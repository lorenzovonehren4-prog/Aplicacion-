'use strict';
// Drive In The Serrín: el carro (un 4x4 tipo jeep). Modelo por fuera, cabina por dentro (volante,
// manos, velocímetro y tacómetro que se mueven) y física.
//
// Ejes locales del carro: +z adelante, +y arriba, +x a la IZQUIERDA (la derecha es -x).
// El conductor va a la izquierda (x = +0.4).

const WB = 2.5;          // distancia entre ejes
const EYE = new THREE.Vector3(0.4, 1.7, -0.3);

function paintMat(id) {
  const p = PAINTS.find(q => q.id === id) || PAINTS[0];
  return new THREE.MeshStandardMaterial({ color: p.c, roughness: p.metal ? 0.25 : 0.5, metalness: p.metal ? 0.85 : 0.1 });
}

function box(w, h, l, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat);
  m.position.set(x, y, z);
  return m;
}

function gaugeFace(kind) {
  return canvasTex(256, 256, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#d9dcdf'; g.beginPath(); g.arc(c, c, 126, 0, 7); g.fill();
    g.fillStyle = '#0b0b0d'; g.beginPath(); g.arc(c, c, 112, 0, 7); g.fill();
    // marcas de 225° a -45° (en sentido horario)
    const n = kind === 'vel' ? 10 : 8;
    for (let i = 0; i <= n * 2; i++) {
      const a = (225 - i * 270 / (n * 2)) * DEG, big = i % 2 === 0;
      g.strokeStyle = kind === 'rpm' && i >= n * 2 - 3 ? '#ff3b2f' : '#f2f2f2';
      g.lineWidth = big ? 7 : 3;
      g.beginPath(); g.moveTo(c + Math.cos(a) * 100, c - Math.sin(a) * 100); g.lineTo(c + Math.cos(a) * (big ? 78 : 88), c - Math.sin(a) * (big ? 78 : 88)); g.stroke();
    }
    g.fillStyle = '#9aa0a6'; g.font = '600 18px Rubik, sans-serif'; g.textAlign = 'center';
    g.fillText(kind === 'vel' ? '' : 'x1000 rpm', c, c + 66);
  });
}

// Arma el carro. Devuelve { root, body, cockpit, wheels, steer, needleV, needleR, digi, arms, lights }.
function makeCar(paint) {
  const root = new THREE.Group();
  const body = new THREE.Group();     // carrocería (se inclina con la suspensión)
  root.add(body);
  const P = paintMat(paint);
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.4, metalness: 0.6 });
  const shadowy = [];
  const add = (m, cast = true) => { body.add(m); if (cast) shadowy.push(m); return m; };
  // --- por fuera ---
  add(box(1.86, 0.62, 3.9, P, 0, 0.82, 0.05));                 // carrocería baja
  const hood = add(box(1.78, 0.3, 1.45, P, 0, 1.2, 1.25));     // capó
  add(box(1.9, 0.12, 4.0, black, 0, 0.5, 0.05));               // estribos
  add(box(1.96, 0.22, 0.25, black, 0, 0.62, 2.05));            // parachoques
  add(box(1.96, 0.22, 0.25, black, 0, 0.62, -1.98));
  add(box(1.5, 0.36, 0.06, black, 0, 1.0, 2.03));              // parrilla
  for (const sx of [-1, 1]) {
    add(box(0.32, 0.18, 1.1, P, sx * 0.92, 1.0, 1.35));        // guardabarros
    add(box(0.32, 0.18, 1.0, P, sx * 0.92, 1.0, -1.35));
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2c4, emissiveIntensity: 0.6 }));
    hl.rotation.x = Math.PI / 2; hl.position.set(sx * 0.62, 1.02, 2.06); add(hl, false);
    add(box(0.18, 0.12, 0.04, new THREE.MeshStandardMaterial({ color: 0xb01010, emissive: 0x600000 }), sx * 0.75, 0.9, -1.97), false);
    // parantes
    const a = box(0.08, 0.72, 0.08, black, sx * 0.86, 1.72, 0.5); a.rotation.x = -0.32; add(a);
    add(box(0.08, 0.72, 0.08, black, sx * 0.86, 1.7, -0.7));
    add(box(0.08, 0.72, 0.08, black, sx * 0.86, 1.7, -1.85));
    add(box(0.06, 0.06, 1.0, P, sx * 0.93, 1.15, -0.1), false);  // borde naranja de la puerta
  }
  add(box(1.82, 0.06, 2.55, dark, 0, 2.06, -0.65));            // techo
  add(box(1.78, 0.08, 0.08, black, 0, 2.0, 0.6));              // marco superior del parabrisas
  add(box(1.78, 0.07, 0.07, black, 0, 1.38, 0.68), false);     // marco inferior
  const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.26, 18), black);
  spare.rotation.x = Math.PI / 2; spare.position.set(0, 1.15, -2.15); add(spare);
  // ruedas
  const wheels = [];
  const tg = new THREE.CylinderGeometry(0.43, 0.43, 0.32, 18); tg.rotateZ(Math.PI / 2);
  const rg = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 10); rg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[0.86, 1.35], [-0.86, 1.35], [0.86, -1.35], [-0.86, -1.35]]) {
    const w = new THREE.Group();
    w.position.set(x, 0.43, z);
    const t = new THREE.Mesh(tg, black); t.castShadow = true;
    w.add(t, new THREE.Mesh(rg, grey));
    root.add(w);
    wheels.push(w);
  }
  // --- cabina (lo que se ve desde el asiento) ---
  const cockpit = new THREE.Group();
  body.add(cockpit);
  const dashM = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.85 });
  cockpit.add(box(1.72, 0.32, 0.5, dashM, 0, 1.2, 0.6));                     // tablero
  const bin = box(0.62, 0.24, 0.24, dashM, 0.4, 1.32, 0.38); cockpit.add(bin); // caja de los relojes
  cockpit.add(box(0.36, 0.05, 0.03, new THREE.MeshStandardMaterial({ color: 0x3b3d42 }), -0.42, 1.24, 0.25)); // rejilla
  cockpit.add(box(0.36, 0.05, 0.03, new THREE.MeshStandardMaterial({ color: 0x3b3d42 }), -0.42, 1.17, 0.25));
  cockpit.add(box(0.36, 0.05, 0.03, new THREE.MeshStandardMaterial({ color: 0x3b3d42 }), -0.42, 1.1, 0.25));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), grey); knob.position.set(-0.15, 1.05, 0.26); cockpit.add(knob);
  const led = box(0.05, 0.03, 0.02, new THREE.MeshBasicMaterial({ color: 0x29c46a }), -0.3, 1.02, 0.26); cockpit.add(led);
  // relojes: cara, aguja y número digital
  const faceV = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ map: gaugeFace('vel'), toneMapped: false }));
  const faceR = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ map: gaugeFace('rpm'), toneMapped: false }));
  // miran hacia el conductor (-z)
  faceV.rotation.y = Math.PI; faceR.rotation.y = Math.PI;
  faceV.position.set(0.53, 1.33, 0.255); faceR.position.set(0.27, 1.33, 0.255);
  cockpit.add(faceV, faceR);
  const needle = (col) => {
    const g = new THREE.Group();
    const m = box(0.006, 0.085, 0.004, new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), 0, 0.035, 0);
    g.add(m);
    return g;
  };
  const needleV = needle(0xff6a1a), needleR = needle(0xff6a1a);
  needleV.position.set(0.53, 1.33, 0.25); needleR.position.set(0.27, 1.33, 0.25);
  needleV.rotation.y = Math.PI; needleR.rotation.y = Math.PI;
  cockpit.add(needleV, needleR);
  const digiCanvas = document.createElement('canvas'); digiCanvas.width = 128; digiCanvas.height = 40;
  const digiTex = new THREE.CanvasTexture(digiCanvas); digiTex.colorSpace = THREE.SRGBColorSpace;
  const digi = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.034), new THREE.MeshBasicMaterial({ map: digiTex, transparent: true, toneMapped: false }));
  digi.rotation.y = Math.PI; digi.position.set(0.53, 1.31, 0.252);
  cockpit.add(digi);
  // volante
  const wheelTilt = new THREE.Group();
  wheelTilt.position.set(0.4, 1.24, 0.16);
  wheelTilt.rotation.x = -0.42;
  const steer = new THREE.Group();
  wheelTilt.add(steer);
  const rimM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7 });
  steer.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 10, 40), rimM));
  const stitch = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.0255, 4, 40, Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0x8a8a8a, wireframe: true, transparent: true, opacity: 0.25 }));
  steer.add(stitch);
  const mark = box(0.05, 0.055, 0.055, new THREE.MeshStandardMaterial({ color: 0xc9a227 }), 0, 0.2, 0); steer.add(mark);
  const spokeM = new THREE.MeshStandardMaterial({ color: 0x8e9398, roughness: 0.35, metalness: 0.7 });
  for (const a of [0, 2.2, -2.2]) {
    const sp = box(0.03, 0.18, 0.02, spokeM, Math.sin(a) * -0.1, Math.cos(a) * -0.1, 0.01);
    sp.rotation.z = a; steer.add(sp);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 16), spokeM); hub.rotation.x = Math.PI / 2; hub.position.z = 0.02; steer.add(hub);
  const hubC = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10), black); hubC.position.z = -0.01; steer.add(hubC);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.set(Math.cos(i * 1.047) * 0.055, Math.sin(i * 1.047) * 0.055, -0.005); steer.add(b); }
  cockpit.add(wheelTilt);
  const column = box(0.06, 0.06, 0.3, black, 0.4, 1.17, 0.32); column.rotation.x = -0.42; cockpit.add(column);
  // manos y brazos (piel tipo bloque, como en el dibujo)
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b8b0, roughness: 0.8 });
  const hands = [];
  for (const sx of [1, -1]) {
    const h = box(0.075, 0.11, 0.08, skin, sx * 0.2, 0.02, -0.01);
    steer.add(h); hands.push(h);
  }
  const arms = [];
  for (const sx of [1, -1]) {
    const a = box(0.13, 0.13, 1, skin, 0, 0, 0);
    a.userData.elbow = new THREE.Vector3(0.4 + sx * 0.33, 0.95, -0.42);
    cockpit.add(a); arms.push(a);
  }
  // piernas (jean)
  const jean = new THREE.MeshStandardMaterial({ color: 0xc4cfe0, roughness: 0.95 });
  for (const sx of [1, -1]) { const l = box(0.15, 0.14, 0.62, jean, 0.4 + sx * 0.11, 0.86, 0.02); l.rotation.x = 0.18; cockpit.add(l); }
  cockpit.add(box(1.7, 0.05, 2.6, new THREE.MeshStandardMaterial({ color: 0x1d1d1f }), 0, 0.56, -0.4));    // piso
  // puertas por dentro
  for (const sx of [1, -1]) cockpit.add(box(0.06, 0.62, 1.4, dashM, sx * 0.88, 0.95, -0.15));
  // visera y retrovisor
  cockpit.add(box(1.2, 0.05, 0.3, new THREE.MeshStandardMaterial({ color: 0x8e8e7e, roughness: 0.9 }), 0.05, 1.93, 0.45));
  const mir = box(0.24, 0.07, 0.025, black, -0.08, 1.86, 0.56); cockpit.add(mir);
  cockpit.add(box(0.21, 0.05, 0.005, new THREE.MeshStandardMaterial({ color: 0xb8c6d4, roughness: 0.15, metalness: 0.8 }), -0.08, 1.86, 0.546));
  // espejo lateral izquierdo (afuera)
  const sm = new THREE.Group(); sm.position.set(1.08, 1.42, 0.72);
  sm.add(box(0.06, 0.03, 0.03, black, -0.05, 0, 0));
  sm.add(box(0.22, 0.16, 0.06, black, 0.06, 0.02, 0));
  sm.add(box(0.19, 0.13, 0.01, new THREE.MeshStandardMaterial({ color: 0x9fb2c6, roughness: 0.1, metalness: 0.9 }), 0.06, 0.02, -0.035));
  body.add(sm);
  // faros (luz de verdad sólo en ambientes oscuros)
  const lamp = new THREE.SpotLight(0xfff1d0, 0, 140, 0.5, 0.45, 1.2);
  lamp.position.set(0, 1.05, 2.1);
  lamp.target.position.set(0, -0.6, 22);
  body.add(lamp, lamp.target);
  const dashLight = new THREE.PointLight(0xffb070, 0, 2.2, 1.5);
  dashLight.position.set(0.3, 1.5, 0.1);
  cockpit.add(dashLight);
  for (const m of shadowy) m.castShadow = true;
  body.children.forEach(o => { o.userData.p0 = o.position.clone(); o.userData.r0 = o.rotation.clone(); });
  return { hood, dashLight, root, body, cockpit, wheels, steer, needleV, needleR, digi, digiCanvas, digiTex, arms, hands, lamp, paint: P, lastDigi: -1 };
}

// Destroza el carro: capó levantado, piezas torcidas, una rueda suelta y pintura quemada.
function wreckCar(car, hard) {
  if (car.wrecked) return;
  car.wrecked = true;
  car.paint.color.multiplyScalar(0.55);
  car.hood.rotation.x = -0.55; car.hood.position.y += 0.25; car.hood.position.z -= 0.1;
  for (const o of car.body.children) {
    if (o === car.cockpit || !o.isMesh || Math.random() > 0.45) continue;
    o.rotation.x += (Math.random() - 0.5) * 0.5 * hard; o.rotation.z += (Math.random() - 0.5) * 0.5 * hard;
    o.position.x += (Math.random() - 0.5) * 0.12 * hard;
  }
  const w = car.wheels[Math.random() < 0.5 ? 0 : 1];
  w.updateWorldMatrix(true, false);
  const pos = new THREE.Vector3().setFromMatrixPosition(w.matrixWorld);
  w.visible = false;
  const clone = w.clone(); clone.visible = true;
  return { wheel: clone, pos };
}
function resetCarLook(car) {
  if (!car.wrecked) return;
  car.wrecked = false;
  for (const o of car.body.children) if (o.userData.p0) { o.position.copy(o.userData.p0); o.rotation.copy(o.userData.r0); }
  car.wheels.forEach(w => { w.visible = true; });
  setCarPaint(car, save.paint);
}

function setCarPaint(car, id) {
  const p = PAINTS.find(q => q.id === id) || PAINTS[0];
  car.paint.color.set(p.c);
  car.paint.metalness = p.metal ? 0.85 : 0.1;
  car.paint.roughness = p.metal ? 0.25 : 0.5;
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
// Mueve volante, manos, agujas y el número del velocímetro.
function poseCockpit(car, C) {
  car.steer.rotation.z = -C.steer * 2.3;
  for (let i = 0; i < 2; i++) {
    const a = car.arms[i], hand = car.hands[i];
    hand.getWorldPosition(_v1);
    car.cockpit.worldToLocal(_v1);
    const e = a.userData.elbow;
    _v2.copy(_v1).sub(e);
    const len = _v2.length();
    a.position.copy(e).addScaledVector(_v2, 0.5);
    a.scale.set(1, 1, len + 0.05);
    a.lookAt(_v1.applyMatrix4(car.cockpit.matrixWorld));
  }
  const kmh = Math.abs(C.f) * 3.6;
  car.needleV.rotation.z = (135 - Math.min(kmh, 200) / 200 * 270) * DEG;
  car.needleR.rotation.z = (135 - Math.min(C.rpm, 8000) / 8000 * 270) * DEG;
  const k = Math.round(kmh);
  if (k !== car.lastDigi) {
    car.lastDigi = k;
    const g = car.digiCanvas.getContext('2d');
    g.clearRect(0, 0, 128, 40);
    g.fillStyle = '#f4f4f4'; g.font = '600 26px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${k} km/h`, 64, 21);
    car.digiTex.needsUpdate = true;
  }
}

// ---------- física ----------
function newCarState(T, st) {
  const p = roadPoint(T, 5, 0);
  return {
    x: p.x, z: p.z, y: p.y, h: p.h, vx: 0, vz: 0, vy: 0, f: 0, l: 0,
    steer: 0, s: 5, d: 0, i: 5, hp: st.hp, hpMax: st.hp, state: 'drive',
    pitch: 0, roll: 0, rollV: 0, pitchV: 0, rpm: 900, gear: 1, slide: 0, hits: 0, hitCool: 0,
    shoulder: 0, impact: 0, fallT: 0, fallSide: 0, bump: 0, topSpeed: 0, odo: 0,
  };
}

// Un paso de simulación. inp = { thr, brk, steer (−1 izquierda … 1 derecha) }.
// ev(nombre, valor) avisa choques y caídas.
function stepCar(C, inp, T, st, dt, ev) {
  if (C.state === 'fall') return stepFall(C, T, dt, ev);
  if (C.state === 'crash') return stepCrash(C, T, dt, ev);
  const fx = Math.sin(C.h), fz = Math.cos(C.h), rx = -fz, rz = fx;
  let f = C.vx * fx + C.vz * fz, l = C.vx * rx + C.vz * rz;
  const grip = st.grip * T.L.grip * (C.shoulder ? 0.75 : 1);
  // motor, freno y pendiente
  let a = 0;
  const top = st.top;
  if (inp.thr > 0 && f > -0.5) a += st.acc * inp.thr * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2.2));
  if (inp.brk > 0) {
    if (f > 0.6) a -= st.brake * inp.brk;
    else if (inp.thr <= 0) a -= 4 * inp.brk;                     // reversa
  }
  if (inp.thr <= 0 && inp.brk <= 0) a -= Math.sign(f) * Math.min(Math.abs(f) / dt, 1.1 + Math.abs(f) * 0.02);
  a -= 9.8 * T.g[Math.min(T.n - 1, Math.round(C.s))] * 0.85;
  a -= f * Math.abs(f) * 0.0009;
  if (C.shoulder) a -= f * 0.35;
  f += a * dt;
  if (f < -7) f = -7;
  // dirección: a alta velocidad el volante da algo más que el agarre (si te pasas, deslizas)
  const fa = Math.max(Math.abs(f), 1);
  const maxA = Math.min(0.58, Math.atan(1.18 * grip * 9.8 * WB / (fa * fa)));
  const yaw = f / WB * Math.tan(inp.steer * maxA) / (1 + Math.abs(l) * 0.25);
  C.h -= yaw * dt;     // steer > 0 gira a la derecha (h baja)
  // la velocidad no gira sola con el carro: el agarre lateral la va corrigiendo
  const nfx = Math.sin(C.h), nfz = Math.cos(C.h), nrx = -nfz, nrz = nfx;
  const vx = f * fx + l * rx, vz = f * fz + l * rz;
  f = vx * nfx + vz * nfz; l = vx * nrx + vz * nrz;
  const lmax = grip * 9.8 * dt;
  if (Math.abs(l) <= lmax) l = 0; else { l -= Math.sign(l) * lmax; f *= 1 - 0.25 * dt; }
  C.slide = Math.abs(l);
  C.vx = f * nfx + l * nrx; C.vz = f * nfz + l * nrz;
  C.f = f; C.l = l;
  C.x += C.vx * dt; C.z += C.vz * dt;
  C.odo += Math.abs(f) * dt;
  // dónde quedó respecto a la ruta
  const loc = locate(T, C.x, C.z, C.i);
  C.i = loc.i; C.s = loc.s; C.d = loc.d;
  const side = C.d < 0 ? 0 : 1, sg = C.d < 0 ? -1 : 1, ad = Math.abs(C.d);
  const si = Math.min(T.n - 1, Math.round(C.s));
  const w = side === 0 ? T.wL[si] : T.wR[si], guard = side === 0 ? T.gL[si] : T.gR[si];
  C.shoulder = ad > T.hw - 0.85 ? 1 : 0;
  const nxo = T.nx[si] * sg, nzo = T.nz[si] * sg;
  const wallLim = T.hw + SHOULDER - 0.95;
  if (w < 0.5 || guard) {
    if (ad > wallLim) {
      const vn = C.vx * nxo + C.vz * nzo;
      const onGuard = guard && w >= 0.5;
      if (vn > st.crash * (onGuard ? 0.85 : 1)) {
        if (onGuard) {
          // rompe la baranda y se va al abismo
          ev('baranda', { s: C.s, side, vn });
          startFall(C, side, sg, nxo, nzo, ev);
          return;
        }
        startCrash(C, sg, nxo, nzo, vn, ev);
        return;
      }
      // roce o golpe contra la pared de roca o la baranda
      const back = ad - wallLim;
      C.x -= nxo * back; C.z -= nzo * back; C.d = sg * wallLim;
      if (vn > 0) {
        C.vx -= nxo * vn * 1.3; C.vz -= nzo * vn * 1.3;
        const sp = Math.hypot(C.vx, C.vz), keep = 1 - Math.min(0.55, 0.03 + vn * 0.035);
        C.vx *= keep; C.vz *= keep;
        // endereza el carro hacia la ruta
        let dh = T.h[si] - C.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
        if (Math.abs(dh) < 1.4) C.h += dh * Math.min(0.5, 0.15 + vn * 0.05);
        if (vn > 1.2) {
          const dmg = vn * 5.5 * st.armor * (onGuard ? 0.8 : 1);
          C.hp -= dmg; C.impact = Math.min(1, vn / 10);
          ev('choque', { vn, guard: onGuard, sp, side });
          if (vn > 2.4 && C.hitCool <= 0) { C.hits++; C.hitCool = 0.8; }
          if (C.hp <= 0) { startCrash(C, sg, nxo, nzo, Math.max(vn, 5), ev); return; }
        }
      }
    }
  } else if (ad > T.hw + SHOULDER + 0.15) {
    // se salió por el abismo
    startFall(C, side, sg, nxo, nzo, ev);
    return;
  }
  if (C.hitCool > 0) C.hitCool -= dt;
  // altura, cabeceo y balanceo
  C.y = roadY(T, C.s) + (C.shoulder ? -0.02 : 0);
  const gr = T.g[si];
  const accLat = f * yaw;
  C.pitch += ((-Math.atan(gr)) - a * 0.006 - C.pitch) * Math.min(1, dt * 8);
  C.roll += (Math.max(-0.07, Math.min(0.07, -accLat * 0.006)) - C.roll) * Math.min(1, dt * 6);
  C.bump = C.shoulder ? Math.sin(C.odo * 9) * 0.02 : Math.sin(C.odo * 2.1) * 0.003;
  // caja automática (para el tacómetro y el sonido)
  const gears = [0, 9, 16, 24, 32, 41, 60].map(v => v * top / 38);
  let g = 1;
  while (g < 6 && Math.abs(f) > gears[g]) g++;
  C.gear = f < -0.3 ? -1 : g;
  const lo = gears[g - 1], hi = gears[g];
  const targetRpm = 1000 + 5600 * Math.min(1.08, (Math.abs(f) - lo * 0.55) / (hi - lo * 0.55)) * (inp.thr > 0 ? 1 : 0.85);
  C.rpm += (Math.max(850, targetRpm) - C.rpm) * Math.min(1, dt * 7);
  C.topSpeed = Math.max(C.topSpeed, f);
}

function startFall(C, side, sg, nxo, nzo, ev) {
  C.state = 'fall'; C.fallT = 0; C.fallSide = side; C.vy = 0.8;
  C.vx += nxo * 2.5; C.vz += nzo * 2.5;
  C.rollV = sg * 1.6; C.pitchV = 0.6;
  ev('caida', {});
}

// Choque fuerte: el carro rebota, gira y puede volcarse. Se queda destrozado.
function startCrash(C, sg, nxo, nzo, vn, ev) {
  C.state = 'crash'; C.crashT = 0;
  C.vx -= nxo * vn * 1.4; C.vz -= nzo * vn * 1.4;
  C.spin = -sg * (1.5 + vn * 0.25) * (Math.random() < 0.5 ? 1 : 0.6);
  C.rollV = -sg * Math.min(9, vn * 0.75);
  C.pitchV = (Math.random() - 0.5) * vn * 0.3;
  C.vy = Math.min(6, vn * 0.35);
  C.hp = Math.min(C.hp, 0);
  ev('crash', { vn });
}

function stepCrash(C, T, dt, ev) {
  C.crashT += dt;
  const sp = Math.hypot(C.vx, C.vz);
  if (sp > 0.01) { const k = Math.max(0, sp - 7 * dt) / sp; C.vx *= k; C.vz *= k; }
  C.x += C.vx * dt; C.z += C.vz * dt;
  C.h += C.spin * dt; C.spin *= 1 - 1.6 * dt;
  C.roll += C.rollV * dt; C.pitch += C.pitchV * dt;
  C.vy -= 9.8 * dt;
  const loc = locate(T, C.x, C.z, C.i);
  C.i = loc.i; C.s = loc.s; C.d = loc.d;
  const lim = T.hw + SHOULDER - 0.95;
  if (Math.abs(C.d) > lim) {
    const si = Math.min(T.n - 1, Math.round(C.s)), sg = C.d < 0 ? -1 : 1;
    const back = Math.abs(C.d) - lim, nxo = T.nx[si] * sg, nzo = T.nz[si] * sg;
    C.x -= nxo * back; C.z -= nzo * back;
    const vn = C.vx * nxo + C.vz * nzo;
    if (vn > 0) { C.vx -= nxo * vn * 1.5; C.vz -= nzo * vn * 1.5; if (vn > 2) ev('golpe', { v: vn }); }
  }
  // al volcarse el carro se levanta del piso
  const lift = Math.abs(Math.sin(C.roll)) * 0.85 + Math.abs(Math.sin(C.pitch)) * 1.2;
  const floor = roadY(T, C.s) + lift;
  C.y += C.vy * dt;
  if (C.y < floor) {
    C.y = floor;
    if (C.vy < -2.5) ev('golpe', { v: -C.vy });
    C.vy = Math.abs(C.vy) * 0.3;
    C.rollV *= 0.6; C.pitchV *= 0.5;
  }
  // termina apoyado sobre las ruedas, de costado o patas arriba
  if (Math.abs(C.rollV) < 1.2 && C.y <= floor + 0.05) {
    const tgt = Math.round(C.roll / (Math.PI / 2)) * (Math.PI / 2);
    C.roll += (tgt - C.roll) * Math.min(1, dt * 4); C.rollV *= 1 - 3 * dt;
  }
  if (Math.abs(C.pitchV) < 1.2) { C.pitch += (0 - C.pitch) * Math.min(1, dt * 3); C.pitchV *= 1 - 3 * dt; }
  C.f = sp;
  C.rpm += (900 - C.rpm) * dt;
}

function stepFall(C, T, dt, ev) {
  C.fallT += dt;
  C.vy -= 9.8 * dt;
  C.x += C.vx * dt; C.z += C.vz * dt; C.y += C.vy * dt;
  C.vx *= 1 - 0.15 * dt; C.vz *= 1 - 0.15 * dt;
  C.roll += C.rollV * dt; C.pitch += C.pitchV * dt;
  const loc = locate(T, C.x, C.z, C.i);
  C.i = loc.i; C.s = loc.s; C.d = loc.d;
  const floor = profileHeight(T, C.s, C.fallSide, Math.abs(C.d)) + 0.7;
  if (C.y < floor) {
    C.y = floor;
    if (C.vy < -3) ev('golpe', { v: -C.vy });
    C.vy = Math.abs(C.vy) * 0.38;
    const sg = C.fallSide === 0 ? -1 : 1, si = Math.min(T.n - 1, Math.round(C.s));
    C.vx += T.nx[si] * sg * 3; C.vz += T.nz[si] * sg * 3;
    C.rollV += sg * 2.5; C.pitchV += (Math.random() - 0.5) * 3;
  }
  C.f = Math.hypot(C.vx, C.vz);
  C.rpm += (7200 - C.rpm) * dt * 2;
}

// Copia el estado al modelo 3D.
function poseCar(car, C, dt) {
  car.root.position.set(C.x, C.y, C.z);
  car.root.rotation.set(0, C.h, 0, 'YXZ');
  car.body.rotation.set(C.pitch + C.bump, 0, C.roll, 'YXZ');
  if (C.state === 'fall') { car.root.rotation.set(C.pitch, C.h + C.fallT * 0.3, C.roll, 'YXZ'); car.body.rotation.set(0, 0, 0); }
  if (C.state === 'crash') { car.root.rotation.set(C.pitch, C.h, C.roll, 'YXZ'); car.body.rotation.set(0, 0, 0); }
  const spin = C.f / 0.43 * dt;
  car.wheels.forEach((w, i) => { w.children[0].rotation.x += spin; w.children[1].rotation.x += spin; if (i < 2) w.rotation.y = -C.steer * 0.45; });
}
