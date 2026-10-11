'use strict';
// Último Disparo: pantallas (intro, menú, misiones, armería, ajustes, ayuda, informe, HUD, pausa
// y resultado) y controles (mouse con bloqueo de puntero, arrastre, botones táctiles, teclado).

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const starTxt = n => '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>';
const isTouch = () => document.body.classList.contains('touch');

const UI = {
  cur: 'intro', back: 'menu', resultShown: false, distT: 0, hintT: 0, mapTab: null,
  show(id) {
    $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
    this.cur = id;
  },
  toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), 2300);
  },
  coins() { $$('.cv').forEach(e => { e.textContent = save.coins; }); },

  // ---------------- menú
  menu() {
    exitLock();
    G.mode = 'menu';
    menuScene();
    const n = unlockedUpTo();
    $('#mmNext').textContent = save.beat ? '¡Juego pasado! Repite para sacar 3 ★' : `Misión ${n}: ${LEVELS[n - 1].name}`;
    $('#mmStars').textContent = `${totalStars()} / ${LEVELS.length * 3} estrellas`;
    $('#mmGun').textContent = `Arma: ${weaponById(save.weapon).name}`;
    this.coins();
    this.show('menu');
  },
  missions() {
    if (G.mode !== 'menu') { G.mode = 'menu'; menuScene(); }
    const next = unlockedUpTo();
    if (!this.mapTab) this.mapTab = LEVELS[next - 1].map;
    $('#mapTabs').innerHTML = Object.entries(MAPS).map(([id, m]) => {
      const lv = LEVELS.filter(l => l.map === id), st = lv.reduce((a, l) => a + ((save.lv[l.n] || {}).stars || 0), 0);
      return `<button class="tab${id === this.mapTab ? ' on' : ''}" style="--c:${m.color}" data-map="${id}">${m.icon} ${m.short} <span class="stars">${st}/${lv.length * 3}★</span></button>`;
    }).join('');
    $('#lvlGrid').innerHTML = LEVELS.filter(l => l.map === this.mapTab).map(l => {
      const s = save.lv[l.n] || {}, lock = l.n > next;
      return `<button class="lvl${lock ? ' lock' : ''}${l.n === next && !s.done ? ' next' : ''}" style="--c:${MAPS[l.map].color}" data-lvl="${l.n}" ${lock ? 'aria-disabled="true"' : ''}>
        <span class="n">${l.n}</span><span class="nm">${l.name}</span><span class="md">${MODE_TXT[l.mode]} · ${l.dist} m</span><span class="stars">${starTxt(s.stars || 0)}</span></button>`;
    }).join('');
    this.coins();
    this.show('missions');
  },
  armory() {
    this.armBack = this.cur === 'brief' ? 'brief' : this.cur === 'result' ? 'result' : 'menu';
    G.prevMode = G.mode;
    G.mode = 'armory';
    G.armView = save.weapon; setArmRifle(save.weapon);
    this.renderArmory();
    this.show('armory');
  },
  renderArmory() {
    const st = gunStats();
    $('#wlist').innerHTML = WEAPONS.map(w => {
      const own = save.owned.includes(w.id), sel = save.weapon === w.id;
      const btn = own ? (sel ? '<button class="btn small" disabled>Elegida ✓</button>' : `<button class="btn small" data-wsel="${w.id}">Elegir</button>`)
        : `<button class="btn small${save.coins >= w.price ? ' main' : ''}" data-wbuy="${w.id}" ${save.coins >= w.price ? '' : 'disabled'}><span class="coin"></span>${w.price}</button>`;
      return `<div class="wcard${sel ? ' sel' : ''}${G.armView === w.id ? ' view' : ''}" data-wview="${w.id}">
        <div><b>${w.name}</b> ${w.extra ? `<span class="chip">${EXTRA_TXT[w.extra]}</span>` : ''}</div>${btn}
        <p>${w.desc}</p>
        <div class="bars"><span>Zoom ${w.zoom}×</span><div class="bar"><i style="width:${w.zoom * 10}%"></i></div>
        <span>Estabilidad</span><div class="bar"><i style="width:${Math.round((1.25 - w.sway) / 0.6 * 100)}%"></i></div></div>
      </div>`;
    }).join('');
    $('#ulist').innerHTML = UPGRADES.map(u => {
      const lv = save.up[u.id], max = lv >= u.max, cost = UP_COST[lv];
      const now = { zoom: `Zoom máx. ${st.zoomMax.toFixed(1)}×`, stab: `Temblor ${Math.round(st.sway * 100)}%`, breath: `${st.breath.toFixed(1)} s de aire`, time: `+${st.extraTime} s` }[u.id];
      return `<div class="uprow"><span class="ic">${u.icon}</span><b>${u.name} <span class="hint" style="font-family:Rubik,system-ui,sans-serif;font-size:12px">· ${now}</span></b>
        ${max ? '<button class="btn small" disabled>Máximo</button>' : `<button class="btn small${save.coins >= cost ? ' main' : ''}" data-up="${u.id}" ${save.coins >= cost ? '' : 'disabled'}><span class="coin"></span>${cost}</button>`}
        <small>${u.desc}<span class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></small></div>`;
    }).join('');
    this.coins();
  },
  leaveArmory() {
    G.mode = G.prevMode === 'armory' ? 'menu' : G.prevMode;
    if (this.armBack === 'brief') { G.stats = gunStats(); this.fillBrief(); this.show('brief'); }
    else if (this.armBack === 'result') this.show('result');
    else this.menu();
  },
  settings() {
    this.setBack = this.cur;
    $$('#optSound button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!save.opt.sound));
    $$('#optQ button').forEach(b => b.classList.toggle('on', b.dataset.v === save.opt.quality));
    $('#optVol').value = save.opt.vol; $('#optSens').value = save.opt.sens;
    this.show('settings');
  },

  // ---------------- informe y misión
  brief(n) {
    exitLock();
    loadLevel(n);
    G.mode = 'brief'; G.t = 0;
    this.fillBrief();
    this.show('brief');
  },
  fillBrief() {
    const L = G.L, st = gunStats(), m = MAPS[L.map];
    $('#bMap').textContent = `${m.icon} ${m.name}`;
    $('#bNum').textContent = `Misión ${L.n} de ${LEVELS.length}`;
    $('#bName').textContent = L.name;
    $('#bText').textContent = L.brief;
    $('#bDist').textContent = `${L.dist} m`;
    $('#bTime').textContent = `${L.time + st.extraTime} s`;
    $('#bMode').textContent = MODE_TXT[L.mode];
    $('#bCiv').textContent = L.civ ? `${L.civ} ${L.civ === 1 ? 'persona' : 'personas'}` : 'Nadie';
    const s = save.lv[L.n];
    $('#bGun').innerHTML = `Arma: <b>${st.w.name}</b> · zoom hasta ${st.zoomMax.toFixed(1)}× · ${st.breath.toFixed(1)} s de aire${s && s.done ? ` · Récord: <span class="stars">${starTxt(s.stars)}</span>` : ''}`;
  },
  go() {
    SFX.init();
    startMission();
    this.show('hud');
    requestLock();
  },
  startHud() {
    const L = G.L;
    this.resultShown = false;
    $('#hName').textContent = `${L.n}. ${L.name}`;
    $('#hMode').textContent = `${MAPS[L.map].short} · ${MODE_TXT[L.mode]} · ${L.dist} m`;
    $('#tTherm').style.display = G.stats.w.extra === 'termica' ? 'block' : 'none';
    $('#hBig').classList.remove('on');
    this.hudShots();
    this.scope(false);
    this.hintT = 0; this.hintStage = 0;
    this.setHint();
  },
  hudShots() {
    const max = G.stats.w.extra === 'silencio' ? 2 : 1;
    $('#hShots').innerHTML = Array.from({ length: max }, (_, i) => `<i class="${i >= G.shots ? 'used' : ''}"></i>`).join('');
  },
  setHint() {
    const L = G.L, t = isTouch();
    const scopeK = t ? 'toca <b>MIRA</b>' : '<kbd>clic derecho</kbd> o <kbd>Shift</kbd>';
    const fireK = t ? 'toca <b>FUEGO</b>' : 'haz <kbd>clic</kbd>';
    const breathK = t ? 'mantén <b>AIRE</b>' : 'mantén <kbd>Espacio</kbd>';
    let h = '';
    if (L.n <= 2) h = !G.scoped ? `Busca la marca roja y entra a la mira: ${scopeK}` : `Apunta a la cabeza, ${breathK} para que no tiemble y ${fireK}`;
    else if (this.hintT < 7) h = { 3: 'Espera a que asome la cabeza detrás del rehén', 5: 'Síguelo con la mira mientras camina', 7: 'Dispara cuando salga de detrás de las camionetas', 9: 'En el puerto los tiros son largos: usa la rueda o + para el zoom', 17: G.stats.w.extra === 'termica' ? 'Usa la mira térmica: tecla T' : 'De noche ayuda la Búho T-9 con mira térmica (en la armería)' }[L.n] || '';
    $('#hHint').innerHTML = h;
    $('#hHint').style.display = h ? '' : 'none';
  },
  scope(on) {
    $('#scope').classList.toggle('on', on);
    $('#cross').style.display = on ? 'none' : '';
    $('#tScope').classList.toggle('on', on);
    if (G.mode === 'play' && G.L && G.L.n <= 2) this.setHint();
  },
  bulletCam(on) {
    $('#bcam').classList.toggle('on', on);
    if (on) { exitLock(); $$('.screen').forEach(s => { if (s.id !== 'bcam') s.classList.remove('on'); }); this.cur = 'bcam'; }
  },
  hud(dt) {
    const tl = Math.max(0, G.timeLeft);
    const tt = $('#hTime');
    const sec = Math.ceil(tl);
    tt.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    tt.classList.toggle('low', tl <= 5);
    const st = G.stats;
    $('#hBreath').style.width = `${(G.breath / st.breath) * 100}%`;
    $('#mBreath').classList.toggle('gasp', G.gasp > 0);
    $('#tBreath').classList.toggle('on', G.holding);
    $('#scope').classList.toggle('thermal', G.thermal);
    $('#sZoom').textContent = `${G.zoom.toFixed(1)}×`;
    this.hintT += dt;
    if (G.L.n > 2 && this.hintT > 7 && this.hintT - dt <= 7) this.setHint();
    // distancia (telémetro)
    this.distT -= dt;
    if (G.scoped && this.distT <= 0) {
      this.distT = 0.15;
      W.camera.updateMatrixWorld();
      ray.set(W.camera.getWorldPosition(V()), W.camera.getWorldDirection(V())); ray.far = 2000;
      const h = ray.intersectObjects(W.solids.concat(...G.people.map(p => p.meshes)), false).find(x => x.distance > 3);
      $('#sDist').textContent = h ? `${Math.round(h.distance)} m` : '— m';
    }
    // marca roja sobre el secuestrador (sólo sin mira)
    const mk = $('#marker');
    if (G.scoped || G.mode !== 'play') { mk.style.opacity = 0; return; }
    const p = G.enemy.headWorld(V()); p.y += 0.45;
    W.camera.updateMatrixWorld();
    const v = p.clone().project(W.camera);
    const w = window.innerWidth, h = window.innerHeight;
    let x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    const behind = v.z > 1;
    const off = behind || x < 30 || x > w - 30 || y < 70 || y > h - 30;
    if (behind) { x = w - x; y = h - 40; }
    x = clamp(x, 40, w - 40); y = clamp(y, 90, h - 30);
    mk.style.opacity = 1;
    mk.classList.toggle('edge', off);
    mk.style.left = x + 'px'; mk.style.top = y + 'px';
  },
  result(r) {
    this.resultShown = true;
    exitLock();
    const L = G.L, box = $('#resBox');
    const last = L.n === LEVELS.length;
    if (r.ok) {
      box.className = 'res panel pop ok';
      box.innerHTML = `<h2>Misión cumplida</h2>
        <div class="bigstars"><span>★</span><span>★</span><span>★</span></div>
        <div class="checks">
          <div><span>Rehén a salvo</span><span class="y">✓</span></div>
          <div><span>Tiro a la cabeza</span><span class="${r.head ? 'y">✓' : 'n">✗'}</span></div>
          <div><span>Rápido (sobró la mitad del tiempo)</span><span class="${r.timeOk ? 'y">✓' : 'n">✗'}</span></div>
          <div><span>Distancia del tiro</span><span>${r.dist} m · ${r.time.toFixed(1)} s</span></div>
        </div>
        <div class="earn"><span class="coin"></span> +${r.coins}${r.first ? '' : ' <span class="hint">(repetición)</span>'}</div>
        ${last ? '<p>¡Terminaste las 30 misiones! Eres el mejor francotirador de rescate.</p>' : ''}
        <div class="acts">${last ? '' : '<button class="btn main" id="rNext">Siguiente misión →</button>'}
          <div class="two"><button class="btn" id="rRetry">↻ Repetir</button><button class="btn" id="rArm">🔫 Armería</button></div>
          <button class="btn small" id="rMenu">Menú</button></div>`;
      const spans = box.querySelectorAll('.bigstars span');
      spans.forEach((s, i) => setTimeout(() => { s.classList.add(i < r.stars ? 'on' : 'off'); if (i < r.stars) SFX.star(i); }, 500 + i * 320));
    } else {
      const why = {
        fallaste: ['Fallaste el tiro', 'El secuestrador escuchó el disparo y escapó con el rehén.'],
        inocente: ['Le diste a un inocente', 'Nunca dispares si hay alguien en la línea de tiro. Espera a que pase.'],
        tiempo: ['Se acabó el tiempo', 'El secuestrador escapó con el rehén. Sé más rápido.'],
      }[r.reason];
      const tips = ['Mantén Espacio (o AIRE) para contener la respiración: la mira casi no tiembla y todo va en cámara lenta.', 'Con más zoom la cabeza se ve más grande. Mejora el zoom en la armería.', 'La Sombra SD tiene silenciador: si fallas, te queda otro tiro.', 'Mejora la estabilidad para que la mira tiemble menos.', 'Cuando camina, sigue al secuestrador con la mira y dispara en el momento justo.'];
      box.className = 'res panel pop bad';
      box.innerHTML = `<h2>Misión fallida</h2><p><b>${why[0]}.</b> ${why[1]}</p>
        <div class="tipbox">💡 ${tips[Math.floor(Math.random() * tips.length)]}</div>
        <div class="acts"><button class="btn main" id="rRetry">↻ Volver a intentarlo</button>
          <div class="two"><button class="btn" id="rArm">🔫 Armería</button><button class="btn" id="rMenu">Menú</button></div></div>`;
    }
    this.show('result');
    const f = $('#rNext') || $('#rRetry'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  },
  retry() { SFX.init(); loadLevel(G.L.n); this.go(); },
  pause() {
    if (G.mode !== 'play') return;
    G.prevMode = 'play'; G.mode = 'paused'; G.holding = false;
    exitLock();
    this.show('pause');
  },
  resume() { G.mode = 'play'; this.show('hud'); requestLock(); },
};

// ---------------------------------------------------------------- bloqueo del puntero (mouse)
const Lock = { failed: false, expectExit: false };
function requestLock() {
  if (isTouch() || Lock.failed) return;
  const c = W.renderer.domElement;
  if (!c.requestPointerLock) { Lock.failed = true; return; }
  try {
    const p = c.requestPointerLock();
    if (p && p.catch) p.catch(() => { Lock.failed = true; });
  } catch (e) { Lock.failed = true; }
}
function exitLock() {
  if (document.pointerLockElement) { Lock.expectExit = true; document.exitPointerLock(); }
}
document.addEventListener('pointerlockerror', () => { Lock.failed = true; });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === W.renderer.domElement;
  if (!locked) {
    if (!Lock.expectExit && G.mode === 'play') UI.pause();
    Lock.expectExit = false;
  }
});

// ---------------------------------------------------------------- entrada
function bindInput() {
  const cv = W.renderer.domElement;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('contextmenu', e => { if (UI.cur === 'hud') e.preventDefault(); });
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    SFX.init();
    if (e.pointerType === 'touch') document.body.classList.add('touch');
    if (G.mode === 'bulletcam') { skipBulletCam(); return; }
    if (G.mode === 'armory') { drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; G.arm.drag = 1; return; }
    if (G.mode !== 'play') return;
    if (e.pointerType === 'mouse') {
      if (e.button === 2) { setScope(!G.scoped); return; }
      if (e.button !== 0) return;
      if (document.pointerLockElement === cv) { fire(); return; }
      if (!Lock.failed) requestLock();
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mouse: e.pointerType === 'mouse' };
  });
  window.addEventListener('pointermove', e => {
    if (G.mode === 'play' && document.pointerLockElement === cv) { aimBy(e.movementX, e.movementY); return; }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (G.mode === 'armory') { G.arm.rot += dx * 0.01; return; }
    aimBy(dx * (drag.mouse ? 1 : 1.25), dy * (drag.mouse ? 1 : 1.25));
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (G.mode === 'armory') { G.arm.drag = 0; drag = null; return; }
    // sin bloqueo de puntero: un clic corto (sin arrastrar) dispara
    if (drag.mouse && Lock.failed && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6 && performance.now() - drag.t < 400) fire();
    drag = null;
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('wheel', e => { if (G.mode === 'play') { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1 : -1); } }, { passive: false });

  // botones táctiles
  const tb = (id, down, upFn) => {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.init(); down(); });
    if (upFn) ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, e => { e.preventDefault(); upFn(); }));
  };
  tb('#tFire', () => fire());
  tb('#tScope', () => setScope(!G.scoped));
  tb('#tBreath', () => { if (!G.scoped) setScope(true); holdBreath(true); }, () => holdBreath(false));
  tb('#tZin', () => zoomBy(1));
  tb('#tZout', () => zoomBy(-1));
  tb('#tTherm', () => toggleThermal());
  $('#hPause').addEventListener('click', () => UI.pause());

  // teclado
  const held = {};
  window.addEventListener('keydown', e => {
    const k = e.key;
    held[k.toLowerCase()] = true;
    if (UI.cur === 'intro') { enterMenu(); return; }
    if (G.mode === 'bulletcam') { if (k === ' ' || k === 'Enter' || k === 'Escape') { e.preventDefault(); skipBulletCam(); } return; }
    if (G.mode === 'play') {
      if (e.repeat && k !== '+' && k !== '-') { if (k === ' ') e.preventDefault(); return; }
      if (k === 'Shift' || k === 'e' || k === 'E' || k === 'q' || k === 'Q') setScope(!G.scoped);
      else if (k === ' ') { e.preventDefault(); if (!G.scoped) setScope(true); holdBreath(true); }
      else if (k === 'f' || k === 'F' || k === 'Enter') fire();
      else if (k === '+' || k === '=') zoomBy(1);
      else if (k === '-' || k === '_') zoomBy(-1);
      else if (k === 't' || k === 'T') toggleThermal();
      else if (k === 'Escape' || k === 'p' || k === 'P') UI.pause();
      return;
    }
    if (G.mode === 'paused' && (k === 'Escape' || k === 'p' || k === 'P')) { UI.resume(); return; }
    if (UI.cur === 'brief' && k === 'Enter') { e.preventDefault(); UI.go(); return; }
    if (UI.cur === 'result') {
      if (k === 'r' || k === 'R') UI.retry();
      else if (k === 'Enter' && $('#rNext') && document.activeElement === document.body) UI.brief(G.L.n + 1);
      else if (k === 'Escape') UI.menu();
      return;
    }
    if (k === 'Escape') {
      if (UI.cur === 'armory') UI.leaveArmory();
      else if (UI.cur === 'settings' || UI.cur === 'help') { if (UI.setBack === 'pause') UI.show('pause'); else UI.menu(); }
      else if (UI.cur === 'missions' || UI.cur === 'brief') UI.menu();
    }
  });
  window.addEventListener('keyup', e => {
    held[e.key.toLowerCase()] = false;
    if (e.key === ' ' && G.mode === 'play') holdBreath(false);
  });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; holdBreath(false); });
  // apuntar con flechas o WASD
  setInterval(() => {
    if (G.mode !== 'play') return;
    const ax = (held.arrowright || held.d ? 1 : 0) - (held.arrowleft || held.a ? 1 : 0);
    const ay = (held.arrowdown || held.s ? 1 : 0) - (held.arrowup || held.w ? 1 : 0);
    if (ax || ay) aimBy(ax * 6, ay * 6);
  }, 16);

  // navegación
  document.addEventListener('click', e => {
    const b = e.target.closest('button, [data-wview]');
    if (!b) return;
    const go = b.dataset.go;
    if (b.tagName === 'BUTTON') SFX.click();
    if (go === 'menu') UI.menu();
    else if (go === 'play') UI.brief(unlockedUpTo());
    else if (go === 'missions') UI.missions();
    else if (go === 'armory') UI.armory();
    else if (go === 'settings') UI.settings();
    else if (go === 'help') { UI.setBack = UI.cur; UI.show('help'); }
    else if (go === 'back') {
      if (UI.cur === 'armory') UI.leaveArmory();
      else if (UI.setBack === 'pause') UI.show('pause');
      else UI.menu();
    }
    if (b.dataset.map) { UI.mapTab = b.dataset.map; UI.missions(); }
    if (b.dataset.lvl) { const n = +b.dataset.lvl; if (n <= unlockedUpTo()) UI.brief(n); else { SFX.nope(); UI.toast('Primero cumple la misión anterior'); } }
    if (b.dataset.wbuy) {
      const w = weaponById(b.dataset.wbuy);
      if (save.coins >= w.price) { save.coins -= w.price; save.owned.push(w.id); save.weapon = w.id; persist(); setRifle(); G.armView = w.id; setArmRifle(w.id); SFX.buy(); UI.toast(`¡${w.name} es tuya!`); UI.renderArmory(); }
      return;
    }
    if (b.dataset.wsel) { save.weapon = b.dataset.wsel; persist(); setRifle(); G.armView = save.weapon; setArmRifle(save.weapon); UI.renderArmory(); return; }
    if (b.dataset.wview && b.dataset.wview !== G.armView) { G.armView = b.dataset.wview; setArmRifle(G.armView); SFX.click(); UI.renderArmory(); return; }
    if (b.dataset.up) {
      const u = b.dataset.up, lv = save.up[u], cost = UP_COST[lv];
      if (lv < 5 && save.coins >= cost) { save.coins -= cost; save.up[u]++; persist(); SFX.buy(); UI.renderArmory(); }
      return;
    }
    if (b.id === 'bGo') UI.go();
    if (b.id === 'pResume') UI.resume();
    if (b.id === 'pRetry') UI.retry();
    if (b.id === 'pMenu') UI.menu();
    if (b.id === 'rNext') UI.brief(G.L.n + 1);
    if (b.id === 'rRetry') UI.retry();
    if (b.id === 'rArm') UI.armory();
    if (b.id === 'rMenu') UI.menu();
  });

  // ajustes
  $('#optSound').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; save.opt.sound = b.dataset.v === '1'; persist(); SFX.setVol(); UI.settings(); });
  $('#optQ').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; save.opt.quality = b.dataset.v; persist(); applyQuality(); UI.settings(); });
  $('#optVol').addEventListener('input', e => { save.opt.vol = +e.target.value; persist(); SFX.setVol(); });
  $('#optSens').addEventListener('input', e => { save.opt.sens = +e.target.value; persist(); });
  let resetArm = 0;
  $('#optReset').addEventListener('click', e => {
    if (Date.now() - resetArm > 2500) { resetArm = Date.now(); e.target.textContent = '¿Seguro? Toca otra vez'; UI.toast('Toca otra vez para borrar todo tu progreso'); setTimeout(() => { e.target.textContent = 'Borrar todo'; }, 2500); return; }
    try { localStorage.removeItem(SAVE_KEY); } catch (er) { /* nada */ }
    location.reload();
  });
}

function enterMenu() {
  SFX.init();
  UI.menu();
}

function scopeSize() {
  const r = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.47);
  document.documentElement.style.setProperty('--r', r + 'px');
}

// ---------------------------------------------------------------- arranque
(async function boot() {
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
  initWorld($('#gl'));
  initGame();
  const onResize = () => { resizeWorld(); scopeSize(); };
  window.addEventListener('resize', onResize); onResize();
  try { await Promise.race([Promise.all([document.fonts.load('700 40px Fredoka'), document.fonts.load('900 40px Rubik'), document.fonts.load('400 16px Rubik')]), new Promise(r => setTimeout(r, 1500))]); } catch (e) { /* nada */ }
  menuScene();
  bindInput();
  $('#intro').addEventListener('click', enterMenu);
  requestAnimationFrame(frame);
  document.body.classList.add('ready');
})();

// ganchos para las pruebas
window.UD = {
  G, W, LEVELS, save, UI,
  aim(part = 'head') {
    const p = part === 'head' ? G.enemy.headWorld(V()) : G.enemy.chestWorld(V());
    aimAtPoint(p); G.stats.sway = 0;
  },
};
