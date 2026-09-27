/* ================== INTERFAZ ================== */
const $ = s => document.querySelector(s);
const stage = $('#stage');
let viewFloor = 0, camYaw = 0.3, camDist = 1200, camPitch = 1.08, playing = false, panel = null, decorFloor = 0;
const camT = new THREE.Vector3(0, 0, 60), camP = new THREE.Vector3();

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  stage.style.width = vw + 'px'; stage.style.height = vh + 'px';
  W = vw; H = vh; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.4 : 2)); renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh; camera.fov = vw / vh < 1 ? 58 : 42; camera.updateProjectionMatrix();
  stage.classList.toggle('portrait', vw / vh < 1);
  if (vw / vh < 1) camDist = Math.max(camDist, 1500);
}
window.addEventListener('resize', resize);

/* ---------- pads de compra ---------- */
function padList() {
  const L = [];
  for (let f = 0; f < save.floors; f++) if (save.tables[f] < SLOTS[f].length) { const i = save.tables[f]; L.push({ kind: 'table', f, i, x: SLOTS[f][i][0], z: SLOTS[f][i][1], title: 'Mesa nueva', price: tableCost(totalTables()) }); }
  if (save.stations < 6) L.push({ kind: 'station', f: 0, i: save.stations, x: STATION_X[save.stations], z: -238, title: 'Cocina ' + (save.stations + 1), price: STATION_COST[save.stations] });
  if (save.floors < 3) { const f = save.floors - 1; if (save.tables[f] >= 6) L.push({ kind: 'floor', f, x: stairX(f), z: -200, title: save.floors === 1 ? 'Segundo piso' : 'Terraza', price: FLOOR_COST[save.floors] }); }
  if (!save.drive && totalTables() >= 5) L.push({ kind: 'drive', f: 0, x: -620, z: 300, title: 'Drive-thru', price: DRIVE_COST });
  if (save.motos < 3 && totalTables() >= 4) L.push({ kind: 'moto', f: 0, x: 620, z: 180 + save.motos * 80, title: save.motos ? 'Otra moto' : 'Delivery', price: save.motos ? MOTO_COST : DELIVERY_COST });
  return L;
}
let padKey = '';
function refreshPads(force) {
  const L = padList();
  const key = L.map(p => p.kind + p.f + p.i + p.price + (save.money >= p.price)).join('|');
  if (key === padKey && !force) return; padKey = key;
  for (const p of WLD.pads) if (p.m.parent) p.m.parent.remove(p.m);
  WLD.pads = L.map(pd => { const m = makePad(pd.kind, pd.title, pd.price); m.position.set(pd.x, floorY(pd.f) + 1, pd.z); WLD.root.add(m); return Object.assign(pd, { m, dwell: 0 }); });
}
function buy(pd) {
  if (save.money < pd.price) { SFX.no(); toast('<b>Te faltan ' + soles(pd.price - save.money) + '</b><small>Sirve más platos y cobra la caja.</small>'); return false; }
  save.money -= pd.price;
  if (pd.kind === 'table') { save.tables[pd.f]++; syncTables(); addTableModel(pd.f, pd.i, true); banner('¡Nueva mesa!'); }
  else if (pd.kind === 'station') { save.stations++; addStationModel(pd.i, true); banner('¡Nueva estación de cocina!', 'Contrata un cocinero en Personal para usarla.'); }
  else if (pd.kind === 'floor') { save.floors++; save.tables[save.floors - 1] = 2; rebuildAll(); syncTables(); viewFloor = save.floors - 1; WLD.tables[save.floors - 1].forEach((t, k) => popIn(t, 0.2 + k * 0.15)); dust(0, floorY(save.floors - 1), 0); dust(-300, floorY(save.floors - 1), 200); dust(300, floorY(save.floors - 1), -100); banner(save.floors === 2 ? '¡Segundo piso construido!' : '¡Terraza construida!', 'Tus mozos suben por la escalera. Contrata más.'); }
  else if (pd.kind === 'drive') { save.drive = true; const d = makeDriveThru(); WLD.root.add(d); popIn(d); banner('¡Drive-thru abierto!', 'Contrata a alguien para la ventanilla, o atiende tú.'); }
  else if (pd.kind === 'moto') { save.motos++; addMotoModel(save.motos - 1, true); banner(save.motos === 1 ? '¡Delivery abierto!' : '¡Nueva moto!', 'Contrata un motorizado en Personal.'); }
  SFX.build(); shake = 8; persist(); refreshPads(true); goalCheck(); return true;
}
function rebuildAll() {
  rebuildWorld();
  for (const p of SIM.people) WLD.root.add(p.model);
  for (const c of SIM.cars) WLD.root.add(c.m);
  for (const t of SIM.tables) { const tm = WLD.tables[t.f] && WLD.tables[t.f][t.i]; if (tm) tm.userData.dirty.visible = t.dirty; }
  for (const o of SIM.orders) if (o.plateM) WLD.floors[0].add(o.plateM);
  for (let f = 0; f < 3; f++) for (const s of SIM.dirt[f]) if (WLD.floors[f]) WLD.floors[f].add(s.m);
  refreshPads(true);
}

/* ---------- avisos ---------- */
let toastT = 0, shake = 0;
function toast(html) { const el = $('#toast'); el.innerHTML = html; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }
function banner(t, sub) { const el = $('#banner'); el.innerHTML = '<b>' + esc(t) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : ''); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); }
function goalCheck() { const d = checkGoals(); if (d.length) { setTimeout(() => { toast('<small>¡Meta cumplida!</small><b>' + esc(d[0].t) + '</b><em>+' + soles(d[0].r) + '</em>'); SFX.cash(); }, 400); persist(); } }

/* ---------- paneles ---------- */
const PANELS = { staff: 'Personal', carta: 'Carta', decor: 'Decoración', reviews: 'Reseñas', goals: 'Metas', options: 'Opciones' };
function openPanel(k) { panel = panel === k ? null : k; SFX.click(); renderPanel(); }
function renderPanel() {
  const el = $('#panel');
  document.querySelectorAll('[data-panel]').forEach(b => b.classList.toggle('on', b.dataset.panel === panel));
  if (!panel) { el.hidden = true; return; }
  el.hidden = false;
  let h = '<div class="ph"><h2>' + PANELS[panel] + '</h2><button class="x" id="pclose" aria-label="Cerrar">✕</button></div><div class="pb">';
  if (panel === 'staff') {
    for (const k of ROLE_KEYS) {
      const R = ROLES[k], n = save.staff[k] || 0, mx = roleMax(k), lv = save.train[k] || 0;
      const lock = mx === 0;
      h += '<div class="card' + (lock ? ' lock' : '') + '"><div class="ci"><b>' + R.name + ' <em>' + n + '/' + mx + '</em></b><span>' + R.desc + '</span><small>Sueldo ' + soles(R.wage) + ' por día. Nivel de entrenamiento ' + lv + '/4</small></div><div class="ca">' +
        (lock ? '<span class="need">' + (k === 'ventana' ? 'Abre el drive-thru' : k === 'repartidor' ? 'Abre el delivery' : 'Compra más estaciones') + '</span>' :
          '<button class="b g" data-hire="' + k + '"' + (n >= mx || save.money < R.hire ? ' disabled' : '') + '>Contratar ' + soles(R.hire) + '</button>' +
          (lv < 4 ? '<button class="b" data-train="' + k + '"' + (n === 0 || save.money < TRAIN_COST(lv) ? ' disabled' : '') + '>Entrenar ' + soles(TRAIN_COST(lv)) + '</button>' : '<span class="need ok">Experto</span>') +
          (n > 0 && !(k === 'cocinero' && n === 1) ? '<button class="b s" data-fire="' + k + '">Despedir</button>' : '')) + '</div></div>';
    }
  } else if (panel === 'carta') {
    h += '<div class="seg">' + Object.keys(PRICE_LVL).map(k => '<button data-price="' + k + '" class="' + (save.price === k ? 'on' : '') + '">' + PRICE_LVL[k].name + '</button>').join('') + '</div><p class="note">Precios bajos traen más clientes; precios altos dejan más plata pero bajan la nota de la carta.</p>';
    for (const d of DISHES) {
      const has = save.menu.includes(d.id), lv = recipeLvl(d.id), uc = Math.round(d.price * 22 * (lv + 1));
      h += '<div class="card dish"><i class="dot" style="background:' + d.col + '"></i><div class="ci"><b>' + d.name + ' <em>' + soles(dishPrice(d.id)) + '</em></b><small>' + (has ? 'En la carta. Receta nivel ' + lv + '/3. Cocción ' + d.cook + ' s.' : 'Nuevo plato para tu carta.') + '</small></div><div class="ca">' +
        (has ? (lv < 3 ? '<button class="b" data-recipe="' + d.id + '"' + (save.money < uc ? ' disabled' : '') + '>Mejorar ' + soles(uc) + '</button>' : '<span class="need ok">Receta maestra</span>') + (save.menu.length > 1 ? '<button class="b s" data-drop="' + d.id + '">Quitar</button>' : '')
          : '<button class="b g" data-add="' + d.id + '"' + (save.money < d.unlock ? ' disabled' : '') + '>' + (d.unlock ? 'Agregar ' + soles(d.unlock) : 'Agregar') + '</button>') + '</div></div>';
    }
  } else if (panel === 'decor') {
    h += '<div class="seg">' + Array.from({ length: save.floors }, (_, f) => '<button data-dfloor="' + f + '" class="' + (decorFloor === f ? 'on' : '') + '">Piso ' + (f + 1) + '</button>').join('') + '</div>';
    const f = decorFloor, d = save.decor[f] || (save.decor[f] = {});
    h += '<p class="note">Nota de decoración del piso ' + (f + 1) + ': <b>' + decoScore(f).toFixed(1) + ' / 5</b>. Más mesas piden más decoración.</p>';
    for (const it of DECOR) {
      if (it.floor0 && f !== 0) continue;
      if (f === 2 && ['cuadro', 'lampara', 'pintura', 'acuario'].includes(it.id)) continue;
      const n = d[it.id] || 0, full = n >= it.max;
      h += '<div class="card"><div class="ci"><b>' + it.name + ' <em>' + n + '/' + it.max + '</em></b><span>' + it.desc + ' (+' + it.pts + ' de ambiente)</span></div><div class="ca"><button class="b g" data-decor="' + it.id + '"' + (full || save.money < it.cost ? ' disabled' : '') + '>' + (full ? 'Listo' : 'Comprar ' + soles(it.cost)) + '</button></div></div>';
      if (it.id === 'pintura' && n > 0) h += '<div class="swrow">' + WALL_COLORS.map(c => '<button class="sw' + (save.wall[f] === c ? ' on' : '') + '" style="--c:' + c + '" data-wall="' + c + '" aria-label="Color"></button>').join('') + '</div>';
    }
  } else if (panel === 'reviews') {
    const R = save.reviews.slice(0, 20), avg = k => R.length ? R.reduce((a, r) => a + r[k], 0) / R.length : 3;
    h += '<div class="rbig"><b>' + save.rating.toFixed(1) + '</b><span>' + starStr(save.rating) + '</span><small>' + save.stats.customers + ' clientes atendidos</small></div>';
    for (const [k, n] of [['food', 'Comida'], ['carta', 'Carta'], ['deco', 'Decoración'], ['clean', 'Limpieza']]) { const v = avg(k); h += '<div class="rbar"><span>' + n + '</span><div><i style="width:' + (v / 5 * 100).toFixed(0) + '%;background:' + (v >= 4 ? '#19D46E' : v >= 3 ? '#FFE14D' : '#FF6B6B') + '"></i></div><em>' + v.toFixed(1) + '</em></div>'; }
    h += '<div class="rlist">' + (R.length ? R.map(r => '<div class="rv"><b>' + esc(r.name) + '</b><span>' + starStr(r.stars) + '</span><p>“' + esc(r.text) + '”</p></div>').join('') : '<p class="note">Todavía no hay reseñas.</p>') + '</div>';
  } else if (panel === 'goals') {
    h += GOALS.map(g => '<div class="goal' + (save.goals.includes(g.id) ? ' done' : '') + '"><span>' + esc(g.t) + '</span><em>' + (save.goals.includes(g.id) ? 'Listo' : '+' + soles(g.r)) + '</em></div>').join('');
  } else if (panel === 'options') {
    h += '<div class="card"><div class="ci"><b>Nombre del restaurante</b></div></div><div class="nrow"><input id="rname" maxlength="26" value="' + esc(save.name) + '"><button class="b g" id="rname-ok">Cambiar</button></div>';
    h += '<div class="card"><div class="ci"><b>Música</b></div><div class="ca"><button class="b" data-tog="music">' + (save.music ? 'Sí' : 'No') + '</button></div></div>';
    h += '<div class="card"><div class="ci"><b>Sonidos</b></div><div class="ca"><button class="b" data-tog="sfx">' + (save.sfx ? 'Sí' : 'No') + '</button></div></div>';
    h += '<div class="card"><div class="ci"><b>Empezar de cero</b><span>Borra todo tu progreso.</span></div><div class="ca"><button class="b s" id="reset">Borrar</button></div></div>';
  }
  el.innerHTML = h + '</div>';
  el.querySelector('#pclose').onclick = () => openPanel(panel);
  el.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { const k = b.dataset.hire; if (save.money < ROLES[k].hire) return; save.money -= ROLES[k].hire; save.staff[k] = (save.staff[k] || 0) + 1; syncStaff(); SFX.build(); toast('<b>¡Contrataste un ' + ROLES[k].name.toLowerCase() + '!</b>'); goalCheck(); renderPanel(); persist(); });
  el.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { const k = b.dataset.fire; save.staff[k]--; const p = SIM.people.filter(q => q.role === k).pop(); if (p) { if (p.job && p.job.claimed === p) p.job.claimed = null; if (p.carry) { p.carry.claimed = null; p.carry.status = 'ready'; } removePerson(p); } SFX.click(); renderPanel(); persist(); });
  el.querySelectorAll('[data-train]').forEach(b => b.onclick = () => { const k = b.dataset.train, c = TRAIN_COST(save.train[k] || 0); if (save.money < c) return; save.money -= c; save.train[k] = (save.train[k] || 0) + 1; SFX.build(); renderPanel(); persist(); });
  el.querySelectorAll('[data-price]').forEach(b => b.onclick = () => { save.price = b.dataset.price; SFX.click(); renderPanel(); persist(); });
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const d = DISH[b.dataset.add]; if (save.money < d.unlock) return; save.money -= d.unlock; save.menu.push(d.id); SFX.build(); toast('<b>' + d.name + ' ya está en la carta</b>'); goalCheck(); renderPanel(); persist(); });
  el.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { save.menu = save.menu.filter(x => x !== b.dataset.drop); SFX.click(); renderPanel(); persist(); });
  el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => { const id = b.dataset.recipe, lv = recipeLvl(id), c = Math.round(DISH[id].price * 22 * (lv + 1)); if (save.money < c) return; save.money -= c; save.recipe[id] = lv + 1; SFX.build(); renderPanel(); persist(); });
  el.querySelectorAll('[data-dfloor]').forEach(b => b.onclick = () => { decorFloor = +b.dataset.dfloor; renderPanel(); });
  el.querySelectorAll('[data-decor]').forEach(b => b.onclick = () => {
    const it = DECOR.find(x => x.id === b.dataset.decor), f = decorFloor, d = save.decor[f];
    if (save.money < it.cost || (d[it.id] || 0) >= it.max) return;
    save.money -= it.cost; d[it.id] = (d[it.id] || 0) + 1;
    if (it.id === 'piso' || it.id === 'pintura') { if (it.id === 'pintura') save.wall[f] = pick(WALL_COLORS.slice(0, 5)); rebuildAll(); }
    else addDecorModel(it.id, f, d[it.id] - 1, true);
    SFX.build(); renderPanel(); persist();
  });
  el.querySelectorAll('[data-wall]').forEach(b => b.onclick = () => { save.wall[decorFloor] = b.dataset.wall; rebuildAll(); SFX.click(); renderPanel(); persist(); });
  el.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => { const k = b.dataset.tog; save[k] = !save[k]; setGains(); renderPanel(); persist(); });
  const rn = el.querySelector('#rname-ok'); if (rn) rn.onclick = () => { const v = el.querySelector('#rname').value.trim().slice(0, 26); if (v) { save.name = v; rebuildAll(); persist(); SFX.build(); renderPanel(); } };
  const rs = el.querySelector('#reset'); if (rs) rs.onclick = () => { if (rs.dataset.a) { localStorage.removeItem(SAVE_KEY); location.reload(); } else { rs.dataset.a = 1; rs.textContent = '¿Seguro?'; } };
}
function starStr(v) { const n = Math.round(v); return '★'.repeat(n) + '☆'.repeat(5 - n); }

/* ---------- HUD ---------- */
let hudT = 0;
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.15;
  $('#h-money').textContent = soles(save.money);
  const reg = $('#h-reg'); reg.textContent = save.register > 0 ? 'Caja: ' + soles(save.register) : 'Caja vacía'; reg.classList.toggle('hot', save.register >= 40 && !(save.staff.cajero > 0));
  const h = hourNow(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15;
  $('#h-clock').textContent = hh + ':' + String(mm).padStart(2, '0');
  $('#h-day').textContent = 'Día ' + save.day + (h >= 12.5 && h < 15 ? ', almuerzo' : h >= 19 && h < 21.5 ? ', cena' : h >= 22.6 ? ', cerrando' : '');
  $('#h-dayfill').style.width = (save.dayT / DAY_LEN * 100).toFixed(1) + '%';
  $('#h-rating').textContent = save.rating.toFixed(1); $('#h-stars').textContent = starStr(save.rating);
  const eat = SIM.tables.filter(t => t.party).length; $('#h-busy').textContent = eat + '/' + SIM.tables.length + ' mesas';
  $('#h-speed').textContent = 'x' + save.speed;
  document.querySelectorAll('[data-floor]').forEach(b => { const f = +b.dataset.floor; b.hidden = f >= save.floors; b.classList.toggle('on', f === viewFloor); });
  $('#floors').hidden = save.floors < 2;
  // pista contextual
  const a = SIM.avatar, ready = SIM.orders.filter(o => o.status === 'ready' && !o.claimed && o.kind !== 'delivery').length;
  let hint = '';
  if (a && a.carry) hint = a.carry.kind === 'drive' ? 'Lleva el pedido a la ventanilla del drive-thru.' : 'Lleva el plato a la mesa que lo pidió.';
  else if (ready && !(save.staff.mozo > 0)) hint = 'Hay ' + ready + (ready === 1 ? ' plato listo' : ' platos listos') + ' en la barra. Recógelo y llévalo a la mesa.';
  else if (SIM.tables.some(t => t.dirty) && !(save.staff.limpiador > 0)) hint = 'Hay mesas sucias. Acércate a limpiarlas o contrata un limpiador.';
  else if (save.register >= 40 && !(save.staff.cajero > 0)) hint = 'Tu caja tiene plata. Ve a cobrarla (o toca la caja).';
  else if (SIM.queue.length >= 2) hint = 'Hay cola en la puerta: compra más mesas.';
  else { const pd = WLD.pads.find(p => save.money >= p.price); if (pd) hint = 'Ya puedes comprar: ' + pd.title + ' (pisa el círculo verde o tócalo).'; }
  $('#hint').textContent = hint; $('#hint').hidden = !hint;
  if (panel === 'staff' || panel === 'carta' || panel === 'decor') { const t2 = Math.floor(save.money / 10); if (t2 !== renderPanel._m) { renderPanel._m = t2; renderPanel(); } }
}

/* ---------- controles ---------- */
const keys = {};
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && playing) e.preventDefault();
  if (e.code === 'KeyQ') camYaw -= 0.3; if (e.code === 'KeyE') camYaw += 0.3;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function readMove() {
  MOVE.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  MOVE.z = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (joy.on) { MOVE.x = joy.x; MOVE.z = joy.y; }
}
const joy = { on: false, x: 0, y: 0 };
const ptrs = new Map(); let drag = null, pinch0 = 0;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
cv3.addEventListener('pointerdown', e => { if (!playing) return; audioInit(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, yaw: camYaw, moved: false }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); drag = null; } cv3.setPointerCapture(e.pointerId); });
cv3.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) camDist = clamp(camDist * pinch0 / d, 650, 2400); pinch0 = d; return; }
  if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 7 || Math.abs(e.clientY - drag.y) > 7) drag.moved = true; if (drag.moved) camYaw = drag.yaw - dx * 0.006; }
});
cv3.addEventListener('pointerup', e => { ptrs.delete(e.pointerId); if (drag && !drag.moved && ptrs.size === 0) tap(e.clientX, e.clientY); if (ptrs.size === 0) drag = null; pinch0 = 0; });
cv3.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); drag = null; });
cv3.addEventListener('wheel', e => { e.preventDefault(); camDist = clamp(camDist * (1 + Math.sign(e.deltaY) * 0.1), 650, 2400); }, { passive: false });
function tap(cx, cy) {
  const r = cv3.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const padHits = ray.intersectObjects(WLD.pads.filter(p => p.f === viewFloor).map(p => p.m), true);
  if (padHits.length) { let o = padHits[0].object; while (o && !WLD.pads.find(p => p.m === o)) o = o.parent; const pd = WLD.pads.find(p => p.m === o); if (pd) { buy(pd); return; } }
  if (WLD.money && viewFloor === 0) { const regHit = ray.intersectObject(WLD.money.parent, true); if (regHit.length) { if (save.register > 0) collectRegister(false); goalCheck(); return; } }
  const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY(viewFloor)); const pt = new THREE.Vector3();
  if (ray.ray.intersectPlane(pl, pt) && SIM.avatar) {
    const f = viewFloor; let x = clamp(pt.x, -485, 485), z = clamp(pt.z, f === 0 ? -180 : -385, f === 0 ? 420 : 385);
    route(SIM.avatar, x, z, f);
    marker.position.set(x, floorY(f) + 2, z); marker.visible = true; marker.userData.t = 0.8;
  }
}
let marker;
$('#joy').addEventListener('pointerdown', e => { joy.on = true; joy.id = e.pointerId; $('#joy').setPointerCapture(e.pointerId); moveJoy(e); });
$('#joy').addEventListener('pointermove', e => { if (joy.on) moveJoy(e); });
const endJoy = () => { joy.on = false; joy.x = joy.y = 0; $('#joy-k').style.transform = ''; };
$('#joy').addEventListener('pointerup', endJoy); $('#joy').addEventListener('pointercancel', endJoy);
function moveJoy(e) { const r = $('#joy').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = Math.abs(dx) > 0.15 ? dx : 0; joy.y = Math.abs(dy) > 0.15 ? dy : 0; $('#joy-k').style.transform = 'translate(' + dx * 30 + 'px,' + dy * 30 + 'px)'; }

/* ---------- render ---------- */
const _v = new THREE.Vector3();
function proj(x, y, z) { _v.set(x, y, z).project(camera); if (_v.z > 1) return null; return { x: (_v.x + 1) / 2 * W, y: (1 - _v.y) / 2 * H }; }
function drawOverlay() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // pedidos en espera
  for (const t of SIM.tables) {
    if (t.f !== viewFloor) continue;
    if (t.party && (t.party.state === 'wait' || t.party.state === 'order')) {
      const s = proj(t.x, floorY(t.f) + 95, t.z); if (!s) continue;
      const pa = t.party, txt = pa.state === 'order' ? '...' : (DISH[pa.dishes[0]].name + (pa.orders.length > 1 ? ' +' + (pa.orders.length - 1) : ''));
      ctx.font = '800 12px Rubik, sans-serif'; const w = ctx.measureText(txt).width + 34;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; rr(s.x - w / 2, s.y - 13, w, 26, 13); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      const pc = clamp(pa.patience / 100, 0, 1); ctx.strokeStyle = pc > 0.5 ? '#19D46E' : pc > 0.25 ? '#FFB800' : '#FF3B30'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(s.x - w / 2 + 14, s.y, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pc); ctx.stroke();
      ctx.fillStyle = INK; ctx.fillText(txt, s.x + 8, s.y + 1);
    } else if (t.dirty) { const s = proj(t.x, floorY(t.f) + 60, t.z); if (s) { ctx.font = '800 11px Rubik, sans-serif'; ctx.fillStyle = '#8B5E3C'; rr(s.x - 26, s.y - 10, 52, 20, 10); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.fillText('Sucia', s.x, s.y + 1); } }
  }
  const ready = SIM.orders.filter(o => o.status === 'ready' && o.kind !== 'delivery').length;
  if (ready && viewFloor === 0) { const s = proj(-120, 90, PASS_Z); if (s) { ctx.font = '800 13px Rubik, sans-serif'; const txt = ready + (ready === 1 ? ' plato listo' : ' platos listos'); const w = ctx.measureText(txt).width + 22; ctx.fillStyle = '#FFE14D'; rr(s.x - w / 2, s.y - 13, w, 26, 13); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = INK; ctx.fillText(txt, s.x, s.y + 1); } }
  if (save.register > 0 && viewFloor === 0) { const s = proj(REG.x, 120, REG.z); if (s) { ctx.font = '15px ' + FONT_D; const txt = soles(save.register); const w = ctx.measureText(txt).width + 24; const bob = Math.sin(SIM.t * 5) * 3; ctx.fillStyle = '#19D46E'; rr(s.x - w / 2, s.y - 15 + bob, w, 30, 15); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = '#FFF'; ctx.fillText(txt, s.x, s.y + 1 + bob); } }
  if (viewFloor === 0) for (const c of SIM.cars) if (c.state === 'in' && c.ordered) { const s = proj(-615, 80, c.z); if (s) { const pc = c.patience / 100; ctx.strokeStyle = pc > 0.5 ? '#19D46E' : pc > 0.25 ? '#FFB800' : '#FF3B30'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, s.y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pc); ctx.stroke(); } }
  for (const f of SIM.fx) {
    let x = f.x, y = f.y, z = f.z;
    if (f.type === 'fly') { if (f.t < 0) continue; const k = f.t / f.life; x = lerp(f.x, f.tx, k); z = lerp(f.z, f.tz, k); y = lerp(f.y, f.ty, k) + Math.sin(k * Math.PI) * 80; }
    const s = proj(x, y, z); if (!s) continue;
    if (f.type === 'dust') { ctx.fillStyle = 'rgba(200,190,170,' + (1 - f.t / f.life).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 7 + f.t * 14, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#FFE14D'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  for (const t of SIM.texts) {
    const s = proj(t.x, t.y, t.z); if (!s) continue;
    const k = t.t / t.life; ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.font = (t.size > 16 ? t.size + 'px ' + FONT_D : '800 ' + t.size + 'px Rubik, sans-serif');
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText(t.text, s.x, s.y); ctx.fillStyle = t.color; ctx.fillText(t.text, s.x, s.y);
  }
  ctx.globalAlpha = 1;
  if (SIM.avatar && SIM.avatar.carry) { const a = SIM.avatar, s = proj(a.x, a.y + 65, a.z); if (s) { ctx.font = '800 12px Rubik, sans-serif'; ctx.fillStyle = '#FF2E88'; const txt = DISH[a.carry.dish].name; const w = ctx.measureText(txt).width + 18; rr(s.x - w / 2, s.y - 11, w, 22, 11); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.fillText(txt, s.x, s.y + 1); } }
}
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poseAll(t) {
  for (const p of SIM.people) {
    const m = p.model; if (!m) continue;
    const f = floorOfY(p.y); m.visible = f <= viewFloor && (p.model.visible !== false || p.role !== 'repartidor') && !(p.role === 'repartidor' && p.state === 'riding');
    m.position.set(p.x, p.y + (p.seated ? 4 : 0), p.z); m.rotation.y = -p.ang;
    posePerson(m, p.phase, !!p.walking, false, t + p.id, !!p.seated, {});
    const u = m.userData;
    if (p.role === 'cocinero' && p.cooking) { u.arms[0].rotation.x = u.arms[1].rotation.x = 1.1 + Math.sin(t * 12 + p.id) * 0.35; u.fores[0].rotation.x = u.fores[1].rotation.x = 0.6; }
    if (p.carryM) { u.arms[0].rotation.x = u.arms[1].rotation.x = 1.25; u.fores[0].rotation.x = u.fores[1].rotation.x = 0.35; }
    if (p.cleaning) { u.arms[1].rotation.x = 1.1; u.arms[1].rotation.z = Math.sin(t * 14) * 0.6; }
    if (p.role === 'cajero') { u.arms[0].rotation.x = u.arms[1].rotation.x = 0.8; }
    if (p.party && p.party.state === 'eating' && p.seated) { u.arms[1].rotation.x = 1.2 + Math.sin(t * 6 + p.id) * 0.4; u.fores[1].rotation.x = 1.2; }
    if (p.party && p.party.state === 'wait' && p.seated && p.party.patience < 30) { u.head.rotation.y = Math.sin(t * 8 + p.id) * 0.5; }
    p.walking = false; p.cleaning = false;
  }
  if (SIM.avatar) SIM.avatar.cleaning = false;
}
function updateLighting() {
  const h = hourNow();
  const dayK = clamp((19.2 - h) / 1.4, 0, 1);
  const dusk = clamp(1 - Math.abs(h - 18.6) / 1.2, 0, 1);
  sun.intensity = 0.25 + 1.65 * dayK; hemi.intensity = 0.55 + 0.8 * dayK;
  sun.color.setRGB(1, lerp(0.75, 0.94, dayK), lerp(0.55, 0.86, dayK));
  hemi.color.setRGB(lerp(0.45, 0.92, dayK), lerp(0.42, 0.94, dayK), lerp(0.6, 0.96, dayK));
  const key = Math.round(dayK * 6) + '_' + Math.round(dusk * 3);
  if (updateLighting.k !== key) { updateLighting.k = key; if (dayK > 0.8) sky('#9FB3C6', '#D4D9DE'); else if (dayK > 0.3) sky('#D9795A', '#F2B38A'); else sky('#141A30', '#3A3350'); scene.fog = new THREE.Fog(dayK > 0.3 ? 0xd4d9de : 0x2a2a40, 2600, 6500); }
  for (const lm of WLD.lampMats) { if (lm.isSprite) lm.material.opacity = (1 - dayK) * 0.9; }
}
function updatePops(dt) {
  for (const p of WLD.pops) { p.t += dt; if (p.t < 0) continue; const k = Math.min(1, p.t / 0.55); const e = 1 + Math.sin(k * Math.PI * 1.5) * (1 - k) * 0.5; p.obj.scale.setScalar(Math.max(0.001, k * e)); }
  WLD.pops = WLD.pops.filter(p => p.t < 0.6); for (const p of WLD.pops) if (p.t >= 0.6) p.obj.scale.setScalar(1);
  for (const pd of WLD.pads) { const u = pd.m.userData; u.ring.rotation.z += dt * 1.5; u.lab.position.y = 70 + Math.sin(SIM.t * 3 + pd.x) * 4; pd.m.visible = pd.f === viewFloor; }
  for (const st of WLD.steam) { st.position.y = 70 + (SIM.t * 30 % 40); st.material.opacity = 0.35 * (1 - (SIM.t * 30 % 40) / 40); }
  if (marker && marker.visible) { marker.userData.t -= dt; marker.scale.setScalar(1 + (0.8 - marker.userData.t)); marker.material.opacity = Math.max(0, marker.userData.t); if (marker.userData.t <= 0) marker.visible = false; }
  for (const d of WLD.deco[0].concat(WLD.deco[1] || [])) if (d.userData.fish) d.userData.fish.forEach((fsh, i) => { fsh.position.z = Math.sin(SIM.t * 0.7 + i) * 55; fsh.rotation.y = Math.cos(SIM.t * 0.7 + i) > 0 ? 0 : Math.PI; });
}
function updateCamera(dt) {
  const a = SIM.avatar;
  const tx = a ? a.x * 0.8 : 0, tz = a ? a.z * 0.8 + 40 : 60, ty = floorY(viewFloor);
  camT.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.exp(-dt * 3));
  camP.set(camT.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, camT.y + Math.sin(camPitch) * camDist, camT.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
  camera.position.copy(camP);
  if (shake > 0 && !REDUCED) { camera.position.x += rand(-1, 1) * shake; camera.position.y += rand(-1, 1) * shake; shake = Math.max(0, shake - dt * 30); }
  camera.lookAt(camT);
  sun.position.set(camT.x - 700, 1400, camT.z + 500); sun.target.position.copy(camT);
}

/* ---------- pantallas ---------- */
function showTitle() {
  $('#title').hidden = false; playing = false; stage.classList.add('intitle'); if (panel) { panel = null; renderPanel(); }
  $('#t-name').value = save.name;
  $('#t-go').textContent = save.started ? 'Continuar' : 'Abrir mi restaurante';
  $('#t-sub').textContent = save.started ? 'Día ' + save.day + ', ' + totalTables() + ' mesas, ' + save.rating.toFixed(1) + ' estrellas.' : 'Empieza con un local chico y conviértelo en el restaurante más famoso de Lima.';
}
$('#t-go').addEventListener('click', () => {
  audioInit(); SFX.click();
  const nm = $('#t-name').value.trim(); if (nm && nm !== save.name) { save.name = nm.slice(0, 26); rebuildAll(); }
  const first = !save.started; save.started = true;
  $('#title').hidden = true; playing = true; stage.classList.remove('intitle'); persist();
  if (first) setTimeout(() => banner('¡Bienvenido a ' + save.name + '!', 'Tu cocinero ya está listo. Cuando salga un plato, llévalo a la mesa.'), 400);
});
onDayEnd = log => {
  const el = $('#dayend');
  const profit = log.income - log.costs - log.wages;
  el.innerHTML = '<div class="dcard"><small>Fin del día ' + log.day + '</small><h2>' + (profit > 0 ? '¡Buen día!' : 'Día difícil') + '</h2>' +
    '<dl><dt>Ventas</dt><dd>' + soles(log.income) + '</dd><dt>Propinas incluidas</dt><dd>' + soles(log.tips) + '</dd><dt>Ingredientes</dt><dd>-' + soles(log.costs) + '</dd><dt>Sueldos del personal</dt><dd>-' + soles(log.wages) + '</dd><dt class="tot">Ganancia</dt><dd class="tot ' + (profit >= 0 ? 'pos' : 'neg') + '">' + soles(profit) + '</dd>' +
    '<dt>Platos servidos</dt><dd>' + log.served + '</dd><dt>Clientes que se fueron</dt><dd>' + log.lost + '</dd><dt>Calificación</dt><dd>' + log.rating.toFixed(1) + ' ★</dd></dl>' +
    (log.lost > 3 ? '<p class="tip">Se fueron ' + log.lost + ' clientes por falta de mesas: compra más.</p>' : '') + '<button class="b g big" id="d-ok">Siguiente día</button></div>';
  el.hidden = false; SFX.cash();
  el.querySelector('#d-ok').onclick = () => { el.hidden = true; SFX.click(); goalCheck(); };
};
function offlineEarnings() {
  if (!save.started) return;
  const gap = (Date.now() - (save.lastT || Date.now())) / 1000;
  if (gap < 90 || (save.profitEma || 0) <= 0) return;
  const earn = Math.round(save.profitEma * Math.min(gap, 8 * 3600) / DAY_LEN * 0.22);
  if (earn < 5) return;
  save.money += earn; persist();
  const hrs = Math.floor(gap / 3600), mins = Math.floor(gap % 3600 / 60);
  $('#dayend').innerHTML = '<div class="dcard"><small>Mientras no estabas</small><h2>Tu restaurante siguió vendiendo</h2><p class="big-money">+' + soles(earn) + '</p><p class="tip">Estuviste fuera ' + (hrs ? hrs + ' h ' : '') + mins + ' min. Tu personal atendió solo (hasta 8 horas).</p><button class="b g big" id="d-ok">¡Genial!</button></div>';
  $('#dayend').hidden = false; $('#dayend').querySelector('#d-ok').onclick = () => { $('#dayend').hidden = true; SFX.cash(); };
}

/* ---------- botones ---------- */
document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => { audioInit(); openPanel(b.dataset.panel); }));
document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => { viewFloor = +b.dataset.floor; SFX.click(); if (SIM.avatar && floorOfY(SIM.avatar.y) !== viewFloor) route(SIM.avatar, viewFloor === 0 ? 0 : 0, 100, viewFloor); }));
$('#h-reg').addEventListener('click', () => { if (save.register > 0) { collectRegister(false); goalCheck(); } });
$('#h-speed').addEventListener('click', () => { save.speed = save.speed >= 3 ? 1 : save.speed + 1; SFX.click(); });
$('#h-menu').addEventListener('click', () => { persist(); showTitle(); });

/* ---------- bucle ---------- */
let last = performance.now(), saveT = 0;
function frame(t) {
  let dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
  if (playing && $('#dayend').hidden) {
    readMove();
    const sdt = dt * save.speed;
    for (let k = 0; k < save.speed; k++) updateSim(dt);
    updateAvatar(sdt / save.speed * save.speed, camYaw);
    const af = SIM.avatar ? floorOfY(SIM.avatar.y) : 0; if (SIM.avatar && !SIM.avatar.path.length && af !== viewFloor && (MOVE.x || MOVE.z)) viewFloor = af;
    if (SIM.avatar && SIM.avatar.path.length && SIM.avatar.path[SIM.avatar.path.length - 1].y !== floorY(viewFloor) && floorOfY(SIM.avatar.y) === floorOfY(SIM.avatar.path[SIM.avatar.path.length - 1].y)) viewFloor = floorOfY(SIM.avatar.y);
    // pads pisados
    const a = SIM.avatar;
    if (a) for (const pd of WLD.pads) { if (pd.f === floorOfY(a.y) && Math.hypot(a.x - pd.x, a.z - pd.z) < 36) { pd.dwell += dt; if (pd.dwell > 0.45 && !pd.done) { pd.done = true; if (!buy(pd)) setTimeout(() => { pd.done = false; pd.dwell = 0; }, 1500); } } else pd.dwell = 0; }
    refreshPads(false);
    updateHUD(dt);
    saveT += dt; if (saveT > 8) { saveT = 0; persist(); goalCheck(); }
  } else if (!playing) { SIM.t += dt; camYaw += dt * 0.05; }
  updateMoneyPile(save.register);
  for (let f = 0; f < WLD.floors.length; f++) WLD.floors[f].visible = f <= viewFloor;
  updatePops(dt); updateLighting(); poseAll(SIM.t); updateCamera(dt);
  renderer.render(scene, camera);
  drawOverlay();
  requestAnimationFrame(frame);
}

/* ---------- arranque ---------- */
isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
stage.classList.toggle('touch', isTouch);
loadSave(); resize();
function boot() {
  initTextures(); initMats(); initEnv();
  rebuildWorld(); syncTables(); syncStaff(); makeAvatar();
  marker = new THREE.Mesh(new THREE.RingGeometry(12, 18, 24), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 1, depthWrite: false })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  refreshPads(true);
  document.body.classList.add('ready');
  showTitle(); offlineEarnings();
  requestAnimationFrame(frame);
}
const fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('800 16px Rubik')]) : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 1800))]).then(boot, boot);
window.__rt = { get save() { return save; }, SIM, WLD, buy, padList, updateSim, updateAvatar, collectRegister, route, openPanel, frame: () => frame(performance.now()), start() { $('#t-go').click(); } };
