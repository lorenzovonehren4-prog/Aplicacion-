'use strict';
// Código Rojo: inteligencia de los carros. Todos manejan con la misma física que el jugador.
//  - tráfico: va por su carril, dobla al azar, para en rojo y no choca al de adelante;
//  - patrulleros: buscan el camino al ladrón por las calles (A*), lo cortan por delante,
//    y cuando lo ven de cerca lo embisten;
//  - ladrón: huye eligiendo en cada cruce la calle que más lo aleja del policía, o va a su guarida.

// ¿En qué tramo de calle está el carro y hacia qué cruce va?
function segmentOf(c) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h);
  let best = null, bd = Infinity;
  for (const n of CITY.nodes) for (const nb of n.nb) {
    const m = nodeAt(nb);
    const dx = m.x - n.x, dz = m.z - n.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const t = clamp((c.x - n.x) * ux + (c.z - n.z) * uz, 0, L);
    const px = n.x + ux * t, pz = n.z + uz * t, d = Math.hypot(c.x - px, c.z - pz);
    const align = ux * fx + uz * fz;           // que vaya en el sentido del tramo
    const score = d - align * 4;
    if (score < bd) { bd = score; best = [n, m]; }
  }
  return best;
}

// Sigue una ruta de cruces por el carril (lane > 0 es el de la derecha). Devuelve el punto al que
// apuntar, cuánto falta para el próximo cruce y cuánto hay que doblar ahí.
function followRoute(c, ai, lane, look) {
  let A = ai.route[0], B = ai.route[1];
  let dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  let prog = (c.x - A.x) * ux + (c.z - A.z) * uz;
  if (prog > L - 4 && ai.route.length > 2) { ai.route.shift(); ai.onNode && ai.onNode(B); return followRoute(c, ai, lane, look); }
  const rx = -uz, rz = ux;                   // derecha del tramo
  let tProg = prog + look, tx, tz;
  if (tProg <= L - 6 || ai.route.length < 3) { const t = Math.min(tProg, L + 30); tx = A.x + ux * t + rx * lane; tz = A.z + uz * t + rz * lane; }
  else {
    // pasa al tramo siguiente (corta la esquina)
    const C = ai.route[2], ex = C.x - B.x, ez = C.z - B.z, L2 = Math.hypot(ex, ez) || 1, vx = ex / L2, vz = ez / L2;
    const rem = tProg - (L - 6);
    tx = B.x + vx * Math.min(rem, L2) + (-vz) * lane; tz = B.z + vz * Math.min(rem, L2) + vx * lane;
  }
  let turn = 0;
  if (ai.route.length > 2) { const C = ai.route[2]; turn = Math.abs(wrapAng(Math.atan2(C.x - B.x, C.z - B.z) - Math.atan2(ux, uz))); }
  return { tx, tz, dEnd: L - prog, turn, axis: Math.abs(ux) > 0.5 ? 'x' : 'z', node: B };
}

// Volante y pedales para ir hacia (tx, tz) a velocidad v.
function driveTo(c, tx, tz, v) {
  const ang = wrapAng(Math.atan2(tx - c.x, tz - c.z) - c.h);
  const inp = { thr: 0, brk: 0, steer: clamp(-ang * 2.4, -1, 1), hand: false, ang };
  if (c.f < v - 0.5) inp.thr = 1; else if (c.f > v + 1.5) { inp.brk = 1; inp.stop = true; }
  // si el objetivo quedó atrás, frena y dobla fuerte
  if (Math.abs(ang) > 1.6 && c.f > 6) { inp.thr = 0; inp.brk = 1; }
  return inp;
}
// Velocidad para llegar a la curva: frena a tiempo según cuánto hay que doblar.
function cornerSpeed(c, fr, skill) {
  const top = c.spec.top * (c.topMul || 1);
  if (fr.turn < 0.25) return top;
  const R = fr.turn > 2.5 ? 5 : 10 + skill * 4;
  const vc = Math.sqrt(c.spec.grip * 9.8 * 0.85 * R) * (0.85 + skill * 0.2);
  return Math.min(top, Math.sqrt(vc * vc + 2 * c.spec.brake * 0.75 * Math.max(0, fr.dEnd - 7)));
}

// Carro de adelante en el mismo carril (para no chocarlo).
function carAhead(c, all, range = 16) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h);
  let best = null, bd = range;
  for (const o of all) {
    if (o === c) continue;
    const dx = o.x - c.x, dz = o.z - c.z, along = dx * fx + dz * fz;
    if (along <= 0 || along > bd) continue;
    if (Math.abs(dx * -fz + dz * fx) > 2.2) continue;
    bd = along; best = o;
  }
  return best ? { o: best, d: bd } : null;
}

// Si se queda trabado contra algo, retrocede un rato. Si el objetivo quedó atrás y va lento,
// da la vuelta en tres movimientos (adelante, reversa con el volante al revés, adelante).
function unstick(c, ai, inp, dt) {
  ai.kCd = Math.max(0, (ai.kCd || 0) - dt);
  if (ai.rev > 0) { ai.rev -= dt; return { thr: 0, brk: 1, steer: -ai.revSteer, hand: false }; }
  if (Math.abs(c.f) < 1.2 && inp.thr > 0) ai.stuck = (ai.stuck || 0) + dt; else ai.stuck = 0;
  if (ai.stuck > 1.1) { ai.stuck = 0; ai.rev = 1.0; ai.revSteer = inp.steer >= 0 ? 1 : -1; }
  if (ai.kind !== 'trafico' && inp.ang !== undefined && Math.abs(inp.ang) > 2.1 && Math.abs(c.f) < 3.5 && !ai.kCd) { ai.kCd = 2.6; ai.rev = 0.9; ai.revSteer = inp.ang < 0 ? 1 : -1; }
  // va y viene sin avanzar: cada 3 s revisa cuánto se movió
  ai.chkT = (ai.chkT || 0) + dt;
  if (ai.chkT > 3) {
    if (ai.chkX !== undefined && Math.hypot(c.x - ai.chkX, c.z - ai.chkZ) < 4 && inp.thr > 0) { ai.rev = 1.3; ai.revSteer = Math.random() < 0.5 ? 1 : -1; }
    ai.chkT = 0; ai.chkX = c.x; ai.chkZ = c.z;
  }
  return inp;
}

// ---------- tráfico ----------
function newTraffic(c) {
  const seg = segmentOf(c);
  const ai = { kind: 'trafico', route: [seg[0], seg[1]], v: 9 + Math.random() * 4.5 };
  extendRandom(ai);
  return ai;
}
function extendRandom(ai) {
  while (ai.route.length < 4) {
    const B = ai.route[ai.route.length - 1], A = ai.route[ai.route.length - 2];
    const opts = B.nb.map(nodeAt).filter(n => n !== A);
    ai.route.push(opts.length ? opts[Math.floor(Math.random() * opts.length)] : A);
  }
}
function trafficInput(c, ai, all, t, dt) {
  extendRandom(ai);
  const fr = followRoute(c, ai, LANE, Math.max(6, c.f * 0.7));
  let v = Math.min(ai.v, cornerSpeed(c, fr, 0.4));
  // semáforo: frena antes de la línea si está en rojo (o en ámbar y todavía lejos)
  const st = lightState(fr.node, fr.axis, t);
  const stopAt = fr.dEnd - 10;
  if ((st === 'rojo' || (st === 'ambar' && stopAt > 6)) && stopAt > -1 && fr.dEnd < 40) v = Math.min(v, Math.sqrt(2 * 4 * Math.max(0, stopAt)));
  const ah = carAhead(c, all, 18);
  if (ah) v = Math.min(v, Math.max(0, (ah.d - 7) * 0.8), Math.max(0, ah.o.f));
  const inp = driveTo(c, fr.tx, fr.tz, v);
  if (v < 0.5) { inp.thr = 0; inp.brk = 1; inp.stop = true; }
  c.braking = inp.brk > 0;
  return unstick(c, ai, inp, dt);
}

// ---------- patrulleros ----------
// role: 'chase' (va directo), 'cut' (le corta adelante), 'flank' (por el costado)
function newCop(c, role, diff) {
  const seg = segmentOf(c);
  return { kind: 'policia', role, diff, route: [seg[0], seg[1]], replan: 0 };
}
function copInput(c, ai, thief, all, t, dt) {
  const D = DIFFS[ai.diff];
  const dist = Math.hypot(thief.x - c.x, thief.z - c.z);
  // goma elástica: si quedó muy lejos acelera un poco más
  c.topMul = D.speed * (dist > 140 ? 1.12 : dist > 70 ? 1.04 : 1);
  ai.replan -= dt;
  const see = dist < 55 && lineFree(c.x, c.z, thief.x, thief.z);
  let inp;
  if (see) {
    // persecución directa: apunta adonde va a estar el ladrón y lo embiste
    const lead = clamp(dist / Math.max(12, c.f), 0, 1.6) * D.skill;
    let tx = thief.x + thief.vx * lead, tz = thief.z + thief.vz * lead;
    if (ai.role === 'flank' && dist > 12) { tx += Math.cos(thief.h) * 3; tz -= Math.sin(thief.h) * 3; }
    inp = driveTo(c, tx, tz, c.spec.top * c.topMul);
    if (dist < 14 && Math.random() < D.aggro) inp.thr = 1, inp.brk = 0;
    ai.direct = true;
  } else {
    if (ai.replan <= 0 || ai.direct) {
      ai.replan = 1.2; ai.direct = false;
      const seg = segmentOf(c);
      let goal;
      const tn = nearestNode(thief.x + thief.vx * 1.5, thief.z + thief.vz * 1.5);
      if (ai.role === 'cut') {
        // el cruce al que va el ladrón (por donde mira)
        const ts = segmentOf(thief); goal = ts[1];
        const ahead = goal.nb.map(nodeAt).filter(n => n !== ts[0]);
        if (ahead.length && dist > 60) goal = ahead.sort((a, b) => Math.abs(wrapAng(Math.atan2(a.x - goal.x, a.z - goal.z) - thief.h)) - Math.abs(wrapAng(Math.atan2(b.x - goal.x, b.z - goal.z) - thief.h)))[0];
      } else goal = tn;
      const path = findPath(seg[1], goal);
      ai.route = [seg[0], ...path];
      if (ai.route.length < 3) ai.route.push(nodeAt(goal.nb[0]));
    }
    const fr = followRoute(c, ai, ai.over ? -LANE : LANE * 0.5, Math.max(7, c.f * 0.6));
    let v = cornerSpeed(c, fr, D.skill);
    const ah = carAhead(c, all, 20);
    ai.over = !!(ah && ah.o.f < c.f - 2);       // adelanta por el otro carril
    inp = driveTo(c, fr.tx, fr.tz, v);
  }
  c.braking = inp.brk > 0;
  return unstick(c, ai, inp, dt);
}

// ---------- ladrón (cuando el jugador es policía) ----------
function newThief(c, diff, hideout) {
  const seg = segmentOf(c);
  const ai = { kind: 'ladron', diff, route: [seg[0], seg[1]], hideout, replan: 0 };
  return ai;
}
function thiefInput(c, ai, cop, all, t, dt) {
  const D = DIFFS[ai.diff];
  c.topMul = D.speed;
  ai.replan -= dt;
  const copNear = (n) => Math.hypot(n.x - cop.x, n.z - cop.z);
  if (ai.replan <= 0) {
    ai.replan = 1.5;
    const seg = segmentOf(c);
    if (ai.hideout) {
      // va a su guarida, pero evita los cruces cerca del policía
      const goal = nearestNode(ai.hideout.x, ai.hideout.z);
      const path = findPath(seg[1], goal, (a, b) => { const d = copNear(b); return d < 70 ? (70 - d) * 6 : 0; });
      ai.route = [seg[0], ...path];
      if (ai.route.length < 3) ai.route.push(nodeAt(goal.nb[0]));
    } else {
      // huye: en cada cruce elige lo que más lo aleja (con algo de azar para no ser predecible)
      const route = [seg[0], seg[1]];
      for (let k = 0; k < 3; k++) {
        const B = route[route.length - 1], A = route[route.length - 2];
        const opts = B.nb.map(nodeAt).filter(n => n !== A);
        let best = opts[0], bs = -Infinity;
        for (const n of opts) {
          const straight = Math.abs(wrapAng(Math.atan2(n.x - B.x, n.z - B.z) - Math.atan2(B.x - A.x, B.z - A.z))) < 0.3 ? 25 * D.skill : 0;
          const edge = (Math.abs(n.x) > 200 || Math.abs(n.z) > 200) ? -20 : 0;
          const s = copNear(n) - copNear(B) + straight + edge + Math.random() * 40 * (1.2 - D.skill);
          if (s > bs) { bs = s; best = n; }
        }
        route.push(best);
      }
      ai.route = route;
    }
  }
  const fr = followRoute(c, ai, ai.over ? -LANE : LANE, Math.max(7, c.f * 0.6));
  let v = cornerSpeed(c, fr, D.skill);
  const ah = carAhead(c, all, 22);
  ai.over = !!(ah && ah.o.f < c.f - 1);
  if (ah && ah.d < 9 && !ai.over) v = Math.min(v, ah.o.f + 2);
  const inp = driveTo(c, fr.tx, fr.tz, v);
  // en curvas cerradas a veces usa el freno de mano
  if (fr.turn > 1.2 && fr.dEnd < 14 && c.f > 14 && D.skill > 0.7) inp.hand = true;
  c.braking = inp.brk > 0;
  return unstick(c, ai, inp, dt);
}
