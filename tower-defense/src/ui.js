/* =====================================================================
 * ui.js — Interfaz de la partida: barra superior, tienda de torres,
 * panel de la torre seleccionada (mejorar / vender / objetivo),
 * habilidades, pistas, pausa, atajos de teclado y pantalla final.
 * ===================================================================== */
window.TD = window.TD || {};

// Notificación flotante (logros, misiones, avisos)
TD.toast = function (icon, title, text) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<div class="t-ico">' + icon + '</div><div><div class="t-title"></div><div class="t-text"></div></div>';
  el.querySelector('.t-title').textContent = title;
  el.querySelector('.t-text').textContent = text || '';
  box.appendChild(el);
  TD.Audio.play('star');
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
};

// Iconos de a qué puede atacar una torre
TD.targetIcons = function (def) {
  let s = '';
  if (def.targets.ground) s += '🦶';
  if (def.targets.air) s += '🪽';
  if (def.detect) s += '👁️';
  return s || '—';
};

TD.GameUI = class {
  constructor(app) {
    this.app = app;
    this.game = null;
    this.tab = 'todas';
    this.$ = (id) => document.getElementById(id);
    this.visibleCards = [];

    this.$('btn-wave').addEventListener('click', () => { if (this.game) this.game.startNextWave(); this.onHud(); });
    this.$('btn-speed').addEventListener('click', () => { if (this.game) { this.game.cycleSpeed(); TD.Audio.play('click'); } });
    this.$('btn-pause').addEventListener('click', () => this.togglePause());
    this.$('pause').addEventListener('click', (ev) => {
      const act = ev.target.dataset && ev.target.dataset.act;
      if (!act) return;
      TD.Audio.play('click');
      if (act === 'resume') this.togglePause(false);
      else if (act === 'restart') this.app.startGame(this.game.opts);
      else if (act === 'help') this.app.menus.showInstructions(true);
      else if (act === 'sound') { this.app.menus.toggleSound(); this.updatePauseSound(); }
      else if (act === 'quit') this.app.showMenu();
    });
    document.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  // Conecta la interfaz a una partida nueva
  attach(game) {
    this.game = game;
    this.$('pause').hidden = true;
    this.$('results').hidden = true;
    this.$('info').hidden = true;
    this.lastInfoKey = null;
    this.buildTabs();
    this.buildShop();
    this.buildAbilities();
    this.onSelection();
    this.onHud();
    const ch = game.challenge;
    const title = ch ? ch.icon + ' ' + ch.name : game.mapDef.icon + ' ' + game.mapDef.name;
    const sub = game.mode === 'endless' ? '♾️ Modo Infinito · ' + game.diff.name : game.diff.icon + ' ' + game.diff.name + ' · 20 oleadas';
    this.banner(title, sub);
  }

  // ------------------------------------------------------------------
  // Tienda
  // ------------------------------------------------------------------
  buildTabs() {
    const box = this.$('shop-tabs');
    box.innerHTML = '';
    const tabs = [['todas', '★ Todas']].concat(Object.keys(TD.CONFIG.categories).map(k => [k, TD.CONFIG.categories[k].icon]));
    for (const [id, label] of tabs) {
      const b = document.createElement('button');
      b.className = 'tab' + (this.tab === id ? ' active' : '');
      b.textContent = label;
      b.title = id === 'todas' ? 'Todas las torres' : TD.CONFIG.categories[id].name;
      b.addEventListener('click', () => { this.tab = id; TD.Audio.play('click'); this.buildTabs(); this.buildShop(); });
      box.appendChild(b);
    }
  }

  buildShop() {
    const g = this.game, box = this.$('shop-cards');
    box.innerHTML = '';
    this.visibleCards = [];
    const ids = Object.keys(TD.CONFIG.towers).filter(id => this.tab === 'todas' || TD.CONFIG.towers[id].category === this.tab);
    // Primero las disponibles, luego las bloqueadas
    ids.sort((a, b) => (g.towerAllowed(b) ? 1 : 0) - (g.towerAllowed(a) ? 1 : 0));
    ids.forEach((id) => {
      const def = TD.CONFIG.towers[id];
      const allowed = g.towerAllowed(id);
      const unlocked = TD.Profile.isTowerUnlocked(id);
      const b = document.createElement('button');
      b.className = 'tcard' + (allowed ? '' : ' locked');
      b.style.setProperty('--cat', TD.CONFIG.categories[def.category].color);
      b.dataset.id = id;
      const hk = allowed && this.visibleCards.length < 9 ? (this.visibleCards.push(id), this.visibleCards.length) : '';
      const priceText = !unlocked ? '🔒 Nv ' + def.unlock : !allowed ? '🚫' : '💵 ' + g.price(id);
      b.innerHTML =
        '<div class="ico">' + def.icon + '</div>' +
        '<div><div class="name"></div><div class="desc"></div></div>' +
        '<div><div class="price">' + priceText + '</div><div class="tg" title="🦶 tierra · 🪽 aire · 👁️ camuflados">' + TD.targetIcons(def) + '</div>' +
        (hk ? '<div class="hk">[' + hk + ']</div>' : '') + '</div>';
      b.querySelector('.name').textContent = def.name;
      b.querySelector('.desc').textContent = def.desc;
      b.addEventListener('click', () => {
        if (!allowed) { TD.Audio.play('error'); this.hint(unlocked ? 'Esta torre no está permitida en este desafío' : 'Se desbloquea al llegar al nivel ' + def.unlock + ' de perfil', 2000); return; }
        g.selectPlacing(id);
      });
      box.appendChild(b);
    });
    this.refreshShop();
  }

  refreshShop() {
    const g = this.game;
    for (const el of this.$('shop-cards').children) {
      const id = el.dataset.id;
      el.classList.toggle('poor', g.towerAllowed(id) && g.money < g.price(id));
      el.classList.toggle('selected', g.placing === id);
    }
  }

  // ------------------------------------------------------------------
  // Habilidades y héroe
  // ------------------------------------------------------------------
  buildAbilities() {
    const g = this.game, box = this.$('abilities');
    box.innerHTML = '';
    if (g.heroId) {
      const h = TD.CONFIG.heroes[g.heroId];
      const b = document.createElement('button');
      b.className = 'ability hero'; b.id = 'ab-hero';
      b.innerHTML = '<span class="key">H</span><span class="ico">' + h.icon + '</span><span class="name"></span>';
      b.querySelector('.name').textContent = h.name.split(' ').pop();
      b.addEventListener('click', () => this.heroAction());
      box.appendChild(b);
    }
    for (const id in TD.CONFIG.abilities) {
      const a = TD.CONFIG.abilities[id];
      const b = document.createElement('button');
      b.className = 'ability';
      b.id = 'ab-' + id;
      b.title = a.name + ': ' + a.desc + (TD.Profile.isAbilityUnlocked(id) ? '' : ' (nivel ' + a.unlock + ')');
      b.innerHTML = '<span class="key">' + a.key + '</span>' + (a.cost ? '<span class="cost">' + a.cost + '</span>' : '') +
        '<span class="ico">' + a.icon + '</span><span class="name">' + a.name.split(' ')[0] + '</span><div class="cd"></div><div class="cdtext"></div>';
      if (!TD.Profile.isAbilityUnlocked(id)) b.classList.add('locked');
      b.addEventListener('click', () => this.useAbility(id));
      box.appendChild(b);
    }
  }

  useAbility(id) {
    const g = this.game;
    if (!TD.Profile.isAbilityUnlocked(id)) { TD.Audio.play('error'); this.hint('Se desbloquea al nivel ' + TD.CONFIG.abilities[id].unlock + ' de perfil', 2000); return; }
    g.useAbility(id);
  }

  heroAction() {
    const g = this.game;
    if (!g.hero) { g.placing = null; g.mode2 = 'heroPlace'; }
    else if (g.selected === g.hero) { g.mode2 = 'heroMove'; g.selected = null; }
    else { g.placing = null; g.mode2 = null; g.selected = g.hero; }
    TD.Audio.play('click');
    this.onSelection();
  }

  // ------------------------------------------------------------------
  // Panel de la torre seleccionada
  // ------------------------------------------------------------------
  onSelection() {
    const g = this.game;
    if (!g) return;
    this.refreshShop();
    for (const id in TD.CONFIG.abilities) {
      const el = this.$('ab-' + id);
      if (el) el.classList.toggle('active', g.mode2 === id);
    }
    const hb = this.$('ab-hero');
    if (hb) hb.classList.toggle('active', g.mode2 === 'heroPlace' || g.mode2 === 'heroMove' || g.selected === g.hero && !!g.hero);
    this.renderInfo();
    this.updateHint();
  }

  renderInfo() {
    const g = this.game, t = g.selected, box = this.$('info');
    if (!t) { box.hidden = true; this.lastInfoKey = null; return; }
    box.hidden = false;
    const def = t.def;
    const key = (t.isHero ? 'h' : t.id) + t.c + ',' + t.r + ':' + t.level + ':' + t.targeting;
    this.lastInfoKey = key;
    const stars = '★'.repeat(t.level) + '☆'.repeat(5 - t.level);
    let html = '<div class="info-head"><div class="ico">' + def.icon + '</div><div><div class="name"></div>' +
      '<div class="lvl">' + stars + ' <small style="color:var(--muted)">' + TD.targetIcons(def) + '</small></div></div>' +
      '<button class="info-close" data-act="close" title="Cerrar (Esc)">✕</button></div>';

    // Estadísticas actual → siguiente
    const keys = ['damage', 'range', 'rate', 'splash', 'pellets', 'chain', 'slow', 'slowTime', 'burnDps', 'income', 'interest', 'cap', 'maxMines', 'groundTime', 'rangeBonus', 'dmgBonus', 'rateBonus'];
    const next = !t.maxed && !t.isHero ? TD.U.towerStats(def, t.level + 1) : (t.isHero && !t.maxed ? TD.U.towerStats(def, t.level + 1) : null);
    html += '<table class="stats">';
    for (const k of keys) {
      if (t.s[k] === undefined) continue;
      if (k === 'rate' && ['farm', 'bank'].includes(def.behavior)) continue;
      let cur = TD.U.statValue(k, t.s[k]);
      let nx = next && next[k] !== undefined && Math.abs(next[k] - t.s[k]) > 1e-6 ? ' <span class="up">→ ' + TD.U.statValue(k, next[k]) + '</span>' : '';
      html += '<tr><td>' + (TD.U.statLabel[k] || k) + '</td><td>' + cur + nx + '</td></tr>';
    }
    html += '</table>';

    if (t.isHero) {
      const h = t.heroDef, nx = t.nextXp();
      html += '<div class="perk">' + h.desc + '</div>';
      html += '<div class="info-meta">XP: ' + Math.floor(t.xp) + (nx ? ' / ' + nx : ' (máximo)') + ' · Bajas: ' + t.kills + '</div>';
      html += '<div class="info-actions" style="margin-top:8px"><button class="btn btn-gold" data-act="move">📍 Mover héroe</button></div>';
    } else {
      if (def.perk) html += '<div class="perk' + (t.perk ? '' : ' off') + '">' + (t.perk ? '✨ ' : '🔒 Nivel 5: ') + '<b>' + def.perk.name + '</b> — ' + def.perk.desc + '</div>';
      const attacks = !['radar', 'command', 'farm', 'silvermine', 'bank', 'minelayer', 'slow'].includes(def.behavior);
      if (attacks) {
        html += '<div class="targeting">';
        for (const m in TD.TARGETING) html += '<button class="btn btn-small' + (t.targeting === m ? ' active' : '') + '" data-target="' + m + '">' + TD.TARGETING[m].icon + ' ' + TD.TARGETING[m].name + '</button>';
        html += '</div>';
      }
      const up = t.upgradeCost();
      html += '<div class="info-actions">' +
        (t.maxed ? '<button class="btn" disabled>★ Nivel máximo</button>' :
          '<button class="btn btn-green" id="btn-upgrade" data-act="upgrade">⬆ Mejorar 💵' + up + ' <small>[U]</small></button>') +
        '<button class="btn btn-danger" data-act="sell">Vender +' + t.sellValue() + ' <small>[V]</small></button></div>';
      const eco = ['farm', 'silvermine', 'bank'].includes(def.behavior);
      html += '<div class="info-meta">' + (eco ? 'Ha producido: 💵 ' + t.earned : 'Bajas: ' + t.kills + ' · Daño: ' + TD.U.fmt(t.damageDealt)) +
        (t.nearLava ? ' · 🔥 junto a lava' : '') + (t.fertile && def.behavior === 'farm' ? ' · ✨ tierra fértil' : '') + '</div>';
    }
    box.innerHTML = html;
    box.querySelector('.name').textContent = def.name;
    box.onclick = (ev) => {
      const el = ev.target.closest('button');
      if (!el) return;
      if (el.dataset.target) { t.targeting = el.dataset.target; TD.Audio.play('click'); this.renderInfo(); return; }
      const act = el.dataset.act;
      if (act === 'close') { g.selected = null; this.onSelection(); }
      else if (act === 'upgrade') { g.upgrade(t); this.renderInfo(); this.refreshShop(); }
      else if (act === 'sell') { g.sell(t); this.onSelection(); }
      else if (act === 'move') { g.mode2 = 'heroMove'; g.selected = null; this.onSelection(); }
    };
    this.refreshInfoButtons();
  }

  refreshInfoButtons() {
    const t = this.game.selected, b = this.$('btn-upgrade');
    if (t && b) b.disabled = this.game.money < t.upgradeCost();
  }

  // ------------------------------------------------------------------
  // Barra superior (se llama ~10 veces por segundo)
  // ------------------------------------------------------------------
  onHud() {
    const g = this.game;
    if (!g) return;
    this.$('hud-lives').textContent = g.lives;
    this.$('hud-money').textContent = TD.U.fmt(g.money);
    this.$('hud-wave').textContent = g.mode === 'endless' ? g.waveNum : g.waveNum + '/' + g.totalWaves;
    this.$('hud-score').textContent = TD.U.fmt(Math.round(g.stats.score * g.diff.scoreMul));
    this.$('btn-speed').textContent = 'x' + g.speed;
    this.$('btn-speed').classList.toggle('active', g.speed > 1);

    const bw = this.$('btn-wave');
    if (g.waveNum >= g.totalWaves) { bw.disabled = true; bw.textContent = '🏁 Última oleada'; bw.classList.remove('early'); }
    else if (g.waveActive && g.earlyUsed) {
      bw.disabled = true; bw.classList.remove('early');
      bw.textContent = '⏳ Acaba con la oleada';
    } else if (g.waveActive) {
      const C = TD.CONFIG.earlyCallBonus;
      bw.disabled = false; bw.classList.add('early');
      bw.textContent = '⏩ Adelantar +' + Math.round(C.base + C.perWave * (g.waveNum + 1)) + ' 💵';
    } else if (g.countdown !== null) {
      bw.disabled = false; bw.classList.add('early');
      bw.textContent = '▶ Oleada ' + (g.waveNum + 1) + ' en ' + Math.ceil(g.countdown) + 's';
    } else { bw.disabled = false; bw.classList.remove('early'); bw.textContent = '▶ Iniciar oleada ' + (g.waveNum + 1); }

    // Vista previa de la próxima oleada
    const nextNum = g.waveNum + 1;
    const key = 'w' + nextNum;
    if (this.previewKey !== key) {
      this.previewKey = key;
      const nb = this.$('hud-next');
      const list = g.wavePreview(nextNum);
      if (!list.length) nb.innerHTML = '<span>¡Última oleada en curso!</span>';
      else {
        nb.innerHTML = '<span>Próxima:</span>' + list.map(({ type, count }) => {
          const e = TD.CONFIG.enemies[type];
          const tags = (e.air ? '🪽' : '') + (e.hidden ? '👁️' : '') + (e.armor ? '🛡️' : '');
          return '<span class="nw' + (e.boss ? ' boss' : '') + '" title="' + e.name + ': ' + e.desc + '">' + e.icon + '×' + count + (tags ? ' ' + tags : '') + '</span>';
        }).join('');
      }
    }

    this.refreshShop();
    this.refreshInfoButtons();
    // Recargas de habilidades
    for (const id in TD.CONFIG.abilities) {
      const el = this.$('ab-' + id);
      if (!el) continue;
      const a = TD.CONFIG.abilities[id];
      const cd = g.abilityCd[id], total = a.cooldown * g.cooldownMul;
      el.querySelector('.cd').style.height = cd > 0 ? (cd / total * 100) + '%' : '0';
      el.querySelector('.cdtext').textContent = cd > 0 ? Math.ceil(cd) : '';
      el.classList.toggle('ready', g.abilityReady(id));
    }
    const hb = this.$('ab-hero');
    if (hb && g.hero) hb.querySelector('.name').textContent = 'Nv ' + g.hero.level;
    // Si la torre seleccionada subió de nivel por otra vía, refresca su panel
    if (g.selected && g.selected.isHero && this.lastInfoKey && !this.lastInfoKey.endsWith(':' + g.selected.level + ':' + g.selected.targeting)) this.renderInfo();
  }

  flashMoney() {
    const el = this.$('hud-money-box');
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    this.hint('💵 No tienes suficiente plata', 1500);
  }

  onLeak() {
    const el = this.$('hud-lives').parentElement;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  onWaveStart(num) {
    const g = this.game;
    if (num > 1 || g.mode !== 'endless') this.banner('Oleada ' + num + (g.mode === 'endless' ? '' : ' / ' + g.totalWaves), '');
    this.updateHint();
  }

  onWaveComplete(num, total) {
    this.banner('✔ Oleada ' + num + ' superada', '+' + total + ' 💵');
    this.updateHint();
  }

  banner(title, sub) {
    const b = this.$('banner');
    b.querySelector('.banner-title').textContent = title;
    b.querySelector('.banner-sub').textContent = sub || '';
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => b.classList.remove('show'), 2200);
  }

  // Pista contextual en la parte inferior del mapa
  hint(text, ms) {
    const h = this.$('hint');
    h.textContent = text;
    h.classList.toggle('show', !!text);
    clearTimeout(this.hintT);
    if (ms) this.hintT = setTimeout(() => this.updateHint(), ms);
  }

  updateHint() {
    const g = this.game;
    if (!g) return;
    let t = '';
    const m = g.mode2;
    if (m === 'heroPlace') t = '🦸 Coloca a tu héroe GRATIS en una casilla libre';
    else if (m === 'heroMove') t = '📍 Elige la nueva posición del héroe · Esc para cancelar';
    else if (m === 'bombardeo') t = '✈️ Haz clic cerca del camino para bombardear · Esc cancela';
    else if (m === 'barricada' || m === 'mina') t = '🧱 Haz clic en una casilla del camino · Esc cancela';
    else if (g.placing) t = 'Clic en una casilla libre para construir · Esc o clic derecho cancela';
    else if (g.waveNum === 0 && g.towers.length === 0) t = '👉 Elige una torre en el panel derecho y colócala junto al camino';
    else if (g.waveNum === 0) t = '▶ Cuando estés listo pulsa «Iniciar oleada» (tecla N)';
    this.hint(t);
  }

  // ------------------------------------------------------------------
  // Pausa y teclado
  // ------------------------------------------------------------------
  togglePause(force) {
    const g = this.game;
    if (!g || g.over) return;
    g.paused = force === undefined ? !g.paused : force;
    this.$('pause').hidden = !g.paused;
    this.$('btn-pause').textContent = g.paused ? '▶' : '❚❚';
    this.updatePauseSound();
  }

  updatePauseSound() {
    const b = this.$('pause').querySelector('[data-act=sound]');
    b.textContent = TD.Audio.enabled ? '🔊 Sonido: sí' : '🔇 Sonido: no';
  }

  onKey(ev) {
    const g = this.game;
    if (!g || !this.app.inGame() || g.over) return;
    if (ev.target && ev.target.tagName === 'INPUT') return;
    const k = ev.key.toLowerCase();
    if (k === ' ' || k === 'p') { ev.preventDefault(); this.togglePause(); return; }
    if (k === 'escape') {
      if (g.paused) this.togglePause(false);
      else if (g.placing || g.selected || (g.mode2 && g.mode2 !== 'heroPlace')) g.cancel();
      else this.togglePause(true);
      return;
    }
    if (g.paused) return;
    if (k === 'f') g.cycleSpeed();
    else if (k === 'n') { g.startNextWave(); this.onHud(); }
    else if (k === 'u' && g.selected) { g.upgrade(g.selected); this.renderInfo(); }
    else if (k === 'v' && g.selected && !g.selected.isHero) { g.sell(g.selected); this.onSelection(); }
    else if (k === 'h' && g.heroId) this.heroAction();
    else if (k >= '1' && k <= '9') { const id = this.visibleCards[+k - 1]; if (id) g.selectPlacing(id); }
    else {
      for (const id in TD.CONFIG.abilities) if (TD.CONFIG.abilities[id].key.toLowerCase() === k) this.useAbility(id);
    }
  }

  // ------------------------------------------------------------------
  // Pantalla final
  // ------------------------------------------------------------------
  onGameOver(res) {
    setTimeout(() => this.showResults(res), 1200);
  }

  showResults(res) {
    const box = this.$('results');
    const g = this.game;
    const P = TD.Profile;
    const x = res.xpRes;
    const endless = res.mode === 'endless';
    const title = endless ? '♾️ Fin de la resistencia' : res.win ? '🏆 ¡VICTORIA!' : '💀 DERROTA';
    const sub = res.mapName + ' · ' + res.diffName + (endless ? ' · ' + res.waves + ' oleadas' : res.win ? '' : ' · Llegaste a la oleada ' + (res.waves + 1));
    const rank = P.rankFor(x.after.level);
    const need = P.xpToNext(x.after.level);
    const s = res.stats;
    const mapIdx = TD.CONFIG.maps.indexOf(g.mapDef);
    const hasNext = res.win && res.mode === 'campaign' && mapIdx < TD.CONFIG.maps.length - 1 && P.isMapUnlocked(mapIdx + 1);

    box.innerHTML =
      '<div class="panel results">' +
      '<h2 class="' + (res.win || endless ? 'win' : 'lose') + '">' + title + '</h2>' +
      '<div class="res-sub"></div>' +
      (endless ? '' : '<div class="res-stars"><span>⭐</span><span>⭐</span><span>⭐</span></div>') +
      '<div class="res-score">🏆 ' + res.score.toLocaleString('es') + (res.newRecord && res.score > 0 ? '<span class="record">¡NUEVO RÉCORD!</span>' : '') + '</div>' +
      '<div class="res-grid">' +
      '<div><b>' + s.kills + '</b>Zombis eliminados</div>' +
      '<div><b>' + res.lives + '/' + res.maxLives + '</b>Vidas</div>' +
      '<div><b>' + TD.U.fmt(s.moneyEarned) + '</b>Plata ganada</div>' +
      '<div><b>' + s.bestStreak + '</b>Mejor racha</div>' +
      '</div>' +
      '<div class="res-xp"><div class="row"><div class="rank-badge" style="background:' + rank.color + '">' + rank.badge + '</div>' +
      '<div style="flex:1"><b>+' + res.xp + ' XP</b> · Nivel <b id="res-lvl">' + x.before.level + '</b> · <span style="color:' + rank.color + '">' + rank.name + '</span>' +
      '<div class="xpbar"><i id="res-xpbar" style="width:' + (x.before.xp / P.xpToNext(x.before.level) * 100) + '%"></i></div>' +
      '<div class="xptext">' + Math.floor(x.after.xp) + ' / ' + need + ' XP' + (res.medals ? ' · +' + res.medals + ' 🏅 medallas' : '') + '</div></div></div>' +
      (x.levels ? '<div class="levelup">⬆ ¡Subiste al nivel ' + x.after.level + '!' + (x.rankUp ? ' 🎖️ Nuevo rango: ' + x.after.rank : '') + '</div>' : '') +
      (x.unlocks.length ? '<div class="unlocks">🔓 Desbloqueado: ' + x.unlocks.join(' · ') + '</div>' : '') +
      '</div>' +
      '<div class="res-actions">' +
      '<button class="btn btn-gold" data-act="retry">🔄 Reintentar</button>' +
      (hasNext ? '<button class="btn btn-green" data-act="next">➡ Siguiente mapa</button>' : '') +
      '<button class="btn" data-act="menu">🏠 Menú</button>' +
      '</div></div>';
    box.querySelector('.res-sub').textContent = sub;
    box.hidden = false;

    // Animación de estrellas y barra de XP
    const stars = box.querySelectorAll('.res-stars span');
    for (let i = 0; i < res.stars; i++) setTimeout(() => { stars[i].classList.add('on'); TD.Audio.play('star'); }, 500 + i * 450);
    const bar = box.querySelector('#res-xpbar');
    setTimeout(() => {
      if (x.levels) {
        bar.style.width = '100%';
        setTimeout(() => {
          bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = '';
          box.querySelector('#res-lvl').textContent = x.after.level;
          bar.style.width = (x.after.xp / need * 100) + '%';
          TD.Audio.play('levelup');
        }, 700);
      } else bar.style.width = (x.after.xp / need * 100) + '%';
    }, 600 + res.stars * 450);

    box.onclick = (ev) => {
      const act = ev.target.dataset && ev.target.dataset.act;
      if (!act) return;
      TD.Audio.play('click');
      if (act === 'retry') this.app.startGame(g.opts);
      else if (act === 'next') this.app.startGame(Object.assign({}, g.opts, { mapIndex: mapIdx + 1 }));
      else if (act === 'menu') this.app.showMenu();
    };
  }
};
