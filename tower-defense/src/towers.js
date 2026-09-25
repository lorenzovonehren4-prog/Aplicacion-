/* =====================================================================
 * towers.js — Torres: estadísticas por nivel, búsqueda de objetivos,
 * comportamientos de ataque (BEHAVIORS), mejoras, venta y dibujo.
 *
 * Para crear una torre con una mecánica nueva:
 *   1) Añádela en CONFIG.towers con behavior: 'miComportamiento'.
 *   2) Registra aquí TD.BEHAVIORS.miComportamiento = { update(t, dt) {...} }.
 * ===================================================================== */
window.TD = window.TD || {};

TD.TARGETING = {
  primero: { name: 'Primero', icon: '⏩' },
  fuerte:  { name: 'Más fuerte', icon: '💪' },
  cercano: { name: 'Más cercano', icon: '📍' },
  ultimo:  { name: 'Último', icon: '⏪' }
};

TD.Tower = class {
  constructor(game, id, c, r, def) {
    const S = TD.CONFIG.grid.cell;
    this.game = game;
    this.id = id;
    this.def = def || TD.CONFIG.towers[id];
    this.c = c; this.r = r;
    this.x = (c + 0.5) * S; this.y = (r + 0.5) * S;
    this.level = 1;
    this.angle = -Math.PI / 2;
    this.cooldown = 0.2;
    this.invested = 0;
    this.kills = 0;
    this.damageDealt = 0;
    this.earned = 0;
    this.shots = 0;
    this.stunTimer = 0;
    this.targeting = this.def.defaultTargeting || 'primero';
    this.buff = { dmg: 0, rate: 0, range: 0, detect: false, radar: false };
    this.recoil = 0;
    this.anim = Math.random() * 10;
    this.nearLava = game.map.nearLava(c, r) && !!game.map.def.lavaRateBonus;
    this.fertile = game.map.tile(c, r) === 'fertil';
    this.mines = [];
    this.drones = [];
    this.recalc();
  }

  get isHero() { return false; }
  get perk() { return this.level >= TD.CONFIG.maxTowerLevel ? this.def.perk : null; }
  get maxed() { return this.level >= TD.CONFIG.maxTowerLevel; }

  recalc() {
    this.s = TD.U.towerStats(this.def, this.level);
    if (this.def.behavior === 'drone') {
      const n = this.perk ? this.perk.drones : this.s.drones;
      while (this.drones.length < n) this.drones.push({ a: (this.drones.length / n) * Math.PI * 2, cd: 0, x: this.x, y: this.y, angle: 0 });
    }
  }

  // --- Valores efectivos (con buffs y eventos del mapa) ---
  get range() {
    let r = this.s.range * TD.CONFIG.grid.cell * (1 + this.buff.range);
    if (this.game.nightActive && !this.buff.radar && this.def.behavior !== 'radar') r *= this.game.map.def.event.rangeMul;
    return r;
  }
  get rate() {
    let k = (this.s.rate || 1) * (1 + this.buff.rate);
    if (this.nearLava) k *= 1 + this.game.map.def.lavaRateBonus;
    if (this.game.stormTimer > 0) k *= this.game.map.def.event.rateMul;
    return k;
  }
  get damage() { return (this.s.damage || 0) * (1 + this.buff.dmg); }
  get detect() { return !!this.def.detect || this.buff.detect; }
  get filter() { return this.def.targets; }
  get projSpeed() { return (this.s.projSpeed || 10) * TD.CONFIG.grid.cell; }

  upgradeCost() { return this.maxed ? Infinity : TD.U.upgradeCost(this.def, this.level, this.game.discount); }
  sellValue() { return Math.floor(this.invested * TD.CONFIG.sellRatio); }

  upgrade() {
    this.level++;
    this.recalc();
  }

  // ¿Es este enemigo un objetivo válido?
  canTarget(e, range, ox, oy) {
    if (!TD.canHit(e, this.filter) || !e.visibleTo(this.detect)) return false;
    const x = ox === undefined ? this.x : ox, y = oy === undefined ? this.y : oy;
    const R = range + e.radius;
    return TD.U.dist2(e.x, e.y, x, y) <= R * R;
  }

  // Lista de objetivos ordenada según el modo de apuntado
  findTargets(n, range, ox, oy, minRange) {
    range = range === undefined ? this.range : range;
    const x = ox === undefined ? this.x : ox, y = oy === undefined ? this.y : oy;
    const list = [];
    for (const e of this.game.enemies) {
      if (!this.canTarget(e, range, x, y)) continue;
      if (minRange && TD.U.dist2(e.x, e.y, x, y) < minRange * minRange) continue;
      list.push(e);
    }
    const mode = this.targeting;
    if (mode === 'primero') list.sort((a, b) => b.progress - a.progress);
    else if (mode === 'ultimo') list.sort((a, b) => a.progress - b.progress);
    else if (mode === 'fuerte') list.sort((a, b) => b.hp - a.hp);
    else list.sort((a, b) => TD.U.dist2(a.x, a.y, x, y) - TD.U.dist2(b.x, b.y, x, y));
    return n ? list.slice(0, n) : list;
  }
  findTarget(range, minRange) { return this.findTargets(1, range, undefined, undefined, minRange)[0] || null; }

  aimAt(e, dt) {
    const want = Math.atan2(e.y - this.y, e.x - this.x);
    if (dt === undefined) { this.angle = want; return; }
    this.angle += TD.U.clamp(TD.U.angleDiff(this.angle, want), -12 * dt, 12 * dt);
  }

  // Punto de salida del cañón
  muzzle() {
    const len = ((this.def.look && this.def.look.barrelLen) || 0.3) * TD.CONFIG.grid.cell;
    return { x: this.x + Math.cos(this.angle) * len, y: this.y + Math.sin(this.angle) * len };
  }

  update(dt) {
    this.anim += dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 8);
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    const b = TD.BEHAVIORS[this.def.behavior];
    if (b && b.update) b.update(this, dt);
  }

  // Dispara un proyectil genérico
  shoot(kind, target, extra) {
    const m = this.muzzle();
    const p = new TD.Projectile(this.game, kind, Object.assign({
      x: m.x, y: m.y, target, speed: this.projSpeed, damage: this.damage,
      filter: this.filter, source: this, pierce: !!this.def.armorPierce
    }, extra || {}));
    this.game.projectiles.push(p);
    this.recoil = 1;
    this.shots++;
    return p;
  }

  // ------------------------------------------------------------------
  // Dibujo
  // ------------------------------------------------------------------
  draw(ctx) {
    const S = TD.CONFIG.grid.cell;
    const cat = TD.CONFIG.categories[this.def.category];
    const x = this.x, y = this.y;
    // Base
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x - S * 0.42 + 3, y - S * 0.42 + 4, S * 0.84, S * 0.84);
    ctx.fillStyle = TD.U.shade(cat.color, -0.45);
    this.roundRect(ctx, x - S * 0.42, y - S * 0.42, S * 0.84, S * 0.84, 7); ctx.fill();
    ctx.fillStyle = TD.U.shade(cat.color, -0.2);
    this.roundRect(ctx, x - S * 0.36, y - S * 0.36, S * 0.72, S * 0.72, 6); ctx.fill();
    // Marco según el nivel
    const lvlColors = [null, '#cd7f32', '#c0c8d0', '#ffd84a', '#d27bff'];
    const lc = lvlColors[this.level - 1];
    if (lc) {
      ctx.strokeStyle = lc; ctx.lineWidth = this.level >= 5 ? 3 : 2;
      if (this.level >= 5) { ctx.shadowColor = lc; ctx.shadowBlur = 10 + Math.sin(this.anim * 4) * 4; }
      this.roundRect(ctx, x - S * 0.42, y - S * 0.42, S * 0.84, S * 0.84, 7); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const b = TD.BEHAVIORS[this.def.behavior];
    if (b && b.draw) b.draw(this, ctx);
    else this.drawTurret(ctx);

    // Indicadores de nivel (puntos)
    for (let i = 0; i < this.level; i++) {
      ctx.fillStyle = this.level >= 5 ? '#e7b3ff' : '#ffe27a';
      ctx.beginPath(); ctx.arc(x - S * 0.28 + i * S * 0.14, y + S * 0.34, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (this.nearLava) { ctx.fillStyle = '#ff7a2a'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', x + S * 0.3, y - S * 0.26); }
    if (this.buff.detect && !this.def.detect) { ctx.fillStyle = '#2fe3cf'; ctx.beginPath(); ctx.arc(x - S * 0.32, y - S * 0.32, 3, 0, Math.PI * 2); ctx.fill(); }
    // Aturdida por erupción
    if (this.stunTimer > 0) {
      ctx.fillStyle = 'rgba(40,40,40,0.55)';
      this.roundRect(ctx, x - S * 0.42, y - S * 0.42, S * 0.84, S * 0.84, 7); ctx.fill();
      ctx.fillStyle = '#ffe14a'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('💫', x, y - S * 0.1 + Math.sin(this.anim * 6) * 2);
    }
  }

  // Torreta genérica con cañones según config.look
  drawTurret(ctx) {
    const S = TD.CONFIG.grid.cell, L = this.def.look || {};
    const col = L.color || '#777';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const n = L.barrels || 0;
    const len = (L.barrelLen || 0.3) * S * (1 - this.recoil * 0.15);
    const w = (L.barrelW || 0.1) * S;
    ctx.fillStyle = '#2d3136';
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * w * 1.25;
      ctx.fillRect(0, off - w / 2, len, w);
    }
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, S * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = TD.U.shade(col, -0.4); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = TD.U.shade(col, 0.3);
    ctx.beginPath(); ctx.arc(-S * 0.05, -S * 0.05, S * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
};

// =====================================================================
// Comportamientos por tipo de torre
// =====================================================================
TD.BEHAVIORS = {
  // Fusilero / Ametralladora
  bullet: {
    update(t, dt) {
      t.cooldown -= dt;
      const n = t.perk && t.perk.multiTarget ? t.perk.multiTarget : 1;
      const targets = t.findTargets(n);
      if (!targets.length) return;
      t.aimAt(targets[0], dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      for (const e of targets) {
        let dmg = t.damage, color = '#fff6a0', size = 2.5;
        if (t.perk && t.perk.everyN && (t.shots + 1) % t.perk.everyN === 0) { dmg *= t.perk.mult; color = '#ffb300'; size = 4; }
        t.shoot('bullet', e, { damage: dmg, color, size });
      }
      TD.Audio.play(t.id === 'ametralladora' ? 'mg' : 'shot');
    }
  },

  // Escopeta: perdigones en abanico
  shotgun: {
    update(t, dt) {
      t.cooldown -= dt;
      const e = t.findTarget();
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      const n = t.s.pellets, spread = t.s.spread;
      const m = t.muzzle();
      for (let i = 0; i < n; i++) {
        const a = t.angle + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
        t.game.projectiles.push(new TD.Projectile(t.game, 'pellet', {
          x: m.x, y: m.y, angle: a, speed: t.projSpeed, damage: t.damage, filter: t.filter, source: t,
          range: t.range * 1.2, color: t.perk ? '#ff8a3c' : '#ffe9b0', size: 2.2, burn: t.perk ? t.perk.burn : null
        }));
      }
      t.recoil = 1; t.shots++;
      t.game.fx.flash(m.x, m.y, '#ffd27f', 7);
      TD.Audio.play('shotgun');
    }
  },

  // Lanzagranadas: granada en arco con daño en área
  splash: {
    update(t, dt) {
      t.cooldown -= dt;
      const e = t.findTarget();
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      // Apunta un poco por delante del enemigo
      const lead = e.flying ? e.game.map.airPointAt(e.dist + e.baseSpeed * e.slowMul * 0.35) : e.game.map.pointAt(e.dist + e.baseSpeed * e.slowMul * 0.35);
      t.shoot('grenade', null, {
        tx: lead.x, ty: lead.y, splash: t.s.splash * TD.CONFIG.grid.cell, color: '#ffb347',
        cluster: t.perk ? t.perk.cluster : 0
      });
    }
  },

  // Lanzallamas: daño continuo en cono + napalm
  flame: {
    update(t, dt) {
      t.cooldown -= dt;
      t.napalmCd = (t.napalmCd || 0) - dt;
      const e = t.findTarget();
      t.firing = !!e;
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      const R = t.range, cone = t.s.cone;
      for (const o of t.game.enemies) {
        if (!TD.canHit(o, t.filter)) continue;
        const d = TD.U.dist(o.x, o.y, t.x, t.y);
        if (d > R + o.radius) continue;
        const a = Math.atan2(o.y - t.y, o.x - t.x);
        if (Math.abs(TD.U.angleDiff(t.angle, a)) > cone / 2 + 0.15) continue;
        o.takeDamage(t.damage, t, false);
        if (o.alive) o.burn(t.s.burnDps, t.s.burnTime, t);
      }
      const m = t.muzzle();
      for (let i = 0; i < 2; i++) {
        const a = t.angle + TD.U.rand(-cone / 2, cone / 2), s = TD.U.rand(0.6, 1) * R * 2.2;
        t.game.fx.add({ type: 'part', x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: Math.random() > 0.5 ? '#ff6a1f' : '#ffc23a', life: 0.35, size: 5 });
      }
      if (t.perk && t.napalmCd <= 0) {
        t.napalmCd = t.perk.napalm.every;
        t.game.puddles.push(new TD.Puddle(t.game, e.x, e.y, { dps: t.perk.napalm.dps, duration: t.perk.napalm.duration, source: t, radius: 20 }));
      }
      TD.Audio.play('flame');
    }
  },

  // Mortero: gran alcance, obús en parábola
  mortar: {
    update(t, dt) {
      t.cooldown -= dt;
      const S = TD.CONFIG.grid.cell;
      const e = t.findTarget(undefined, t.s.minRange * S);
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      const shells = t.perk ? t.perk.shells : 1;
      for (let i = 0; i < shells; i++) {
        const lead = e.game.map.pointAt(e.dist + e.baseSpeed * e.slowMul * t.s.flight * 0.9 + (i - (shells - 1) / 2) * S * 0.7);
        t.shoot('shell', null, { tx: lead.x, ty: lead.y, flight: t.s.flight + i * 0.12, splash: t.s.splash * S, color: '#ff9a3c' });
      }
      t.game.fx.flash(t.x, t.y, '#fff0c0', 10);
      TD.Audio.play('boom');
    }
  },

  // Tanque: cañonazo perforante con pequeña área
  cannon: {
    update(t, dt) {
      t.cooldown -= dt;
      const e = t.findTarget();
      if (t.pending && t.pending.time > 0) {
        t.pending.time -= dt;
        if (t.pending.time <= 0 && e) t.shoot('cannon', e, { splash: t.s.splash * TD.CONFIG.grid.cell, color: '#ffb347', size: 5 });
      }
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      t.shoot('cannon', e, { splash: t.s.splash * TD.CONFIG.grid.cell, color: '#ffb347', size: 5 });
      if (t.perk && t.perk.double) t.pending = { time: 0.18 };
      const m = t.muzzle();
      t.game.fx.flash(m.x, m.y, '#ffd27f', 10);
      TD.Audio.play('boom');
    }
  },

  // Minador: coloca minas en el camino cercano
  minelayer: {
    update(t, dt) {
      t.cooldown -= dt;
      t.mines = t.mines.filter(m => m.alive);
      if (t.cooldown > 0 || t.mines.length >= t.s.maxMines) return;
      if (!t.pathSpots) {
        t.pathSpots = [];
        const map = t.game.map;
        for (let d = 0; d < map.length; d += 8) {
          const p = map.pointAt(d);
          if (TD.U.dist(p.x, p.y, t.x, t.y) <= t.range) t.pathSpots.push(p);
        }
      }
      if (!t.pathSpots.length) return;
      t.cooldown = 1 / t.rate;
      const p = TD.U.pick(t.pathSpots);
      const mine = new TD.Mine(t.game, p.x + TD.U.rand(-8, 8), p.y + TD.U.rand(-8, 8), {
        damage: t.damage, radius: t.s.splash * TD.CONFIG.grid.cell, source: t, cluster: t.perk ? t.perk.cluster : 1
      });
      t.mines.push(mine);
      t.game.mines.push(mine);
      t.game.fx.beam(t.x, t.y, mine.x, mine.y, 'rgba(255,220,150,0.5)', 1, 0.2);
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#6b5030'; ctx.fillRect(t.x - S * 0.24, t.y - S * 0.12, S * 0.48, S * 0.26);
      ctx.fillStyle = '#3b3b3b';
      ctx.beginPath(); ctx.arc(t.x - S * 0.14, t.y + S * 0.16, 4, 0, Math.PI * 2); ctx.arc(t.x + S * 0.14, t.y + S * 0.16, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(t.x, t.y - S * 0.18, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(t.mines.length + '/' + t.s.maxMines, t.x, t.y + 4);
    }
  },

  // Antiaérea: misiles teledirigidos
  missile: {
    update(t, dt) {
      t.cooldown -= dt;
      const salvo = t.perk ? t.perk.salvo : 1;
      const targets = t.findTargets(salvo);
      if (!targets.length) return;
      t.aimAt(targets[0], dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      for (let i = 0; i < salvo; i++) {
        const e = targets[i % targets.length];
        t.shoot('missile', e, { angle: t.angle + TD.U.rand(-0.6, 0.6), maxSpeed: t.projSpeed, splash: t.s.splash * TD.CONFIG.grid.cell, color: '#9fd0ff' });
      }
      TD.Audio.play('missile');
    }
  },

  // Flak: explosión instantánea en el aire
  flak: {
    update(t, dt) {
      t.cooldown -= dt;
      const e = t.findTarget();
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      const r = t.s.splash * TD.CONFIG.grid.cell * (t.perk ? t.perk.splashMul : 1);
      const ox = TD.U.rand(-6, 6), oy = TD.U.rand(-6, 6);
      TD.explode(t.game, e.x + ox, e.y + oy, r * 0.6, t.damage, t.filter, t, false, 'rgba(255,200,120,0.8)');
      if (t.perk) t.game.fx.particles(e.x, e.y, 6, '#cfd8e6', r * 3, 0.3, 2);
      t.game.fx.beam(t.muzzle().x, t.muzzle().y, e.x, e.y, 'rgba(255,255,200,0.4)', 1, 0.05);
      t.recoil = 1;
      TD.Audio.play('shot');
    }
  },

  // Red de captura: derriba voladores
  net: {
    update(t, dt) {
      t.cooldown -= dt;
      // Prioriza voladores que aún no están derribados
      const list = t.findTargets(0).filter(e => e.groundedTimer <= 0);
      const e = list[0];
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      e.takeDamage(t.damage, t, false);
      e.groundIt(t.s.groundTime, t.perk ? t.perk.shock : 0);
      const m = t.muzzle();
      t.game.fx.beam(m.x, m.y, e.x, e.y, 'rgba(240,240,240,0.9)', 2, 0.15);
      t.game.fx.ring(e.x, e.y, e.radius + 6, '#ffffff', 0.3);
      t.recoil = 1;
      TD.Audio.play('shot');
    }
  },

  // Láser: rayo continuo que atraviesa en línea
  laser: {
    update(t, dt) {
      const e = t.findTarget();
      t.beam = null;
      if (!e) return;
      t.aimAt(e);
      const m = t.muzzle();
      const R = t.range;
      const ex = t.x + Math.cos(t.angle) * R, ey = t.y + Math.sin(t.angle) * R;
      t.beam = { x1: m.x, y1: m.y, x2: ex, y2: ey, bounces: [] };
      const dps = t.damage * t.rate;
      // Daña a todos los enemigos cerca de la línea
      for (const o of t.game.enemies) {
        if (!TD.canHit(o, t.filter)) continue;
        const dx = ex - m.x, dy = ey - m.y, len2 = dx * dx + dy * dy;
        const k = TD.U.clamp(((o.x - m.x) * dx + (o.y - m.y) * dy) / len2, 0, 1);
        const px = m.x + dx * k, py = m.y + dy * k;
        if (TD.U.dist2(o.x, o.y, px, py) < (o.radius + 5) * (o.radius + 5)) o.takeDamage(dps * dt, t, false);
      }
      if (t.perk) {
        let from = e;
        const hit = new Set([e]);
        for (let i = 0; i < t.perk.bounces; i++) {
          let best = null, bd = Infinity;
          for (const o of t.game.enemies) {
            if (hit.has(o) || !TD.canHit(o, t.filter) || !o.visibleTo(t.detect)) continue;
            const d = TD.U.dist2(o.x, o.y, from.x, from.y);
            if (d < bd && d < 110 * 110) { bd = d; best = o; }
          }
          if (!best) break;
          best.takeDamage(dps * 0.6 * dt, t, false);
          t.beam.bounces.push({ x1: from.x, y1: from.y, x2: best.x, y2: best.y });
          hit.add(best); from = best;
        }
      }
      TD.Audio.play('laser');
    },
    draw(t, ctx) {
      t.drawTurret(ctx);
      if (!t.beam) return;
      const w = 3 + Math.sin(t.anim * 30) * 1.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,80,160,0.45)'; ctx.lineWidth = w + 5;
      ctx.beginPath(); ctx.moveTo(t.beam.x1, t.beam.y1); ctx.lineTo(t.beam.x2, t.beam.y2); ctx.stroke();
      ctx.strokeStyle = '#ffd0ea'; ctx.lineWidth = w * 0.6;
      ctx.beginPath(); ctx.moveTo(t.beam.x1, t.beam.y1); ctx.lineTo(t.beam.x2, t.beam.y2); ctx.stroke();
      for (const b of t.beam.bounces) {
        ctx.strokeStyle = 'rgba(255,80,160,0.7)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
    }
  },

  // Tesla: rayo en cadena
  chain: {
    update(t, dt) {
      t.cooldown -= dt;
      if (t.cooldown > 0) return;
      const e = t.findTarget();
      if (!e) return;
      t.cooldown = 1 / t.rate;
      const S = TD.CONFIG.grid.cell;
      const pts = [{ x: t.x, y: t.y - S * 0.2 }];
      const hit = new Set();
      let cur = e, dmg = t.damage;
      for (let i = 0; i < t.s.chain && cur; i++) {
        hit.add(cur);
        pts.push({ x: cur.x, y: cur.y });
        cur.takeDamage(dmg, t, false);
        if (t.perk && cur.alive) cur.stun(t.perk.stun);
        dmg *= 0.9;
        let best = null, bd = Infinity;
        const R = t.s.chainRange * S;
        for (const o of t.game.enemies) {
          if (hit.has(o) || !TD.canHit(o, t.filter) || !o.visibleTo(t.detect)) continue;
          const d = TD.U.dist2(o.x, o.y, cur.x, cur.y);
          if (d < R * R && d < bd) { bd = d; best = o; }
        }
        cur = best;
      }
      t.game.fx.bolt(pts, '#8fa8ff', 0.18);
      TD.Audio.play('zap');
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#3a3f55'; ctx.fillRect(t.x - S * 0.1, t.y - S * 0.2, S * 0.2, S * 0.4);
      ctx.strokeStyle = '#c08a3a'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(t.x, t.y + S * 0.12 - i * S * 0.1, S * 0.16, S * 0.05, 0, 0, Math.PI * 2); ctx.stroke(); }
      const glow = 0.6 + 0.4 * Math.sin(t.anim * 8);
      ctx.fillStyle = 'rgba(143,168,255,' + glow + ')';
      ctx.shadowColor = '#8fa8ff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(t.x, t.y - S * 0.24, S * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  },

  // Francotirador: impacto instantáneo, perforante
  sniper: {
    update(t, dt) {
      t.cooldown -= dt;
      const e = t.findTarget();
      if (!e) return;
      t.aimAt(e, dt);
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.rate;
      const m = t.muzzle();
      t.game.fx.beam(m.x, m.y, e.x, e.y, 'rgba(255,255,255,0.85)', 1.5, 0.1);
      t.game.fx.flash(e.x, e.y, '#ffffff', 8);
      t.recoil = 1; t.shots++;
      if (t.perk && !e.boss && Math.random() < t.perk.instakill) {
        t.game.fx.text(e.x, e.y - 18, '¡LETAL!', '#ff4f4f', 13);
        e.takeDamage(e.hp + 1, t, true);
      } else {
        e.takeDamage(t.damage, t, true);
      }
      TD.Audio.play('sniper');
    }
  },

  // Radar: aura de detección y alcance (se aplica en game.computeBuffs)
  radar: {
    update(t, dt) {
      if (!t.perk) return;
      t.pulseCd = (t.pulseCd === undefined ? t.perk.pulseEvery : t.pulseCd) - dt;
      if (t.pulseCd <= 0) {
        t.pulseCd = t.perk.pulseEvery;
        t.game.revealTimer = Math.max(t.game.revealTimer, t.perk.pulseTime);
        t.game.fx.ring(t.x, t.y, 400, '#2fe3cf', 1.0);
        t.game.fx.text(t.x, t.y - 26, '¡BARRIDO!', '#2fe3cf', 13);
      }
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#44505a'; ctx.fillRect(t.x - 3, t.y - 2, 6, S * 0.22);
      ctx.save(); ctx.translate(t.x, t.y - 2); ctx.rotate(t.anim * 1.5);
      ctx.fillStyle = '#d8e4ea';
      ctx.beginPath(); ctx.ellipse(0, 0, S * 0.26, S * 0.12, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#2fb3a3'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2fe3cf'; ctx.beginPath(); ctx.arc(0, -S * 0.1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  // Dron explorador: drones que orbitan y disparan
  drone: {
    update(t, dt) {
      const R = t.range * 0.62;
      const dR = t.s.droneRange * TD.CONFIG.grid.cell;
      t.drones.forEach((d, i) => {
        d.a += dt * 1.1;
        d.x = t.x + Math.cos(d.a) * R;
        d.y = t.y + Math.sin(d.a) * R * 0.85;
        d.cd -= dt;
        const e = t.findTargets(1, dR, d.x, d.y)[0];
        if (!e) return;
        d.angle = Math.atan2(e.y - d.y, e.x - d.x);
        if (d.cd > 0) return;
        d.cd = 1 / t.rate;
        t.game.projectiles.push(new TD.Projectile(t.game, 'bullet', {
          x: d.x, y: d.y, target: e, speed: 520, damage: t.damage, filter: t.filter, source: t, color: '#7fffe0', size: 2.2
        }));
        TD.Audio.play('shot');
      });
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#244'; ctx.beginPath(); ctx.arc(t.x, t.y, S * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7fffe0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(t.x - 7, t.y); ctx.lineTo(t.x + 7, t.y); ctx.moveTo(t.x, t.y - 7); ctx.lineTo(t.x, t.y + 7); ctx.stroke();
    },
    // Los drones se dibujan por encima de todo (los llama el juego)
    drawTop(t, ctx) {
      for (const d of t.drones) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(d.x + 4, d.y + 10, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle || 0);
        ctx.fillStyle = '#3c9c8f'; ctx.fillRect(-6, -4, 12, 8);
        ctx.strokeStyle = 'rgba(220,255,250,0.7)'; ctx.lineWidth = 1;
        for (const [ox, oy] of [[-7, -6], [7, -6], [-7, 6], [7, 6]]) {
          ctx.beginPath(); ctx.ellipse(ox, oy, 4, 1.5, t.anim * 30, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#ff4f4f'; ctx.fillRect(4, -1, 2, 2);
        ctx.restore();
      }
    }
  },

  // Criogenizador: pulso que ralentiza en área
  slow: {
    update(t, dt) {
      t.cooldown -= dt;
      if (t.cooldown > 0) return;
      const R = t.range;
      let any = false;
      for (const e of t.game.enemies) {
        if (!TD.canHit(e, t.filter)) continue;
        if (TD.U.dist2(e.x, e.y, t.x, t.y) > (R + e.radius) * (R + e.radius)) continue;
        any = true;
        e.takeDamage(t.damage, t, false);
        if (!e.alive) continue;
        e.applySlow(t.s.slow, t.s.slowTime);
        if (t.perk && Math.random() < t.perk.freezeChance) e.freeze(t.perk.freezeTime);
      }
      if (!any) return;
      t.cooldown = 1 / t.rate;
      t.pulse = 1;
      t.game.fx.ring(t.x, t.y, R, 'rgba(160,220,255,0.9)', 0.45);
      TD.Audio.play('freeze');
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(Math.sin(t.anim) * 0.2);
      ctx.fillStyle = '#bfe9ff'; ctx.strokeStyle = '#4fb6e8'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, r = i % 2 ? S * 0.14 : S * 0.28;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, S * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  },

  // Tienda de mando: aura de daño y cadencia (en game.computeBuffs)
  command: {
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#6b6a3a';
      ctx.beginPath(); ctx.moveTo(t.x - S * 0.3, t.y + S * 0.2); ctx.lineTo(t.x, t.y - S * 0.2); ctx.lineTo(t.x + S * 0.3, t.y + S * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3a20'; ctx.beginPath(); ctx.moveTo(t.x - 5, t.y + S * 0.2); ctx.lineTo(t.x, t.y + 2); ctx.lineTo(t.x + 5, t.y + S * 0.2); ctx.fill();
      ctx.fillStyle = '#ddd'; ctx.fillRect(t.x + S * 0.12, t.y - S * 0.36, 2, S * 0.3);
      ctx.fillStyle = '#e04f4f';
      ctx.beginPath(); ctx.moveTo(t.x + S * 0.12 + 2, t.y - S * 0.36); ctx.lineTo(t.x + S * 0.3 + Math.sin(t.anim * 4) * 2, t.y - S * 0.3); ctx.lineTo(t.x + S * 0.12 + 2, t.y - S * 0.24); ctx.fill();
    }
  },

  // Granja: produce al final de cada oleada (game.onWaveComplete)
  farm: {
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#b5452f'; ctx.fillRect(t.x - S * 0.22, t.y - S * 0.08, S * 0.44, S * 0.3);
      ctx.fillStyle = '#7a2a1f';
      ctx.beginPath(); ctx.moveTo(t.x - S * 0.28, t.y - S * 0.06); ctx.lineTo(t.x, t.y - S * 0.3); ctx.lineTo(t.x + S * 0.28, t.y - S * 0.06); ctx.fill();
      ctx.fillStyle = '#f4ecd8'; ctx.fillRect(t.x - 5, t.y + 2, 10, S * 0.2 - 2);
      ctx.strokeStyle = '#f4ecd8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(t.x - 5, t.y + 2); ctx.lineTo(t.x + 5, t.y + S * 0.2); ctx.moveTo(t.x + 5, t.y + 2); ctx.lineTo(t.x - 5, t.y + S * 0.2); ctx.stroke();
      if (t.fertile) { ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✨', t.x + S * 0.3, t.y - S * 0.25); }
    }
  },

  // Mina de plata: genera monedas durante la oleada
  silvermine: {
    update(t, dt) {
      if (!t.game.waveActive) return;
      t.cooldown -= dt;
      if (t.cooldown > 0) return;
      t.cooldown = 1 / t.s.rate;
      const value = Math.round(t.s.income * (t.perk ? t.perk.incomeMul : 1) * t.game.economyMul);
      t.game.coins.push({ x: t.x + TD.U.rand(-18, 18), y: t.y + TD.U.rand(-18, 18), value, life: 7, t: 0, source: t });
    },
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#3a2f28';
      ctx.beginPath(); ctx.arc(t.x, t.y + S * 0.08, S * 0.24, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6b4a2b'; ctx.fillRect(t.x - S * 0.28, t.y + S * 0.06, S * 0.56, 4);
      ctx.fillRect(t.x - S * 0.26, t.y - S * 0.18, 4, S * 0.26); ctx.fillRect(t.x + S * 0.22, t.y - S * 0.18, 4, S * 0.26);
      ctx.fillStyle = '#c8d0da';
      ctx.beginPath(); ctx.arc(t.x - 4, t.y + S * 0.02, 3, 0, Math.PI * 2); ctx.arc(t.x + 5, t.y - 2, 3, 0, Math.PI * 2); ctx.fill();
    }
  },

  // Banco: intereses al final de cada oleada
  bank: {
    draw(t, ctx) {
      const S = TD.CONFIG.grid.cell;
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(t.x - S * 0.26, t.y - S * 0.1, S * 0.52, S * 0.32);
      ctx.fillStyle = '#c9b88a';
      ctx.beginPath(); ctx.moveTo(t.x - S * 0.3, t.y - S * 0.1); ctx.lineTo(t.x, t.y - S * 0.3); ctx.lineTo(t.x + S * 0.3, t.y - S * 0.1); ctx.fill();
      ctx.fillStyle = '#8a7a5a';
      for (let i = -2; i <= 2; i++) ctx.fillRect(t.x + i * S * 0.1 - 2, t.y - S * 0.06, 4, S * 0.24);
      ctx.fillStyle = '#2e7d32'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', t.x, t.y - S * 0.14);
    }
  }
};
