/* =====================================================================
 * menus.js — Fondo animado, menú principal, selección de mapa /
 * dificultad / héroe, desafíos, instrucciones, perfil con rangos,
 * cuartel, logros y ajustes.
 * ===================================================================== */
window.TD = window.TD || {};

// ---------------------------------------------------------------------
// Escena de fondo: noche, luna, colinas y una horda caminando hacia
// una fortaleza que dispara. Se pausa durante la partida.
// ---------------------------------------------------------------------
TD.BgScene = class {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.running = false;
    this.stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.6, s: Math.random() * 1.6 + 0.3, p: Math.random() * 6 }));
    this.zombies = Array.from({ length: 14 }, () => this.newZombie(Math.random() * window.innerWidth * 0.75));
    this.bats = Array.from({ length: 5 }, () => ({ x: Math.random(), y: 0.15 + Math.random() * 0.25, v: 0.02 + Math.random() * 0.03, p: Math.random() * 6 }));
    this.tracers = [];
    this.fireCd = 0;
    // Brasas que suben, relámpagos ocasionales y explosiones lejanas
    this.embers = Array.from({ length: 45 }, () => this.newEmber(true));
    this.lightning = 0; this.lightningCd = 4 + Math.random() * 5; this.bolt = null;
    this.blasts = [];
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  newZombie(x) {
    return { x: x === undefined ? -40 : x, speed: 18 + Math.random() * 22, size: 0.8 + Math.random() * 0.5, p: Math.random() * 6, hp: 1, dead: 0, lane: Math.random() };
  }
  newEmber(anywhere) {
    return { x: Math.random(), y: anywhere ? Math.random() : 1.05, v: 0.02 + Math.random() * 0.05, s: 1 + Math.random() * 2.2,
             p: Math.random() * 6, hue: Math.random() < 0.7 ? '255,140,60' : '255,210,120' };
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.cv.style.display = 'block';
    let last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.update(dt); this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.cv.style.display = 'none'; }

  update(dt) {
    this.t += dt;
    const groundY = this.h * 0.82, fortX = this.w - 110;
    for (const z of this.zombies) {
      if (z.dead) { z.dead += dt; if (z.dead > 1.2) Object.assign(z, this.newZombie()); continue; }
      z.x += z.speed * dt; z.p += dt * 6;
      if (z.x > fortX - 40) Object.assign(z, this.newZombie());
    }
    for (const b of this.bats) { b.x += b.v * dt; b.p += dt * 14; if (b.x > 1.1) { b.x = -0.1; b.y = 0.12 + Math.random() * 0.3; } }
    // La fortaleza dispara al zombi más cercano
    this.fireCd -= dt;
    if (this.fireCd <= 0) {
      this.fireCd = 0.35 + Math.random() * 0.4;
      const alive = this.zombies.filter(z => !z.dead && z.x > this.w * 0.35).sort((a, b) => b.x - a.x);
      if (alive.length) {
        const z = alive[0];
        const zy = groundY - 8 + z.lane * 26;
        this.tracers.push({ x1: fortX - 10, y1: groundY - 120, x2: z.x, y2: zy - 14 * z.size, t: 0 });
        if (Math.random() < 0.45) { z.dead = 0.01; this.blasts.push({ x: z.x, y: zy - 14 * z.size, t: 0 }); }
      }
    }
    for (const e of this.embers) {
      e.y -= e.v * dt; e.p += dt * 2;
      if (e.y < -0.05) Object.assign(e, this.newEmber(false));
    }
    // Relámpago
    this.lightningCd -= dt;
    if (this.lightningCd <= 0) {
      this.lightningCd = 5 + Math.random() * 7;
      this.lightning = 1;
      const x0 = Math.random() * this.w * 0.7;
      const pts = [{ x: x0, y: 0 }];
      let x = x0, y = 0;
      while (y < this.h * 0.6) { y += 20 + Math.random() * 30; x += (Math.random() - 0.5) * 60; pts.push({ x, y }); }
      this.bolt = pts;
    }
    if (this.lightning > 0) this.lightning = Math.max(0, this.lightning - dt * 2.5);
    // Explosiones cuando cae un zombi
    for (const b of this.blasts) b.t += dt;
    this.blasts = this.blasts.filter(b => b.t < 0.5);
    for (const tr of this.tracers) tr.t += dt;
    this.tracers = this.tracers.filter(tr => tr.t < 0.12);
  }

  draw() {
    const c = this.ctx, w = this.w, h = this.h, t = this.t;
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#07080f'); sky.addColorStop(0.55, '#1c1230'); sky.addColorStop(0.8, '#4a1a1a'); sky.addColorStop(1, '#120a0a');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    for (const s of this.stars) {
      c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + s.p));
      c.fillStyle = '#fff'; c.fillRect(s.x * w, s.y * h, s.s, s.s);
    }
    c.globalAlpha = 1;
    // Relámpago
    if (this.lightning > 0 && this.bolt) {
      c.fillStyle = 'rgba(200,190,255,' + this.lightning * 0.18 + ')'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(230,225,255,' + this.lightning + ')'; c.lineWidth = 2.5;
      c.beginPath(); this.bolt.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    }
    // Luna
    const mx = w * 0.78, my = h * 0.2, mr = Math.min(w, h) * 0.07;
    const glow = c.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
    glow.addColorStop(0, 'rgba(255,220,180,0.35)'); glow.addColorStop(1, 'rgba(255,220,180,0)');
    c.fillStyle = glow; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.fillStyle = '#f4e3c4'; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(180,150,120,0.35)';
    c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, Math.PI * 2); c.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.15, 0, Math.PI * 2); c.fill();
    // Murciélagos
    c.fillStyle = '#0a0a12';
    for (const b of this.bats) {
      const x = b.x * w, y = b.y * h + Math.sin(b.p * 0.2) * 10, f = Math.sin(b.p) * 6;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y - 4 - f); c.lineTo(x - 4, y + 1); c.lineTo(x, y + 3); c.lineTo(x + 4, y + 1); c.lineTo(x + 10, y - 4 - f); c.closePath(); c.fill();
    }
    // Colinas
    const hill = (yBase, amp, freq, color, off) => {
      c.fillStyle = color; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) c.lineTo(x, yBase + Math.sin(x * freq + off) * amp + Math.sin(x * freq * 2.3 + off) * amp * 0.4);
      c.lineTo(w, h); c.closePath(); c.fill();
    };
    hill(h * 0.66, 26, 0.004, '#170d1e', 1);
    hill(h * 0.74, 18, 0.007, '#110914', 3);
    // Árboles muertos
    c.strokeStyle = '#0b060c'; c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const x = (i * 0.17 + 0.03) * w, y = h * 0.74 + Math.sin(x * 0.007 + 3) * 18;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 50); c.moveTo(x, y - 30); c.lineTo(x - 16, y - 46); c.moveTo(x, y - 38); c.lineTo(x + 14, y - 56); c.stroke();
    }
    // Suelo
    const groundY = h * 0.82;
    c.fillStyle = '#0a0608'; c.fillRect(0, groundY, w, h - groundY);
    // Fortaleza
    const fx = w - 110;
    c.fillStyle = '#0d0a10';
    c.fillRect(fx - 30, groundY - 110, 120, 110);
    c.fillRect(fx - 40, groundY - 150, 50, 150);
    for (let i = 0; i < 5; i++) c.fillRect(fx - 40 + i * 11, groundY - 162, 7, 12);
    c.fillStyle = 'rgba(255,190,90,' + (0.6 + 0.3 * Math.sin(t * 3)) + ')';
    c.fillRect(fx - 22, groundY - 128, 10, 14); c.fillRect(fx + 30, groundY - 80, 10, 14);
    // Reflector que barre el cielo desde la torre
    const la = -Math.PI / 2 - 0.5 + Math.sin(t * 0.5) * 0.7;
    const lx = fx - 15, ly = groundY - 150;
    const beam = c.createLinearGradient(lx, ly, lx + Math.cos(la) * h, ly + Math.sin(la) * h);
    beam.addColorStop(0, 'rgba(255,240,200,0.28)'); beam.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = beam;
    c.beginPath(); c.moveTo(lx, ly);
    c.lineTo(lx + Math.cos(la - 0.09) * h * 1.2, ly + Math.sin(la - 0.09) * h * 1.2);
    c.lineTo(lx + Math.cos(la + 0.09) * h * 1.2, ly + Math.sin(la + 0.09) * h * 1.2);
    c.closePath(); c.fill();
    // Balas trazadoras
    c.strokeStyle = 'rgba(255,230,150,0.9)'; c.lineWidth = 2;
    for (const tr of this.tracers) { c.beginPath(); c.moveTo(tr.x1, tr.y1); c.lineTo(tr.x2, tr.y2); c.stroke(); }
    // Zombis (siluetas con ojos rojos)
    for (const z of this.zombies) {
      const s = z.size, y = groundY - 8 + z.lane * 26;
      c.save(); c.translate(z.x, y);
      if (z.dead) { c.globalAlpha = Math.max(0, 1 - z.dead); c.rotate(-Math.min(1.4, z.dead * 3)); }
      c.fillStyle = '#2b1826';
      c.strokeStyle = 'rgba(255,90,90,0.25)'; c.lineWidth = 1;
      const bob = Math.sin(z.p) * 2;
      c.fillRect(-5 * s, -30 * s + bob, 10 * s, 20 * s);             // cuerpo
      c.beginPath(); c.arc(0, -35 * s + bob, 6 * s, 0, Math.PI * 2); c.fill(); // cabeza
      c.fillRect(4 * s, -27 * s + bob, 14 * s, 3.5 * s);              // brazos
      c.fillRect(4 * s, -22 * s + bob, 12 * s, 3.5 * s);
      c.save(); c.translate(0, -10 * s); c.rotate(Math.sin(z.p) * 0.4); c.fillRect(-3 * s, 0, 4 * s, 12 * s); c.restore();
      c.save(); c.translate(0, -10 * s); c.rotate(-Math.sin(z.p) * 0.4); c.fillRect(0, 0, 4 * s, 12 * s); c.restore();
      c.fillStyle = '#ff2a2a'; c.fillRect(2 * s, -37 * s + bob, 2 * s, 2 * s);
      c.restore();
    }
    // Explosiones
    for (const b of this.blasts) {
      const k = 1 - b.t / 0.5;
      c.fillStyle = 'rgba(255,170,60,' + k * 0.8 + ')';
      c.beginPath(); c.arc(b.x, b.y, 6 + (1 - k) * 22, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,240,200,' + k + ')';
      c.beginPath(); c.arc(b.x, b.y, 4 + (1 - k) * 8, 0, Math.PI * 2); c.fill();
    }
    // Brasas
    for (const e of this.embers) {
      c.fillStyle = 'rgba(' + e.hue + ',' + (0.35 + 0.35 * Math.sin(e.p * 3)) + ')';
      c.beginPath(); c.arc(e.x * w + Math.sin(e.p) * 12, e.y * h, e.s, 0, Math.PI * 2); c.fill();
    }
    // Niebla
    const fog = c.createLinearGradient(0, h * 0.7, 0, h);
    fog.addColorStop(0, 'rgba(120,60,90,0)'); fog.addColorStop(1, 'rgba(80,40,60,0.35)');
    c.fillStyle = fog; c.fillRect(0, h * 0.7, w, h * 0.3);
    // Viñeta
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
};

// ---------------------------------------------------------------------
// Menús
// ---------------------------------------------------------------------
TD.Menus = class {
  constructor(app) {
    this.app = app;
    this.sel = { mode: 'campaign', map: 0, diff: 'guardian', hero: 'rex' };
  }

  $(id) { return document.getElementById(id); }

  show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const map = {
      menu: () => this.renderMenu(), select: () => this.renderSelect(), challenges: () => this.renderChallenges(),
      instructions: () => this.renderInstructions(), profile: () => this.renderProfile(), barracks: () => this.renderBarracks(),
      achievements: () => this.renderAchievements(), settings: () => this.renderSettings()
    };
    if (map[name]) map[name]();
    this.$('screen-' + name).classList.add('active');
    this.$('screen-' + name).scrollTop = 0;
  }

  head(title) {
    return '<div class="page-head"><button class="btn btn-back" data-go="menu">← Volver</button><h2>' + title + '</h2><div class="spacer"></div>' +
      '<div class="chips"><span class="chip">🏅 ' + TD.Profile.data.medals + '</span><span class="chip">Nv ' + TD.Profile.data.level + '</span></div></div>';
  }

  // Enlaza botones data-go="pantalla" dentro de un contenedor
  bindGo(root) {
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { TD.Audio.play('click'); this.show(b.dataset.go); }));
  }

  rankBadge(level, big) {
    const r = TD.Profile.rankFor(level);
    return '<div class="rank-badge' + (big ? ' big' : '') + '" style="background:linear-gradient(' + TD.U.shade(r.color, 0.25) + ',' + r.color + ')">' + r.badge + '</div>';
  }

  modal(html, onBind) {
    const m = this.$('modal');
    m.innerHTML = '<div class="panel">' + html + '</div>';
    m.hidden = false;
    const close = () => { m.hidden = true; m.innerHTML = ''; };
    m.onclick = (ev) => { if (ev.target === m || (ev.target.dataset && ev.target.dataset.act === 'close')) { TD.Audio.play('click'); close(); } };
    if (onBind) onBind(m, close);
    return close;
  }

  toggleSound() {
    TD.Audio.enabled = !TD.Audio.enabled;
    TD.Profile.data.settings.sound = TD.Audio.enabled;
    TD.Profile.save();
  }

  // Muestra el resultado de subir de nivel tras recompensas
  showLevelUp(res) {
    if (!res || !res.levels) return;
    const r = TD.Profile.rank();
    TD.Audio.play('levelup');
    TD.toast('⬆', '¡Nivel ' + res.after.level + '!', (res.rankUp ? 'Nuevo rango: ' + r.name + '. ' : '') + (res.unlocks.length ? 'Desbloqueado: ' + res.unlocks.join(', ') : ''));
  }

  // ------------------------------------------------------------------
  // Menú principal
  // ------------------------------------------------------------------
  renderMenu() {
    const P = TD.Profile, d = P.data, C = TD.CONFIG;
    P.ensureMissions();
    const r = P.rank(), need = P.xpToNext(d.level);
    const dailyOk = P.dailyAvailable(), di = P.dailyIndex();
    const endlessOk = P.isEndlessUnlocked();

    let days = '';
    C.dailyRewards.forEach((rw, i) => {
      const cls = i < di || (!dailyOk && i < d.daily.streak) ? ' done' : (dailyOk && i === di ? ' today' : '');
      days += '<div class="daily-day' + cls + '">Día ' + (i + 1) + '<b>' + rw.medals + '🏅</b>' + rw.xp + 'xp</div>';
    });

    let missions = '';
    d.missions.list.forEach((m, i) => {
      const def = C.missions.find(x => x.id === m.id);
      if (!def) return;
      const pct = Math.min(100, m.progress / def.goal * 100);
      missions += '<div class="mission"><div class="mission-body">' + def.text +
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="mission-reward">' + TD.U.fmt(m.progress) + ' / ' + TD.U.fmt(def.goal) + ' · Premio: ' + def.xp + ' XP + ' + def.medals + ' 🏅</div></div>' +
        (m.claimed ? '<span class="chip">✔</span>' : '<button class="btn btn-small ' + (m.done ? 'btn-gold glow' : '') + '" data-claim="' + i + '"' + (m.done ? '' : ' disabled') + '>Reclamar</button>') +
        '</div>';
    });

    const el = this.$('screen-menu');
    el.innerHTML =
      '<div class="menu">' +
      '<div>' +
      '<div class="logo">REINO EN GUARDIA<small>APOCALIPSIS</small></div>' +
      '<div class="card profile-card" data-go="profile" title="Ver perfil">' + this.rankBadge(d.level) +
      '<div class="profile-info"><div class="profile-name"></div>' +
      '<div class="profile-rank" style="color:' + r.color + '">' + r.name + ' · Nivel ' + d.level + '</div>' +
      '<div class="xpbar"><i style="width:' + (d.xp / need * 100) + '%"></i></div>' +
      '<div class="xptext">' + Math.floor(d.xp) + ' / ' + need + ' XP para el nivel ' + (d.level + 1) + '</div></div>' +
      '<div class="chips" style="flex-direction:column"><span class="chip">🏅 ' + d.medals + '</span><span class="chip">⭐ ' + P.totalStars() + '</span></div></div>' +
      '<div class="menu-buttons">' +
      '<button class="btn btn-green btn-play" data-act="play">▶ JUGAR</button>' +
      '<button class="btn" data-act="endless">♾️ Infinito' + (endlessOk ? '' : '<span class="lock">🔒 gana 1 partida</span>') + '</button>' +
      '<button class="btn" data-go="challenges">🏆 Desafíos</button>' +
      '<button class="btn" data-go="barracks">🎖️ Cuartel</button>' +
      '<button class="btn" data-go="achievements">🏅 Logros <span class="lock">' + Object.keys(d.achievements).length + '/' + C.achievements.length + '</span></button>' +
      '<button class="btn" data-go="instructions">📖 Instrucciones</button>' +
      '<button class="btn" data-go="settings">⚙️ Ajustes</button>' +
      '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:16px">' +
      '<div class="card' + (dailyOk ? ' glow' : '') + '"><h3>🎁 Recompensa diaria</h3><div class="daily-days">' + days + '</div>' +
      (dailyOk ? '<button class="btn btn-gold" style="width:100%" data-act="daily">¡Reclamar día ' + (di + 1) + '!</button>' : '<div class="xptext">Vuelve mañana para seguir tu racha 🔥 (' + d.daily.streak + ' días)</div>') + '</div>' +
      '<div class="card"><h3>📋 Misiones del día</h3>' + missions + '<div class="xptext" style="margin-top:6px">Se renuevan cada día.</div></div>' +
      '</div></div>';
    el.querySelector('.profile-name').textContent = d.name;
    this.bindGo(el);
    el.querySelector('[data-act=play]').addEventListener('click', () => { TD.Audio.play('click'); this.sel.mode = 'campaign'; this.show('select'); });
    el.querySelector('[data-act=endless]').addEventListener('click', () => {
      if (!endlessOk) { TD.Audio.play('error'); TD.toast('🔒', 'Modo Infinito bloqueado', 'Gana una partida para desbloquearlo.'); return; }
      TD.Audio.play('click'); this.sel.mode = 'endless'; this.show('select');
    });
    const dailyBtn = el.querySelector('[data-act=daily]');
    if (dailyBtn) dailyBtn.addEventListener('click', () => {
      const res = P.claimDaily();
      if (!res) return;
      TD.Audio.play('coin');
      this.modal('<div class="big-ico">🎁</div><h2>¡Día ' + res.day + ' reclamado!</h2><p>+' + res.reward.xp + ' XP · +' + res.reward.medals + ' 🏅</p>' +
        '<button class="btn btn-gold" data-act="close">¡Genial!</button>');
      this.showLevelUp(res.res);
      this.renderMenu();
    });
    el.querySelectorAll('[data-claim]').forEach(b => b.addEventListener('click', () => {
      const res = P.claimMission(+b.dataset.claim);
      if (!res) return;
      TD.Audio.play('coin');
      TD.toast('📋', 'Misión reclamada', '+' + res.def.xp + ' XP · +' + res.def.medals + ' 🏅');
      this.showLevelUp(res.res);
      this.renderMenu();
    }));
  }

  // ------------------------------------------------------------------
  // Selección de mapa, dificultad y héroe
  // ------------------------------------------------------------------
  renderSelect() {
    const P = TD.Profile, C = TD.CONFIG, s = this.sel;
    const endless = s.mode === 'endless';
    if (!P.isMapUnlocked(s.map)) s.map = 0;
    if (!P.isHeroUnlocked(s.hero)) s.hero = 'rex';
    const el = this.$('screen-select');
    let html = '<div class="page">' + this.head(endless ? '♾️ Modo Infinito' : '▶ Campaña') +
      '<div class="section-title">1 · Elige el mapa</div><div class="maps">';
    C.maps.forEach((m, i) => {
      const unlocked = P.isMapUnlocked(i);
      let info = '';
      if (endless) info = '<div class="map-stars">Récord: <b style="color:var(--gold)">' + (P.data.endlessBest[m.id] || 0) + ' oleadas</b></div>';
      else {
        info = '<div class="map-stars">';
        for (const dId in C.difficulties) {
          const st = P.mapStars(m.id, dId);
          info += '<span>' + C.difficulties[dId].icon + ' <b>' + '★'.repeat(st) + '</b>' + '☆'.repeat(3 - st) + '</span>';
        }
        info += '</div>';
      }
      html += '<div class="card map-card' + (s.map === i ? ' selected' : '') + '" data-map="' + i + '">' +
        '<canvas width="480" height="288" data-prev="' + i + '"></canvas>' +
        '<h4>' + m.icon + ' ' + m.name + '</h4><p>' + m.desc + '</p>' + info +
        (unlocked ? '' : '<div class="locked-overlay"><div><big>🔒</big>Gana en ' + C.maps[i - 1].name + ' para desbloquear</div></div>') + '</div>';
    });
    html += '</div><div class="section-title">2 · Dificultad</div><div class="options-row">';
    for (const id in C.difficulties) {
      const d = C.difficulties[id];
      html += '<div class="card opt' + (s.diff === id ? ' selected' : '') + '" data-diff="' + id + '"><h4>' + d.icon + ' ' + d.name + '</h4>' +
        '<p>❤️ ' + d.lives + ' vidas · 💵 ' + d.money + ' de plata<br>Vida zombis ×' + d.hpMul + ' · Velocidad ×' + d.speedMul +
        '<br>Puntos ×' + d.scoreMul + ' · XP ×' + d.xpMul + ' · Medallas ×' + d.medalMul + '</p></div>';
    }
    html += '</div><div class="section-title">3 · Héroe</div><div class="options-row">';
    for (const id in C.heroes) {
      const h = C.heroes[id], ok = P.isHeroUnlocked(id);
      html += '<div class="card opt' + (s.hero === id ? ' selected' : '') + '" data-hero="' + id + '"><h4>' + h.icon + ' ' + h.name + '</h4><p>' + h.desc + '</p>' +
        (ok ? '' : '<div class="locked-overlay"><div><big>🔒</big>Nivel ' + h.unlock + '</div></div>') + '</div>';
    }
    html += '</div><div class="start-row"><button class="btn btn-green btn-big" data-act="start">⚔️ ¡A LA BATALLA!</button></div></div>';
    el.innerHTML = html;
    this.bindGo(el);

    el.querySelectorAll('canvas[data-prev]').forEach(cv => new TD.GameMap(C.maps[+cv.dataset.prev]).drawPreview(cv));
    el.querySelectorAll('[data-map]').forEach(b => b.addEventListener('click', () => {
      if (!P.isMapUnlocked(+b.dataset.map)) { TD.Audio.play('error'); return; }
      TD.Audio.play('click'); s.map = +b.dataset.map; this.renderSelect();
    }));
    el.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { TD.Audio.play('click'); s.diff = b.dataset.diff; this.renderSelect(); }));
    el.querySelectorAll('[data-hero]').forEach(b => b.addEventListener('click', () => {
      if (!P.isHeroUnlocked(b.dataset.hero)) { TD.Audio.play('error'); return; }
      TD.Audio.play('click'); s.hero = b.dataset.hero; this.renderSelect();
    }));
    el.querySelector('[data-act=start]').addEventListener('click', () => {
      TD.Audio.play('click');
      P.data.lastHero = s.hero; P.data.lastDiff = s.diff; P.save();
      this.app.startGame({ mapIndex: s.map, difficulty: s.diff, heroId: s.hero, mode: s.mode });
    });
  }

  // ------------------------------------------------------------------
  // Desafíos
  // ------------------------------------------------------------------
  renderChallenges() {
    const P = TD.Profile, C = TD.CONFIG;
    const el = this.$('screen-challenges');
    let html = '<div class="page">' + this.head('🏆 Desafíos') + '<div class="barracks">';
    for (const ch of C.challenges) {
      const ok = P.isChallengeUnlocked(ch), done = !!P.data.challengesDone[ch.id];
      const map = C.maps.find(m => m.id === ch.map);
      html += '<div class="card bk opt" style="cursor:default"><h4>' + ch.icon + ' ' + ch.name + (done ? ' ✅' : '') + '</h4>' +
        '<p>' + ch.desc + '<br>🗺️ ' + map.name + ' · ' + C.difficulties[ch.difficulty].icon + ' ' + C.difficulties[ch.difficulty].name +
        '<br>Premio: ' + ch.medals + ' 🏅' + (done ? ' (conseguido)' : '') + '</p>' +
        '<button class="btn ' + (done ? '' : 'btn-gold') + '" data-ch="' + ch.id + '"' + (ok ? '' : ' disabled') + '>' + (ok ? (done ? 'Repetir' : '⚔️ Aceptar reto') : '🔒 Nivel ' + ch.unlock) + '</button></div>';
    }
    html += '</div></div>';
    el.innerHTML = html;
    this.bindGo(el);
    el.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => {
      const ch = C.challenges.find(x => x.id === b.dataset.ch);
      TD.Audio.play('click');
      this.app.startGame({ mapIndex: C.maps.findIndex(m => m.id === ch.map), difficulty: ch.difficulty, heroId: P.data.lastHero || 'rex', mode: 'challenge', challenge: ch });
    }));
  }

  // ------------------------------------------------------------------
  // Instrucciones (también accesibles desde la pausa)
  // ------------------------------------------------------------------
  instructionsHTML(tab) {
    const C = TD.CONFIG;
    const tabs = [['jugar', '🎮 Cómo jugar'], ['controles', '⌨️ Controles'], ['zombis', '🧟 Zombis'], ['torres', '🗼 Torres'], ['progreso', '🎖️ Progreso']];
    let h = '<div class="help-tabs">' + tabs.map(([id, n]) => '<button class="btn btn-small' + (tab === id ? ' active' : '') + '" data-help="' + id + '">' + n + '</button>').join('') + '</div><div class="help-body">';
    if (tab === 'jugar') {
      h += '<h3>🎯 Objetivo</h3>Los zombis avanzan por el camino hacia tu fortaleza 🏰. Cada uno que llega te quita vidas ❤️. Sobrevive a las <b>20 oleadas</b> para ganar. Si tus vidas llegan a 0, pierdes.' +
        '<h3>🗼 Torres</h3>Elige una torre en el panel derecho y haz clic en una casilla libre (fuera del camino). Verás su alcance antes de colocarla. Haz clic en una torre construida para <b>mejorarla</b> (hasta nivel 5 ★) o <b>venderla</b> por el 70% de lo invertido. En el nivel 5 cada torre desbloquea una habilidad especial.' +
        '<h3>🦶🪽👁️ Tipos de ataque</h3>Cada torre muestra a qué puede atacar: <b>🦶 terrestres</b>, <b>🪽 voladores</b> y <b>👁️ camuflados</b>. Los camuflados solo los ven las torres de detección o las que están cerca de un <b>Radar</b>. Los <b>🛡️ blindados</b> restan daño a cada golpe: usa armas potentes o perforantes (Francotirador, Tanque).' +
        '<h3>💵 Plata</h3>Ganas plata al eliminar zombis y al terminar cada oleada. Las <b>Granjas</b>, <b>Minas de Plata</b> y <b>Bancos</b> generan más. ¡Pasa el ratón sobre las monedas de la Mina de Plata para recogerlas con +25%!' +
        '<h3>⏩ Ritmo de las oleadas</h3>Una oleada termina cuando eliminas a todos sus zombis. Entonces tienes <b>10 segundos</b> para prepararte antes de que llegue la siguiente (o pulsa <kbd>N</kbd> para empezarla ya y ganar plata extra). Mientras dura una oleada puedes <b>adelantar la siguiente una sola vez</b>. Usa <b>x1.5, x2 o x3</b> para acelerar el juego.' +
        '<h3>🦸 Héroe y habilidades</h3>Coloca tu héroe gratis al empezar; sube de nivel solo al eliminar zombis cerca. Las habilidades (✈️🧊📦🧱💣) se recargan con el tiempo.' +
        '<h3>🌙🌪️🌋 Eventos</h3>Cada mapa tiene su evento: noches que reducen el alcance, tormentas que ralentizan la cadencia y erupciones que aturden torres.';
    } else if (tab === 'controles') {
      h += '<h3>🖱️ Ratón / táctil</h3>Clic en una torre del panel → clic en el mapa para construir. Clic en una torre para ver sus opciones. Clic derecho o <kbd>Esc</kbd> para cancelar.' +
        '<h3>⌨️ Teclado</h3>' +
        '<kbd>1</kbd>–<kbd>9</kbd> elegir torre · <kbd>N</kbd> iniciar / adelantar oleada · <kbd>F</kbd> cambiar velocidad · <kbd>Espacio</kbd> pausa<br>' +
        '<kbd>U</kbd> mejorar · <kbd>V</kbd> vender · <kbd>H</kbd> héroe · <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd> habilidades · <kbd>Esc</kbd> cancelar';
    } else if (tab === 'zombis') {
      h += '<div class="bestiary">';
      for (const id in C.enemies) {
        const e = C.enemies[id];
        const tags = (e.air ? '🪽 Volador ' : '🦶 Terrestre ') + (e.hidden ? '👁️ Camuflado ' : '') + (e.armor ? '🛡️ Blindado ' : '') + (e.boss ? '👑 JEFE' : '');
        h += '<div class="beast"><canvas width="56" height="56" data-beast="' + id + '"></canvas><div><div class="n">' + e.icon + ' ' + e.name + '</div><div class="d">' + e.desc +
          '</div><div class="tags">' + tags + ' · ❤️' + e.hp + ' · 💵' + e.reward + '</div></div></div>';
      }
      h += '</div>';
    } else if (tab === 'torres') {
      for (const cat in C.categories) {
        const cc = C.categories[cat];
        h += '<h3>' + cc.icon + ' ' + cc.name + '</h3><div class="bestiary">';
        for (const id in C.towers) {
          const t = C.towers[id];
          if (t.category !== cat) continue;
          h += '<div class="beast"><div style="font-size:30px;width:44px;text-align:center">' + t.icon + '</div><div><div class="n">' + t.name + ' · 💵' + t.cost + '</div><div class="d">' + t.desc +
            '</div><div class="tags">' + TD.targetIcons(t) + (t.unlock > 1 ? ' · 🔒 Nv ' + t.unlock : '') + '</div><div class="d">★5: <b>' + t.perk.name + '</b> — ' + t.perk.desc + '</div></div></div>';
        }
        h += '</div>';
      }
    } else if (tab === 'progreso') {
      h += '<h3>⭐ Estrellas</h3>Al ganar consigues estrellas según las vidas que conserves: ⭐⭐⭐ si mantienes el ' + Math.round(C.stars.three * 100) + '% o más, ⭐⭐ con el ' + Math.round(C.stars.two * 100) + '%, ⭐ en cualquier otro caso.' +
        '<h3>🏆 Puntuación</h3>Sumas puntos por cada zombi y oleada. Al ganar se añaden bonos por vidas y plata restante. La dificultad multiplica el total.' +
        '<h3>📈 XP y rangos</h3>Cada partida te da XP según tu puntuación (¡aunque pierdas!). Al subir de nivel ascenderás de rango y desbloquearás torres, héroes, habilidades y desafíos:' +
        '<div class="ranks" style="margin-top:8px">' + C.ranks.map(r => '<div class="rank-row reached">' + this.rankBadge(r.level) + '<div><b>' + r.name + '</b><br><small>Nivel ' + r.level + '</small></div></div>').join('') + '</div>' +
        '<h3>🏅 Medallas</h3>Consíguelas con estrellas nuevas, logros, misiones, subidas de nivel y desafíos. Gástalas en el <b>Cuartel</b> en mejoras permanentes.' +
        '<h3>🎁 Cada día</h3>Reclama la recompensa diaria (¡la racha de 7 días da premios mayores!) y completa las 3 misiones del día.';
    }
    return h + '</div>';
  }

  // Dibuja las miniaturas de zombis del bestiario
  drawBeasts(root) {
    const fakeMap = { pointAt: () => ({ x: 28, y: 30, angle: 0 }), airPointAt: () => ({ x: 28, y: 32, angle: 0 }), air: { len: 1 }, length: 1 };
    const fakeGame = { map: fakeMap, revealTimer: 1, enemies: [], fx: null };
    root.querySelectorAll('canvas[data-beast]').forEach(cv => {
      const type = cv.dataset.beast;
      const e = new TD.Enemy(fakeGame, type, { hpMul: 1, speedMul: 1, wave: 1 });
      const ctx = cv.getContext('2d');
      const scale = Math.min(1, 16 / e.radius);
      ctx.translate(28, 30); ctx.scale(scale, scale); ctx.translate(-28, -30);
      e.drawHealthBar = () => {};
      e.phase = 1;
      e.draw(ctx);
    });
  }

  renderInstructions(tab) {
    tab = tab || 'jugar';
    const el = this.$('screen-instructions');
    el.innerHTML = '<div class="page">' + this.head('📖 Instrucciones') + '<div class="card">' + this.instructionsHTML(tab) + '</div></div>';
    this.bindGo(el);
    this.drawBeasts(el);
    el.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', () => { TD.Audio.play('click'); this.renderInstructions(b.dataset.help); }));
  }

  // Desde la pausa: instrucciones en ventana emergente
  showInstructions(fromGame) {
    if (!fromGame) return this.show('instructions');
    const render = (tab) => {
      this.modal('<div style="text-align:left;max-height:70vh;overflow:auto">' + this.instructionsHTML(tab) + '</div><div style="margin-top:12px"><button class="btn" data-act="close">Cerrar</button></div>', (m) => {
        m.querySelector('.panel').style.maxWidth = '860px';
        this.drawBeasts(m);
        m.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', () => render(b.dataset.help)));
      });
    };
    render('jugar');
  }

  // ------------------------------------------------------------------
  // Perfil
  // ------------------------------------------------------------------
  renderProfile() {
    const P = TD.Profile, d = P.data, C = TD.CONFIG, st = d.stats;
    const r = P.rank(), need = P.xpToNext(d.level);
    const nextRank = C.ranks.find(x => x.level > d.level);
    const el = this.$('screen-profile');
    const stat = (v, l) => '<div><b>' + TD.U.fmt(v || 0) + '</b>' + l + '</div>';
    el.innerHTML = '<div class="page">' + this.head('👤 Perfil') +
      '<div class="card" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:16px">' + this.rankBadge(d.level, true) +
      '<div style="flex:1;min-width:220px"><input class="name-input" maxlength="18" value="" aria-label="Nombre">' +
      '<div class="profile-rank" style="color:' + r.color + ';font-size:20px;margin-top:6px">' + r.name + ' · Nivel ' + d.level + '</div>' +
      '<div class="xpbar"><i style="width:' + (d.xp / need * 100) + '%"></i></div>' +
      '<div class="xptext">' + Math.floor(d.xp) + ' / ' + need + ' XP · XP total: ' + TD.U.fmt(d.totalXp) +
      (nextRank ? ' · Próximo rango: <b>' + nextRank.name + '</b> (nivel ' + nextRank.level + ')' : ' · ¡Rango máximo!') + '</div></div>' +
      '<div class="chips" style="flex-direction:column"><span class="chip">🏅 ' + d.medals + ' medallas</span><span class="chip">⭐ ' + P.totalStars() + ' estrellas</span></div></div>' +
      '<div class="card" style="margin-bottom:16px"><h3>📊 Estadísticas</h3><div class="stat-list">' +
      stat(st.games, 'Partidas') + stat(st.wins, 'Victorias') + stat(st.losses, 'Derrotas') + stat(st.kills, 'Zombis eliminados') +
      stat(st.killsAir, 'Voladores derribados') + stat(st.killsHidden, 'Camuflados eliminados') + stat(st.bossKills, 'Jefes derrotados') +
      stat(st.built, 'Torres construidas') + stat(st.maxed, 'Torres a nivel 5') + stat(st.moneyEarned, 'Plata ganada') +
      stat(st.waves, 'Oleadas superadas') + stat(st.bestStreak, 'Mejor racha') + '</div></div>' +
      '<div class="card"><h3>🎖️ Rangos</h3><div class="ranks">' +
      C.ranks.map(rk => '<div class="rank-row' + (d.level >= rk.level ? ' reached' : '') + (rk === r ? ' current' : '') + '">' + this.rankBadge(rk.level) +
        '<div><b>' + rk.name + '</b><br><small>Nivel ' + rk.level + '</small></div></div>').join('') + '</div></div></div>';
    this.bindGo(el);
    const input = el.querySelector('.name-input');
    input.value = d.name;
    input.addEventListener('change', () => { d.name = input.value.trim().slice(0, 18) || 'Comandante'; P.save(); });
  }

  // ------------------------------------------------------------------
  // Cuartel (mejoras permanentes)
  // ------------------------------------------------------------------
  renderBarracks() {
    const P = TD.Profile, C = TD.CONFIG;
    const el = this.$('screen-barracks');
    let html = '<div class="page">' + this.head('🎖️ Cuartel') +
      '<p style="color:var(--muted);margin-top:-8px">Gasta tus medallas 🏅 en mejoras permanentes para todas tus partidas.</p><div class="barracks">';
    for (const b of C.barracks) {
      const lvl = P.barracksLevel(b.id), maxed = lvl >= b.max, cost = b.costs[lvl];
      html += '<div class="card bk"><h4>' + b.icon + ' ' + b.name + '</h4><p>' + b.desc + '</p><div class="pips">' +
        Array.from({ length: b.max }, (_, i) => '<i class="' + (i < lvl ? 'on' : '') + '"></i>').join('') + '</div>' +
        (maxed ? '<button class="btn" disabled>★ Máximo</button>' : '<button class="btn btn-gold" data-buy="' + b.id + '"' + (P.data.medals < cost ? ' disabled' : '') + '>Mejorar · ' + cost + ' 🏅</button>') + '</div>';
    }
    el.innerHTML = html + '</div></div>';
    this.bindGo(el);
    el.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', () => {
      if (P.buyBarracks(btn.dataset.buy)) { TD.Audio.play('upgrade'); this.renderBarracks(); } else TD.Audio.play('error');
    }));
  }

  // ------------------------------------------------------------------
  // Logros
  // ------------------------------------------------------------------
  renderAchievements() {
    const P = TD.Profile, C = TD.CONFIG;
    const got = Object.keys(P.data.achievements).length;
    const el = this.$('screen-achievements');
    let html = '<div class="page">' + this.head('🏅 Logros · ' + got + '/' + C.achievements.length) + '<div class="ach-grid">';
    for (const a of C.achievements) {
      const ok = !!P.data.achievements[a.id];
      html += '<div class="ach' + (ok ? '' : ' locked') + '"><div class="ico">' + (ok ? a.icon : '🔒') + '</div><div><div class="n">' + a.name + '</div><div class="d">' + a.desc + '</div><div class="d">' + (ok ? '✅ Conseguido' : 'Premio: ' + a.medals + ' 🏅') + '</div></div></div>';
    }
    el.innerHTML = html + '</div></div>';
    this.bindGo(el);
  }

  // ------------------------------------------------------------------
  // Ajustes
  // ------------------------------------------------------------------
  renderSettings() {
    const P = TD.Profile, s = P.data.settings;
    const el = this.$('screen-settings');
    el.innerHTML = '<div class="page">' + this.head('⚙️ Ajustes') + '<div class="card">' +
      '<div class="settings-row"><span>🔊 Sonido</span><button class="btn" data-act="sound">' + (s.sound ? 'Activado' : 'Desactivado') + '</button></div>' +
      '<div class="settings-row"><span>🎚️ Volumen</span><input type="range" min="0" max="1" step="0.05" value="' + s.volume + '"></div>' +
      '<div class="settings-row"><span>🗑️ Borrar todo el progreso</span><button class="btn btn-danger" data-act="reset">Borrar</button></div>' +
      '</div></div>';
    this.bindGo(el);
    el.querySelector('[data-act=sound]').addEventListener('click', () => { this.toggleSound(); TD.Audio.play('click'); this.renderSettings(); });
    el.querySelector('input[type=range]').addEventListener('input', (ev) => {
      s.volume = +ev.target.value; TD.Audio.setVolume(s.volume); P.save(); TD.Audio.play('coin');
    });
    el.querySelector('[data-act=reset]').addEventListener('click', () => {
      this.modal('<div class="big-ico">⚠️</div><h2>¿Borrar todo?</h2><p>Perderás nivel, medallas, estrellas y logros. No se puede deshacer.</p>' +
        '<div class="res-actions"><button class="btn" data-act="close">Cancelar</button><button class="btn btn-danger" data-act="confirm">Sí, borrar</button></div>', (m, close) => {
        m.querySelector('[data-act=confirm]').addEventListener('click', () => { P.reset(); close(); TD.toast('🗑️', 'Progreso borrado', 'Empiezas de nuevo como Recluta.'); this.renderSettings(); });
      });
    });
  }
};
