'use strict';
// Carrera: karts, bots, vueltas, sectores, posiciones y efectos (chispas, humo, marcas).

const R = {
  on: false, T: null, def: null, diff: null, laps: 3, mode: 'quick',
  karts: [], player: null, t: 0, state: 'idle', countdown: 0, finishOrder: [],
  endTimer: 0, prof: null, bestSec: [Infinity, Infinity, Infinity], bestLap: Infinity, events: [],
};

function botLook() {
  const b = BODIES[Math.floor(Math.random() * BODIES.length)];
  const h = HELMETS[Math.floor(Math.random() * HELMETS.length)];
  const g = Math.random() < 0.35 ? GLOWS[1 + Math.floor(Math.random() * (GLOWS.length - 1))] : null;
  return { body: b, helmet: h, rims: RIMS[Math.floor(Math.random() * RIMS.length)], glow: g, num: 2 + Math.floor(Math.random() * 97) };
}

// grid: lista de { name, isPlayer, look } en orden de largada
function startRace(def, diff, laps, mode, grid) {
  endRace();
  R.def = def; R.diff = diff; R.laps = laps; R.mode = mode;
  R.T = buildTrackScene(def);
  R.prof = speedProfile(R.T, diff.pace);
  R.karts = []; R.finishOrder = []; R.events = [];
  R.t = 0; R.state = 'countdown'; R.countdown = 3.6; R.endTimer = 0;
  const pb = save.pb[def.id] || {};
  R.bestSec = (pb.sec || [Infinity, Infinity, Infinity]).map(v => v == null ? Infinity : v);
  R.bestLap = pb.lap || Infinity;
  R.sessSec = [Infinity, Infinity, Infinity];
  R.sessLap = Infinity;
  grid.forEach((g, k) => {
    const slot = gridSlot(R.T, k);
    const mesh = makeKart(g.look);
    W.scene.add(mesh);
    const kart = {
      name: g.name, isPlayer: !!g.isPlayer, look: g.look, mesh,
      p: newPhys(slot.x, slot.z, slot.h), idx: slot.i,
      dist: -slot.back, maxDist: -slot.back, lapsDone: 0, lapStart: 0, secStart: 0, sec: [null, null, null],
      lastLap: null, bestLap: null, finished: false, finishTime: null, pos: k + 1,
      ai: { lane: 0, laneT: 0, err: 1, errT: 0, stuck: 0 }, bump: 0, wrong: 0,
    };
    kart.ai.lane = rand(-0.6, 0.6);
    R.karts.push(kart);
    if (kart.isPlayer) R.player = kart;
    poseKart(mesh, kart.p, 0);
  });
  R.on = true;
  FX.reset();
}

function endRace() {
  for (const k of R.karts) W.scene.remove(k.mesh);
  R.karts = []; R.player = null; R.on = false; R.state = 'idle';
  clearTrack();
}

// ---------- controles del bot ----------
function botInput(k, dt) {
  const T = R.T, p = k.p, N = T.N, ai = k.ai;
  const v = Math.max(p.fwd, 0);
  // carril propio: varía un poco y se aparta si hay alguien adelante
  ai.laneT -= dt;
  if (ai.laneT <= 0) { ai.laneT = rand(2, 5); ai.laneWant = rand(-0.8, 0.8); }
  let want = ai.laneWant || 0;
  for (const o of R.karts) {
    if (o === k) continue;
    let d = o.dist - k.dist;
    if (d > 0 && d < 9) {
      const ci = o.idx;
      const olat = (o.p.x - T.px[ci]) * T.nx[ci] + (o.p.z - T.pz[ci]) * T.nz[ci];
      const mylat = (p.x - T.px[k.idx]) * T.nx[k.idx] + (p.z - T.pz[k.idx]) * T.nz[k.idx];
      if (Math.abs(olat - mylat) < 1.8) want = olat > mylat ? -2.2 : 2.2;
    }
  }
  ai.lane = lerp(ai.lane, want, 1 - Math.exp(-dt * 1.5));
  const la = 3.5 + v * 0.42;
  const j = (k.idx + Math.round(la)) % N;
  const lim = T.hw - 1.0;
  const off = clamp(T.lineOff[j] + ai.lane, -lim, lim);
  const tx = T.px[j] + T.nx[j] * off, tz = T.pz[j] + T.nz[j] * off;
  const dx = tx - p.x, dz = tz - p.z, dl = Math.hypot(dx, dz) || 1;
  const rx = -Math.cos(p.h), rz = Math.sin(p.h);
  const sideways = (dx * rx + dz * rz) / dl;
  // pure pursuit: giro que hace falta para llegar al punto, como fracción del giro máximo
  const sp = Math.max(v, 1.5);
  const yawNeed = sp * 2 * sideways / dl;
  const yawMax = Math.min(sp / KART.wheelbase * Math.tan(KART.steerLow), KART.grip * 1.1 / sp);
  const frac = clamp(yawNeed / yawMax, -1, 1);
  let steer = Math.sign(frac) * Math.pow(Math.abs(frac), 1 / 1.3);

  // velocidad objetivo según la curva que viene
  ai.errT -= dt;
  if (ai.errT <= 0) { ai.errT = rand(1.5, 4); ai.err = 1 + R.diff.err * rand(-0.07, 0.035); }
  const look = (k.idx + 2 + Math.round(v * 0.12)) % N;
  let vt = Math.min(R.prof[look], R.prof[k.idx]) * ai.err;
  vt = Math.min(vt, KART.vmax * R.diff.top);
  // un poquito de goma elástica en las dificultades bajas
  if (R.player && R.diff.id !== 'experto') {
    const gap = k.dist - R.player.dist;
    if (gap > 60) vt *= 0.96; else if (gap < -60) vt *= 1.03;
  }
  if (k.finished) vt *= 0.7;
  let throttle = 0, brake = 0;
  if (v < vt - 0.3) throttle = 1; else if (v < vt + 0.3) throttle = 0.35;
  if (v > vt + 0.9) brake = clamp((v - vt) / 3, 0.2, 1);
  // si quedó trabado contra la barrera, retrocede
  if (R.state === 'race' && p.speed < 1) ai.stuck += dt; else ai.stuck = Math.max(0, ai.stuck - dt * 2);
  if (ai.stuck > 1.5) { throttle = 0; brake = 1; steer = -steer; if (ai.stuck > 3) ai.stuck = 0; }
  return { throttle, brake, steer, handbrake: false };
}

// ---------- paso de la carrera ----------
function updateRace(dt, playerInput) {
  if (!R.on) return;
  const T = R.T;
  if (R.state === 'countdown') {
    const before = Math.ceil(R.countdown - 0.6);
    R.countdown -= dt;
    const after = Math.ceil(R.countdown - 0.6);
    if (after !== before && after >= 1) R.events.push({ type: 'beep', n: after });
    if (R.countdown <= 0.6) { R.state = 'race'; R.t = 0; R.events.push({ type: 'go' }); }
  } else if (R.state === 'race' || R.state === 'done') {
    R.t += dt;
  }
  const live = R.state !== 'countdown';
  for (const k of R.karts) {
    let inp;
    if (!live) { k.inp = { throttle: k.isPlayer ? playerInput.throttle : 0, brake: 0, steer: 0 }; k.p.vx = k.p.vz = 0; poseKart(k.mesh, k.p, dt); continue; }
    else if (k.isPlayer && !k.finished) inp = playerInput;
    else inp = botInput(k, dt);
    const res = stepPhys(k.p, inp, dt, T, k.idx);
    k.inp = inp;
    k.idx = res.idx;
    if (res.hit > 2) {
      FX.sparks(k.p.x + T.nx[k.idx] * res.side * 0.7, k.p.z + T.nz[k.idx] * res.side * 0.7, res.hit, k.p.y);
      if (k.isPlayer) R.events.push({ type: 'hit', v: res.hit });
    }
    trackProgress(k, T);
  }
  collideKarts(R.karts);
  for (const k of R.karts) {
    if (k.bump > 2 && (k.isPlayer)) R.events.push({ type: 'bump', v: k.bump });
    k.bump = 0;
    poseKart(k.mesh, k.p, dt, R.t);
    // humo y marcas al derrapar
    if (k.p.slip > 2.2 && k.p.speed > 5) FX.skid(k, k.p.slip);
  }
  // posiciones
  const order = R.karts.slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1; if (b.finished) return 1;
    return b.dist - a.dist;
  });
  order.forEach((k, i) => k.pos = i + 1);
  // fin
  if (R.state === 'done') {
    R.endTimer += dt;
    const all = R.karts.every(k => k.finished);
    if (all || R.endTimer > 18) finishAll();
  }
  FX.update(dt);
}

function trackProgress(k, T) {
  const c = trackCoords(T, k.p.x, k.p.z, k.idx);
  const prev = ((k.dist % T.L) + T.L) % T.L;
  let d = c.s - prev;
  if (d < -T.L / 2) d += T.L; else if (d > T.L / 2) d -= T.L;
  k.dist += d;
  // sentido contrario
  const fwdDot = Math.sin(k.p.h) * T.tx[k.idx] + Math.cos(k.p.h) * T.tz[k.idx];
  k.wrong = (fwdDot < -0.4 && k.p.speed > 2) ? k.wrong + 1 : 0;
  if (k.dist <= k.maxDist) return;
  const L = T.L, sl = L / 3;
  // sectores cruzados por primera vez
  const fromSec = Math.floor(k.maxDist / sl), toSec = Math.floor(k.dist / sl);
  k.maxDist = k.dist;
  if (R.state === 'countdown') return;
  for (let b = fromSec + 1; b <= toSec; b++) {
    if (b <= 0) { if (b === 0) { k.lapStart = R.t; k.secStart = R.t; } continue; }
    const si = (b - 1) % 3; // sector que se acaba de cerrar
    const st = R.t - k.secStart;
    k.secStart = R.t;
    k.sec[si] = st;
    if (k.isPlayer) onPlayerSector(si, st);
    if (b % 3 === 0) {
      // vuelta completa
      const lt = R.t - k.lapStart;
      k.lapStart = R.t;
      k.lapsDone++;
      k.lastLap = lt;
      if (k.bestLap == null || lt < k.bestLap) k.bestLap = lt;
      if (k.isPlayer) onPlayerLap(lt);
      if (k.lapsDone >= R.laps && !k.finished) {
        k.finished = true; k.finishTime = R.t;
        R.finishOrder.push(k);
        if (k.isPlayer) { R.state = 'done'; R.events.push({ type: 'finish', pos: R.finishOrder.length }); }
      } else if (k.isPlayer && k.lapsDone === R.laps - 1) R.events.push({ type: 'lastlap' });
      if (k.isPlayer) k.sec = [null, null, null];
    }
  }
}

function onPlayerSector(si, st) {
  let cls = 'slow';
  if (st < R.bestSec[si]) { R.bestSec[si] = st; cls = 'record'; }
  else if (st < R.sessSec[si]) cls = 'best';
  R.sessSec[si] = Math.min(R.sessSec[si], st);
  R.player.secCls = R.player.secCls || [];
  R.player.secCls[si] = cls;
  R.events.push({ type: 'sector', si, st, cls });
}

function onPlayerLap(lt) {
  let cls = 'slow';
  if (lt < R.bestLap) { R.bestLap = lt; cls = 'record'; }
  else if (lt < R.sessLap) cls = 'best';
  R.sessLap = Math.min(R.sessLap, lt);
  R.player.lastCls = cls;
  R.player.secCls = [];
  R.events.push({ type: 'lap', lt, cls });
  // guardar récords de la pista
  const pb = save.pb[R.def.id] || (save.pb[R.def.id] = { lap: null, sec: [null, null, null] });
  if (pb.lap == null || lt < pb.lap) pb.lap = lt;
  pb.sec = R.bestSec.map(v => isFinite(v) ? v : null);
  persist();
}

function finishAll() {
  if (R.state === 'results') return;
  // los que no llegaron se ordenan por distancia recorrida
  const rest = R.karts.filter(k => !k.finished).sort((a, b) => b.dist - a.dist);
  for (const k of rest) { k.finished = true; k.finishTime = null; R.finishOrder.push(k); }
  R.state = 'results';
  R.events.push({ type: 'results' });
}

// Reubica al jugador en el centro de la pista (tecla R)
function resetPlayer() {
  const k = R.player; if (!k || R.state !== 'race') return;
  const T = R.T, i = k.idx;
  k.p.x = T.px[i] + T.nx[i] * T.lineOff[i] * 0.5; k.p.z = T.pz[i] + T.nz[i] * T.lineOff[i] * 0.5;
  k.p.h = Math.atan2(T.tx[i], T.tz[i]); k.p.vx = k.p.vz = 0; k.p.yaw = 0;
}

// ---------- efectos ----------
const FX = {
  sparksPts: null, smoke: [], skids: null, skidN: 0, sparkData: [],
  init(scene) {
    // chispas
    const n = 160;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.sparksPts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#FFC24D', size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sparksPts.frustumCulled = false;
    scene.add(this.sparksPts);
    for (let i = 0; i < n; i++) this.sparkData.push({ life: 0, x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, floor: 0 });
    // humo
    const st = canvasTexture(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(230,230,240,.75)'); gr.addColorStop(1, 'rgba(230,230,240,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; scene.add(s); this.smoke.push({ s, life: 0 });
    }
    // marcas de frenada (anillo de cuadraditos oscuros)
    const sk = 700;
    this.skids = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.5), new THREE.MeshBasicMaterial({ color: '#0b0b0e', transparent: true, opacity: 0.45, depthWrite: false }), sk);
    this.skids.count = 0; this.skids.frustumCulled = false; scene.add(this.skids);
    this.skidMax = sk;
  },
  reset() {
    for (const d of this.sparkData) d.life = 0;
    for (const s of this.smoke) { s.life = 0; s.s.visible = false; }
    this.skids.count = 0; this.skidN = 0;
  },
  sparks(x, z, power, y) {
    const n = Math.min(24, Math.round(power * 3));
    for (let i = 0, made = 0; i < this.sparkData.length && made < n; i++) {
      const d = this.sparkData[i]; if (d.life > 0) continue;
      d.life = rand(0.2, 0.5); d.x = x; d.y = (y || 0) + 0.3; d.z = z; d.floor = y || 0;
      d.vx = rand(-4, 4); d.vy = rand(1, 4); d.vz = rand(-4, 4); made++;
    }
  },
  _m: new THREE.Matrix4(), _q: new THREE.Quaternion(), _v: new THREE.Vector3(), _s: new THREE.Vector3(1, 1, 1),
  _up: new THREE.Vector3(0, 1, 0), _qx: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
  skid(k, slip) {
    k.skidT = (k.skidT || 0) + 1;
    const p = k.p;
    if (k.skidT % 2 === 0) {
      const rx = -Math.cos(p.h), rz = Math.sin(p.h), fx = Math.sin(p.h), fz = Math.cos(p.h);
      for (const sd of [-1, 1]) {
        const x = p.x + rx * 0.6 * sd - fx * 0.64, z = p.z + rz * 0.6 * sd - fz * 0.64;
        const qy = this._q.setFromAxisAngle(this._up, p.h).multiply(this._qx);
        this._v.set(x, p.y + 0.03 + (this.skidN % 50) * 0.00004, z);
        this._m.compose(this._v, qy, this._s);
        this.skids.setMatrixAt(this.skidN % this.skidMax, this._m);
        this.skidN++;
      }
      this.skids.count = Math.min(this.skidN, this.skidMax);
      this.skids.instanceMatrix.needsUpdate = true;
    }
    if (k.skidT % 4 === 0 && slip > 3) {
      const s = this.smoke.find(o => o.life <= 0);
      if (s) { s.life = 1; s.s.visible = true; s.s.position.set(p.x - Math.sin(p.h) * 0.9, p.y + 0.35, p.z - Math.cos(p.h) * 0.9); s.s.scale.setScalar(0.6); }
    }
  },
  update(dt) {
    const pos = this.sparksPts.geometry.attributes.position;
    this.sparkData.forEach((d, i) => {
      if (d.life > 0) {
        d.life -= dt; d.vy -= 12 * dt; d.x += d.vx * dt; d.y = Math.max(d.floor + 0.02, d.y + d.vy * dt); d.z += d.vz * dt;
        pos.setXYZ(i, d.x, d.life > 0 ? d.y : -10, d.z);
      } else pos.setXYZ(i, 0, -10, 0);
    });
    pos.needsUpdate = true;
    for (const s of this.smoke) {
      if (s.life <= 0) continue;
      s.life -= dt * 1.1;
      s.s.position.y += dt * 0.6;
      s.s.scale.setScalar(0.6 + (1 - s.life) * 2.2);
      s.s.material.opacity = Math.max(0, s.life * 0.5);
      if (s.life <= 0) s.s.visible = false;
    }
  },
};
