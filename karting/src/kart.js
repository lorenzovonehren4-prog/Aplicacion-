'use strict';
// Modelo 3D del kart (inspirado en un kart de alquiler: chasis de tubos, trompa,
// pontones, motor al costado), acabados de pintura y su física semi-realista.

const MATS = new Map();
function mat(color, opts) {
  const key = color + JSON.stringify(opts || {});
  if (!MATS.has(key)) {
    const o = Object.assign({ color, roughness: 0.6, metalness: 0.05 }, opts || {});
    MATS.set(key, new THREE.MeshStandardMaterial(o));
  }
  return MATS.get(key);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let CARBON_TEX = null;
function carbonTexture() {
  if (CARBON_TEX) return CARBON_TEX;
  CARBON_TEX = canvasTexture(64, 64, (g, w, h) => {
    g.fillStyle = '#16161B'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const gr = g.createLinearGradient(x * 8, y * 8, x * 8 + 8, y * 8 + 8);
      const on = (x + y) % 2;
      gr.addColorStop(0, on ? '#34343C' : '#1C1C22'); gr.addColorStop(1, on ? '#1C1C22' : '#34343C');
      g.fillStyle = gr; g.fillRect(x * 8, y * 8, 8, 8);
    }
  });
  CARBON_TEX.wrapS = CARBON_TEX.wrapT = THREE.RepeatWrapping; CARBON_TEX.repeat.set(3, 3);
  return CARBON_TEX;
}

// Material según el acabado: mate, brillo, metal, cromo, oro, perla, neon, carbono
const FINISH = new Map();
function finishMat(color, f, map) {
  const key = color + '|' + (f || 'brillo') + '|' + (map ? map.uuid : '');
  if (FINISH.has(key)) return FINISH.get(key);
  let m;
  const P = THREE.MeshPhysicalMaterial;
  switch (f) {
    case 'mate': m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.05, map }); break;
    case 'metal': m = new P({ color, roughness: 0.32, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.06, map }); break;
    case 'cromo': m = new P({ color, roughness: 0.05, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5, map }); break;
    case 'oro': m = new P({ color, roughness: 0.2, metalness: 1, clearcoat: 1, clearcoatRoughness: 0.03, emissive: color, emissiveIntensity: 0.22, envMapIntensity: 1.6, map }); break;
    case 'perla': m = new P({ color, roughness: 0.22, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 820], map }); break;
    case 'neon': m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, emissive: color, emissiveIntensity: 1.25, map }); break;
    case 'carbono': m = new P({ color: '#ffffff', map: carbonTexture(), roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }); break;
    default: m = new P({ color, roughness: 0.36, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.08, map });
  }
  FINISH.set(key, m);
  return m;
}

// Textura del casco. En una esfera de three.js, u da la vuelta alrededor del eje Y
// (u = 0.25 mira hacia +z, el frente) y v va de abajo (0) a arriba (1).
const HELMET_TEX = new Map();
function helmetTexture(h) {
  if (HELMET_TEX.has(h.id)) return HELMET_TEX.get(h.id);
  const t = canvasTexture(256, 128, (g, w, hh) => {
    g.fillStyle = h.a; g.fillRect(0, 0, w, hh);
    g.fillStyle = h.b;
    const band = (u, wd) => { g.fillRect((u - wd / 2) * w, 0, wd * w, hh * 0.62); };
    if (h.p === 'franja') { band(0.25, 0.09); band(0.75, 0.09); }
    if (h.p === 'doble') { for (const u of [0.2, 0.3, 0.7, 0.8]) band(u, 0.045); }
    if (h.p === 'mitad') { g.fillRect(0, hh * 0.42, w, hh * 0.58); }
    if (h.p === 'cuadros') {
      const n = 16, m = 8;
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2) g.fillRect(i * w / n, j * hh / m, w / n, hh / m);
    }
    if (h.p === 'rayo') {
      for (const u0 of [0, 0.5]) {
        g.beginPath();
        const x = u0 * w;
        g.moveTo(x + 10, hh * 0.15); g.lineTo(x + 70, hh * 0.15); g.lineTo(x + 50, hh * 0.38);
        g.lineTo(x + 110, hh * 0.38); g.lineTo(x + 30, hh * 0.62); g.lineTo(x + 50, hh * 0.45); g.lineTo(x, hh * 0.45);
        g.closePath(); g.fill();
      }
    }
  });
  HELMET_TEX.set(h.id, t);
  return t;
}

function numberTexture(num, color) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 50, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16141C'; g.font = '800 64px Fredoka, Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), w / 2, h / 2 + 3);
  });
}

let GLOW_TEX = null;
function glowTexture() {
  if (GLOW_TEX) return GLOW_TEX;
  GLOW_TEX = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return GLOW_TEX;
}

const GEO = {};
function geo(name, make) { return GEO[name] || (GEO[name] = make()); }

function boxM(w, h, d, m, x, y, z) {
  const me = new THREE.Mesh(geo('b' + w + ',' + h + ',' + d, () => new THREE.BoxGeometry(w, h, d)), m);
  me.position.set(x, y, z); me.castShadow = true; return me;
}
function tube(len, r, m, x, y, z, axis) {
  const me = new THREE.Mesh(geo('t' + len + ',' + r, () => new THREE.CylinderGeometry(r, r, len, 10)), m);
  me.position.set(x, y, z);
  if (axis === 'x') me.rotation.z = Math.PI / 2; else if (axis === 'z') me.rotation.x = Math.PI / 2;
  me.castShadow = true; return me;
}
// caja con cantos redondeados (forma extruida con bisel)
function roundBox(w, h, d, r, m, x, y, z) {
  const me = new THREE.Mesh(geo('rb' + [w, h, d, r], () => {
    const s = new THREE.Shape(), hw = w / 2 - r, hh = h / 2 - r;
    s.moveTo(-hw, -h / 2); s.lineTo(hw, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh); s.lineTo(w / 2, hh);
    s.quadraticCurveTo(w / 2, h / 2, hw, h / 2); s.lineTo(-hw, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
    s.lineTo(-w / 2, -hh); s.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - r * 2) / 2);
    return g;
  }), m);
  me.position.set(x, y, z); me.castShadow = true; return me;
}

// Crea el kart con la estética dada: { body, helmet, rims, glow, num }
function makeKart(look) {
  const pick = (k, v) => typeof v === 'string' ? cosById(k, v) : v;
  const body = pick('body', look.body), helmet = pick('helmet', look.helmet), rims = pick('rims', look.rims);
  const glow = look.glow ? pick('glow', look.glow) : null;
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const chassis = new THREE.Group(); root.add(chassis);   // se inclina con el balanceo
  const paint = finishMat(body.c, body.f);
  const black = mat('#1C1C22', { roughness: 0.7 });
  const steel = mat('#C9CDD6', { metalness: 0.75, roughness: 0.28 });
  const dark = mat('#3A3D46', { roughness: 0.5, metalness: 0.3 });
  const seatM = mat('#22222A', { roughness: 0.55 });

  // chasis de tubos
  chassis.add(tube(1.55, 0.028, steel, -0.3, 0.13, 0, 'z'), tube(1.55, 0.028, steel, 0.3, 0.13, 0, 'z'));
  chassis.add(tube(1.1, 0.025, steel, 0, 0.13, 0.62, 'x'), tube(1.2, 0.025, steel, 0, 0.13, -0.62, 'x'));
  chassis.add(tube(0.7, 0.025, steel, 0, 0.13, 0.2, 'x'));
  chassis.add(boxM(0.62, 0.02, 1.25, dark, 0, 0.11, 0.05));
  // trompa delantera y pontones laterales (pintados, cantos redondeados)
  chassis.add(roundBox(1.06, 0.17, 0.26, 0.05, paint, 0, 0.2, 0.9));
  const cone = roundBox(0.52, 0.2, 0.52, 0.06, paint, 0, 0.28, 0.65); cone.rotation.x = -0.3; chassis.add(cone);
  const plate = new THREE.Mesh(geo('plate', () => new THREE.PlaneGeometry(0.3, 0.3)),
    new THREE.MeshStandardMaterial({ map: numberTexture(look.num == null ? 7 : look.num, body.f === 'carbono' ? '#1C1C22' : body.c), roughness: 0.4 }));
  plate.position.set(0, 0.41, 0.78); plate.rotation.x = -1.27; chassis.add(plate);
  for (const sx of [-1, 1]) {
    chassis.add(roundBox(0.22, 0.18, 0.76, 0.05, paint, sx * 0.56, 0.19, -0.02));
    chassis.add(boxM(0.2, 0.03, 0.5, black, sx * 0.56, 0.29, -0.02));
  }
  // paragolpes trasero
  chassis.add(roundBox(1.28, 0.14, 0.16, 0.05, black, 0, 0.2, -1.0));
  chassis.add(tube(0.35, 0.03, steel, -0.4, 0.2, -0.86, 'z'), tube(0.35, 0.03, steel, 0.4, 0.2, -0.86, 'z'));
  // asiento
  chassis.add(boxM(0.42, 0.08, 0.42, seatM, 0, 0.2, -0.18));
  const back = roundBox(0.44, 0.44, 0.08, 0.03, seatM, 0, 0.43, -0.4); back.rotation.x = -0.25; chassis.add(back);
  // motor al costado, con aletas y escape
  chassis.add(roundBox(0.26, 0.3, 0.3, 0.04, steel, -0.44, 0.33, -0.36));
  for (let i = 0; i < 4; i++) chassis.add(boxM(0.3, 0.025, 0.32, dark, -0.44, 0.42 + i * 0.045, -0.36));
  chassis.add(tube(0.6, 0.045, dark, -0.15, 0.2, -0.78, 'x'));
  chassis.add(roundBox(0.2, 0.16, 0.2, 0.04, mat('#E9E3D2', { roughness: 0.6 }), 0.36, 0.3, 0.25)); // tanque
  // volante
  const colm = tube(0.45, 0.02, steel, 0, 0.36, 0.38, 'z'); colm.rotation.x = Math.PI / 2 - 0.9; chassis.add(colm);
  const wheelS = new THREE.Mesh(geo('steer', () => new THREE.TorusGeometry(0.13, 0.022, 8, 20)), black);
  wheelS.position.set(0, 0.52, 0.22); wheelS.rotation.x = -0.75; chassis.add(wheelS);

  // piloto
  const suit = mat('#2B2E3A', { roughness: 0.8 });
  const torso = new THREE.Mesh(geo('torso', () => new THREE.CapsuleGeometry(0.17, 0.26, 6, 12)), suit);
  torso.position.set(0, 0.6, -0.2); torso.rotation.x = -0.2; torso.castShadow = true; chassis.add(torso);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(geo('arm', () => new THREE.CapsuleGeometry(0.055, 0.34, 4, 8)), suit);
    arm.position.set(sx * 0.17, 0.6, 0.02); arm.rotation.x = 1.1; arm.rotation.z = -sx * 0.25; arm.castShadow = true; chassis.add(arm);
    const leg = new THREE.Mesh(geo('leg', () => new THREE.CapsuleGeometry(0.07, 0.45, 4, 8)), suit);
    leg.position.set(sx * 0.13, 0.3, 0.25); leg.rotation.x = Math.PI / 2 - 0.25; chassis.add(leg);
  }
  const head = new THREE.Group(); head.position.set(0, 0.92, -0.14); chassis.add(head);
  const hMat = finishMat('#ffffff', helmet.f || 'brillo', helmetTexture(helmet));
  if (helmet.f === 'neon') { hMat.emissive = new THREE.Color(helmet.b); hMat.emissiveMap = helmetTexture(helmet); hMat.emissiveIntensity = 1.1; }
  const shell = new THREE.Mesh(geo('helmet', () => new THREE.SphereGeometry(0.19, 32, 20)), hMat);
  shell.castShadow = true; head.add(shell);
  const visor = new THREE.Mesh(geo('visor', () => new THREE.SphereGeometry(0.195, 24, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.35, Math.PI * 0.3)),
    new THREE.MeshPhysicalMaterial({ color: '#0C0C14', roughness: 0.05, metalness: 0.4, clearcoat: 1 }));
  head.add(visor);

  // ruedas
  const tyre = mat('#18181C', { roughness: 0.9 });
  const rimM = finishMat(rims.c, rims.f || 'metal');
  const wheels = [];
  const mkWheel = (r, w, x, z, front) => {
    const pivot = new THREE.Group(); pivot.position.set(x, r, z);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(geo('ty' + r + w, () => new THREE.CylinderGeometry(r, r, w, 22)), tyre);
    t.rotation.z = Math.PI / 2; t.castShadow = true; spin.add(t);
    const rm = new THREE.Mesh(geo('rm' + r + w, () => new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.01, 16)), rimM);
    rm.rotation.z = Math.PI / 2; spin.add(rm);
    const hub = boxM(w + 0.02, r * 0.25, r * 0.9, dark, 0, 0, 0); spin.add(hub);
    root.add(pivot);
    wheels.push({ pivot, spin, r, front });
  };
  mkWheel(0.15, 0.13, -0.56, 0.62, true); mkWheel(0.15, 0.13, 0.56, 0.62, true);
  mkWheel(0.17, 0.2, -0.6, -0.64, false); mkWheel(0.17, 0.2, 0.6, -0.64, false);

  // luces de neón debajo del kart: tubos que brillan y un reflejo en el piso
  let glowParts = null;
  if (glow && glow.c) {
    const col = glow.c === 'rainbow' ? '#ff3366' : glow.c;
    const tubeM = new THREE.MeshBasicMaterial({ color: col });
    const floorM = new THREE.MeshBasicMaterial({ color: col, map: glowTexture(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const bars = [boxM(0.04, 0.03, 1.3, tubeM, -0.42, 0.08, 0), boxM(0.04, 0.03, 1.3, tubeM, 0.42, 0.08, 0), boxM(0.8, 0.03, 0.04, tubeM, 0, 0.08, 0.72)];
    bars.forEach(b => { b.castShadow = false; chassis.add(b); });
    const pool = new THREE.Mesh(geo('glowpool', () => new THREE.PlaneGeometry(2.8, 3.4)), floorM);
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.03; pool.renderOrder = 2; root.add(pool);
    glowParts = { tubeM, floorM, rainbow: glow.c === 'rainbow' };
  }

  root.userData = { chassis, wheels, head, wheelS, glowParts };
  return root;
}

// ---------- Física ----------
// Rumbo h: el frente apunta a (sin h, cos h). La derecha es (-cos h, sin h).
// steer > 0 gira a la derecha.
function newPhys(x, z, h) {
  return { x, z, y: 0, h, vx: 0, vz: 0, yaw: 0, steer: 0, slip: 0, speed: 0, fwd: 0, lat: 0, hitT: 0, roll: 0, pitch: 0, slope: 0, wheelRot: 0 };
}

function stepPhys(p, inp, dt, T, idx) {
  const sh = Math.sin(p.h), ch = Math.cos(p.h);
  const fx = sh, fz = ch, rx = -ch, rz = sh;
  let vf = p.vx * fx + p.vz * fz;
  let vl = p.vx * rx + p.vz * rz;
  const sp = Math.abs(vf);
  p.steer = inp.steer;

  // motor, frenos y freno motor
  let ax = 0;
  if (inp.throttle > 0) {
    if (vf >= -0.5) ax += inp.throttle * KART.accel * Math.max(0, 1 - (vf / KART.vmax) ** 2);
    else ax += inp.throttle * KART.brake;
  }
  if (inp.brake > 0) {
    if (vf > 0.4) ax -= inp.brake * KART.brake;
    else if (inp.throttle <= 0) ax -= inp.brake * KART.accel * 0.6 * Math.max(0, 1 - (Math.max(0, -vf) / KART.reverse) ** 2);
  }
  // rodadura, aire y freno motor (al soltar el acelerador el kart desacelera solo)
  let drag = KART.roll + 0.0016 * vf * vf;
  if (inp.throttle <= 0 && inp.brake <= 0) drag += KART.engineBrake * clamp(sp / 6, 0, 1);
  if (vf > 0) ax -= Math.min(drag, vf / dt); else if (vf < 0 && inp.throttle <= 0) ax += Math.min(drag, -vf / dt);
  if (inp.handbrake) ax -= Math.sign(vf) * Math.min(2.5, Math.abs(vf) / dt);
  // pendiente de rampas y puentes
  ax -= 9.8 * T.grade[idx] * 0.85;
  vf += ax * dt;

  // dirección: el volante pide una fracción del giro máximo posible a esa velocidad.
  // A baja velocidad manda la geometría; a alta, el agarre. Así un toque en recta mueve poco
  // y a fondo en curva se aprovecha todo el agarre.
  const gripMax = inp.handbrake ? KART.slideGrip : KART.grip;
  const geoYaw = Math.abs(vf) / KART.wheelbase * Math.tan(KART.steerLow);
  const gripYaw = gripMax * (inp.handbrake ? 2.0 : 1.1) / Math.max(sp, 1.5);
  const yawMax = Math.min(geoYaw, gripYaw);
  const shaped = Math.sign(inp.steer) * Math.pow(Math.abs(inp.steer), 1.3);
  const yawWant = -Math.sign(vf) * shaped * yawMax;
  p.yaw = lerp(p.yaw, yawWant, 1 - Math.exp(-dt * 10));
  p.h += p.yaw * dt;

  // la velocidad lateral se come con el agarre de las llantas
  const take = gripMax * dt;
  const slipBefore = Math.abs(vl);
  vl = Math.abs(vl) <= take ? 0 : vl - Math.sign(vl) * take;
  // al deslizar se pierde algo de velocidad
  if (slipBefore > 1) vf -= Math.sign(vf) * Math.min(Math.abs(vf), slipBefore * 0.22 * dt);

  // conservamos la velocidad en el marco viejo para que aparezca el derrape
  p.vx = fx * vf + rx * vl; p.vz = fz * vf + rz * vl;
  p.x += p.vx * dt; p.z += p.vz * dt;
  const sh2 = Math.sin(p.h), ch2 = Math.cos(p.h);
  p.fwd = p.vx * sh2 + p.vz * ch2;
  p.lat = p.vx * -ch2 + p.vz * sh2;
  p.speed = Math.hypot(p.vx, p.vz);
  p.slip = Math.abs(p.lat);
  p.wheelRot += p.fwd * dt / 0.16;
  p.roll = lerp(p.roll, clamp(p.yaw * p.fwd * 0.003, -0.07, 0.07), 1 - Math.exp(-dt * 8));
  p.pitch = lerp(p.pitch, clamp(-ax * 0.003, -0.04, 0.04), 1 - Math.exp(-dt * 6));
  p.hitT = Math.max(0, p.hitT - dt);

  // barreras: no puede salirse del ancho de la pista
  const i = nearestIndex(T, p.x, p.z, idx);
  const dx = p.x - T.px[i], dz = p.z - T.pz[i];
  const lat = dx * T.nx[i] + dz * T.nz[i];
  const along = dx * T.tx[i] + dz * T.tz[i];
  const lim = T.hw - 0.42;
  let hit = 0;
  if (Math.abs(lat) > lim) {
    const s = Math.sign(lat), push = Math.abs(lat) - lim;
    p.x -= T.nx[i] * s * push; p.z -= T.nz[i] * s * push;
    const vn = p.vx * T.nx[i] * s + p.vz * T.nz[i] * s;   // hacia la barrera
    if (vn > 0) {
      p.vx -= T.nx[i] * s * vn * 1.3; p.vz -= T.nz[i] * s * vn * 1.3;
      const keep = clamp(1 - vn * 0.04, 0.6, 0.97);
      p.vx *= keep; p.vz *= keep;
      hit = vn;
      // la barrera endereza un poco el kart
      const th = Math.atan2(T.tx[i], T.tz[i]);
      let d = th - p.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < Math.PI / 2) p.h += d * clamp(vn * 0.05, 0, 0.35);
      p.hitT = 0.25;
    }
  }
  p.y = trackHeight(T, i, along);
  p.slope = lerp(p.slope, Math.atan(T.grade[i]), 1 - Math.exp(-dt * 10));
  return { idx: i, hit, side: Math.sign(lat) };
}

// Choques entre karts: círculos que se separan e intercambian velocidad (solo si están al mismo nivel)
function collideKarts(karts) {
  const r2 = KART.radius * 2;
  for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) {
    const A = karts[a].p, B = karts[b].p;
    if (Math.abs(A.y - B.y) > 1.5) continue;
    const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
    if (d >= r2 || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, pen = r2 - d;
    A.x -= nx * pen / 2; A.z -= nz * pen / 2; B.x += nx * pen / 2; B.z += nz * pen / 2;
    const rel = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
    if (rel < 0) {
      const j = -rel * 0.8;
      A.vx -= nx * j / 2; A.vz -= nz * j / 2; B.vx += nx * j / 2; B.vz += nz * j / 2;
      karts[a].bump = karts[b].bump = Math.max(-rel, karts[a].bump || 0);
    }
  }
}

const _glowCol = new THREE.Color();
function poseKart(mesh, p, dt, time) {
  mesh.position.set(p.x, p.y, p.z);
  mesh.rotation.y = p.h;
  mesh.rotation.x = -p.slope;
  const u = mesh.userData;
  u.chassis.rotation.z = -p.roll;
  u.chassis.rotation.x = p.pitch;
  const st = p.steer * 0.45;
  for (const w of u.wheels) {
    w.spin.rotation.x = p.wheelRot * (0.16 / w.r);
    if (w.front) w.pivot.rotation.y = -st;
  }
  u.wheelS.rotation.z = p.steer * 1.4;
  u.head.rotation.y = -p.steer * 0.25;
  u.head.rotation.z = p.roll * 2;
  if (u.glowParts && u.glowParts.rainbow) {
    _glowCol.setHSL(((time || performance.now() / 1000) * 0.25) % 1, 1, 0.55);
    u.glowParts.tubeM.color.copy(_glowCol); u.glowParts.floorM.color.copy(_glowCol);
  }
}
