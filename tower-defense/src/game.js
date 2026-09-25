/* =====================================================================
 * game.js — Una partida: estado, bucle (requestAnimationFrame + delta
 * time), oleadas, economía, habilidades, eventos del mapa, entrada del
 * ratón sobre el lienzo, dibujo y cálculo del resultado final.
 * ===================================================================== */
window.TD = window.TD || {};

TD.Game = class {
  /**
   * @param canvas lienzo del juego
   * @param opts { mapIndex, difficulty, heroId, mode: 'campaign'|'endless'|'challenge', challenge }
   * @param ui   objeto con callbacks de interfaz (puede ser null en pruebas)
   */
  constructor(canvas, opts, ui) {
    const C = TD.CONFIG, P = TD.Profile;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui || null;
    this.opts = opts;
    this.mode = opts.mode || 'campaign';
    this.challenge = opts.challenge || null;
    this.mapDef = C.maps[opts.mapIndex];
    this.map = new TD.GameMap(this.mapDef);
    this.diffId = opts.difficulty;
    this.diff = C.difficulties[opts.difficulty];

    // Estado de la partida
    this.enemies = []; this.towers = []; this.projectiles = [];
    this.mines = []; this.puddles = []; this.barricades = []; this.coins = []; this.tempTurrets = [];
    this.fx = new TD.Effects();
    this.hero = null;
    this.heroId = opts.heroId;

    // Mejoras del Cuartel
    this.discount = P.barracksValue('descuento');
    this.economyMul = 1 + P.barracksValue('granjas');
    this.cooldownMul = 1 - P.barracksValue('recarga');

    const ch = this.challenge || {};
    this.maxLives = ch.lives || (this.diff.lives + P.barracksValue('vidas'));
    this.lives = this.maxLives;
    this.money = ch.money || Math.round(this.diff.money * (1 + P.barracksValue('plata')));
    this.speedMul = this.diff.speedMul * (ch.speedMul || 1);

    this.totalWaves = this.mode === 'endless' ? Infinity : C.waves.length;
    this.waveNum = 0;          // oleadas iniciadas
    this.waves = [];           // registros de oleadas activas/terminadas
    this.completedWaves = 0;

    this.speedIndex = 0;
    this.paused = false;
    this.over = false;
    this.countdown = null;     // segundos hasta la siguiente oleada (entre oleadas)
    this.earlyUsed = false;    // ya se adelantó una oleada durante la actual
    this.time = 0;

    // Selección / modos de entrada
    this.placing = null;       // id de torre a colocar
    this.selected = null;      // torre o héroe seleccionado
    this.mode2 = this.heroId ? 'heroPlace' : null; // 'heroPlace' | 'heroMove' | habilidad
    this.hover = null;

    // Habilidades: recarga restante
    this.abilityCd = {};
    for (const id in C.abilities) this.abilityCd[id] = 0;

    // Eventos del mapa
    this.nightActive = false;
    this.stormTimer = 0; this.stormAt = -1;
    this.revealTimer = 0;
    this.eruption = { timer: (this.mapDef.event.interval || 0), warn: null };

    // Estadísticas de esta partida
    this.stats = { kills: 0, killsAir: 0, killsHidden: 0, bossKills: 0, moneyEarned: 0, built: 0, maxed: 0,
                   abilities: 0, earlyCalls: 0, livesLost: 0, usedEconomy: false, bestStreak: 0, score: 0 };
    this.streak = { count: 0, timer: 0 };
    this.shakeAmt = 0;

    this.bindInput();
    this.running = false;
    this.lastTime = 0;
    this.hudTimer = 0;
  }

  emit(name, ...args) { if (this.ui && this.ui[name]) this.ui[name](...args); }

  // ------------------------------------------------------------------
  // Bucle principal
  // ------------------------------------------------------------------
  start() {
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      dt = Math.min(dt, TD.CONFIG.maxDelta);
      if (!this.paused && !this.over) this.step(dt * this.speed);
      this.render();
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.hudTimer = 0.1; this.emit('onHud'); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.unbindInput();
  }

  get speed() { return TD.CONFIG.speeds[this.speedIndex]; }
  cycleSpeed() { this.speedIndex = (this.speedIndex + 1) % TD.CONFIG.speeds.length; this.emit('onHud'); }
  setSpeed(i) { this.speedIndex = TD.U.clamp(i, 0, TD.CONFIG.speeds.length - 1); this.emit('onHud'); }

  // Simula en pasos pequeños para que x2/x3 sea estable
  step(dt) {
    const maxStep = 1 / 60;
    let n = Math.ceil(dt / maxStep);
    const h = dt / n;
    while (n-- > 0 && !this.over) this.update(h);
  }

  update(dt) {
    this.time += dt;
    this.updateWaves(dt);
    this.computeBuffs();
    this.updateEvents(dt);

    for (const e of this.enemies) e.update(dt);
    for (const t of this.towers) t.update(dt);
    if (this.hero) this.hero.update(dt);
    this.updateTempTurrets(dt);
    for (const p of this.projectiles) p.update(dt);
    for (const m of this.mines) m.update(dt);
    for (const p of this.puddles) p.update(dt);

    this.enemies = this.enemies.filter(e => e.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.mines = this.mines.filter(m => m.alive);
    this.puddles = this.puddles.filter(p => p.alive);
    for (const b of this.barricades) if (b.hp <= 0 && !b.broken) {
      b.broken = true;
      this.fx.particles(b.x, b.y, 12, '#8a6a44', 90, 0.5, 4);
      TD.Audio.play('boom');
    }
    this.barricades = this.barricades.filter(b => !b.broken);

    // Monedas de la Mina de Plata: se cobran solas al caducar
    for (const c of this.coins) {
      c.t += dt; c.life -= dt;
      if (c.life <= 0) { this.addMoney(c.value, c.x, c.y, true); c.source && (c.source.earned += c.value); }
    }
    this.coins = this.coins.filter(c => c.life > 0);

    for (const id in this.abilityCd) if (this.abilityCd[id] > 0) this.abilityCd[id] -= dt;
    if (this.revealTimer > 0) this.revealTimer -= dt;
    if (this.streak.timer > 0) { this.streak.timer -= dt; if (this.streak.timer <= 0) this.endStreak(); }
    if (this.shakeAmt > 0) this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);

    this.fx.update(dt);

    // Cuenta atrás de preparación entre oleadas
    if (this.countdown !== null && !this.waveActive) {
      this.countdown -= dt;
      if (this.countdown <= 0) { this.countdown = null; this.startNextWave(); }
    }

    if (this.lives <= 0) this.endGame(false);
    else if (this.waveNum >= this.totalWaves && this.completedWaves >= this.totalWaves && this.enemies.length === 0) this.endGame(true);
  }

  // ------------------------------------------------------------------
  // Oleadas
  // ------------------------------------------------------------------
  activeWaves() { return this.waves.filter(w => !w.done); }
  get waveActive() { return this.activeWaves().length > 0; }

  // Grupos de una oleada (campaña o generada en modo Infinito)
  waveGroups(num) {
    const C = TD.CONFIG;
    if (num <= C.waves.length) return C.waves[num - 1];
    // Modo Infinito: generación pseudoaleatoria con semilla por oleada
    let seed = num * 7919 + this.mapDef.id.length;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const E = C.endless, groups = [];
    if (num % 10 === 0) groups.push(['BOSS', 1 + Math.floor((num - 20) / 20), 3, 0]);
    for (let i = 0; i < E.groupsPerWave; i++) {
      const type = E.pool[Math.floor(rnd() * E.pool.length)];
      const count = Math.round((E.baseCount + E.countPerWave * (num - 20)) * (0.5 + rnd()));
      groups.push([type, count, 0.25 + rnd() * 0.6, i * 3]);
    }
    return groups;
  }

  // Resumen para la vista previa: [{ type, count }]
  wavePreview(num) {
    if (num > this.totalWaves) return [];
    const out = {};
    for (const [type, count] of this.waveGroups(num)) {
      const t = type === 'BOSS' || type === 'MINIBOSS' ? this.mapDef.boss : type;
      out[t] = (out[t] || 0) + count;
    }
    return Object.keys(out).map(type => ({ type, count: out[type] }));
  }

  hpMulFor(num) {
    const C = TD.CONFIG;
    let m = this.diff.hpMul * this.mapDef.hpMul * (1 + C.hpGrowthPerWave * (num - 1));
    if (num > C.waves.length) m *= Math.pow(1.05, num - C.waves.length);
    return m;
  }

  startNextWave() {
    if (this.over || this.waveNum >= this.totalWaves) return false;
    const C = TD.CONFIG;
    // Adelantar: con oleadas en curso solo se permite una vez, y da plata extra
    if (this.waveActive) {
      if (this.earlyUsed) { TD.Audio.play('error'); this.emit('hint', '⏳ Ya adelantaste una oleada: acaba con los zombis actuales', 1800); return false; }
      this.earlyUsed = true;
      const bonus = Math.round(C.earlyCallBonus.base + C.earlyCallBonus.perWave * (this.waveNum + 1));
      this.addMoney(bonus);
      this.stats.earlyCalls++;
      TD.Profile.addStat('earlyCalls');
      this.fx.text(this.map.width / 2, 40, '¡Adelantada! +' + bonus + ' 💵', '#ffd84a', 18);
    } else if (this.countdown !== null && this.countdown > 0) {
      // Saltarse la preparación también da plata
      const bonus = Math.round(this.countdown * C.prepSkipBonus);
      if (bonus > 0) { this.addMoney(bonus); this.fx.text(this.map.width / 2, 40, '¡Sin esperar! +' + bonus + ' 💵', '#ffd84a', 18); }
    }
    this.countdown = null;
    this.waveNum++;
    const num = this.waveNum;
    const wave = { num, spawners: [], alive: 0, done: false, night: false };
    for (const [type, count, interval, delay] of this.waveGroups(num)) {
      wave.spawners.push({ type, count, interval, timer: delay, spawned: 0 });
    }
    // Eventos ligados a la oleada
    const ev = this.mapDef.event;
    if (ev.type === 'noche' && ev.waves.includes(num)) { wave.night = true; this.nightActive = true; this.emit('banner', '🌙 Cae la noche', 'Alcance −25% salvo torres cubiertas por un Radar'); }
    if (ev.type === 'tormenta' && Math.random() < ev.chance) this.stormAt = TD.U.rand(3, 14);
    this.waves.push(wave);
    const hasBoss = wave.spawners.some(s => s.type === 'BOSS' || s.type === 'MINIBOSS');
    TD.Audio.play(hasBoss ? 'boss' : 'wave');
    if (hasBoss) { this.shake(10); this.emit('banner', '⚠️ ¡JEFE!', TD.CONFIG.enemies[this.mapDef.boss].name); }
    this.emit('onWaveStart', num);
    return true;
  }

  updateWaves(dt) {
    for (const w of this.waves) {
      if (w.done) continue;
      for (const s of w.spawners) {
        if (s.spawned >= s.count) continue;
        s.timer -= dt;
        while (s.timer <= 0 && s.spawned < s.count) {
          const isBoss = s.type === 'BOSS' || s.type === 'MINIBOSS';
          this.spawnEnemy(isBoss ? this.mapDef.boss : s.type, w.num, { mini: s.type === 'MINIBOSS', dist: -s.timer * 20 });
          s.spawned++;
          s.timer += s.interval;
        }
      }
      const allSpawned = w.spawners.every(s => s.spawned >= s.count);
      if (allSpawned && w.alive <= 0) this.onWaveComplete(w);
    }
  }

  spawnEnemy(type, waveNum, o) {
    o = o || {};
    const e = new TD.Enemy(this, type, {
      hpMul: this.hpMulFor(waveNum), speedMul: this.speedMul, wave: waveNum,
      dist: Math.max(0, o.dist || 0), offset: o.offset !== undefined ? o.offset : TD.U.rand(-7, 7), mini: o.mini
    });
    this.enemies.push(e);
    const w = this.waves.find(x => x.num === waveNum);
    if (w) w.alive++;
    return e;
  }

  waveOf(e) { return this.waves.find(x => x.num === e.wave); }

  onWaveComplete(w) {
    const C = TD.CONFIG;
    w.done = true;
    this.completedWaves++;
    TD.Profile.addStat('waves');
    if (w.night && !this.waves.some(x => !x.done && x.night)) this.nightActive = false;

    // Recompensa de oleada
    let total = Math.round((C.waveBonus.base + C.waveBonus.perWave * w.num) * this.diff.waveBonusMul);
    this.addMoney(total);
    // Economía: granjas y bancos
    for (const t of this.towers) {
      if (t.def.behavior === 'farm') {
        const v = Math.round(t.s.income * (t.perk ? t.perk.incomeMul : 1) * (t.fertile ? 1.5 : 1) * this.economyMul);
        this.addMoney(v, t.x, t.y - 10, true);
        t.earned += v; total += v;
        this.fx.particles(t.x, t.y, 6, '#ffd84a', 60, 0.6, 3);
      } else if (t.def.behavior === 'bank') {
        const rate = t.perk ? t.perk.interest : t.s.interest;
        const cap = t.s.cap * (t.perk ? t.perk.capMul : 1) * this.economyMul;
        const v = Math.round(Math.min(this.money * rate, cap));
        if (v > 0) { this.addMoney(v, t.x, t.y - 10, true); t.earned += v; total += v; }
      }
    }
    // Doc Luna: recupera vidas
    if (this.hero && this.hero.heroDef.ability.type === 'heal' && this.hero.level >= this.hero.heroDef.ability.level) {
      const every = this.hero.level >= 4 ? 2 : this.hero.heroDef.ability.lifeEvery;
      if (w.num % every === 0 && this.lives < this.maxLives) {
        this.lives++;
        this.fx.text(this.hero.x, this.hero.y - 30, '+1 ❤️', '#ff7aa8', 15);
      }
    }
    this.stats.score += 100 * w.num;
    if (this.mode === 'endless' && w.num >= 30) TD.Profile.unlockAchievement('infinito30');
    TD.Audio.play('coin');
    // Todas las oleadas limpias: se reinicia el adelanto y empieza la preparación
    if (!this.waveActive) {
      this.earlyUsed = false;
      if (this.waveNum < this.totalWaves) this.countdown = C.prepTime;
    }
    this.emit('onWaveComplete', w.num, total);
  }

  // ------------------------------------------------------------------
  // Economía, bajas y fugas
  // ------------------------------------------------------------------
  addMoney(n, x, y, showText) {
    n = Math.round(n);
    this.money += n;
    this.stats.moneyEarned += n;
    TD.Profile.addStat('moneyEarned', n);
    if (showText && x !== undefined) this.fx.text(x, y, '+' + n + ' 💵', '#ffe066', 13);
    if (this.money >= 3000) TD.Profile.unlockAchievement('rico');
  }

  onEnemyKilled(e, source) {
    const w = this.waveOf(e);
    if (w) w.alive--;
    const reward = e.reward;
    this.addMoney(reward);
    this.fx.text(e.x, e.y - 10, '+' + reward, '#ffe066', e.boss ? 20 : 12);
    this.fx.particles(e.x, e.y, e.boss ? 30 : 6, TD.U.shade(e.def.color, -0.2), e.boss ? 160 : 70, 0.5, e.boss ? 5 : 3);
    this.stats.kills++;
    this.stats.score += Math.round(reward * 10);
    TD.Profile.addStat('kills');
    if (e.air) { this.stats.killsAir++; TD.Profile.addStat('killsAir'); }
    if (e.def.hidden) { this.stats.killsHidden++; TD.Profile.addStat('killsHidden'); }
    if (source) source.kills = (source.kills || 0) + 1;
    if (e.boss && !e.mini) {
      this.stats.bossKills++;
      TD.Profile.addStat('bossKills');
      TD.Profile.unlockAchievement('jefe');
      if (source && source.id === 'francotirador') TD.Profile.unlockAchievement('sniperJefe');
      this.shake(14);
      TD.Audio.play('bigboom');
      this.emit('banner', '💀 ¡Jefe derrotado!', '+' + reward + ' 💵');
    } else TD.Audio.play('kill');

    // XP del héroe: bajas propias o cercanas
    if (this.hero) {
      const near = TD.U.dist2(e.x, e.y, this.hero.x, this.hero.y) < Math.pow(this.hero.range * 1.5, 2);
      if (source === this.hero || near) this.hero.addXp(reward);
    }

    // Racha de bajas
    this.streak.count++;
    this.streak.timer = TD.CONFIG.killStreak.window;
    if (this.streak.count > this.stats.bestStreak) this.stats.bestStreak = this.streak.count;
    if (this.streak.count >= 25) TD.Profile.unlockAchievement('racha');
  }

  endStreak() {
    const K = TD.CONFIG.killStreak, n = this.streak.count;
    if (n >= K.minKills) {
      const bonus = n * K.bonusPerKill;
      this.addMoney(bonus);
      const label = n >= 25 ? '¡CARNICERÍA!' : n >= 15 ? '¡MASACRE!' : n >= 10 ? '¡MULTIBAJA!' : '¡Racha!';
      this.fx.text(this.map.width / 2, this.map.height / 2 - 40, label + ' x' + n + '  +' + bonus + ' 💵', '#ff9a3c', 22);
    }
    this.streak.count = 0;
  }

  onEnemyEscaped(e) {
    const w = this.waveOf(e);
    if (w) w.alive--;
    this.lives = Math.max(0, this.lives - e.lives);
    this.stats.livesLost += e.lives;
    this.shake(e.boss ? 16 : 5);
    this.fx.text(this.map.width - 60, e.y, '−' + e.lives + ' ❤️', '#ff4f4f', 18);
    TD.Audio.play('leak');
    this.emit('onLeak');
  }

  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }

  // ------------------------------------------------------------------
  // Auras (Radar, Mando, héroe Rex)
  // ------------------------------------------------------------------
  computeBuffs() {
    const all = this.hero ? this.towers.concat([this.hero]) : this.towers;
    for (const t of all) { t.buff.dmg = 0; t.buff.rate = 0; t.buff.range = 0; t.buff.detect = false; t.buff.radar = false; }
    const S = TD.CONFIG.grid.cell;
    for (const a of this.towers) {
      const b = a.def.behavior;
      if (b !== 'radar' && b !== 'command') continue;
      const R = a.s.range * S;
      for (const t of all) {
        if (t === a || TD.U.dist2(t.x, t.y, a.x, a.y) > R * R) continue;
        if (b === 'radar') { t.buff.detect = true; t.buff.radar = true; t.buff.range += a.s.rangeBonus; }
        else {
          t.buff.dmg += a.s.dmgBonus; t.buff.rate += a.s.rateBonus;
          if (a.perk) t.buff.range += a.perk.rangeBonus;
        }
      }
    }
    if (this.hero && this.hero.heroDef.stats.auraDmg) {
      const R = this.hero.heroDef.stats.auraRange * S;
      const bonus = this.hero.heroDef.stats.auraDmg * (1 + (this.hero.level - 1) * 0.25);
      for (const t of this.towers) if (TD.U.dist2(t.x, t.y, this.hero.x, this.hero.y) <= R * R) t.buff.dmg += bonus;
    }
  }

  // ------------------------------------------------------------------
  // Eventos del mapa: tormenta de arena y erupciones
  // ------------------------------------------------------------------
  updateEvents(dt) {
    const ev = this.mapDef.event;
    if (this.stormTimer > 0) this.stormTimer -= dt;
    if (this.stormAt > 0) {
      this.stormAt -= dt;
      if (this.stormAt <= 0) {
        this.stormAt = -1;
        this.stormTimer = ev.duration;
        this.emit('banner', '🌪️ ¡Tormenta de arena!', 'Cadencia de las torres −40% durante ' + ev.duration + ' s');
      }
    }
    if (ev.type === 'erupcion' && this.waveActive && this.towers.length) {
      const E = this.eruption;
      if (E.warn) {
        E.warn.t -= dt;
        if (E.warn.t <= 0) {
          const t = E.warn.tower;
          if (this.towers.includes(t)) {
            t.stunTimer = ev.stun;
            this.fx.explosion(t.x, t.y, 30, '#ff5a1f');
            this.fx.text(t.x, t.y - 26, '¡Aturdida!', '#ff9a3c', 13);
            this.shake(6);
            TD.Audio.play('bigboom');
          }
          E.warn = null;
        }
      } else {
        E.timer -= dt;
        if (E.timer <= 0) {
          E.timer = ev.interval * TD.U.rand(0.8, 1.2);
          const candidates = this.towers.filter(t => t.def.category !== 'economia');
          if (candidates.length) E.warn = { tower: TD.U.pick(candidates), t: ev.warning };
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Torretas temporales de la Ingeniera Chispa
  // ------------------------------------------------------------------
  updateTempTurrets(dt) {
    for (const tt of this.tempTurrets) {
      tt.life -= dt; tt.cd -= dt;
      let best = null, bd = Infinity;
      for (const e of this.enemies) {
        if (!e.alive || !e.visibleTo(false)) continue;
        const d = TD.U.dist2(e.x, e.y, tt.x, tt.y);
        if (d < tt.range * tt.range && d < bd) { bd = d; best = e; }
      }
      if (best) {
        tt.angle = Math.atan2(best.y - tt.y, best.x - tt.x);
        if (tt.cd <= 0) {
          tt.cd = 1 / tt.rate;
          this.projectiles.push(new TD.Projectile(this, 'bullet', { x: tt.x, y: tt.y, target: best, speed: 700, damage: tt.damage,
            filter: { ground: true, air: true }, source: tt.source, color: '#f0c43a', size: 2 }));
        }
      }
    }
    this.tempTurrets = this.tempTurrets.filter(t => t.life > 0);
  }

  // ------------------------------------------------------------------
  // Construcción, mejora y venta
  // ------------------------------------------------------------------
  towerAt(c, r) { return this.towers.find(t => t.c === c && t.r === r) || null; }
  canPlace(c, r) {
    if (!this.map.isBuildable(c, r) || this.towerAt(c, r)) return false;
    if (this.hero && this.hero.c === c && this.hero.r === r) return false;
    return true;
  }
  price(id) { return Math.round(TD.CONFIG.towers[id].cost * (1 - this.discount) / 5) * 5; }

  // ¿Está permitida esta torre (desbloqueo y reglas de desafío)?
  towerAllowed(id) {
    if (!TD.Profile.isTowerUnlocked(id)) return false;
    const ch = this.challenge;
    if (ch && ch.allowed && !ch.allowed.includes(id)) return false;
    if (ch && ch.banned && ch.banned.includes(id)) return false;
    return true;
  }

  build(id, c, r) {
    const cost = this.price(id);
    if (!this.towerAllowed(id) || !this.canPlace(c, r)) { TD.Audio.play('error'); return null; }
    if (this.money < cost) { TD.Audio.play('error'); this.emit('flashMoney'); return null; }
    this.money -= cost;
    const t = new TD.Tower(this, id, c, r);
    t.invested = cost;
    this.towers.push(t);
    this.tempTurrets = this.tempTurrets.filter(tt => tt.c !== c || tt.r !== r);
    this.stats.built++;
    TD.Profile.addStat('built');
    if (t.def.category === 'economia') this.stats.usedEconomy = true;
    this.fx.ring(t.x, t.y, 28, '#ffffff', 0.35);
    this.fx.particles(t.x, t.y, 10, '#e8dcc0', 80, 0.4, 3);
    TD.Audio.play('build');
    return t;
  }

  upgrade(t) {
    if (!t || t.isHero || t.maxed) return false;
    const cost = t.upgradeCost();
    if (this.money < cost) { TD.Audio.play('error'); this.emit('flashMoney'); return false; }
    this.money -= cost;
    t.invested += cost;
    t.upgrade();
    this.fx.ring(t.x, t.y, 32, '#ffd84a', 0.5);
    this.fx.particles(t.x, t.y, 14, '#ffd84a', 90, 0.5, 3);
    this.fx.text(t.x, t.y - 28, 'Nivel ' + t.level + (t.maxed ? ' ★' : ''), '#ffd84a', 14);
    TD.Audio.play('upgrade');
    if (t.maxed) {
      this.stats.maxed++;
      TD.Profile.addStat('maxed');
      TD.Profile.unlockAchievement('max5');
    }
    return true;
  }

  sell(t) {
    if (!t || t.isHero) return false;
    const v = t.sellValue();
    this.money += v;
    this.towers = this.towers.filter(x => x !== t);
    if (t.mines) t.mines.forEach(m => { m.alive = false; });
    if (this.selected === t) this.selected = null;
    this.fx.text(t.x, t.y - 10, '+' + v + ' 💵', '#ffe066', 14);
    this.fx.particles(t.x, t.y, 12, '#b0b0b0', 90, 0.4, 3);
    TD.Audio.play('sell');
    return true;
  }

  findFreeCellNear(c, r, rad) {
    const spots = [];
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      const cc = c + dc, rr = r + dr;
      if ((dc || dr) && this.canPlace(cc, rr) && !this.tempTurrets.some(t => t.c === cc && t.r === rr)) spots.push({ c: cc, r: rr });
    }
    return spots.length ? TD.U.pick(spots) : null;
  }

  // ------------------------------------------------------------------
  // Habilidades del jugador
  // ------------------------------------------------------------------
  abilityReady(id) {
    const a = TD.CONFIG.abilities[id];
    if (!TD.Profile.isAbilityUnlocked(id)) return false;
    if (this.abilityCd[id] > 0) return false;
    if (a.cost && this.money < a.cost) return false;
    return true;
  }

  // Activa una habilidad (las que requieren apuntar pasan a modo selección)
  useAbility(id) {
    const a = TD.CONFIG.abilities[id];
    if (!this.abilityReady(id)) { TD.Audio.play('error'); return false; }
    if (id === 'congelar') {
      for (const e of this.enemies) e.freeze(a.duration);
      this.fx.ring(this.map.width / 2, this.map.height / 2, 600, '#bfe9ff', 0.8);
      TD.Audio.play('freeze');
      this.finishAbility(id);
    } else if (id === 'suministro') {
      const v = a.money + a.perWave * this.waveNum;
      this.addMoney(v, this.map.width / 2, 60, true);
      this.fx.particles(this.map.width / 2, 60, 20, '#ffd84a', 150, 0.8, 4);
      TD.Audio.play('coin');
      this.finishAbility(id);
    } else {
      this.placing = null;
      this.selected = null;
      this.mode2 = this.mode2 === id ? null : id;
      this.emit('onSelection');
    }
    return true;
  }

  finishAbility(id) {
    this.abilityCd[id] = TD.CONFIG.abilities[id].cooldown * this.cooldownMul;
    this.stats.abilities++;
    TD.Profile.addStat('abilities');
    this.mode2 = null;
    this.emit('onSelection');
  }

  castAt(id, x, y) {
    const a = TD.CONFIG.abilities[id];
    const S = TD.CONFIG.grid.cell;
    const proj = this.map.project(x, y);
    if (id === 'bombardeo') {
      if (proj.d > S * 2.5) { TD.Audio.play('error'); return false; }
      for (let i = 0; i < a.bombs; i++) {
        const d = proj.dist + (i - (a.bombs - 1) / 2) * a.spacing * S;
        const p = this.map.pointAt(d);
        this.projectiles.push(new TD.Projectile(this, 'shell', {
          x: p.x - 300, y: p.y - 400, tx: p.x, ty: p.y, flight: 0.5 + i * 0.12, damage: a.damage,
          splash: a.radius * S, filter: { ground: true, air: true }, source: null, color: '#ff7a2a', size: 7
        }));
      }
      this.emit('banner', '✈️ ¡Bombardeo en camino!', '');
    } else if (id === 'barricada' || id === 'mina') {
      const { c, r } = this.map.cellAt(x, y);
      if (!this.map.isPath(c, r) || proj.d > S * 0.6) { TD.Audio.play('error'); return false; }
      if (this.money < a.cost) { TD.Audio.play('error'); return false; }
      this.money -= a.cost;
      const p = this.map.pointAt(proj.dist);
      if (id === 'barricada') {
        const hp = a.hp + a.hpPerWave * this.waveNum;
        this.barricades.push({ x: p.x, y: p.y, dist: proj.dist, hp, maxHp: hp, angle: p.angle });
      } else {
        this.mines.push(new TD.Mine(this, p.x, p.y, { damage: a.damage, radius: a.radius * S }));
      }
      TD.Audio.play('build');
    }
    this.finishAbility(id);
    return true;
  }

  // ------------------------------------------------------------------
  // Entrada del ratón / táctil sobre el lienzo
  // ------------------------------------------------------------------
  bindInput() {
    this._onMove = (ev) => {
      const p = this.toCanvas(ev);
      this.hover = { x: p.x, y: p.y, ...this.map.cellAt(p.x, p.y) };
      // Recoger monedas al pasar el ratón
      this.collectCoinsAt(p.x, p.y);
    };
    this._onLeave = () => { this.hover = null; };
    this._onClick = (ev) => {
      const p = this.toCanvas(ev);
      this.hover = { x: p.x, y: p.y, ...this.map.cellAt(p.x, p.y) };
      this.handleClick(p.x, p.y);
    };
    this._onContext = (ev) => { ev.preventDefault(); this.cancel(); };
    this.canvas.addEventListener('mousemove', this._onMove);
    this.canvas.addEventListener('mouseleave', this._onLeave);
    this.canvas.addEventListener('click', this._onClick);
    this.canvas.addEventListener('contextmenu', this._onContext);
  }
  unbindInput() {
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('contextmenu', this._onContext);
  }
  toCanvas(ev) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (this.canvas.width / r.width), y: (ev.clientY - r.top) * (this.canvas.height / r.height) };
  }

  collectCoinsAt(x, y) {
    for (const c of this.coins) {
      if (c.life > 0 && TD.U.dist2(c.x, c.y, x, y) < 22 * 22) {
        const v = Math.round(c.value * 1.25);
        c.life = 0; c.value = 0;
        this.addMoney(v, c.x, c.y, true);
        if (c.source) c.source.earned += v;
        TD.Audio.play('coin');
      }
    }
    this.coins = this.coins.filter(c => c.life > 0);
  }

  cancel() {
    this.placing = null;
    this.selected = null;
    if (this.mode2 !== 'heroPlace') this.mode2 = null;
    this.emit('onSelection');
  }

  selectPlacing(id) {
    if (!this.towerAllowed(id)) { TD.Audio.play('error'); return; }
    this.mode2 = this.mode2 === 'heroPlace' ? 'heroPlace' : null;
    this.selected = null;
    this.placing = this.placing === id ? null : id;
    if (this.placing) this.mode2 = null;
    TD.Audio.play('click');
    this.emit('onSelection');
  }

  handleClick(x, y) {
    if (this.over) return;
    const { c, r } = this.map.cellAt(x, y);
    const m = this.mode2;
    if (m && TD.CONFIG.abilities[m]) { this.castAt(m, x, y); return; }
    if (m === 'heroPlace' || m === 'heroMove') {
      if (this.canPlace(c, r)) {
        if (!this.hero) {
          this.hero = new TD.Hero(this, this.heroId, c, r);
          this.fx.ring(this.hero.x, this.hero.y, 36, '#ffd84a', 0.6);
          TD.Audio.play('build');
        } else this.hero.moveTo(c, r);
        this.mode2 = null;
        this.selected = this.hero;
        this.emit('onSelection');
      } else TD.Audio.play('error');
      return;
    }
    if (this.placing) {
      const id = this.placing;
      if (this.build(id, c, r)) {
        // Mantiene la torre elegida si se pulsa con Mayús (construcción rápida)
        this.placing = null;
      }
      this.emit('onSelection');
      return;
    }
    const t = this.towerAt(c, r) || (this.hero && this.hero.c === c && this.hero.r === r ? this.hero : null);
    this.selected = t && this.selected !== t ? t : null;
    if (t) TD.Audio.play('click');
    this.emit('onSelection');
  }

  // ------------------------------------------------------------------
  // Dibujo
  // ------------------------------------------------------------------
  render() {
    const ctx = this.ctx, S = TD.CONFIG.grid.cell;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.shakeAmt > 0) ctx.translate(TD.U.rand(-1, 1) * this.shakeAmt * 0.5, TD.U.rand(-1, 1) * this.shakeAmt * 0.5);

    this.map.draw(ctx, this.time);
    this.drawAirRoute(ctx);
    for (const p of this.puddles) p.draw(ctx);
    for (const m of this.mines) m.draw(ctx);
    for (const b of this.barricades) this.drawBarricade(ctx, b);

    // Vista previa de colocación / alcance de la selección
    this.drawOverlays(ctx);

    for (const t of this.towers) t.draw(ctx);
    for (const tt of this.tempTurrets) this.drawTempTurret(ctx, tt);
    if (this.hero) this.hero.draw(ctx);

    for (const e of this.enemies) if (!e.flying) e.draw(ctx);
    for (const e of this.enemies) if (e.flying) e.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    for (const t of this.towers) { const b = TD.BEHAVIORS[t.def.behavior]; if (b.drawTop) b.drawTop(t, ctx); }

    for (const c of this.coins) this.drawCoin(ctx, c);

    // Aviso de erupción
    const W = this.eruption.warn;
    if (W) {
      const k = 0.5 + 0.5 * Math.sin(this.time * 20);
      ctx.strokeStyle = 'rgba(255,60,0,' + (0.5 + 0.5 * k) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W.tower.x, W.tower.y, S * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff5a1f'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠', W.tower.x, W.tower.y - S * 0.65);
    }

    this.fx.draw(ctx);
    this.drawCountdown(ctx);

    // Capas de eventos
    if (this.nightActive) {
      ctx.fillStyle = 'rgba(10,20,60,0.38)';
      ctx.fillRect(0, 0, this.map.width, this.map.height);
    }
    if (this.stormTimer > 0) {
      ctx.fillStyle = 'rgba(210,160,90,0.25)';
      ctx.fillRect(0, 0, this.map.width, this.map.height);
      ctx.fillStyle = 'rgba(240,200,140,0.5)';
      for (let i = 0; i < 60; i++) {
        const x = ((i * 97 + this.time * 400) % (this.map.width + 40)) - 20, y = (i * 53) % this.map.height;
        ctx.fillRect(x, y, 14, 1.5);
      }
    }
    if (this.revealTimer > 0) {
      ctx.strokeStyle = 'rgba(47,227,207,0.5)'; ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, this.map.width - 4, this.map.height - 4);
    }
    ctx.restore();
  }

  drawOverlays(ctx) {
    const S = TD.CONFIG.grid.cell, h = this.hover;
    const circle = (x, y, r, fill, stroke) => {
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };
    // Torre seleccionada: su alcance
    if (this.selected) {
      const t = this.selected;
      if (t.def.behavior !== 'farm' && t.def.behavior !== 'bank' && t.def.behavior !== 'silvermine') {
        circle(t.x, t.y, t.range, 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.6)');
        if (t.def.behavior === 'mortar') circle(t.x, t.y, t.s.minRange * S, 'rgba(255,80,80,0.1)', 'rgba(255,80,80,0.4)');
      }
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2;
      ctx.strokeRect(t.c * S + 1, t.r * S + 1, S - 2, S - 2);
    }
    if (!h || !this.map.inside(h.c, h.r)) return;

    // Colocando torre: alcance antes de construir
    if (this.placing) {
      const ok = this.canPlace(h.c, h.r) && this.money >= this.price(this.placing);
      const def = TD.CONFIG.towers[this.placing];
      const st = TD.U.towerStats(def, 1);
      const x = (h.c + 0.5) * S, y = (h.r + 0.5) * S;
      if (st.range) circle(x, y, st.range * S, ok ? 'rgba(120,255,140,0.13)' : 'rgba(255,90,90,0.13)', ok ? 'rgba(120,255,140,0.7)' : 'rgba(255,90,90,0.7)');
      ctx.fillStyle = ok ? 'rgba(120,255,140,0.35)' : 'rgba(255,90,90,0.35)';
      ctx.fillRect(h.c * S, h.r * S, S, S);
      ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85; ctx.fillText(def.icon, x, y); ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
      // Marca las torres que recibirían el aura
      if (def.behavior === 'radar' || def.behavior === 'command') {
        for (const t of this.towers) if (TD.U.dist(t.x, t.y, x, y) <= st.range * S) {
          ctx.strokeStyle = def.behavior === 'radar' ? '#2fe3cf' : '#ffd84a'; ctx.lineWidth = 2;
          ctx.strokeRect(t.c * S + 3, t.r * S + 3, S - 6, S - 6);
        }
      }
      if (this.mapDef.lavaRateBonus && this.map.nearLava(h.c, h.r) && ok) {
        ctx.fillStyle = '#ffb347'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText('+15% cadencia', x, y - S * 0.6);
      }
      if (this.map.tile(h.c, h.r) === 'fertil' && def.behavior === 'farm') {
        ctx.fillStyle = '#ffe066'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Tierra fértil +50%', x, y - S * 0.6);
      }
      return;
    }
    const m = this.mode2;
    if (m === 'heroPlace' || m === 'heroMove') {
      const ok = this.canPlace(h.c, h.r);
      const hd = TD.CONFIG.heroes[this.heroId];
      circle((h.c + 0.5) * S, (h.r + 0.5) * S, hd.stats.range * S, ok ? 'rgba(255,216,74,0.14)' : 'rgba(255,90,90,0.13)', ok ? '#ffd84a' : '#ff5a5a');
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(hd.icon, (h.c + 0.5) * S, (h.r + 0.5) * S); ctx.textBaseline = 'alphabetic';
      return;
    }
    if (m === 'bombardeo') {
      const a = TD.CONFIG.abilities.bombardeo, proj = this.map.project(h.x, h.y);
      const ok = proj.d <= S * 2.5;
      for (let i = 0; i < a.bombs; i++) {
        const p = this.map.pointAt(proj.dist + (i - (a.bombs - 1) / 2) * a.spacing * S);
        circle(p.x, p.y, a.radius * S, ok ? 'rgba(255,120,40,0.15)' : 'rgba(255,90,90,0.08)', ok ? 'rgba(255,120,40,0.8)' : 'rgba(255,90,90,0.4)');
      }
    } else if (m === 'barricada' || m === 'mina') {
      const ok = this.map.isPath(h.c, h.r);
      ctx.fillStyle = ok ? 'rgba(255,216,74,0.35)' : 'rgba(255,90,90,0.35)';
      ctx.fillRect(h.c * S, h.r * S, S, S);
      ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(TD.CONFIG.abilities[m].icon, (h.c + 0.5) * S, (h.r + 0.5) * S); ctx.textBaseline = 'alphabetic';
    } else {
      // Resalta la casilla bajo el ratón
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(h.c * S + 0.5, h.r * S + 0.5, S - 1, S - 1);
    }
  }

  // ¿Hay voladores en el mapa o en la próxima oleada?
  airIncoming() {
    if (this.enemies.some(e => e.flying)) return true;
    if (this.waveActive) return false;
    return this.wavePreview(this.waveNum + 1).some(p => TD.CONFIG.enemies[p.type].air);
  }

  // Ruta de los voladores: línea brillante animada con flechas en movimiento
  drawAirRoute(ctx) {
    const air = this.map.air, S = TD.CONFIG.grid.cell;
    const alert = this.airIncoming();
    const k = alert ? 0.75 + 0.25 * Math.sin(this.time * 6) : 0.55;
    const trace = () => { ctx.beginPath(); air.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); };
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = alert ? 'rgba(255,120,120,' + 0.22 * k + ')' : 'rgba(90,190,255,0.16)';
    ctx.lineWidth = 18; trace();
    ctx.setLineDash([16, 12]); ctx.lineDashOffset = -this.time * 45;
    ctx.strokeStyle = alert ? 'rgba(255,170,170,' + k + ')' : 'rgba(170,225,255,' + k + ')';
    ctx.lineWidth = 3; trace();
    ctx.setLineDash([]);
    // Flechas que avanzan por la ruta
    const spacing = S * 2.5;
    ctx.fillStyle = alert ? 'rgba(255,200,200,0.9)' : 'rgba(210,240,255,0.85)';
    for (let d = (this.time * 45) % spacing; d < air.len; d += spacing) {
      const p = this.map.airPointAt(d);
      if (p.x < 4 || p.x > this.map.width - 4) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Insignia de entrada
    const e0 = this.map.airPointAt(S * 1.2);
    const e = { x: TD.U.clamp(e0.x, 40, this.map.width - 40), y: TD.U.clamp(e0.y, 18, this.map.height - 34) };
    ctx.fillStyle = alert ? 'rgba(160,30,30,0.9)' : 'rgba(20,50,80,0.85)';
    ctx.strokeStyle = alert ? '#ffb0b0' : '#aee1ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✈', e.x, e.y + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = alert ? '#ffd0d0' : '#d8f0ff';
    ctx.fillText(alert ? '¡AÉREOS!' : 'RUTA AÉREA', e.x, e.y + 26);
    ctx.restore();
  }

  // Cuenta atrás entre oleadas
  drawCountdown(ctx) {
    if (this.countdown === null || this.over) return;
    const secs = Math.ceil(this.countdown);
    if (this.lastTick !== secs) { this.lastTick = secs; if (secs <= 3) TD.Audio.play('click'); }
    const cx = this.map.width / 2, cy = 44, w = 310, h = 54;
    ctx.save();
    ctx.fillStyle = 'rgba(10,14,20,0.82)'; ctx.strokeStyle = secs <= 3 ? '#ff7a5a' : '#ffd84a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 14) : ctx.rect(cx - w / 2, cy - h / 2, w, h); ctx.fill(); ctx.stroke();
    // Anillo de progreso
    const f = this.countdown / TD.CONFIG.prepTime;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx - w / 2 + 30, cy, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = secs <= 3 ? '#ff7a5a' : '#ffd84a';
    ctx.beginPath(); ctx.arc(cx - w / 2 + 30, cy, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    const pop = 1 + Math.max(0, (this.countdown % 1) - 0.7) * 1.2;
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(18 * pop) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(secs, cx - w / 2 + 30, cy + 1);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffd84a';
    ctx.fillText('Oleada ' + (this.waveNum + 1) + ' en camino', cx - w / 2 + 58, cy - 8);
    ctx.font = '12px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#c9d3df';
    ctx.fillText('¡Prepárate! · N = empezar ya (+' + Math.round(this.countdown * TD.CONFIG.prepSkipBonus) + ' 💵)', cx - w / 2 + 58, cy + 11);
    ctx.restore();
  }

  drawBarricade(ctx, b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle + Math.PI / 2);
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(-18, -6, 36, 12);
    ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 2; ctx.strokeRect(-18, -6, 36, 12);
    ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(18, 6); ctx.moveTo(-18, 6); ctx.lineTo(18, -6); ctx.stroke();
    ctx.restore();
    const f = b.hp / b.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(b.x - 16, b.y - 22, 32, 4);
    ctx.fillStyle = '#e0a040'; ctx.fillRect(b.x - 16, b.y - 22, 32 * f, 4);
  }

  drawTempTurret(ctx, tt) {
    ctx.globalAlpha = Math.min(1, tt.life * 2);
    ctx.fillStyle = '#5a4a20'; ctx.fillRect(tt.x - 12, tt.y - 12, 24, 24);
    ctx.save(); ctx.translate(tt.x, tt.y); ctx.rotate(tt.angle);
    ctx.fillStyle = '#2d3136'; ctx.fillRect(0, -2, 14, 4);
    ctx.fillStyle = '#f0c43a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawCoin(ctx, c) {
    const bob = Math.sin(c.t * 5) * 3;
    ctx.globalAlpha = c.life < 1.5 ? 0.4 + 0.6 * Math.abs(Math.sin(c.t * 10)) : 1;
    ctx.fillStyle = '#c8d0da'; ctx.strokeStyle = '#7a8490'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y + bob, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a6470'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$', c.x, c.y + bob + 4);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------
  // Fin de partida: estrellas, puntuación, XP, medallas y logros
  // ------------------------------------------------------------------
  endGame(win) {
    if (this.over) return;
    this.over = true;
    const P = TD.Profile, C = TD.CONFIG, d = P.data;
    if (this.streak.count) this.endStreak();

    // Puntuación
    let score = this.stats.score;
    if (win) score += this.lives * 150 + Math.floor(this.money * 0.5);
    score = Math.round(score * this.diff.scoreMul);

    // Estrellas según vidas conservadas
    let stars = 0;
    if (win) {
      const f = this.lives / this.maxLives;
      stars = f >= C.stars.three ? 3 : f >= C.stars.two ? 2 : 1;
    }

    // Récords
    const key = this.mode === 'challenge' ? 'ch-' + this.challenge.id : this.mode === 'endless' ? 'inf-' + this.mapDef.id : this.mapDef.id + '-' + this.diffId;
    const prevBest = d.bestScore[key] || 0;
    const newRecord = score > prevBest;
    if (newRecord) d.bestScore[key] = score;
    if (this.mode === 'endless') d.endlessBest[this.mapDef.id] = Math.max(d.endlessBest[this.mapDef.id] || 0, this.completedWaves);

    // Medallas
    let medals = 0;
    if (win && this.mode === 'campaign') {
      d.stars[this.mapDef.id] = d.stars[this.mapDef.id] || {};
      const old = d.stars[this.mapDef.id][this.diffId] || 0;
      if (stars > old) { medals += (stars - old) * this.diff.medalMul; d.stars[this.mapDef.id][this.diffId] = stars; }
      medals += 1;
    }
    if (win && this.mode === 'challenge' && !d.challengesDone[this.challenge.id]) {
      d.challengesDone[this.challenge.id] = true;
      medals += this.challenge.medals;
      P.unlockAchievement('desafio');
    }
    if (this.mode === 'endless') medals += Math.floor(this.completedWaves / 10);
    d.medals += medals;

    // Estadísticas globales
    d.stats.games++;
    if (win) P.addStat('wins'); else d.stats.losses++;
    d.stats.bestStreak = Math.max(d.stats.bestStreak, this.stats.bestStreak);

    // Logros de victoria
    if (win) {
      P.unlockAchievement('primera');
      if (this.stats.livesLost === 0) P.unlockAchievement('perfecto');
      if (!this.stats.usedEconomy) P.unlockAchievement('sinGranjas');
      if (this.diffId === 'leyenda') P.unlockAchievement('leyenda');
      const wonAll = C.maps.every(m => d.stars[m.id] && Object.values(d.stars[m.id]).some(v => v > 0));
      if (wonAll) P.unlockAchievement('trilogia');
      const threeAll = C.maps.every(m => d.stars[m.id] && Object.values(d.stars[m.id]).some(v => v >= 3));
      if (threeAll) P.unlockAchievement('estrellas');
    }

    // XP del perfil
    let xp = score * C.profile.xpPerScore * this.diff.xpMul;
    if (win) xp += C.profile.winXpBonus * this.diff.xpMul;
    else xp *= C.profile.lossXpFactor;
    xp = Math.max(10, Math.round(xp));
    const xpRes = P.addXp(xp);
    P.save();

    this.result = {
      win, stars, score, newRecord, prevBest, medals, xp: xpRes.amount, xpRes,
      lives: this.lives, maxLives: this.maxLives, waves: this.completedWaves, mode: this.mode,
      stats: Object.assign({}, this.stats), money: this.money,
      mapName: this.mapDef.name, diffName: this.diff.name
    };
    TD.Audio.play(win ? 'win' : 'lose');
    this.emit('onGameOver', this.result);
  }
};
