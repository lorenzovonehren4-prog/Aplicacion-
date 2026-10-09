'use strict';
// Repetición: durante la carrera se graban todos los karts a 30 cuadros por segundo (R.rec en race.js).
// Al final se puede volver a ver con cámaras de TV al costado de la pista, cámara de persecución,
// helicóptero y a bordo. Espacio pausa, ← → adelanta o atrasa, ↑ ↓ cambia de kart, C cambia de cámara,
// V cambia la velocidad y Esc vuelve a los resultados.

const RP = { t: 0, playing: true, speed: 1, target: 0, cam: 0, spots: [], spot: -1, fov: 40, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true, labelT: 0 };
const RP_CAMS = ['Cámaras de TV', 'Persecución', 'Helicóptero', 'A bordo'];
const RF = 9;   // datos por kart y cuadro: x, y, z, h, slope, roll, pitch, steer, wheelRot

// Puestos de cámara de TV: cada ~60 m, alternando lados, altos al aire libre y bajos dentro de los túneles
function tvSpots(T) {
  const out = [], step = 60;
  for (let s = 20, n = 0; s < T.N; s += step, n++) {
    const i = Math.round(s) % T.N;
    const side = n % 2 ? 1 : -1, tun = T.tunnel && T.tunnel[i];
    const off = tun ? T.hw - 0.6 : T.hw + 5.5;
    const x = T.px[i] + T.nx[i] * off * side, z = T.pz[i] + T.nz[i] * off * side;
    const ground = T.ground ? Math.max(T.ground(x, z), T.py[i]) : T.py[i];
    out.push({ i, x, z, y: ground + (tun ? 2.2 : 4.5) });
  }
  return out;
}

function startReplay() {
  if (!R.on || !R.rec || R.rec.t.length < 10) { toast('No hay repetición para ver'); return; }
  SFX.click(); SFX.silence();
  RP.spots = tvSpots(R.T);
  RP.t = R.rec.t[0]; RP.playing = true; RP.speed = 1; RP.cam = 0; RP.spot = -1; RP.snap = true;
  RP.target = Math.max(0, R.karts.indexOf(R.finishOrder[0] || R.player));
  FX.reset && FX.reset();
  document.body.classList.add('replaying');
  show('replay');
  replayLabel();
}
function endReplay() {
  document.body.classList.remove('replaying');
  CAMS.forEach(c => c.snap = true);
  show('results');
}

// posición de un kart en el tiempo t (interpolada entre dos cuadros)
const _rp = { x: 0, y: 0, z: 0, h: 0, slope: 0, roll: 0, pitch: 0, steer: 0, wheelRot: 0 };
function replayPose(ki, t, out) {
  const ts = R.rec.t, d = R.rec.k[ki], n = ts.length;
  let f = clamp(Math.floor((t - ts[0]) / R.rec.dt), 0, n - 2);
  while (f > 0 && ts[f] > t) f--;
  while (f < n - 2 && ts[f + 1] < t) f++;
  const a = clamp((t - ts[f]) / ((ts[f + 1] - ts[f]) || 1), 0, 1), o = f * RF, q = o + RF;
  out.x = lerp(d[o], d[q], a); out.y = lerp(d[o + 1], d[q + 1], a); out.z = lerp(d[o + 2], d[q + 2], a);
  let dh = d[q + 3] - d[o + 3]; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  out.h = d[o + 3] + dh * a;
  out.slope = lerp(d[o + 4], d[q + 4], a); out.roll = lerp(d[o + 5], d[q + 5], a); out.pitch = lerp(d[o + 6], d[q + 6], a);
  out.steer = lerp(d[o + 7], d[q + 7], a); out.wheelRot = lerp(d[o + 8], d[q + 8], a);
  out.speed = Math.hypot(d[q] - d[o], d[q + 2] - d[o + 2]) / R.rec.dt;
  return out;
}

function updateReplay(dt) {
  const ts = R.rec.t, end = ts[ts.length - 1];
  if (RP.playing) RP.t += dt * RP.speed;
  if (RP.t > end) { RP.t = ts[0]; RP.snap = true; RP.spot = -1; }
  if (RP.t < ts[0]) RP.t = ts[0];
  R.karts.forEach((k, i) => { replayPose(i, RP.t, _rp); poseKart(k.mesh, _rp, RP.playing ? dt * RP.speed : 0, RP.t); k.mesh.userData.head.visible = !(RP.cam === 3 && i === RP.target); });
  const tk = replayPose(RP.target, RP.t, {});
  const k = R.karts[RP.target];
  $('rpTime').textContent = fmtTime(Math.max(0, RP.t)) + ' / ' + fmtTime(end);
  $('rpBar').style.width = ((RP.t - ts[0]) / (end - ts[0]) * 100) + '%';
  $('rpWho').innerHTML = `<span class="dot" style="background:${cosById('body', k.look.body.id || k.look.body).c}"></span>${esc(k.name)} · ${Math.round(tk.speed * 3.6)} km/h`;
  $('rpState').textContent = (RP.playing ? '▶' : '❚❚') + ' ×' + RP.speed;
  if (RP.labelT > 0) { RP.labelT -= dt; if (RP.labelT <= 0) $('rpCam').classList.remove('show'); }
}
function replayLabel() { const el = $('rpCam'); el.textContent = RP_CAMS[RP.cam]; el.classList.add('show'); RP.labelT = 1.6; }

function replayCamera(dt, cam) {
  const p = replayPose(RP.target, RP.t, {});
  const T = R.T, k = R.karts[RP.target];
  const fx = Math.sin(p.h), fz = Math.cos(p.h);
  let tp, tl = new THREE.Vector3(p.x, p.y + 0.6, p.z), fov = 60, smooth = 8;
  if (RP.cam === 0) {
    // la cámara de TV más cercana que tenga al kart adelante o recién pasando
    const idx = nearestIndex(T, p.x, p.z, RP.snap || RP.idx == null ? -1 : RP.idx); RP.idx = idx;
    let best = -1, bd = Infinity;
    RP.spots.forEach((s, j) => {
      let d = idx - s.i; if (d < -T.N / 2) d += T.N; if (d > T.N / 2) d -= T.N;
      if (d < -45 || d > 30) return;
      const dist = Math.hypot(s.x - p.x, s.z - p.z, s.y - p.y);
      if (dist < bd) { bd = dist; best = j; }
    });
    if (best < 0) best = RP.spot >= 0 ? RP.spot : 0;
    if (best !== RP.spot) { RP.spot = best; RP.snap = true; }
    const s = RP.spots[best];
    tp = new THREE.Vector3(s.x, s.y, s.z);
    const dist = tp.distanceTo(tl);
    // zoom como en la tele: el kart ocupa siempre más o menos lo mismo en pantalla
    fov = clamp(2 * Math.atan(5 / Math.max(dist, 1)) * 180 / Math.PI, 12, 65);
    smooth = 30;
  } else if (RP.cam === 1) {
    tp = new THREE.Vector3(p.x - fx * 5, p.y + 2.2, p.z - fz * 5);
    tl.set(p.x + fx * 3, p.y + 0.7, p.z + fz * 3);
  } else if (RP.cam === 2) {
    const a = RP.t * 0.25;
    tp = new THREE.Vector3(p.x + Math.sin(a) * 14, p.y + 16, p.z + Math.cos(a) * 14);
    fov = 50;
  } else {
    tp = new THREE.Vector3(p.x - fx * 0.12, p.y + 1.08, p.z - fz * 0.12);
    tl.set(p.x + fx * 6, p.y + 0.9, p.z + fz * 6);
    smooth = 60; fov = 70;
  }
  if (RP.snap) { RP.pos.copy(tp); RP.look.copy(tl); RP.fov = fov; RP.snap = false; }
  const s = 1 - Math.exp(-dt * smooth);
  RP.pos.lerp(tp, RP.cam === 0 || RP.cam === 3 ? 1 : s); RP.look.lerp(tl, RP.cam === 3 ? 1 : 1 - Math.exp(-dt * 12)); RP.fov = lerp(RP.fov, fov, 1 - Math.exp(-dt * 4));
  cam.position.copy(RP.pos); cam.lookAt(RP.look);
  cam.fov = RP.fov; cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix();
}

function replayKey(e) {
  const ts = R.rec.t;
  if (e.code === 'Escape' || e.code === 'Backspace') { endReplay(); e.preventDefault(); return; }
  if (e.code === 'Space' || e.code === 'KeyP') RP.playing = !RP.playing;
  if (e.code === 'ArrowRight') { RP.t = Math.min(ts[ts.length - 1], RP.t + 5); RP.snap = true; }
  if (e.code === 'ArrowLeft') { RP.t = Math.max(ts[0], RP.t - 5); RP.snap = true; }
  if (e.code === 'ArrowUp' || e.code === 'Tab') { RP.target = (RP.target + 1) % R.karts.length; RP.snap = true; RP.spot = -1; }
  if (e.code === 'ArrowDown') { RP.target = (RP.target + R.karts.length - 1) % R.karts.length; RP.snap = true; RP.spot = -1; }
  if (e.code === 'KeyC') { RP.cam = (RP.cam + 1) % RP_CAMS.length; RP.snap = true; RP.spot = -1; replayLabel(); }
  if (e.code === 'KeyV') RP.speed = RP.speed === 1 ? 2 : RP.speed === 2 ? 0.5 : 1;
  if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
}
