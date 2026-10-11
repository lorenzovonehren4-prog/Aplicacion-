'use strict';
// Código Rojo: modelos de los carros (también el patrullero con circulina y los del tráfico),
// la cabina por dentro y la física (agarre, freno de mano para derrapar, saltos en las rampas,
// choques contra casas, árboles, el canal y las paredes rojas).
//
// Rumbo h: el frente apunta a (sin h, cos h) en (x, z); la derecha es (-cos h, sin h).
// Ejes locales del modelo: +z adelante, +x a la izquierda.
//
// Modelo: la carrocería es el perfil lateral extruido a lo ancho con bisel (bordes redondeados)
// y con los pasos de rueda recortados; la cabina es otro perfil más angosto encima, con
// vidrios oscuros. Las piezas que no son pintura se juntan en una sola malla por material
// (vidrios, molduras y cromo, faros, luces traseras) y se arman una vez por tipo de carro.

// L largo, W ancho, clr altura del piso, belt línea de cintura, roof techo,
// zW base del parabrisas, zR1/zR2 techo adelante/atrás, zB base de la luneta, r radio de rueda, wb distancia entre ejes
const BODY = {
  hatch: { L: 3.95, W: 1.76, clr: 0.27, belt: 0.93, roof: 1.47, zW: 0.55, zR1: -0.12, zR2: -1.3, zB: -1.8, r: 0.31, wb: 2.5 },
  sedan: { L: 4.65, W: 1.82, clr: 0.27, belt: 0.92, roof: 1.43, zW: 0.72, zR1: -0.02, zR2: -1.0, zB: -1.6, r: 0.33, wb: 2.75 },
  muscle: { L: 4.85, W: 1.9, clr: 0.25, belt: 0.88, roof: 1.32, zW: 0.42, zR1: -0.28, zR2: -1.08, zB: -1.72, r: 0.36, wb: 2.85, scoop: true },
  sport: { L: 4.45, W: 1.93, clr: 0.22, belt: 0.82, roof: 1.22, zW: 0.55, zR1: -0.25, zR2: -0.85, zB: -1.66, r: 0.34, wb: 2.6, spoiler: 'lip' },
  super: { L: 4.55, W: 2.0, clr: 0.18, belt: 0.74, roof: 1.12, zW: 0.78, zR1: -0.02, zR2: -0.62, zB: -1.55, r: 0.35, wb: 2.7, spoiler: 'wing' },
  pickup: { L: 5.3, W: 1.98, clr: 0.42, belt: 1.12, roof: 1.88, zW: 1.0, zR1: 0.42, zR2: -0.42, zB: -0.55, r: 0.42, wb: 3.2, bed: true },
  van: { L: 4.9, W: 1.98, clr: 0.32, belt: 1.02, roof: 2.08, zW: 1.62, zR1: 0.95, zR2: -2.3, zB: -2.42, r: 0.36, wb: 3.0 },
};

function decalTex(text, color = '#1f4fbf') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = color; g.font = '900 64px Rubik, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function plateTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 58);
  g.fillStyle = '#c8202a'; g.fillRect(3, 3, 250, 12);
  g.fillStyle = '#1a1a1a'; g.font = '800 34px "Courier New", monospace'; g.textAlign = 'center';
  g.fillText(['ABC-123', 'LMA-704', 'BRR-777', 'CRJ-202', 'PER-519'][Math.floor(Math.random() * 5)], 128, 54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let POLICE_DECAL = null, PLATE = null, BLOB = null;

// Perfil 2D (z, y) extruido a lo ancho w, con bisel. Devuelve geometría centrada en x.
function sideExtrude(shape, w, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, w - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(w - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}
const MG = (geo, m, c) => ({ geo, m, c });
const T4 = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')).setPosition(x, y, z);

// Geometrías de un tipo de carro (se arman una sola vez).
const CAR_GEO = {};
function carGeo(type) {
  if (CAR_GEO[type]) return CAR_GEO[type];
  const B = BODY[type];
  const hl = B.L / 2, fw = B.wb / 2, ra = B.r + 0.07, cy = B.r;
  // carrocería baja con pasos de rueda
  const s = new THREE.Shape();
  const nose = type === 'super' || type === 'sport' ? 0.25 : type === 'van' ? 0.05 : 0.14;
  s.moveTo(-hl, B.clr + 0.1);
  s.lineTo(-fw - ra, B.clr); s.lineTo(-fw - ra, cy); s.absarc(-fw, cy, ra, Math.PI, 0, true); s.lineTo(-fw + ra, B.clr);
  s.lineTo(fw - ra, B.clr); s.lineTo(fw - ra, cy); s.absarc(fw, cy, ra, Math.PI, 0, true); s.lineTo(fw + ra, B.clr);
  s.lineTo(hl, B.clr + 0.1);
  s.lineTo(hl + 0.02, B.belt - 0.3 - nose * 0.4);
  s.quadraticCurveTo(hl, B.belt - nose * 0.5, hl - 0.25, B.belt - nose * 0.25);
  s.lineTo(B.zW, B.belt + (type === 'super' ? 0.02 : 0.05));
  if (B.bed) { s.lineTo(B.zB, B.belt + 0.05); s.lineTo(-hl + 0.15, B.belt + 0.02); }
  else { s.lineTo(B.zB, B.belt + 0.04); s.lineTo(-hl + 0.18, B.belt - 0.02); }
  s.quadraticCurveTo(-hl, B.belt - 0.06, -hl - 0.01, B.belt - 0.28);
  s.lineTo(-hl, B.clr + 0.1);
  const lower = sideExtrude(s, B.W, 0.07);
  // cabina (más angosta) con vidrios
  const cw = B.W * (type === 'van' ? 0.96 : type === 'pickup' ? 0.92 : 0.84);
  const c = new THREE.Shape();
  c.moveTo(B.zW, B.belt); c.lineTo(B.zR1, B.roof); c.lineTo(B.zR2, B.roof); c.lineTo(B.zB, B.belt); c.closePath();
  const cabin = sideExtrude(c, cw, 0.06);
  const glass = [], trim = [], head = [], tail = [];
  // parabrisas y luneta: planos sobre las caras inclinadas
  const pane = (z0, y0, z1, y1, w, out) => {
    const dz = z1 - z0, dy = y1 - y0, len = Math.hypot(dz, dy), ang = Math.atan2(dy, dz);
    const nz = -Math.sin(ang) * out, ny = Math.cos(ang) * out;
    glass.push(MG(new THREE.PlaneGeometry(w, len * 0.9), T4(0, (y0 + y1) / 2 + ny * 0.04 + 0.01, (z0 + z1) / 2 + nz * 0.04, -Math.PI / 2 + ang * -1 + Math.PI, 0, 0), 0x0d151d));
  };
  // (el plano mira hacia afuera: adelante para el parabrisas, atrás para la luneta)
  const wsAng = Math.atan2(B.roof - B.belt, B.zR1 - B.zW);
  glass.push(MG(new THREE.PlaneGeometry(cw * 0.86, Math.hypot(B.roof - B.belt, B.zR1 - B.zW) * 0.86), T4(0, (B.belt + B.roof) / 2 + 0.02, (B.zW + B.zR1) / 2 + 0.035, -Math.PI / 2 - wsAng + Math.PI, 0, 0), 0x0d151d));
  const rwAng = Math.atan2(B.roof - B.belt, B.zB - B.zR2);
  glass.push(MG(new THREE.PlaneGeometry(cw * 0.84, Math.hypot(B.roof - B.belt, B.zB - B.zR2) * 0.84), T4(0, (B.belt + B.roof) / 2 + 0.02, (B.zB + B.zR2) / 2 - 0.035, -Math.PI / 2 - rwAng + Math.PI, Math.PI, 0), 0x0d151d));
  // ventanas laterales (con parante del medio)
  const sw = new THREE.Shape(), inset = 0.09;
  const fz = B.zW - inset * 1.6, rz = B.zB + inset * 1.6;
  sw.moveTo(fz, B.belt + 0.05); sw.lineTo(B.zR1 - inset * 0.4, B.roof - inset); sw.lineTo(B.zR2 + inset * 0.4, B.roof - inset); sw.lineTo(rz, B.belt + 0.05); sw.closePath();
  for (const sd of [-1, 1]) {
    const g = new THREE.ShapeGeometry(sw); g.rotateY(sd > 0 ? -Math.PI / 2 : Math.PI / 2);
    glass.push(MG(g, new THREE.Matrix4().makeTranslation(sd * (cw / 2 + 0.012), 0, 0), 0x0d151d));
    const mid = (B.zR1 + B.zR2) / 2 + 0.05;
    if (type !== 'sport' && type !== 'super') trim.push(MG(new THREE.BoxGeometry(0.02, B.roof - B.belt - 0.1, 0.09), T4(sd * (cw / 2 + 0.02), (B.roof + B.belt) / 2, mid), 0x111214));
    // espejo
    trim.push(MG(new THREE.BoxGeometry(0.2, 0.13, 0.12), T4(sd * (B.W / 2 + 0.07), B.belt + 0.1, B.zW - 0.05), 0x15171a));
    // líneas de puertas y manijas
    for (const dz of [B.zW + 0.05, (B.zR1 + B.zR2) / 2 + 0.05]) trim.push(MG(new THREE.BoxGeometry(0.012, B.belt - B.clr - 0.25, 0.012), T4(sd * (B.W / 2 + 0.002), (B.belt + B.clr) / 2 + 0.05, dz), 0x0b0b0c));
    trim.push(MG(new THREE.BoxGeometry(0.02, 0.035, 0.14), T4(sd * (B.W / 2 + 0.008), B.belt - 0.12, B.zW - 0.4), 0xb8bec6));
    // faldón negro
    trim.push(MG(new THREE.BoxGeometry(0.04, 0.12, B.wb - B.r * 2 - 0.2), T4(sd * (B.W / 2 - 0.01), B.clr + 0.06, 0), 0x18191c));
  }
  // frente: parrilla, faros, parachoques y placa
  const fy = B.belt - 0.28;
  trim.push(MG(new THREE.BoxGeometry(B.W * 0.42, 0.16, 0.05), T4(0, fy, hl + 0.01), 0x101114));
  trim.push(MG(new THREE.BoxGeometry(B.W * 0.44, 0.02, 0.06), T4(0, fy + 0.09, hl + 0.01), 0xc9ced6));
  trim.push(MG(new THREE.BoxGeometry(B.W * 0.86, 0.12, 0.08), T4(0, B.clr + 0.16, hl + 0.02), 0x1a1b1e));
  trim.push(MG(new THREE.BoxGeometry(B.W * 0.6, 0.08, 0.05), T4(0, B.clr + 0.07, hl - 0.02), 0x0e0f11));
  for (const sd of [-1, 1]) {
    const hg = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20); hg.rotateX(Math.PI / 2); hg.scale(1.6, 0.8, 1);
    head.push(MG(hg, T4(sd * B.W * 0.33, fy + 0.04, hl + 0.005), 0xffffff));
    trim.push(MG(new THREE.BoxGeometry(0.42, 0.18, 0.03), T4(sd * B.W * 0.33, fy + 0.04, hl - 0.01), 0x2a2d33));
    // luces traseras
    tail.push(MG(new THREE.BoxGeometry(B.W * 0.3, 0.1, 0.04), T4(sd * B.W * 0.3, B.belt - 0.14, -hl - 0.005), 0xffffff));
    // escape
    if (sd > 0 || type === 'muscle' || type === 'sport' || type === 'super') { const ex = new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12); ex.rotateX(Math.PI / 2); trim.push(MG(ex, T4(sd * B.W * 0.28, B.clr + 0.08, -hl - 0.03), 0xb8bec6)); }
  }
  trim.push(MG(new THREE.BoxGeometry(B.W * 0.86, 0.12, 0.08), T4(0, B.clr + 0.16, -hl - 0.02), 0x1a1b1e));
  // extras
  if (B.scoop) trim.push(MG(new THREE.BoxGeometry(0.5, 0.08, 0.6), T4(0, B.belt + 0.02, hl - 0.75), 0x15161a));
  if (B.spoiler === 'wing') {
    trim.push(MG(new THREE.BoxGeometry(B.W * 0.9, 0.04, 0.32), T4(0, B.belt + 0.32, -hl + 0.25), 0x141518));
    for (const sd of [-1, 1]) trim.push(MG(new THREE.BoxGeometry(0.05, 0.28, 0.12), T4(sd * B.W * 0.3, B.belt + 0.17, -hl + 0.25), 0x141518));
    for (const sd of [-1, 1]) trim.push(MG(new THREE.BoxGeometry(0.03, 0.18, 0.7), T4(sd * (B.W / 2 + 0.005), B.clr + 0.35, -0.55), 0x0e0f11));
  }
  if (B.spoiler === 'lip') trim.push(MG(new THREE.BoxGeometry(B.W * 0.8, 0.03, 0.18), T4(0, B.belt + 0.07, -hl + 0.12, -0.15, 0, 0), 0x141518));
  if (B.bed) {
    const z0 = B.zB - 0.08, z1 = -hl + 0.06, len = z0 - z1, cz = (z0 + z1) / 2;
    trim.push(MG(new THREE.BoxGeometry(B.W - 0.16, 0.04, len), T4(0, B.belt - 0.25, cz), 0x1d1e21));
  }
  const geo = {
    lower, cabin,
    glass: mergeGeos(glass), trim: mergeGeos(trim), head: mergeGeos(head), tail: mergeGeos(tail),
  };
  // rueda: neumático (torno redondeado) + aro con 5 rayos + disco
  const prof = [];
  const R = B.r, wt = 0.26;
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; prof.push(new THREE.Vector2(R - 0.07 + Math.cos(a) * 0.07, Math.sin(a) * wt / 2)); }
  const tire = new THREE.LatheGeometry([new THREE.Vector2(R * 0.62, -wt / 2), ...prof, new THREE.Vector2(R * 0.62, wt / 2)], 24); tire.rotateZ(Math.PI / 2);
  const rim = [MG(tire, null, 0x161618)];
  const disc = new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.04, 20); disc.rotateZ(Math.PI / 2);
  rim.push(MG(disc, T4(0.1, 0, 0), 0x8a8d92), MG(disc, T4(-0.1, 0, 0), 0x8a8d92));
  for (let k = 0; k < 5; k++) for (const sx of [-1, 1]) rim.push(MG(new THREE.BoxGeometry(0.035, R * 0.55, 0.07), T4(sx * 0.125, 0, 0, k * Math.PI * 2 / 5, 0, 0).multiply(new THREE.Matrix4().makeTranslation(0, R * 0.3, 0)), 0xc4c9d0));
  const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 12); hub.rotateZ(Math.PI / 2);
  rim.push(MG(hub, null, 0xd8dce2));
  geo.wheel = mergeGeos(rim);
  CAR_GEO[type] = geo;
  return geo;
}

const SHARED = {};
function sharedMats() {
  if (SHARED.trim) return SHARED;
  SHARED.trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5 });
  SHARED.glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1118, roughness: 0.04, metalness: 0.3, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide });
  SHARED.wheel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.55 });
  SHARED.white = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f2, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
  return SHARED;
}
function blobTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 10, 64, 64, 62);
  r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.6, 'rgba(0,0,0,0.4)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}

// Arma un carro. spec: un CARS o { body, color }. opts: { police, cockpit }.
function makeCar(spec, opts = {}) {
  const type = BODY[spec.body] ? spec.body : 'sedan', B = BODY[type], geo = carGeo(type), S = sharedMats();
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const police = !!opts.police;
  const paint = new THREE.MeshPhysicalMaterial({ color: police ? 0x0f1115 : spec.color, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const mk = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; body.add(o); return o; };
  mk(geo.lower, paint);
  const roof = mk(geo.cabin, police ? S.white : paint);
  const cab = mk(geo.glass, S.glass);
  mk(geo.trim, S.trim);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 0.8, roughness: 0.1 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1a10, emissiveIntensity: 0.5, roughness: 0.2 });
  mk(geo.head, headMat); mk(geo.tail, tailMat);
  // placas
  PLATE = PLATE || plateTex();
  for (const sd of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshBasicMaterial({ map: PLATE })); p.position.set(0, B.clr + 0.32, sd * (B.L / 2 + 0.065)); p.rotation.y = sd > 0 ? 0 : Math.PI; body.add(p); }
  // patrullero: puertas blancas, letras, escudo, defensa y circulina
  const bar = []; let car_ant = null;
  if (police) {
    const dz = (B.zW + B.zB) / 2 + 0.1, dl = (B.zW - B.zB) * 0.95;
    for (const sd of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.02, B.belt - B.clr - 0.2, dl), S.white);
      door.position.set(sd * (B.W / 2 + 0.01), (B.belt + B.clr) / 2 + 0.05, dz); body.add(door);
      POLICE_DECAL = POLICE_DECAL || decalTex('POLICÍA');
      const d = new THREE.Mesh(new THREE.PlaneGeometry(dl * 0.85, dl * 0.16), new THREE.MeshBasicMaterial({ map: POLICE_DECAL, transparent: true }));
      d.position.set(sd * (B.W / 2 + 0.025), (B.belt + B.clr) / 2 + 0.05, dz); d.rotation.y = sd * Math.PI / 2; body.add(d);
    }
    const ry = B.roof + 0.04, rz = (B.zR1 + B.zR2) / 2 + 0.1;
    const base = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.72, 0.07, 0.3), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5 }));
    base.position.set(0, ry, rz); body.add(base);
    for (const sd of [-1, 1]) {
      const m = new THREE.MeshStandardMaterial({ color: sd < 0 ? 0xff2030 : 0x2050ff, emissive: sd < 0 ? 0xff1020 : 0x1040ff, emissiveIntensity: 0.4, roughness: 0.15, transparent: true, opacity: 0.92 });
      const l = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.33, 0.12, 0.26), m);
      l.position.set(sd * B.W * 0.18, ry + 0.09, rz); body.add(l); bar.push(l);
    }
    const push = new THREE.Mesh(new THREE.BoxGeometry(B.W * 0.7, 0.32, 0.1), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.6, metalness: 0.4 }));
    push.position.set(0, B.clr + 0.32, B.L / 2 + 0.12); body.add(push);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    ant.position.set(-B.W * 0.3, B.roof + 0.2, B.zR2 + 0.1); body.add(ant); car_ant = ant;
  }
  // ruedas
  const wheels = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const w = new THREE.Group(); w.position.set(sx * (B.W / 2 - 0.14), B.r, sz * B.wb / 2);
    const m = new THREE.Mesh(geo.wheel, S.wheel); m.castShadow = true;
    if (sx < 0) m.rotation.y = Math.PI;
    w.add(m); root.add(w); wheels.push(w);
  }
  // sombra suave debajo (se ve aunque no haya sombras de verdad)
  BLOB = BLOB || blobTex();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(B.W * 1.5, B.L * 1.2), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; blob.renderOrder = 1; root.add(blob);
  const car = { root, body, wheels, bar, paint, headMat, tailMat, B, police, roof, cab, ant: car_ant };
  if (opts.cockpit) makeCockpit(car);
  return car;
}

// Cabina por dentro: tablero con tablero de relojes, volante, consola, espejo, parantes,
// techo y puertas. El capó (la carrocería de afuera) se sigue viendo por el parabrisas.
let DASH_TEX = null;
function dashTex() {
  // plástico granulado del tablero
  if (DASH_TEX) return DASH_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#4a4d55'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  DASH_TEX = new THREE.CanvasTexture(c); DASH_TEX.colorSpace = THREE.SRGBColorSpace; DASH_TEX.wrapS = DASH_TEX.wrapT = THREE.RepeatWrapping; DASH_TEX.repeat.set(4, 2);
  return DASH_TEX;
}
function rod(a, b, r, mat) {
  // cilindro de a hasta b (para parantes)
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, d.length(), 10), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}
function makeCockpit(car) {
  // La carrocería se corta por detrás del parabrisas (plano de recorte) y adentro se arma la cabina.
  const B = car.B, ck = new THREE.Group(), y0 = B.belt, front = B.zW;
  const cw = B.W * 0.86, dx = 0.37;                           // ancho de la cabina, el chofer va a la izquierda (+x)
  const eye = new THREE.Vector3(dx, Math.min(y0 + 0.36, B.roof - 0.12), front - 1.3);
  const dash = new THREE.MeshStandardMaterial({ color: 0x9a9ca2, map: dashTex(), roughness: 0.82 });
  const soft = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.9 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ck.add(m); return m; };
  // tablero
  const dz = 0.8, back = front - dz + 0.02;
  add(new THREE.BoxGeometry(B.W - 0.1, 0.44, dz), dash, 0, y0 - 0.16, front - dz / 2 + 0.02);
  add(new THREE.CylinderGeometry(0.09, 0.09, B.W - 0.1, 18, 1, false, 0, Math.PI), dash, 0, y0 + 0.06, back + 0.08, 0, 0, Math.PI / 2);
  // visera de los relojes, relojes, pantalla y salidas de aire
  const vr = Math.min(0.12, (eye.y - y0) * 0.32);
  add(new THREE.CylinderGeometry(vr, vr, 0.16, 20, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x1e2024, roughness: 0.85, side: THREE.DoubleSide }), dx, y0 + 0.1, back - 0.02, -Math.PI / 2, 0, 0);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  add(new THREE.PlaneGeometry(0.3, 0.112), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), dx, y0 + 0.04, back - 0.005, -0.12, Math.PI, 0);
  const ncv = document.createElement('canvas'); ncv.width = 256; ncv.height = 160;
  const ntex = new THREE.CanvasTexture(ncv); ntex.colorSpace = THREE.SRGBColorSpace;
  add(new THREE.PlaneGeometry(0.22, 0.137), new THREE.MeshBasicMaterial({ map: ntex, toneMapped: false }), 0, y0 - 0.06, back - 0.005, -0.1, Math.PI, 0);
  for (const x of [-cw / 2 + 0.14, -0.17, 0.17, cw / 2 - 0.14]) add(new THREE.BoxGeometry(0.1, 0.045, 0.02), chrome, x, y0 - 0.17, back - 0.005);
  // consola entre los asientos, piso y puertas por dentro
  add(new THREE.BoxGeometry(0.3, 0.3, 1.2), dash, 0, y0 - 0.42, back - 0.6);
  add(new THREE.BoxGeometry(B.W - 0.1, 0.04, front - B.zB), soft, 0, B.clr + 0.16, (front + B.zB) / 2);
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.06, y0 - B.clr - 0.1, front - B.zB), soft, sd * (B.W / 2 - 0.06), (y0 + B.clr + 0.1) / 2 + 0.05, (front + B.zB) / 2);
    add(new THREE.BoxGeometry(0.12, 0.05, front - B.zB - 0.2), dash, sd * (B.W / 2 - 0.1), y0 + 0.08, (front + B.zB) / 2 - 0.1);
    add(new THREE.BoxGeometry(0.03, 0.04, 0.22), chrome, sd * (B.W / 2 - 0.1), y0 - 0.12, back - 0.5);
  }
  // asientos (se ven al costado)
  for (const x of [dx, -dx]) {
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), leather, x, y0 - 0.32, eye.z - 0.05);
    add(new THREE.BoxGeometry(0.5, 0.7, 0.12), leather, x, y0 + 0.02, eye.z - 0.33, -0.18, 0, 0);
  }
  // volante
  const wheelG = new THREE.Group(); wheelG.position.set(dx, eye.y - 0.38, eye.z + 0.44); wheelG.rotation.x = 0.38;
  const steer = new THREE.Group(); wheelG.add(steer);
  steer.add(new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 12, 40), leather));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.06, 18).rotateX(Math.PI / 2), soft); steer.add(hub);
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), soft); s.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0); s.rotation.z = a; steer.add(s); }
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.03), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); mark.position.set(0, 0.185, 0); steer.add(mark);
  wheelG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.36, 10).rotateX(Math.PI / 2).translate(0, 0, 0.2), soft));
  ck.add(wheelG);
  // parantes del parabrisas, parante del medio, techo y espejo
  const pil = new THREE.MeshStandardMaterial({ color: 0x2b2d32, roughness: 0.85 });
  for (const sd of [-1, 1]) {
    ck.add(rod(new THREE.Vector3(sd * (cw / 2 + 0.02), y0 + 0.06, front + 0.02), new THREE.Vector3(sd * (cw / 2 - 0.1), B.roof - 0.04, B.zR1), 0.045, pil));
    ck.add(rod(new THREE.Vector3(sd * (cw / 2), y0, (B.zR1 + B.zR2) / 2 - 0.1), new THREE.Vector3(sd * (cw / 2 - 0.08), B.roof - 0.04, (B.zR1 + B.zR2) / 2 - 0.1), 0.06, pil));
    add(new THREE.BoxGeometry(0.05, 0.11, 0.18), pil, sd * (B.W / 2 + 0.08), y0 + 0.14, front - 0.1, 0, sd * 0.2, 0);
  }
  add(new THREE.BoxGeometry(cw, 0.06, 0.12), pil, 0, B.roof - 0.05, B.zR1 - 0.02);
  add(new THREE.BoxGeometry(cw, 0.03, Math.max(0.3, B.zR1 - B.zR2) + 0.1), new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95 }), 0, B.roof - 0.03, (B.zR1 + B.zR2) / 2);
  add(new THREE.BoxGeometry(0.02, 0.07, 0.02), pil, 0, B.roof - 0.1, B.zR1 - 0.1);
  add(new THREE.BoxGeometry(0.26, 0.075, 0.03), pil, 0, B.roof - 0.16, B.zR1 - 0.12);
  add(new THREE.PlaneGeometry(0.24, 0.06), new THREE.MeshStandardMaterial({ color: 0x9fb6cc, roughness: 0.05, metalness: 1 }), 0, B.roof - 0.16, B.zR1 - 0.137, 0, Math.PI, 0);
  // reflejo leve en el parabrisas
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(cw, Math.hypot(B.roof - y0, B.zR1 - front)), new THREE.MeshPhysicalMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0.07, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
  ws.position.set(0, (B.roof + y0) / 2, (B.zR1 + front) / 2); ws.rotation.x = Math.atan2(front - B.zR1, B.roof - y0) - Math.PI / 2; ck.add(ws);
  car.body.add(ck);
  car.cockpit = ck; car.steerWheel = steer; car.dashCv = cv; car.dashTex = tex; car.navCv = ncv; car.navTex = ntex;
  car.eye = eye;
  car.clip = new THREE.Plane();
  ck.visible = false;
}
// Con la cámara adentro, la pintura de la carrocería se recorta detrás del parabrisas.
function setCockpitClip(car, on) {
  car.paint.clippingPlanes = on ? [car.clip] : null;
  car.paint.needsUpdate = true;
}
const _cn = new THREE.Vector3(), _cp = new THREE.Vector3();
function updateCockpitClip(car) {
  car.body.updateMatrixWorld();
  _cn.set(0, 0, 1).transformDirection(car.body.matrixWorld);
  _cp.set(0, 0, car.B.zW - 0.03).applyMatrix4(car.body.matrixWorld);
  car.clip.setFromNormalAndCoplanarPoint(_cn, _cp);
}

// Dibuja los relojes: velocímetro, tacómetro, marcha y vida.
function drawDash(car, s) {
  const g = car.dashCv.getContext('2d'), W = 512, H = 192;
  const kmh = Math.abs(s.f) * 3.6;
  g.fillStyle = '#05070b'; g.fillRect(0, 0, W, H);
  const dial = (cx, val, max, label, ticks, red, txt) => {
    const r = 82, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.lineWidth = 5; g.strokeStyle = '#1b2230'; g.beginPath(); g.arc(cx, 96, r, a0, a1); g.stroke();
    if (red) { g.strokeStyle = '#b3202a'; g.beginPath(); g.arc(cx, 96, r, a0 + (a1 - a0) * red, a1); g.stroke(); }
    g.strokeStyle = '#d9e4f2'; g.lineWidth = 2;
    for (let i = 0; i <= ticks; i++) { const a = a0 + (a1 - a0) * i / ticks; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - 4), 96 + Math.sin(a) * (r - 4)); g.lineTo(cx + Math.cos(a) * (r - 14), 96 + Math.sin(a) * (r - 14)); g.stroke(); }
    const a = a0 + (a1 - a0) * clamp(val / max, 0, 1);
    g.strokeStyle = '#ff3b3b'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, 96); g.lineTo(cx + Math.cos(a) * (r - 10), 96 + Math.sin(a) * (r - 10)); g.stroke();
    g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(cx, 96, 7, 0, 7); g.fill();
    g.fillStyle = '#e8f3ff'; g.font = '700 30px Arial'; g.textAlign = 'center'; g.fillText(txt, cx, 150);
    g.fillStyle = '#7f8ba0'; g.font = '600 13px Arial'; g.fillText(label, cx, 172);
  };
  dial(110, s.rpm, 7500, 'x1000 rpm', 15, 0.8, s.gear < 0 ? 'R' : s.gear);
  dial(402, kmh, 260, 'km/h', 13, 0, Math.round(kmh));
  // vida al medio
  const hp = s.hp / s.hpMax;
  g.fillStyle = '#1b2230'; g.fillRect(226, 70, 60, 10); g.fillStyle = hp < 0.3 ? '#ff4d4d' : hp < 0.6 ? '#ffc53d' : '#3ddc84'; g.fillRect(226, 70, 60 * hp, 10);
  g.fillStyle = '#7f8ba0'; g.font = '600 12px Arial'; g.textAlign = 'center'; g.fillText('MOTOR', 256, 62);
  if (s.nitro !== undefined) { g.fillStyle = '#1b2230'; g.fillRect(226, 108, 60, 10); g.fillStyle = '#3fb6ff'; g.fillRect(226, 108, 60 * s.nitro, 10); g.fillStyle = '#7f8ba0'; g.fillText('NITRO', 256, 100); }
  car.dashTex.needsUpdate = true;
}
// Pantalla de la consola: un mapa chico con el norte arriba.
function drawNav(car, s) {
  const g = car.navCv.getContext('2d'), W = 256, H = 160, k = 0.55;
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#3a4659'; g.lineWidth = ROAD_W * k;
  const tx = x => W / 2 - (x - s.x) * k, tz = z => H / 2 - (z - s.z) * k;
  for (const c of GRID) { g.beginPath(); g.moveTo(tx(c), 0); g.lineTo(tx(c), H); g.stroke(); g.beginPath(); g.moveTo(0, tz(c)); g.lineTo(W, tz(c)); g.stroke(); }
  if (typeof G !== 'undefined' && G.thief && G.thief.body !== s) { g.fillStyle = '#ff8a00'; g.beginPath(); g.arc(tx(G.thief.body.x), tz(G.thief.body.z), 5, 0, 7); g.fill(); }
  if (typeof G !== 'undefined') for (const c of G.cops || []) if (c.body !== s) { g.fillStyle = '#3070ff'; g.beginPath(); g.arc(tx(c.body.x), tz(c.body.z), 4, 0, 7); g.fill(); }
  g.save(); g.translate(W / 2, H / 2); g.rotate(Math.PI - s.h); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
  car.navTex.needsUpdate = true;
}

function poseCockpit(car, s) {
  if (!car.cockpit || !car.cockpit.visible) return;
  updateCockpitClip(car);
  car.steerWheel.rotation.z = s.steer * 2.4;
  car.dashT = (car.dashT || 0) + 1;
  if (car.dashT % 2 === 0) drawDash(car, s);
  if (car.dashT % 6 === 0) drawNav(car, s);
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
  // nitro (sólo el jugador lo tiene): más empuje y más velocidad tope mientras dure
  c.boost = !!(inp.nitro && c.nitro > 0.02 && !c.dead && f > -0.5);
  if (c.nitro !== undefined) c.nitro = clamp(c.nitro + (c.boost ? -0.32 : 0.035 + (c.slide > 3 || c.air ? 0.12 : 0)) * dt, 0, 1);
  const top = sp.top * (c.topMul || 1) * (c.dead ? 0.15 : 1) * (c.boost ? 1.22 : 1);
  if (!c.air) {
    c.grass = !onRoad(c.x, c.z);
    const grip = sp.grip * (c.grass ? 0.78 : 1) * (inp.hand ? 0.5 : 1);
    let a = 0;
    if (inp.thr > 0 && f > -0.5) a += sp.acc * inp.thr * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2.4));
    if (c.boost) a += sp.acc * 0.9 * Math.max(0, 1 - Math.pow(Math.max(0, f) / top, 2));
    // frenar parado es reversa, salvo que sea "quedarse quieto" (stop)
    if (inp.brk > 0) { if (f > 0.5) a -= sp.brake * inp.brk; else if (inp.stop) a -= Math.sign(f) * Math.min(Math.abs(f) / dt, sp.brake); else if (inp.thr <= 0) a -= 5 * inp.brk; }
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
  car.wheels.forEach((w, i) => { w.children[0].rotation.x += spin; if (i < 2) w.rotation.y = -c.steer * 0.5; });
  if (car.bar.length && car.sirenOn) {
    const ph = Math.floor(t * 8) % 2;
    car.bar[0].material.emissiveIntensity = ph ? 3 : 0.15; car.bar[1].material.emissiveIntensity = ph ? 0.15 : 3;
  }
  car.tailMat.emissiveIntensity = c.braking ? 2.2 : (W.time === 'noche' ? 0.8 : 0.3);
}
