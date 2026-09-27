/* ================== SIMULACIÓN ================== */
const SIM = { t: 0, people: [], orders: [], fx: [], texts: [], tables: [], queue: [], cars: [], dirt: [[], [], []], plates: [], spawnT: 1, carT: 8, delT: 10, wallT: 0, avatar: null, nextId: 1, rides: [], ended: false };
const SKIN = ['#8D5A3B', '#A56B45', '#C68A5E', '#7A4B2E', '#B97A56', '#D9A37A'], HAIR = ['#1A1110', '#2B1B14', '#3A2A20', '#140E0C', '#5A3A26', '#8A7A6A'], SHIRT = ['#E23B3B', '#2E6BFF', '#19A35A', '#F2C230', '#FFFFFF', '#7B3FF2', '#FF7A1A', '#23324A', '#C9C3B6', '#FF2E88', '#3C8D93', '#8B5E3C'], PANT = ['#2A3550', '#23324A', '#3B3B3B', '#5A4632', '#1E2A3A'];
const NAMES = ['Doña Rosa', 'Don Julio', 'Kevin', 'Milagros', 'Jorge', 'Señora Carmen', 'Lucía', 'El contador', 'Valeria', 'Renzo', 'Pedro', 'Ana', 'Brayan', 'Sofía', 'Martín', 'Kiara', 'Don Aurelio'];
function randLook() { const l = { kind: 'normal', skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), pants: pick(PANT), hat: null, scale: 1 }; if (chance(0.2)) { l.hat = 'gorra'; l.hatColor = pick(SHIRT); } if (chance(0.15)) l.bag = pick(['#3B2A20', '#1E2A3A', '#6B2E2E']); return l; }
function staffLook(role) { const R = ROLES[role]; return { kind: 'staff', skin: pick(SKIN), hair: pick(HAIR), shirt: R.shirt, pants: R.pants, hat: R.hat, hatColor: R.hatColor, vest: R.vest, apron: role === 'cocinero' ? '#F4F4F2' : null, scale: 1 }; }
const floorOfY = y => clamp(Math.round(y / FLOOR_H - 0.25), 0, 2);

/* ---------- personas y caminos ---------- */
function spawnPerson(role, look, x, y, z) {
  const m = makePerson(look); bake(m); WLD.root.add(m);
  const p = { id: SIM.nextId++, role, look, model: m, x, y, z, path: [], speed: role === 'cust' ? rand(85, 110) : 135, state: 'idle', ang: 0, phase: Math.random() * 6, t: 0, carry: null, carryM: null, seated: false };
  SIM.people.push(p); return p;
}
function removePerson(p) { if (p.model) WLD.root.remove(p.model); if (p.carryM && p.carryM.parent) p.carryM.parent.remove(p.carryM); SIM.people = SIM.people.filter(q => q !== p); }
// Camino que usa la escalera cuando el destino está en otro piso
function route(p, x, z, f) {
  const pts = [], cf = floorOfY(p.y);
  let cur = cf;
  const land = sx => sx > 0 ? 340 : -340;
  while (cur < f) { const sx = stairX(cur); pts.push({ x: sx, y: floorY(cur), z: STAIR.z0 + 20 }, { x: sx, y: floorY(cur + 1), z: STAIR.z1 - 8 }, { x: land(sx), y: floorY(cur + 1), z: STAIR.z1 - 4 }); cur++; }
  while (cur > f) { const sx = stairX(cur - 1); pts.push({ x: land(sx), y: floorY(cur), z: STAIR.z1 - 4 }, { x: sx, y: floorY(cur), z: STAIR.z1 - 8 }, { x: sx, y: floorY(cur - 1), z: STAIR.z0 + 20 }); cur--; }
  pts.push({ x, y: floorY(f), z });
  p.path = pts;
}
function stepPath(p, dt) {
  if (!p.path.length) return true;
  const tg = p.path[0], dx = tg.x - p.x, dz = tg.z - p.z, dy = tg.y - p.y;
  const d = Math.hypot(dx, dz, dy * 0.6);
  const sp = p.speed * dt;
  if (d <= sp) { p.x = tg.x; p.z = tg.z; p.y = tg.y; p.path.shift(); return !p.path.length; }
  p.x += dx / d * sp; p.z += dz / d * sp; p.y += dy / d * sp;
  if (Math.abs(dx) + Math.abs(dz) > 0.5) p.ang = Math.atan2(dx, -dz);
  p.phase += dt * 10; p.walking = true;
  return false;
}
function carryPlate(p, dish) {
  const g = new THREE.Group(); setFood(g, dish); g.position.set(0, 30, -9); p.model.add(g); p.carryM = g;
}
function dropPlate(p) { if (p.carryM && p.carryM.parent) p.carryM.parent.remove(p.carryM); p.carryM = null; p.carry = null; }

/* ---------- mesas ---------- */
function syncTables() {
  const old = SIM.tables; SIM.tables = [];
  for (let f = 0; f < save.floors; f++) for (let i = 0; i < save.tables[f]; i++) {
    const prev = old.find(t => t.f === f && t.i === i);
    const [x, z] = SLOTS[f][i];
    const t = prev || { f, i, x, z, party: null, dirty: false, cleanP: 0 };
    t.cap = tableCap(f, i);
    SIM.tables.push(t);
  }
}
// Sillas: 0 adelante, 1 atrás, 2 izquierda, 3 derecha (las dos últimas solo en mesas para 4)
function seatPos(t, s) {
  const d = seatDist(t.cap);
  if (s === 2) return { x: t.x - d, z: t.z, ang: Math.PI / 2 };
  if (s === 3) return { x: t.x + d, z: t.z, ang: -Math.PI / 2 };
  return { x: t.x, z: t.z + (s ? -d : d), ang: s ? Math.PI : 0 };
}
// Esquina libre de la mesa donde se para el mozo para atender la silla s
function waiterSpot(t, s) { const k = seatDist(t.cap) * 0.8; return { x: t.x + (s === 2 ? -k : k), z: t.z + (s === 1 || s === 3 ? -k : k) }; }
// Mesa libre donde entre el grupo; se prefiere la más chica que alcance
function freeTable(n) { const opts = SIM.tables.filter(t => !t.party && !t.dirty && t.cap >= (n || 1)); if (!opts.length) return null; opts.sort((a, b) => a.cap - b.cap || a.f - b.f || Math.random() - 0.5); return opts[0]; }

/* ---------- ratings ---------- */
function cartaScore() { const n = save.menu.length; return clamp(1 + (n >= 11 ? 4 : n >= 8 ? 3.2 : n >= 5 ? 2.4 : n >= 3 ? 1.6 : 0.8) + PRICE_LVL[save.price].carta, 1, 5); }
function decoScore(f) { const nt = Math.max(2, save.tables[f]); return clamp(1.2 + decoPts(f) / ((3 + nt * 1.1) * DIST().decoNeed) * 3.6, 1, 5); }
function cleanScore(f) { const dirtyT = SIM.tables.filter(t => t.f === f && t.dirty).length, spots = SIM.dirt[f].length; return clamp(5 - dirtyT * 0.9 - spots * 0.5, 1, 5); }
const COMMENTS = {
  food: [['¡Riquísimo el {d}!', '¡El mejor {d} de Lima!', 'Volveré por ese {d}.'], ['El {d} estaba bien.', 'Buen sabor, nada del otro mundo.'], ['El {d} llegó frío.', 'Esperé demasiado mi {d}.', 'Muy lento el servicio.']],
  clean: ['Las mesas estaban sucias.', 'El piso estaba cochino.', '¿Nadie limpia aquí?'],
  deco: ['El local se ve muy simple.', 'Le falta decoración.', 'Qué local tan bonito.', 'Me encantó el ambiente.'],
  carta: ['Pocos platos en la carta.', 'Muy caro para lo que es.', '¡Qué buena carta!'],
};
function makeReview(party, waited, angry) {
  const f = party.table ? party.table.f : 0;
  const dish = party.dishes && party.dishes[0];
  const noPollo = eventOn('partido') && !save.menu.includes('pollo');
  const food = angry ? 1 : clamp(2.2 + recipeLvl(dish) * 0.6 + (waited < 14 ? 1.3 : waited < 26 ? 0.6 : waited < 38 ? 0 : -1) - (noPollo ? 1.2 : 0), 1, 5);
  const carta = cartaScore(), deco = decoScore(f), clean = cleanScore(f);
  const dw = DIST().decoW, overall = angry ? 1 : (food * 0.4 + carta * 0.2 + deco * dw + clean * 0.2) / (0.8 + dw);
  let text;
  const worst = [['food', food], ['clean', clean], ['deco', deco], ['carta', carta]].sort((a, b) => a[1] - b[1])[0];
  if (angry) text = dish ? pick(['¡Me cansé de esperar!', 'Nunca me trajeron mi pedido.', 'Pésimo servicio.']) : pick(['Nadie vino a tomarme el pedido.', '¿Hay mozos aquí o qué?', 'Me ignoraron todo el rato.']);
  else if (overall >= 4.3) text = pick(COMMENTS.food[0]).replace('{d}', DISH[dish].name.toLowerCase());
  else if (worst[1] < 2.6) text = worst[0] === 'food' ? pick(COMMENTS.food[2]).replace('{d}', DISH[dish].name.toLowerCase()) : worst[0] === 'clean' ? pick(COMMENTS.clean) : worst[0] === 'deco' ? pick(COMMENTS.deco.slice(0, 2)) : pick(COMMENTS.carta.slice(0, 2));
  else text = pick(COMMENTS.food[1]).replace('{d}', DISH[dish].name.toLowerCase());
  if (noPollo && !angry && chance(0.6)) text = pick(['¿Día de partido y sin pollo a la brasa?', 'Vine por un pollito y no había.', 'Sin pollo a la brasa no es lo mismo.']);
  const r = { name: party.critic ? 'Crítico gastronómico' : pick(NAMES), stars: Math.round(overall * 10) / 10, food, carta, deco, clean, text, day: save.day, critic: !!party.critic };
  save.reviews.unshift(r); if (save.reviews.length > 40) save.reviews.length = 40;
  // la reseña del crítico pesa como 10
  save.rating = clamp(lerp(save.rating, overall, party.critic ? 0.52 : 0.07), 1, 5);
  if (party.critic && save.event) save.event.review = { stars: r.stars, text: r.text };
  return r;
}

/* ---------- pedidos y cocina ---------- */
function newOrder(dish, kind, ref) {
  const o = { id: SIM.nextId++, dish, kind, ref, status: 'queue', t0: SIM.t, cookT: 0, station: -1, plateM: null, claimed: null };
  SIM.orders.push(o);
  const c = DISH[dish].cost; save.money -= c; save.dayLog.costs += c;
  if (dish === 'pollo' && eventOn('partido')) save.event.pollos = (save.event.pollos || 0) + 1;
  return o;
}
function cookSpeed() { return 1 + (save.train.cocinero || 0) * 0.28; }
function staffSpeed(role) { return 1 + (save.train[role] || 0) * 0.22; }
function updateKitchen(dt) {
  const cooks = SIM.people.filter(p => p.role === 'cocinero');
  if (SIM.blackout) { for (const ck of cooks) ck.cooking = false; return; }
  for (const ck of cooks) {
    const st = ck.station;
    const busy = SIM.orders.find(o => o.status === 'cooking' && o.station === st);
    if (busy) { busy.cookT += dt * cookSpeed(); ck.cooking = true; if (busy.cookT >= DISH[busy.dish].cook) { busy.status = 'ready'; busy.readyT = SIM.t; const pg = new THREE.Group(); setFood(pg, busy.dish); pg.position.set(STATION_X[st] + rand(-20, 20), 41, PASS_Z); WLD.floors[0].add(pg); busy.plateM = pg; SFX.bell(); } }
    else { ck.cooking = false; const next = SIM.orders.filter(o => o.status === 'queue').sort((a, b) => a.t0 - b.t0)[0]; if (next) { next.status = 'cooking'; next.station = st; } }
  }
}
function pickPoint(o) { return { x: STATION_X[o.station] || 0, z: PICK_Z }; }
function takePlate(p, o) { o.status = 'carried'; o.claimed = p; if (o.plateM && o.plateM.parent) o.plateM.parent.remove(o.plateM); o.plateM = null; p.carry = o; carryPlate(p, o.dish); SFX.pick(); }
function serveOrder(p, o) {
  dropPlate(p); o.status = 'done';
  if (o.kind === 'table') {
    const party = o.ref; const t = party.table;
    const seat = party.members.findIndex(m => m.dishes && m.dishes.includes(o.dish) && !m.served && true);
    const mi = seat >= 0 ? seat : party.members.findIndex(m => !m.served);
    const mem = party.members[Math.max(0, mi)]; if (mem) mem.served = true;
    const tm = WLD.tables[t.f][t.i], foods = tm ? tm.userData.food : []; const fg = foods[Math.max(0, mi) % Math.max(1, foods.length)]; if (fg) { setFood(fg, o.dish); fg.visible = true; }
    party.servedN = (party.servedN || 0) + 1;
    if (party.servedN >= party.orders.length) { party.state = 'eating'; party.t = rand(7, 11); party.waited = SIM.t - party.orderT; }
    save.stats.served++; save.dayLog.served++;
    SFX.serve();
    floatText(t.x, floorY(t.f) + 60, t.z, '¡Buen provecho!', '#FFFFFF', 13);
  }
}

/* ---------- clientes ---------- */
function spawnWalker() {
  const dir = chance(0.5) ? 1 : -1;
  const p = spawnPerson('walker', randLook(), -dir * 1500, 8, 455 + rand(-20, 20));
  p.dir = dir; p.state = 'walk'; p.path = [{ x: dir * 1500, y: 8, z: p.z }];
  const h = hourNow();
  const D = DIST();
  const peak = 0.35 + 0.9 * Math.exp(-Math.pow((h - 13) / 1.4, 2)) + 0.8 * D.dinner * Math.exp(-Math.pow((h - 20) / 1.6, 2));
  const pEnter = clamp(0.3 + (save.rating - 3) * 0.16, 0.1, 0.85) * Math.pow(PRICE_LVL[save.price].flow, D.priceSens) * Math.min(1.3, peak) * (h > 22.6 ? 0 : 1);
  const evMul = eventOn('feriado') ? 1.3 : eventOn('partido') ? 1.2 : SIM.blackout ? 0.6 : 1;
  p.wants = chance(pEnter * evMul);
  // grupos de 3 o 4 solo vienen si hay mesas para 4
  const r = Math.random();
  p.party = SIM.tables.some(t => t.cap === 4) ? (r < 0.35 ? 1 : r < 0.7 ? 2 : r < 0.86 ? 3 : 4) : (r < 0.45 ? 2 : 1);
}
function hourNow() { return 11 + save.dayT / DAY_LEN * 12; }
function updateWalker(p, dt) {
  if (p.state === 'walk') {
    if (p.wants && Math.abs(p.x - DOOR.x) < 40) {
      p.wants = false;
      const t = freeTable(p.party);
      if (t) seatParty(p, t);
      else if (p.critic) { p.state = 'queue'; SIM.queue.unshift(p); SIM.queue.forEach((q, k) => { q.path = [{ x: 90 + (k + 1) * 40, y: 8, z: 430 }]; }); } // el crítico no se va sin intentar: se pone primero en la cola
      else if (SIM.queue.length < 4) { p.state = 'queue'; SIM.queue.push(p); p.path = [{ x: 90 + SIM.queue.length * 40, y: 8, z: 430 }]; }
      else { save.stats.lost++; save.dayLog.lost++; floatText(p.x, 60, p.z, 'No hay mesas...', '#FF8FB8', 13); if (p.critic) criticLost(); }
      return;
    }
    if (stepPath(p, dt)) removePerson(p);
  } else if (p.state === 'queue') {
    stepPath(p, dt);
    p.qT = (p.qT || 0) + dt;
    if (SIM.queue[0] === p) { const t = freeTable(p.party); if (t) { SIM.queue.shift(); SIM.queue.forEach((q, k) => { q.path = [{ x: 90 + (k + 1) * 40, y: 8, z: 430 }]; }); seatParty(p, t); return; } }
    if (p.qT > 40) { SIM.queue = SIM.queue.filter(q => q !== p); save.stats.lost++; save.dayLog.lost++; floatText(p.x, 60, p.z, '¡Me voy!', '#FF8FB8', 13); if (p.critic) criticLost(); p.state = 'walk'; p.path = [{ x: 1500, y: 8, z: 455 }]; }
  }
}
function seatParty(p, t) {
  const party = { id: SIM.nextId++, table: t, members: [], orders: [], state: 'toTable', t: 0, patience: 100, critic: !!p.critic };
  t.party = party;
  const n = p.party;
  const mem0 = p; mem0.role = 'cust'; mem0.party = party; party.members.push(mem0);
  for (let k = 1; k < n; k++) { const q = spawnPerson('cust', randLook(), p.x + 30 * k, p.y, p.z + (k % 2) * 16); q.party = party; party.members.push(q); }
  party.members.forEach((m, k) => { m.state = 'toTable'; m.seat = k; const sp = seatPos(t, k); m.path = [{ x: DOOR.x, y: 8, z: 430 }, { x: DOOR.x, y: 0, z: 360 }]; const tail = []; const tmp = { x: 0, y: 0, z: 360, path: [] }; route(tmp, sp.x, sp.z, t.f); m.path = m.path.concat(tmp.path); });
  save.stats.customers += n;
}
function updateParty(party, dt) {
  const t = party.table;
  if (party.state === 'toTable') {
    let all = true;
    for (const m of party.members) { if (!m.seated) { if (stepPath(m, dt)) { m.seated = true; const sp = seatPos(t, m.seat); m.ang = sp.ang; m.x = sp.x; m.z = sp.z; } else all = false; } }
    if (all) { party.state = 'order'; party.t = 1.2; }
  } else if (party.state === 'order') {
    // miran la carta y luego llaman al mozo
    party.t -= dt;
    if (party.t <= 0) { party.state = 'callWaiter'; party.callT = SIM.t; party.takeP = 0; }
  } else if (party.state === 'callWaiter') {
    party.patience -= dt * 1.2;
    if (party.patience <= 0) { leaveParty(party, true); }
  } else if (party.state === 'wait') {
    party.patience -= dt * (1.9 - (save.decor[t.f] && save.decor[t.f].parlante ? DIST().music : 0));
    if (party.patience <= 0) { leaveParty(party, true); }
  } else if (party.state === 'eating') {
    party.t -= dt;
    if (party.t <= 0) {
      let total = 0; for (const o of party.orders) total += dishPrice(o.dish);
      const rv = makeReview(party, party.waited || 20, false);
      const tip = rv.stars >= 4.5 ? Math.round(total * 0.15) : rv.stars >= 4 ? Math.round(total * 0.08) : 0;
      save.register += total + tip; save.dayLog.income += total + tip; save.dayLog.tips += tip;
      coinsTo(t.x, floorY(t.f) + 40, t.z);
      floatText(t.x, floorY(t.f) + 70, t.z, '+' + soles(total + tip), '#FFE14D', 17);
      floatText(t.x, floorY(t.f) + 95, t.z, '★'.repeat(Math.round(rv.stars)) + '☆'.repeat(5 - Math.round(rv.stars)), rv.stars >= 4 ? '#FFE14D' : '#FF8FB8', 14);
      leaveParty(party, false);
    }
  } else if (party.state === 'leaving') {
    let gone = true;
    for (const m of party.members) { if (m.model) { if (stepPath(m, dt)) { removePerson(m); } else gone = false; } }
    if (gone) party.state = 'gone';
  }
}
// El mozo (o tú) anota el pedido: recién ahí llega a la cocina
function takeOrder(party) {
  if (party.state !== 'callWaiter') return;
  for (const m of party.members) { const d = pickDish(); m.dishes = [d]; party.orders.push(newOrder(d, 'table', party)); if (chance(0.35)) { const dr = save.menu.find(id => DISH[id].drink); if (dr && d !== dr) { m.dishes.push(dr); party.orders.push(newOrder(dr, 'table', party)); } } }
  party.dishes = party.orders.map(o => o.dish);
  party.state = 'wait'; party.orderT = SIM.t; party.waiter = null;
  save.stats.ordersTaken++;
  const t = party.table; SFX.pick(); floatText(t.x, floorY(t.f) + 70, t.z, '¡Anotado!', '#FFFFFF', 13);
}
function pickDish() { if (eventOn('partido') && save.menu.includes('pollo') && chance(0.8)) return 'pollo'; const foods = save.menu.filter(id => !DISH[id].drink); const pool = foods.length ? foods : save.menu; let tot = 0; for (const id of pool) tot += DISH[id].pop; let r = Math.random() * tot; for (const id of pool) { r -= DISH[id].pop; if (r <= 0) return id; } return pool[0]; }
function leaveParty(party, angry) {
  const t = party.table;
  if (angry) { if (SIM.blackout && save.event) save.event.lostOrders = (save.event.lostOrders || 0) + 1; makeReview(party, 60, true); SFX.angry(); floatText(t.x, floorY(t.f) + 80, t.z, '¡Qué lento! ★☆☆☆☆', '#FF6B6B', 15); for (const o of party.orders) if (o.status !== 'done') { o.status = 'cancel'; if (o.plateM && o.plateM.parent) o.plateM.parent.remove(o.plateM); if (o.claimed) dropPlate(o.claimed); } }
  else { t.dirty = true; const tm = WLD.tables[t.f][t.i]; if (tm) { tm.userData.dirty.visible = true; tm.userData.food.forEach(fg => { fg.visible = false; }); } if (chance(0.3)) addDirt(t.f, t.x + rand(-60, 60), t.z + rand(-60, 60)); }
  const tm = WLD.tables[t.f][t.i]; if (tm && angry) tm.userData.food.forEach(fg => { fg.visible = false; });
  t.party = null; party.waiter = null;
  party.state = 'leaving';
  for (const m of party.members) { m.seated = false; m.state = 'leave'; const tmp = { x: m.x, y: m.y, z: m.z, path: [] }; route(tmp, DOOR.x, 360, 0); m.path = tmp.path.concat([{ x: DOOR.x, y: 8, z: 440 }, { x: chance(0.5) ? 1500 : -1500, y: 8, z: 460 }]); }
}
function addDirt(f, x, z) {
  if (SIM.dirt[f].length > 6) return;
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 10), M('#6B5236', { op: 0.75 })); m.rotation.x = -Math.PI / 2; m.scale.set(rand(10, 18), rand(8, 14), 1); m.position.set(x, 0.8, z); WLD.floors[f].add(m);
  SIM.dirt[f].push({ x, z, m, p: 0 });
}

/* ---------- personal ---------- */
function syncStaff() {
  for (const k of ROLE_KEYS) {
    const want = save.staff[k] || 0;
    let have = SIM.people.filter(p => p.role === k);
    while (have.length < want) {
      let x = 0, z = 0, y = 0;
      if (k === 'cocinero') { x = STATION_X[have.length]; z = COOK_Z; }
      else if (k === 'cajero') { x = REG.x; z = REG.z - 45; }
      else if (k === 'ventana') { x = -465; z = -300; }
      else if (k === 'repartidor') { x = 580; z = 150; }
      else { x = -200 + have.length * 70; z = -140; }
      const p = spawnPerson(k, staffLook(k), x, y, z); p.home = { x, y, z }; p.state = 'idle';
      if (k === 'cocinero') { p.station = have.length; p.ang = 0; }
      if (k === 'cajero') p.ang = Math.PI;
      if (k === 'ventana') p.ang = -Math.PI / 2;
      have = SIM.people.filter(q => q.role === k);
    }
  }
}
function updateStaff(p, dt) {
  const k = p.role;
  p.walking = false;
  if (k === 'cocinero') { p.x = STATION_X[p.station]; p.z = COOK_Z; p.ang = 0; return; }
  if (k === 'cajero') { p.aT = (p.aT || 0) + dt; if (p.aT > 3.5) { p.aT = 0; if (save.register > 0) collectRegister(true); } return; }
  if (k === 'mozo') {
    if (p.state === 'idle') {
      const o = SIM.orders.filter(o2 => o2.status === 'ready' && o2.kind === 'table' && !o2.claimed).sort((a, b) => a.readyT - b.readyT)[0];
      const pa = o ? null : SIM.tables.filter(t => t.party && t.party.state === 'callWaiter' && !t.party.waiter).map(t => t.party).sort((a, b) => a.callT - b.callT)[0];
      if (o) { o.claimed = p; p.job = o; const pp = pickPoint(o); const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, pp.x, pp.z, 0); p.path = tmp.path; p.state = 'toPick'; }
      else if (pa) { pa.waiter = p; p.job = pa; const ws = waiterSpot(pa.table, 0); const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, ws.x, ws.z, pa.table.f); p.path = tmp.path; p.state = 'toOrder'; }
      else if (Math.hypot(p.x - p.home.x, p.z - p.home.z) > 5 || p.y > 1) { if (!p.path.length) { const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, p.home.x, p.home.z, 0); p.path = tmp.path; } p.speed = 135 * staffSpeed('mozo'); stepPath(p, dt); }
    } else if (p.state === 'toOrder' || p.state === 'taking') {
      p.speed = 140 * staffSpeed('mozo');
      const pa = p.job;
      if (pa.state !== 'callWaiter' || pa.waiter !== p) { p.state = 'idle'; p.job = null; p.path = []; return; }
      if (p.state === 'toOrder') { if (stepPath(p, dt)) { p.state = 'taking'; p.t = 1.0 / staffSpeed('mozo'); p.ang = Math.atan2(pa.table.x - p.x, -(pa.table.z - p.z)); } }
      else { p.t -= dt; if (p.t <= 0) { takeOrder(pa); p.state = 'idle'; p.job = null; } }
    } else if (p.state === 'toPick') {
      p.speed = 140 * staffSpeed('mozo');
      if (p.job.status === 'cancel') { p.state = 'idle'; p.job = null; return; }
      if (stepPath(p, dt)) { takePlate(p, p.job); const party = p.job.ref, t = party.table; const mi = party.members.findIndex(m => !m.served); const ws = waiterSpot(t, Math.max(0, mi)); const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, ws.x, ws.z, t.f); p.path = tmp.path; p.state = 'toTable'; }
    } else if (p.state === 'toTable') {
      p.speed = 140 * staffSpeed('mozo');
      if (p.job.status === 'cancel') { dropPlate(p); p.state = 'idle'; p.job = null; return; }
      if (stepPath(p, dt)) { serveOrder(p, p.job); p.job = null; p.state = 'idle'; }
    }
    return;
  }
  if (k === 'limpiador') {
    p.speed = 120 * staffSpeed('limpiador');
    if (p.state === 'idle') {
      const t = SIM.tables.find(t2 => t2.dirty && !t2.cleaner);
      const spots = []; for (let f = 0; f < save.floors; f++) for (const s of SIM.dirt[f]) if (!s.cleaner) spots.push([f, s]);
      if (t) { t.cleaner = p; p.job = { t }; const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, t.x + 45, t.z, t.f); p.path = tmp.path; p.state = 'go'; }
      else if (spots.length) { const [f, s] = spots[0]; s.cleaner = p; p.job = { s, f }; const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, s.x + 16, s.z, f); p.path = tmp.path; p.state = 'go'; }
      else if (!p.path.length && (Math.hypot(p.x - p.home.x, p.z - p.home.z) > 5 || p.y > 1)) { const tmp = { x: p.x, y: p.y, z: p.z, path: [] }; route(tmp, 420, 330, 0); p.path = tmp.path; }
      else stepPath(p, dt);
    } else if (p.state === 'go') {
      if (stepPath(p, dt)) { p.state = 'clean'; p.t = 2.4 / staffSpeed('limpiador'); }
    } else if (p.state === 'clean') {
      p.t -= dt; p.cleaning = true;
      if (p.t <= 0) { p.cleaning = false; if (p.job.t) cleanTable(p.job.t); else cleanSpot(p.job.f, p.job.s); p.job = null; p.state = 'idle'; }
    }
    return;
  }
  if (k === 'ventana') {
    p.speed = 130 * staffSpeed('ventana');
    if (p.state === 'idle') {
      const o = SIM.orders.find(o2 => o2.status === 'ready' && o2.kind === 'drive' && !o2.claimed);
      if (o) { o.claimed = p; p.job = o; const pp = pickPoint(o); p.path = [{ x: pp.x, y: 0, z: -245 }]; p.state = 'toPick'; }
      else { if (!p.path.length && Math.hypot(p.x + 465, p.z + 300) > 5) p.path = [{ x: -465, y: 0, z: -300 }]; stepPath(p, dt); if (!p.path.length) p.ang = -Math.PI / 2; }
    } else if (p.state === 'toPick') { if (stepPath(p, dt)) { takePlate(p, p.job); p.path = [{ x: -465, y: 0, z: -300 }]; p.state = 'toWin'; } }
    else if (p.state === 'toWin') { if (stepPath(p, dt)) { handDrive(p); p.state = 'idle'; } }
    return;
  }
  if (k === 'repartidor') {
    p.speed = 140 * staffSpeed('repartidor');
    if (p.state === 'idle') {
      const d = SIM.deliveries && SIM.deliveries.find(dv => !dv.rider && dv.orders.every(o => o.status === 'ready'));
      if (d) { d.rider = p; p.job = d; d.orders.forEach(o => { o.claimed = p; }); const pp = pickPoint(d.orders[0]); p.path = [{ x: 520, y: 0, z: 440 }, { x: DOOR.x, y: 8, z: 440 }, { x: DOOR.x, y: 0, z: 360 }, { x: pp.x, y: 0, z: pp.z }]; p.state = 'toPick'; }
      else if (!p.path.length && Math.hypot(p.x - p.home.x, p.z - p.home.z) > 5) p.path = [{ x: DOOR.x, y: 0, z: 360 }, { x: DOOR.x, y: 8, z: 440 }, { x: p.home.x, y: 0, z: p.home.z }];
      else stepPath(p, dt);
    } else if (p.state === 'toPick') {
      if (stepPath(p, dt)) { for (const o of p.job.orders) { o.status = 'carried'; if (o.plateM && o.plateM.parent) o.plateM.parent.remove(o.plateM); } carryPlate(p, p.job.orders[0].dish); p.path = [{ x: DOOR.x, y: 0, z: 360 }, { x: DOOR.x, y: 8, z: 440 }, { x: 590, y: 0, z: 180 }]; p.state = 'toMoto'; SFX.pick(); }
    } else if (p.state === 'toMoto') {
      if (stepPath(p, dt)) { dropPlate(p); p.model.visible = false; p.state = 'riding'; startRide(p); }
    }
  }
}
function cleanTable(t) { t.dirty = false; t.cleaner = null; const tm = WLD.tables[t.f][t.i]; if (tm) tm.userData.dirty.visible = false; save.stats.cleaned++; SFX.clean(); floatText(t.x, floorY(t.f) + 50, t.z, '¡Limpio!', '#7CF0A9', 13); }
function cleanSpot(f, s) { if (s.m.parent) s.m.parent.remove(s.m); SIM.dirt[f] = SIM.dirt[f].filter(q => q !== s); SFX.clean(); }
function collectRegister(auto) {
  if (save.register <= 0) return;
  const amt = save.register; save.money += amt; save.register = 0; save.stats.collected++;
  floatText(REG.x, 90, REG.z, '+' + soles(amt), '#19D46E', auto ? 15 : 22);
  SFX.cash(); if (!auto) for (let i = 0; i < 12; i++) SIM.fx.push({ type: 'coin', x: REG.x, y: 60, z: REG.z, vx: rand(-80, 80), vy: rand(120, 220), vz: rand(-80, 80), t: 0, life: 0.9 });
}
function coinsTo(x, y, z) { for (let i = 0; i < 5; i++) SIM.fx.push({ type: 'fly', x, y, z, tx: REG.x, ty: 60, tz: REG.z, t: -i * 0.06, life: 0.8 }); }

/* ---------- drive-thru ---------- */
function updateCars(dt) {
  if (save.drive) {
    SIM.carT -= dt;
    const h = hourNow();
    if (SIM.carT <= 0 && h < 22.6 && SIM.cars.length < 5) { SIM.carT = rand(9, 16) / (0.6 + save.rating / 5); const m = makeCar(pick(['#E23B3B', '#2E6BFF', '#F2F2EE', '#26262C', '#F2C230', '#19A35A'])); m.position.set(-615, 0, 780); WLD.root.add(m); SIM.cars.push({ m, z: 780, v: 0, state: 'in', orders: [], patience: 100 }); }
  }
  for (let i = 0; i < SIM.cars.length; i++) {
    const c = SIM.cars[i], ahead = SIM.cars[i - 1];
    let stopZ = -1e9;
    if (c.state === 'in') stopZ = -300;
    if (ahead && ahead.state !== 'out') stopZ = Math.max(stopZ, ahead.z + 110);
    if (c.state === 'in' && !c.ordered && c.z < 120) { c.ordered = true; const n = irand(1, 2); for (let k = 0; k < n; k++) c.orders.push(newOrder(pickDish(), 'drive', c)); }
    const want = c.state === 'out' ? 260 : (c.z - stopZ > 4 ? Math.min(220, (c.z - stopZ) * 2) : 0);
    c.v = lerp(c.v, want, 0.08); c.z -= c.v * dt; if (c.state !== 'out' && c.z < stopZ) c.z = stopZ;
    c.m.position.z = c.z;
    if (c.state === 'in' && c.ordered) { c.patience -= dt * 1.4; if (c.patience <= 0) { c.state = 'out'; c.orders.forEach(o => { if (o.status !== 'done') o.status = 'cancel'; }); SFX.horn(); floatText(-615, 60, c.z, '¡Qué lento!', '#FF6B6B', 14); save.rating = clamp(lerp(save.rating, 1.5, 0.05), 1, 5); } }
    if (c.state === 'out' && c.z < -900) { WLD.root.remove(c.m); SIM.cars.splice(i, 1); i--; }
  }
}
function handDrive(p) {
  const o = p.job; dropPlate(p); o.status = 'done'; p.job = null;
  const c = o.ref; SFX.serve();
  if (c.orders.every(x => x.status === 'done')) {
    let total = 0; for (const x of c.orders) total += dishPrice(x.dish);
    save.register += total; save.dayLog.income += total; save.stats.served += c.orders.length; save.dayLog.served += c.orders.length;
    floatText(-560, 70, -300, '+' + soles(total), '#FFE14D', 16);
    c.state = 'out'; save.rating = clamp(lerp(save.rating, c.patience > 50 ? 4.6 : 3.4, 0.04), 1, 5);
  }
}

/* ---------- delivery ---------- */
function updateDelivery(dt) {
  SIM.deliveries = SIM.deliveries || [];
  if (save.motos > 0) {
    SIM.delT -= dt;
    if (SIM.delT <= 0 && hourNow() < 22.6 && SIM.deliveries.filter(d => !d.done).length < save.motos + 1) {
      SIM.delT = rand(14, 24) / (0.6 + save.rating / 5);
      const n = irand(1, 3), d = { orders: [], rider: null, done: false };
      for (let k = 0; k < n; k++) d.orders.push(newOrder(pickDish(), 'delivery', d));
      SIM.deliveries.push(d); floatText(0, 180, 300, '¡Pedido por delivery!', '#FF2E88', 16); SFX.bell();
    }
  }
  for (const r of SIM.rides) {
    r.t += dt;
    const m = WLD.motoModels[r.slot];
    if (r.t < 3) { m.position.x = lerp(620, 1500, r.t / 3); m.position.z = lerp(180 + r.slot * 80, 640, Math.min(1, r.t)); m.rotation.y = Math.PI / 2; }
    else if (r.t < 11) m.visible = false;
    else if (r.t < 14) { m.visible = true; const k = (r.t - 11) / 3; m.position.x = lerp(1500, 620, k); m.position.z = lerp(640, 180 + r.slot * 80, k); m.rotation.y = -Math.PI / 2; }
    else {
      m.position.set(620, 0, 180 + r.slot * 80); m.rotation.y = Math.PI / 2; r.done = true;
      const d = r.p.job; let total = 5; for (const o of d.orders) { total += dishPrice(o.dish); o.status = 'done'; }
      save.register += total; save.dayLog.income += total; save.stats.served += d.orders.length; save.dayLog.served += d.orders.length; d.done = true;
      floatText(620, 80, 200, '+' + soles(total) + ' delivery', '#FFE14D', 15);
      r.p.model.visible = true; r.p.x = 590; r.p.z = 150; r.p.state = 'idle'; r.p.job = null;
    }
  }
  SIM.rides = SIM.rides.filter(r => !r.done);
  SIM.deliveries = SIM.deliveries.filter(d => !d.done);
}
function startRide(p) { const used = SIM.rides.map(r => r.slot); let slot = 0; while (used.includes(slot) && slot < save.motos - 1) slot++; SIM.rides.push({ p, t: 0, slot }); SFX.horn(); }

/* ---------- tu personaje ---------- */
function makeAvatar() {
  const look = { kind: 'avatar', skin: '#A56B45', hair: '#1A1110', shirt: '#FF2E88', pants: '#23324A', hat: 'gorra', hatColor: '#FFE14D', apron: '#FFFFFF', scale: 1.08 };
  const a = spawnPerson('avatar', look, 60, 0, 300); a.speed = 185; a.state = 'idle';
  const ring = new THREE.Mesh(new THREE.RingGeometry(16, 20, 24), M('#FFE14D', { basic: true, op: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 1; a.model.add(ring);
  SIM.avatar = a; return a;
}
const MOVE = { x: 0, z: 0 };
function updateAvatar(dt, camYaw) {
  const a = SIM.avatar; if (!a) return;
  a.walking = false;
  if (MOVE.x || MOVE.z) {
    a.path = [];
    const sn = Math.sin(camYaw), c = Math.cos(camYaw);
    const dx = MOVE.x * c + MOVE.z * sn, dz = -MOVE.x * sn + MOVE.z * c;
    const len = Math.hypot(dx, dz) || 1, sp = a.speed * dt;
    const f = floorOfY(a.y);
    let nx = a.x + dx / len * sp, nz = a.z + dz / len * sp;
    nx = clamp(nx, -485, 485); nz = clamp(nz, f === 0 ? -180 : -385, f === 0 ? 420 : 385);
    if (f > 0) { const hx = stairX(f - 1); if (Math.abs(nx - hx) < 45 && nz < -135) { nx = a.x; nz = a.z; } }
    if (f < save.floors - 1) { const sx = stairX(f); if (Math.abs(nx - sx) < 38 && nz < STAIR.z0 + 30 && nz > STAIR.z1) { route(a, (sx > 0 ? 340 : -340), STAIR.z1 - 4 + 30, f + 1); a.x = nx; } }
    if (a.path.length) { stepPath(a, dt); }
    else { a.x = nx; a.z = nz; a.y = floorY(f); a.ang = Math.atan2(dx, -dz); a.phase += dt * 12; a.walking = true; }
  } else if (a.path.length) { a.speed = 185; stepPath(a, dt); }
  // interacciones
  const f = floorOfY(a.y);
  if (a.carry) {
    const o = a.carry;
    if (o.status === 'cancel') { dropPlate(a); }
    else if (o.kind === 'table') { const t = o.ref.table; if (t.f === f && Math.hypot(a.x - t.x, a.z - t.z) < 85) { serveOrder(a, o); } }
    else if (o.kind === 'drive' && f === 0 && Math.hypot(a.x + 470, a.z + 300) < 70) { const pj = { job: o }; handDrive(Object.assign(a, pj)); a.job = null; }
  } else {
    if (f === 0) for (const o of SIM.orders) if (o.status === 'ready' && !o.claimed && o.kind !== 'delivery') { const pp = pickPoint(o); if (Math.hypot(a.x - pp.x, a.z - pp.z) < 55) { takePlate(a, o); floatText(a.x, 70, a.z, 'Llévalo a ' + (o.kind === 'drive' ? 'la ventanilla' : 'su mesa'), '#FFFFFF', 13); break; } }
    for (const t of SIM.tables) { const pa = t.party; if (pa && pa.state === 'callWaiter' && t.f === f && Math.hypot(a.x - t.x, a.z - t.z) < 85) { pa.takeP = (pa.takeP || 0) + dt; a.taking = true; if (pa.takeP > 0.7) { if (pa.waiter && pa.waiter !== a) { const w = pa.waiter; w.state = 'idle'; w.job = null; w.path = []; } takeOrder(pa); } break; } }
    for (const t of SIM.tables) if (t.dirty && !t.cleaner && t.f === f && Math.hypot(a.x - t.x, a.z - t.z) < 80) { t.cleanP += dt; if (t.cleanP > 1.1) { t.cleanP = 0; cleanTable(t); } a.cleaning = true; }
    for (const s of SIM.dirt[f]) if (!s.cleaner && Math.hypot(a.x - s.x, a.z - s.z) < 40) { s.p += dt; if (s.p > 0.8) cleanSpot(f, s); break; }
  }
  if (f === 0 && Math.hypot(a.x - REG.x, a.z - REG.z) < 90 && save.register > 0) collectRegister(false);
}

/* ---------- efectos ---------- */
function floatText(x, y, z, text, color, size) { SIM.texts.push({ x, y, z, text, color, size: size || 16, t: 0, life: 1.8 }); }
function updateFx(dt) {
  for (const f of SIM.fx) { f.t += dt; if (f.type === 'fly') continue; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vy -= 400 * dt; }
  SIM.fx = SIM.fx.filter(f => f.t < f.life);
  for (const t of SIM.texts) { t.t += dt; t.y += 30 * dt; }
  SIM.texts = SIM.texts.filter(t => t.t < t.life);
}

/* ---------- cambio de local ---------- */
// Vacía la simulación (gente, autos, pedidos) antes de reconstruir otro local
function resetSim() {
  for (const p of SIM.people.slice()) removePerson(p);
  for (const c of SIM.cars) if (c.m.parent) c.m.parent.remove(c.m);
  Object.assign(SIM, { people: [], orders: [], fx: [], texts: [], tables: [], queue: [], cars: [], dirt: [[], [], []], rides: [], deliveries: [], avatar: null, spawnT: 1, carT: 8, delT: 10 });
}

/* ---------- eventos ---------- */
const eventOn = id => !!(save.event && save.event.id === id && save.event.day === save.day);
function criticLost() { save.rating = clamp(lerp(save.rating, 1.5, 0.5), 1, 5); if (save.event) save.event.review = { stars: 1.5, text: 'Ni siquiera conseguí mesa. Imperdonable.' }; }
function eventResult(ev) {
  if (ev.id === 'partido') { const n = ev.pollos || 0, a = irand(1, 3), b = irand(0, 2); return (save.menu.includes('pollo') || n ? 'Vendiste ' + n + ' pollos a la brasa. ' : 'No tenías pollo a la brasa y la gente se quejó. ') + (a > b ? 'Perú ganó ' + a + '-' + b + ' y todos celebraron en tu local.' : 'Perú empató ' + b + '-' + b + ', pero la barra no paró.'); }
  if (ev.id === 'critico') return ev.review ? 'El crítico te puso ' + ev.review.stars.toFixed(1) + ' ★: “' + ev.review.text + '”' : 'El crítico nunca apareció. Quizás mañana…';
  if (ev.id === 'apagon') return ev.genUsed ? 'Tu generador salvó el día: la cocina nunca paró.' : 'Sin luz, la cocina estuvo parada' + (ev.lostOrders ? ' y se ' + (ev.lostOrders === 1 ? 'fue 1 mesa' : 'fueron ' + ev.lostOrders + ' mesas') + ' sin comer.' : '.') + ' Un generador cuesta ' + soles(GENERATOR_COST) + '.';
  if (ev.id === 'feriado') return 'Atendiste a ' + (save.stats.customers - (ev.c0 || 0)) + ' clientes en el feriado.';
  return '';
}
function startEvent() {
  const ids = Object.keys(EVENTS).filter(k => !save.event || k !== save.event.id);
  const id = pick(ids), ev = { id, day: save.day, shown: false, c0: save.stats.customers };
  if (id === 'critico') ev.hour = rand(12.5, 18.5);
  if (id === 'apagon') { ev.h0 = rand(13.2, 15); ev.h1 = ev.h0 + rand(3, 4); }
  save.event = ev; save.nextEvent = save.day + irand(2, 3);
}
function updateEvents() {
  const ev = save.event; if (!ev || ev.day !== save.day) { SIM.blackout = false; return; }
  const h = hourNow();
  if (ev.id === 'critico' && !ev.spawned && h >= ev.hour) {
    ev.spawned = true; spawnWalker(); const p = SIM.people[SIM.people.length - 1];
    p.wants = true; p.party = 1; p.critic = true; // de incógnito: se ve como cualquier cliente
  }
  if (ev.id === 'apagon') {
    const dark = h >= ev.h0 && h < ev.h1;
    if (dark && save.generator) ev.genUsed = true;
    const bo = dark && !save.generator;
    if (bo && !SIM.blackout) { banner('¡Se fue la luz!', save.generator ? '' : 'La cocina se detuvo. Compra un generador.'); SFX.no(); }
    if (!bo && SIM.blackout) banner(save.generator ? '¡Generador encendido!' : '¡Volvió la luz!', 'La cocina vuelve a funcionar.');
    SIM.blackout = bo;
  } else SIM.blackout = false;
}

/* ---------- ciclo del día ---------- */
let onDayEnd = () => {};
function updateSim(dt) {
  SIM.t += dt;
  save.dayT += dt;
  if (save.dayT >= DAY_LEN) {
    save.dayT = 0;
    let wages = 0; for (const k of ROLE_KEYS) wages += (save.staff[k] || 0) * ROLES[k].wage;
    save.money -= wages;
    const log = Object.assign({}, save.dayLog, { wages, day: save.day, rating: save.rating, chain: Math.round(save.chainDay) }); save.chainDay = 0;
    if (save.event && save.event.day === save.day) log.event = { name: EVENTS[save.event.id].name, text: eventResult(save.event) };
    save.profitEma = lerp(save.profitEma || 0, log.income - log.costs - wages, save.day === 1 ? 1 : 0.4);
    save.day++; save.dayLog = { income: 0, costs: 0, served: 0, lost: 0, tips: 0 };
    if (save.day >= save.nextEvent) startEvent();
    persist(); onDayEnd(log);
  }
  // los otros locales de la cadena siguen vendiendo solos
  if (save.chain.length > 1) { const bg = chainBgDaily() / DAY_LEN * dt; save.money += bg; save.chainDay += bg; }
  updateEvents();
  const fer = eventOn('feriado');
  SIM.spawnT -= dt;
  if (SIM.spawnT <= 0) { SIM.spawnT = rand(0.9, 1.9) / DIST().flow / (fer ? 2 : 1); if (SIM.people.filter(p => p.role === 'walker').length < QCFG.walkers * (DIST().busy ? 1.3 : 1) * (fer ? 1.5 : 1)) spawnWalker(); }
  for (const p of SIM.people.slice()) { if (p.role === 'walker') updateWalker(p, dt); else if (ROLES[p.role]) updateStaff(p, dt); }
  const parties = new Set(); for (const p of SIM.people) if (p.party && typeof p.party === 'object') parties.add(p.party);
  for (const t of SIM.tables) if (t.party) parties.add(t.party);
  for (const pa of parties) updateParty(pa, dt);
  updateKitchen(dt);
  updateCars(dt);
  updateDelivery(dt);
  SIM.orders = SIM.orders.filter(o => o.status !== 'done' && o.status !== 'cancel' || SIM.t - o.t0 < 1);
  for (const o of SIM.orders) if (o.status === 'cancel' && o.plateM && o.plateM.parent) o.plateM.parent.remove(o.plateM);
  updateFx(dt);
}
