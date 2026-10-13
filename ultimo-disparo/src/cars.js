'use strict';
// Último Disparo: carros. Los autos son los modelos de Código Rojo (perfil lateral extruido con
// bisel, cabina con vidrios, faros, luces traseras, placas y ruedas con aro de 5 rayos); el bus
// y el camión cisterna se arman igual. Ejes locales: +z adelante, +x a la izquierda.

// Junta muchas geometrías con color por vértice en una sola (menos llamadas de dibujo).
function mergeGeos(parts) {
  let count = 0;
  const flat = parts.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; count += g.attributes.position.count; return { g, m: p.m, c: p.c }; });
  // c === null: conserva los colores que ya trae la geometría
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), cc = new THREE.Color();
  let o = 0;
  for (const p of flat) {
    const a = p.g.attributes.position, na = p.g.attributes.normal, ua = p.g.attributes.uv;
    if (p.m) nm.getNormalMatrix(p.m);
    const keep = p.c === null && p.g.attributes.color;
    if (!keep) cc.set(p.c);
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i); if (p.m) v.applyMatrix4(p.m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      v.fromBufferAttribute(na, i); if (p.m) v.applyMatrix3(nm).normalize();
      nor[o * 3] = v.x; nor[o * 3 + 1] = v.y; nor[o * 3 + 2] = v.z;
      if (keep) { const ca = p.g.attributes.color; col[o * 3] = ca.getX(i); col[o * 3 + 1] = ca.getY(i); col[o * 3 + 2] = ca.getZ(i); }
      else { col[o * 3] = cc.r; col[o * 3 + 1] = cc.g; col[o * 3 + 2] = cc.b; }
      if (ua) { uv[o * 2] = ua.getX(i); uv[o * 2 + 1] = ua.getY(i); }
      o++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

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
let PLATE = null, BLOB = null;

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


// Arma un auto. type: hatch, sedan, sport, muscle, pickup, van. opts: { taxi, night }
function makeCar(type, color, opts = {}) {
  const B = BODY[type] || BODY.sedan, geo = carGeo(BODY[type] ? type : 'sedan'), S = sharedMats();
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 });
  const mk = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; body.add(o); return o; };
  mk(geo.lower, paint); mk(geo.cabin, paint); mk(geo.glass, S.glass); mk(geo.trim, S.trim);
  const lit = opts.night ? 1 : 0;
  mk(geo.head, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: 0.4 + lit * 3, roughness: 0.1 }));
  mk(geo.tail, new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1a10, emissiveIntensity: 0.3 + lit * 1.6, roughness: 0.2 }));
  PLATE = PLATE || plateTex();
  for (const sd of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshBasicMaterial({ map: PLATE })); p.position.set(0, B.clr + 0.32, sd * (B.L / 2 + 0.065)); p.rotation.y = sd > 0 ? 0 : Math.PI; body.add(p); }
  if (opts.taxi) {
    const sm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe58a, emissiveIntensity: 0.6 + lit * 1.5, roughness: 0.3 });
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.24), sm); s.position.set(0, B.roof + 0.1, (B.zR1 + B.zR2) / 2); body.add(s);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 1.6), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    for (const sd of [-1, 1]) { const c = ch.clone(); c.position.set(sd * (B.W / 2 + 0.01), B.belt - 0.2, 0.1); body.add(c); }
  }
  const wheels = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const w = new THREE.Group(); w.position.set(sx * (B.W / 2 - 0.14), B.r, sz * B.wb / 2);
    const m = new THREE.Mesh(geo.wheel, S.wheel); m.castShadow = true;
    if (sx < 0) m.rotation.y = Math.PI;
    w.add(m); root.add(w); wheels.push(w);
  }
  BLOB = BLOB || blobTex();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(B.W * 1.5, B.L * 1.2), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; blob.renderOrder = 1; root.add(blob);
  root.userData.wheels = wheels; root.userData.r = B.r; root.userData.len = B.L;
  return root;
}

// Bus (micro) y camión cisterna: caja con bordes redondeados, ventanas, parachoques y ruedas.
function roundBox(L, H, Wd, r) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2 + r, 0); s.lineTo(L / 2 - r, 0); s.quadraticCurveTo(L / 2, 0, L / 2, r); s.lineTo(L / 2, H - r); s.quadraticCurveTo(L / 2, H, L / 2 - r, H);
  s.lineTo(-L / 2 + r, H); s.quadraticCurveTo(-L / 2, H, -L / 2, H - r); s.lineTo(-L / 2, r); s.quadraticCurveTo(-L / 2, 0, -L / 2 + r, 0);
  return sideExtrude(s, Wd, 0.06);
}
function bigWheels(root, positions, R, Wd) {
  const S = sharedMats(), prof = [], wt = 0.3;
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; prof.push(new THREE.Vector2(R - 0.09 + Math.cos(a) * 0.09, Math.sin(a) * wt / 2)); }
  const tire = new THREE.LatheGeometry([new THREE.Vector2(R * 0.6, -wt / 2), ...prof, new THREE.Vector2(R * 0.6, wt / 2)], 24); tire.rotateZ(Math.PI / 2);
  const disc = new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.05, 20); disc.rotateZ(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(R * 0.2, R * 0.25, 0.32, 10); hub.rotateZ(Math.PI / 2);
  const g = mergeGeos([MG(tire, null, 0x141416), MG(disc, T4(0.13, 0, 0), 0xb9bdc3), MG(hub, null, 0x8a8d92)]);
  const wheels = [];
  for (const [sx, z] of positions) {
    const w = new THREE.Group(); w.position.set(sx * (Wd / 2 - 0.16), R, z);
    const m = new THREE.Mesh(g, S.wheel); m.castShadow = true; if (sx < 0) m.rotation.y = Math.PI;
    w.add(m); root.add(w); wheels.push(w);
  }
  return wheels;
}
function makeBus(color, opts = {}) {
  const L = 11, H = 2.9, Wd = 2.5, clr = 0.35, root = new THREE.Group(), S = sharedMats();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0.3, clearcoat: 0.8 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2ee, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 });
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; root.add(o); return o; };
  const bodyG = roundBox(L, H, Wd, 0.35);
  add(bodyG, white, 0, clr, 0);
  add(new THREE.BoxGeometry(Wd + 0.02, 0.5, L - 0.3), paint, 0, clr + 0.55, 0);
  add(new THREE.BoxGeometry(Wd + 0.025, 0.12, L - 0.4), paint, 0, clr + 2.35, 0);
  // ventanas laterales con parantes, parabrisas y luneta
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.02, 0.95, L - 2.2), S.glass, sd * (Wd / 2 + 0.01), clr + 1.75, -0.3);
    for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.03, 0.95, 0.08), S.trim, sd * (Wd / 2 + 0.02), clr + 1.75, -4.6 + i * 1.45);
    add(new THREE.BoxGeometry(0.02, 1.9, 0.95), S.glass, sd * (Wd / 2 + 0.012), clr + 1.25, L / 2 - 1.2);
  }
  add(new THREE.BoxGeometry(Wd - 0.2, 1.3, 0.03), S.glass, 0, clr + 1.75, L / 2 + 0.01);
  add(new THREE.BoxGeometry(Wd - 0.4, 0.8, 0.03), S.glass, 0, clr + 1.9, -L / 2 - 0.01);
  add(new THREE.BoxGeometry(Wd, 0.3, 0.12), S.trim, 0, clr + 0.15, L / 2 + 0.03);
  add(new THREE.BoxGeometry(Wd, 0.3, 0.12), S.trim, 0, clr + 0.15, -L / 2 - 0.03);
  const lit = opts.night ? 3 : 0.4;
  for (const sd of [-1, 1]) {
    add(new THREE.BoxGeometry(0.35, 0.18, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: lit }), sd * 0.9, clr + 0.6, L / 2 + 0.02);
    add(new THREE.BoxGeometry(0.25, 0.35, 0.04), new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1a10, emissiveIntensity: lit * 0.5 }), sd * 1.0, clr + 0.8, -L / 2 - 0.02);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.3), new THREE.MeshStandardMaterial({ map: signTex(opts.route || 'RUTA 22', '#111', '#ffb020'), emissive: 0xffffff, emissiveMap: signTex(opts.route || 'RUTA 22', '#111', '#ffb020'), emissiveIntensity: 0.8 }));
  sign.position.set(0, clr + 2.62, L / 2 + 0.03); root.add(sign);
  root.userData.wheels = bigWheels(root, [[1, 3.6], [-1, 3.6], [1, -3.4], [-1, -3.4]], 0.5, Wd);
  root.userData.r = 0.5; root.userData.len = L;
  return root;
}
function makeTanker(color, opts = {}) {
  const L = 12, Wd = 2.5, root = new THREE.Group(), S = sharedMats();
  const paint = new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.4, clearcoat: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xd9dcdf, metalness: 0.85, roughness: 0.22, envMapIntensity: 1.3 });
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; root.add(o); return o; };
  // cabina
  const cab = roundBox(2.4, 2.4, Wd, 0.3); add(cab, paint, 0, 0.7, L / 2 - 1.3);
  add(new THREE.BoxGeometry(Wd - 0.3, 0.9, 0.03), S.glass, 0, 2.35, L / 2 - 0.08);
  for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.8, 1.0), S.glass, sd * (Wd / 2 + 0.01), 2.35, L / 2 - 0.8);
  add(new THREE.BoxGeometry(Wd * 0.7, 0.55, 0.06), S.trim, 0, 1.2, L / 2 - 0.08);
  add(new THREE.BoxGeometry(Wd, 0.32, 0.18), S.trim, 0, 0.7, L / 2 - 0.02);
  for (const sd of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 10), steel, sd * (Wd / 2 - 0.1), 3.0, L / 2 - 2.6);
  // chasis y tanque con anillos
  add(new THREE.BoxGeometry(1.2, 0.3, L - 1), S.trim, 0, 0.8, -0.3);
  const tank = new THREE.CylinderGeometry(1.2, 1.2, L - 3.8, 28); tank.rotateX(Math.PI / 2);
  add(tank, steel, 0, 2.2, -1.6);
  for (const sd of [-1, 1]) { const cap = new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 1, 0.3); cap.rotateX(sd * Math.PI / 2); add(cap, steel, 0, 2.2, -1.6 + sd * (L - 3.8) / 2); }
  for (let i = 0; i < 4; i++) { const r = new THREE.TorusGeometry(1.21, 0.035, 6, 32); add(r, S.trim, 0, 2.2, -5 + i * 2.3); }
  add(new THREE.BoxGeometry(0.6, 0.12, 6), S.trim, 0, 3.42, -1.6);
  const lit = opts.night ? 3 : 0.4;
  for (const sd of [-1, 1]) add(new THREE.BoxGeometry(0.3, 0.16, 0.04), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d8, emissiveIntensity: lit }), sd * 0.9, 1.0, L / 2 + 0.01);
  root.userData.wheels = bigWheels(root, [[1, L / 2 - 1.6], [-1, L / 2 - 1.6], [1, -3.2], [-1, -3.2], [1, -4.5], [-1, -4.5]], 0.52, Wd);
  root.userData.r = 0.52; root.userData.len = L;
  return root;
}
