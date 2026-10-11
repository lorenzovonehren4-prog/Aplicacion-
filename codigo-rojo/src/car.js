'use strict';
// Código Rojo: modelos de los carros (también el patrullero con circulina y los del tráfico),
// la cabina por dentro y la física (agarre, freno de mano para derrapar, saltos en las rampas,
// choques contra casas, árboles, el canal y las paredes rojas).
//
// Rumbo h: el frente apunta a (sin h, cos h) en (x, z); la derecha es (-cos h, sin h).
// Ejes locales del modelo: +z adelante, +x a la izquierda.

const BODY = {
  hatch: { L: 3.9, W: 1.76, H: 0.72, cab: [0.35, -0.55, 1.9], cabH: 0.62, wb: 2.45, r: 0.33 },
  sedan: { L: 4.6, W: 1.82, H: 0.72, cab: [0.25, -0.35, 2.2], cabH: 0.6, wb: 2.75, r: 0.34 },
  pickup: { L: 5.2, W: 1.95, H: 0.95, cab: [0.7, 0.4, 1.7], cabH: 0.75, wb: 3.2, r: 0.42, bed: true },
  muscle: { L: 4.8, W: 1.9, H: 0.7, cab: [0.15, -0.55, 1.8], cabH: 0.55, wb: 2.85, r: 0.36 },
  sport: { L: 4.4, W: 1.92, H: 0.6, cab: [0.05, -0.45, 1.75], cabH: 0.5, wb: 2.6, r: 0.34 },
  super: { L: 4.5, W: 2.0, H: 0.52, cab: [-0.1, -0.2, 1.6], cabH: 0.44, wb: 2.7, r: 0.35 },
  van: { L: 4.8, W: 1.95, H: 1.1, cab: [0.9, -1.6, 3.4], cabH: 0.9, wb: 3.0, r: 0.36 },
};

function decalTex(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 48;
  const g = c.getContext('2d');
  g.fillStyle = '#1f4fbf'; g.font = '900 34px Rubik, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 26);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let POLICE_DECAL = null;

// Arma un carro. spec: un CARS o { body, color }. opts: { police, cockpit }.
function makeCar(spec, opts = {}) {
  const B = BODY[spec.body] || BODY.sedan;
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const police = !!opts.police;
  const paint = new THREE.MeshStandardMaterial({ color: police ? 0x16181d : spec.color, roughness: 0.32, metalness: 0.45 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.3 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1d2a36, roughness: 0.08, metalness: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0x9ca3ab, roughness: 0.25, metalness: 0.9 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  const y0 = B.r + 0.12;
  // carrocería baja y cabina (trapecio extruido a lo ancho)
  add(new THREE.BoxGeometry(B.W, B.H, B.L), paint, 0, y0 + B.H / 2, 0);
  add(new THREE.BoxGeometry(B.W + 0.04, 0.16, B.L + 0.06), black, 0, y0 + 0.08, 0);
  const [cf, cb, cl] = B.cab;            // centro, desplazamiento atrás, largo
  const cz = cf + cb * 0.5, top = cl * 0.62;
  const sh = new THREE.Shape(); sh.moveTo(-cl / 2, 0); sh.lineTo(cl / 2, 0); sh.lineTo(cl / 2 - (cl - top) * 0.62, B.cabH); sh.lineTo(-cl / 2 + (cl - top) * 0.38, B.cabH); sh.closePath();
  const cabGeo = new THREE.ExtrudeGeometry(sh, { depth: B.W * 0.86, bevelEnabled: false }); cabGeo.translate(0, 0, -B.W * 0.43);
  const cab = new THREE.Mesh(cabGeo, glass); cab.rotation.y = -Math.PI / 2; cab.position.set(0, y0 + B.H, cz); cab.castShadow = true; body.add(cab);
  const lbits = [];
  // techo de color
  const roof = add(new THREE.BoxGeometry(B.W * 0.84, 0.07, top * 0.92), police ? white : paint, 0, y0 + B.H + B.cabH, cz - (cl - top) * 0.12);
  if (B.bed) { add(new THREE.BoxGeometry(B.W, 0.5, 1.9), paint, 0, y0 + B.H + 0.2, -B.L / 2 + 1.0); add(new THREE.BoxGeometry(B.W - 0.2, 0.52, 1.7), black, 0, y0 + B.H + 0.24, -B.L / 2 + 1.0); }
  // puertas blancas del patrullero, letras y circulina
  const bar = [];
  if (police) {
    for (const sd of [-1, 1]) {
      add(new THREE.BoxGeometry(0.02, B.H * 0.8, B.L * 0.42), white, sd * (B.W / 2 + 0.005), y0 + B.H * 0.55, 0.05);
      POLICE_DECAL = POLICE_DECAL || decalTex('POLICÍA');
      const d = new THREE.Mesh(new THREE.PlaneGeometry(B.L * 0.4, 0.3), new THREE.MeshBasicMaterial({ map: POLICE_DECAL, transparent: true }));
      d.position.set(sd * (B.W / 2 + 0.02), y0 + B.H * 0.55, 0.05); d.rotation.y = sd * Math.PI / 2; body.add(d);
    }
    add(new THREE.BoxGeometry(B.W * 0.7, 0.1, 0.32), black, 0, y0 + B.H + B.cabH + 0.08, cz);
    for (const sd of [-1, 1]) {
      const m = new THREE.MeshStandardMaterial({ color: sd < 0 ? 0xff2030 : 0x2050ff, emissive: sd < 0 ? 0xff1020 : 0x1040ff, emissiveIntensity: 0.4 });
      bar.push(add(new THREE.BoxGeometry(B.W * 0.32, 0.14, 0.3), m, sd * B.W * 0.18, y0 + B.H + B.cabH + 0.2, cz));
    }
    add(new THREE.BoxGeometry(B.W * 0.8, 0.35, 0.12), black, 0, y0 + 0.35, B.L / 2 + 0.1);   // defensa
  }
  // faros y luces de freno
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xfff0c8, emissiveIntensity: 0.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x9a0a0a, emissive: 0xff1010, emissiveIntensity: 0.3 });
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.42, 0.14, 0.05), headMat, sd * B.W * 0.33, y0 + B.H * 0.68, B.L / 2 + 0.01);
    add(new THREE.BoxGeometry(0.42, 0.14, 0.05), tailMat, sd * B.W * 0.33, y0 + B.H * 0.7, -B.L / 2 - 0.01);
  }
  add(new THREE.BoxGeometry(B.W * 0.5, 0.18, 0.04), chrome, 0, y0 + B.H * 0.45, B.L / 2 + 0.02);
  // ruedas
  const wheels = [];
  const tg = new THREE.CylinderGeometry(B.r, B.r, 0.28, 16); tg.rotateZ(Math.PI / 2);
  const rg = new THREE.CylinderGeometry(B.r * 0.6, B.r * 0.6, 0.3, 8); rg.rotateZ(Math.PI / 2);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const w = new THREE.Group(); w.position.set(sx * (B.W / 2 - 0.08), B.r, sz * B.wb / 2);
    const t = new THREE.Mesh(tg, black); t.castShadow = true;
    w.add(t, new THREE.Mesh(rg, chrome)); root.add(w); wheels.push(w);
  }
  const car = { root, body, wheels, bar, paint, headMat, tailMat, B, police, roof, cab };
  if (opts.cockpit) makeCockpit(car);
  return car;
}

// Cabina simple: tablero, volante, velocímetro y parantes. Sólo para el carro del jugador.
function makeCockpit(car) {
  const B = car.B, ck = new THREE.Group(), y0 = B.r + 0.12 + B.H;
  const front = B.cab[0] + B.cab[1] * 0.5 + B.cab[2] / 2;    // borde de adelante de la cabina
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.9 });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(B.W - 0.1, 0.2, 0.42), dark); dash.position.set(0, y0 - 0.06, front - 0.28); ck.add(dash);
  const wheelG = new THREE.Group(); wheelG.position.set(0.38, y0 - 0.1, front - 0.72); wheelG.rotation.x = -0.4;
  const steer = new THREE.Group(); wheelG.add(steer);
  steer.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 32), dark));
  for (const a of [0, 2.1, -2.1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.7 })); s.position.set(Math.sin(a) * -0.09, Math.cos(a) * -0.09, 0); s.rotation.z = a; steer.add(s); }
  ck.add(wheelG);
  // velocímetro digital
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.set(0.38, y0 + 0.07, front - 0.52); scr.rotation.y = Math.PI; scr.rotation.x = 0.3;
  ck.add(scr);
  for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, B.cabH + 0.1, 0.08), dark); p.position.set(sd * (B.W / 2 - 0.12), y0 + B.cabH / 2, front - 0.25); p.rotation.x = -0.45; ck.add(p); }
  const rf = new THREE.Mesh(new THREE.BoxGeometry(B.W - 0.15, 0.05, 0.9), dark); rf.position.set(0, y0 + B.cabH + 0.02, front - 1.45); ck.add(rf);
  car.body.add(ck);
  car.cockpit = ck; car.steerWheel = steer; car.speedCv = cv; car.speedTex = tex; car.lastKmh = -1;
  car.eye = new THREE.Vector3(0.38, y0 + B.cabH * 0.5, front - 1.2);
  ck.visible = false;
}

function poseCockpit(car, s) {
  if (!car.cockpit || !car.cockpit.visible) return;
  car.steerWheel.rotation.z = s.steer * 2.2;
  const k = Math.round(Math.abs(s.f) * 3.6);
  if (k !== car.lastKmh) {
    car.lastKmh = k;
    const g = car.speedCv.getContext('2d'); g.fillStyle = '#060a10'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#7ff0ff'; g.font = '700 38px "Courier New", monospace'; g.textAlign = 'center'; g.fillText(k, 64, 40);
    g.font = '600 13px Arial'; g.fillText('km/h', 64, 58);
    car.speedTex.needsUpdate = true;
  }
}

// ---------- física ----------
function newBody(spec, x, z, h) {
  return { spec, x, z, y: groundH(x, z), h, vx: 0, vz: 0, vy: 0, f: 0, l: 0, steer: 0, hp: spec.hp, hpMax: spec.hp,
    air: false, airT: 0, jumpFrom: null, slide: 0, rpm: 900, gear: 1, pitch: 0, roll: 0, grass: false, hit: 0, dead: false, odo: 0, mass: spec.mass || 1 };
}

// Un paso. inp = { thr, brk, steer, hand }. ev(nombre, datos) para choques y saltos.
function stepBody(c, inp, dt, ev) {
  const sp = c.spec;
  const fx = Math.sin(c.h), fz = Math.cos(c.h), rx = -fz, rz = fx;
  let f = c.vx * fx + c.vz * fz, l = c.vx * rx + c.vz * rz;
  const top = sp.top * (c.topMul || 1) * (c.dead ? 0.15 : 1);
  if (!c.air) {
    c.grass = !onRoad(c.x, c.z);
    const grip = sp.grip * (c.grass ? 0.78 : 1) * (inp.hand ? 0.5 : 1);
    let a = 0;
    if (inp.thr > 0 && f > -0.5) a += sp.acc * inp.thr * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2.4));
    if (inp.brk > 0) { if (f > 0.5) a -= sp.brake * inp.brk; else if (inp.thr <= 0) a -= 5 * inp.brk; }
    if (inp.thr <= 0 && inp.brk <= 0) a -= Math.sign(f) * Math.min(Math.abs(f) / dt, 1.2 + Math.abs(f) * 0.02);
    if (inp.hand) a -= Math.sign(f) * 3;
    a -= f * Math.abs(f) * 0.0007 + (c.grass ? f * 0.25 : 0);
    f += a * dt;
    if (f < -9) f = -9;
    const fa = Math.max(Math.abs(f), 1);
    const maxA = Math.min(0.6, Math.atan(1.25 * sp.grip * 9.8 * 2.7 / (fa * fa)));
    let yaw = f / 2.7 * Math.tan(inp.steer * maxA) / (1 + Math.abs(l) * 0.15);
    if (inp.hand && Math.abs(f) > 6) yaw *= 1.7;
    c.h -= yaw * dt;
    const nfx = Math.sin(c.h), nfz = Math.cos(c.h), nrx = -nfz, nrz = nfx;
    const vx = f * fx + l * rx, vz = f * fz + l * rz;
    f = vx * nfx + vz * nfz; l = vx * nrx + vz * nrz;
    const lmax = grip * 9.8 * dt;
    if (Math.abs(l) <= lmax) l = 0; else { l -= Math.sign(l) * lmax; f *= 1 - 0.2 * dt; }
    c.slide = Math.abs(l);
    c.vx = f * nfx + l * nrx; c.vz = f * nfz + l * nrz;
    c.yawRate = yaw;
  } else {
    // en el aire: sigue de largo, gira un poco
    c.h -= (c.yawRate || 0) * 0.3 * dt;
    c.vx *= 1 - 0.02 * dt; c.vz *= 1 - 0.02 * dt;
    f = c.vx * fx + c.vz * fz;
  }
  c.f = f; c.l = l;
  const ox = c.x, oz = c.z;
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.odo += Math.abs(f) * dt;
  // altura: sigue el piso; si el piso se cae (punta de la rampa) sale volando
  const g0 = groundH(ox, oz), g1 = groundH(c.x, c.z);
  if (!c.air) {
    if (g1 >= c.y - 0.15) { c.vy = (g1 - c.y) / dt; c.y = g1; }
    else { c.air = true; c.airT = 0; c.jumpFrom = { x: c.x, z: c.z }; }
    c.vy = Math.min(c.vy, 9);
  }
  if (c.air) {
    c.airT += dt;
    c.vy -= 9.8 * dt; c.y += c.vy * dt;
    if (c.y <= g1) {
      const imp = -c.vy;
      c.y = g1; c.air = false;
      const dist = c.jumpFrom ? Math.hypot(c.x - c.jumpFrom.x, c.z - c.jumpFrom.z) : 0;
      ev('aterriza', { c, imp, dist });
      c.vy = 0;
    }
  }
  // inclinación visual
  const slope = (g1 - g0) / Math.max(0.01, Math.hypot(c.x - ox, c.z - oz));
  const tp = c.air ? clamp(-c.vy * 0.03, -0.35, 0.35) : -Math.atan(slope) * Math.sign(f || 1);
  c.pitch += (tp - c.pitch) * Math.min(1, dt * 8);
  c.roll += (clamp(-(c.yawRate || 0) * f * 0.004, -0.08, 0.08) - c.roll) * Math.min(1, dt * 6);
  // caja automática para el sonido y el tacómetro
  const gears = [0, 9, 17, 26, 36, 47, 70].map(v => v * top / 50);
  let g = 1; while (g < 6 && Math.abs(f) > gears[g]) g++;
  c.gear = f < -0.3 ? -1 : g;
  const lo = gears[g - 1], hi = gears[g];
  c.rpm += ((1000 + 5800 * clamp((Math.abs(f) - lo * 0.5) / (hi - lo * 0.5), 0, 1.05) * (inp.thr > 0 ? 1 : 0.8)) - c.rpm) * Math.min(1, dt * 8);
  if (c.air) c.rpm += (7000 - c.rpm) * dt * 3;
}

// Choques contra lo fijo: paredes rojas del borde, casas, árboles, cerro y canal.
// El carro es tres círculos a lo largo (adelante, medio y atrás).
function collideStatic(c, ev) {
  const fx = Math.sin(c.h), fz = Math.cos(c.h), half = c.spec.body ? (BODY[c.spec.body] || BODY.sedan).L / 2 - 0.9 : 1.4;
  const R = 1.0;
  for (const k of [-1, 0, 1]) {
    let px = c.x + fx * half * k, pz = c.z + fz * half * k;
    // pared roja
    const lim = LIMIT - R;
    for (const [ax, sg] of [['x', 1], ['x', -1], ['z', 1], ['z', -1]]) {
      const v = ax === 'x' ? px : pz;
      if (v * sg > lim) {
        const pen = v * sg - lim;
        if (ax === 'x') { c.x -= sg * pen; px -= sg * pen; } else { c.z -= sg * pen; pz -= sg * pen; }
        const vn = (ax === 'x' ? c.vx : c.vz) * sg;
        if (vn > 0) { if (ax === 'x') c.vx -= sg * vn * 1.4; else c.vz -= sg * vn * 1.4; hitDamage(c, vn, ev, 'pared', px, pz); }
      }
    }
    for (const s of solidsNear(px, pz)) {
      if (c.y > s.h) continue;
      const cx = clamp(px, s.x0, s.x1), cz = clamp(pz, s.z0, s.z1);
      let dx = px - cx, dz = pz - cz, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      let nx, nz, pen;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = R - d; }
      else {
        // el centro quedó adentro: sale por el lado más cercano
        const opts = [[px - s.x0, -1, 0], [s.x1 - px, 1, 0], [pz - s.z0, 0, -1], [s.z1 - pz, 0, 1]].sort((a, b) => a[0] - b[0]);
        nx = opts[0][1]; nz = opts[0][2]; pen = opts[0][0] + R;
      }
      c.x += nx * pen; c.z += nz * pen; px += nx * pen; pz += nz * pen;
      const vn = -(c.vx * nx + c.vz * nz);
      if (vn > 0) {
        c.vx += nx * vn * 1.3; c.vz += nz * vn * 1.3;
        const keep = 1 - Math.min(0.5, 0.05 + vn * 0.03); c.vx *= keep; c.vz *= keep;
        hitDamage(c, vn, ev, s.kind, px - nx * R, pz - nz * R);
      }
    }
  }
}
function hitDamage(c, vn, ev, kind, x, z) {
  if (vn < 1.5) return;
  const dmg = vn * 1.5 / (c.mass || 1) * (c.actor && c.actor.role === 'policia' ? 0.6 : 1);
  c.hp = Math.max(0, c.hp - dmg);
  ev('choque', { c, vn, kind, x, z });
}

// Choques entre carros (dos círculos por carro). Los pesados empujan más.
function collideCars(a, b, ev) {
  const dx0 = a.x - b.x, dz0 = a.z - b.z;
  if (dx0 * dx0 + dz0 * dz0 > 49 || Math.abs(a.y - b.y) > 1.6) return;
  const ca = [], cb = [];
  for (const [c, out] of [[a, ca], [b, cb]]) {
    const L = (BODY[c.spec.body] || BODY.sedan).L / 2 - 0.95, fx = Math.sin(c.h), fz = Math.cos(c.h);
    out.push([c.x + fx * L, c.z + fz * L], [c.x - fx * L, c.z - fz * L]);
  }
  const R = 1.0;
  for (const p of ca) for (const q of cb) {
    let dx = p[0] - q[0], dz = p[1] - q[1], d = Math.hypot(dx, dz);
    if (d >= 2 * R || d < 1e-4) continue;
    const nx = dx / d, nz = dz / d, pen = 2 * R - d;
    const ma = a.mass, mb = b.mass, tot = ma + mb;
    a.x += nx * pen * mb / tot; a.z += nz * pen * mb / tot; b.x -= nx * pen * ma / tot; b.z -= nz * pen * ma / tot;
    const rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (rv < 0) {
      const j = -(1 + 0.25) * rv / (1 / ma + 1 / mb);
      a.vx += j * nx / ma; a.vz += j * nz / ma; b.vx -= j * nx / mb; b.vz -= j * nz / mb;
      // un empujón de costado hace girar al otro
      a.h += clamp((Math.random() - 0.5) * -rv * 0.02, -0.15, 0.15); b.h += clamp((Math.random() - 0.5) * -rv * 0.02, -0.15, 0.15);
      ev('choqueCarro', { a, b, imp: -rv, x: (p[0] + q[0]) / 2, z: (p[1] + q[1]) / 2 });
    }
  }
}

// Copia la física al modelo 3D.
function poseCar(car, c, dt, t) {
  car.root.position.set(c.x, c.y, c.z);
  car.root.rotation.set(0, c.h, 0, 'YXZ');
  car.body.rotation.set(c.pitch, 0, c.roll, 'YXZ');
  const spin = c.f / car.B.r * dt;
  car.wheels.forEach((w, i) => { w.children[0].rotation.x += spin; w.children[1].rotation.x += spin; if (i < 2) w.rotation.y = -c.steer * 0.5; });
  if (car.bar.length && car.sirenOn) {
    const ph = Math.floor(t * 8) % 2;
    car.bar[0].material.emissiveIntensity = ph ? 3 : 0.15; car.bar[1].material.emissiveIntensity = ph ? 0.15 : 3;
  }
  car.tailMat.emissiveIntensity = c.braking ? 2.2 : (W.time === 'noche' ? 0.8 : 0.3);
}
