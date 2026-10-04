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
function roundBoxGeo(w, h, d, r) {
  return geo('rb' + [w, h, d, r], () => {
    const s = new THREE.Shape(), hw = w / 2 - r, hh = h / 2 - r;
    s.moveTo(-hw, -h / 2); s.lineTo(hw, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh); s.lineTo(w / 2, hh);
    s.quadraticCurveTo(w / 2, h / 2, hw, h / 2); s.lineTo(-hw, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
    s.lineTo(-w / 2, -hh); s.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(d - r * 2) / 2);
    return g;
  });
}
function roundBox(w, h, d, r, m, x, y, z) {
  const me = new THREE.Mesh(roundBoxGeo(w, h, d, r), m);
  me.position.set(x, y, z); me.castShadow = true; return me;
}

// Une varias geometrías (con posición, normal y uv) en una sola
function mergeGeos(list) {
  const parts = list.map(g => g.index ? g.toNonIndexed() : g);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const size = parts[0].attributes[name].itemSize;
    const total = parts.reduce((n, g) => n + g.attributes[name].count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// ---------- piezas con forma (extrusiones, tornos y tubos) ----------
// Forma vista desde arriba (x, z) extruida hacia arriba con bisel
function extrudeUp(name, pts, height, bevel) {
  return geo(name, () => {
    const sh = new THREE.Shape(); pts.forEach(([x, z], i) => i ? sh.lineTo(x, -z) : sh.moveTo(x, -z));
    const g = new THREE.ExtrudeGeometry(sh, { depth: height - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
    g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
    return g;
  });
}
// Forma de perfil (z, y) extruida a lo ancho (x) con bisel
function extrudeSide(name, pts, width, bevel) {
  return geo(name, () => {
    const sh = new THREE.Shape(); pts.forEach(([z, y], i) => i ? sh.lineTo(z, y) : sh.moveTo(z, y));
    const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
    g.rotateY(-Math.PI / 2); g.translate(width / 2 - bevel, 0, 0);
    return g;
  });
}
// curva suave por puntos para formas redondeadas
function smoothPts(ctrl, n) {
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
  return c.getPoints(n || 48).map(v => [v.x, v.z]);
}
let TREAD_TEX = null;
function treadTexture() {
  if (TREAD_TEX) return TREAD_TEX;
  TREAD_TEX = canvasTexture(256, 32, (g, w, h) => {
    g.fillStyle = '#1B1B20'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#121216'; for (let x = 0; x < w; x += 8) g.fillRect(x, 4, 3, h - 8);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  });
  return TREAD_TEX;
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
  const black = new THREE.MeshPhysicalMaterial({ color: '#17171C', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const chrome = mat('#E3E6EC', { metalness: 1, roughness: 0.12 });
  const alu = mat('#B9BEC8', { metalness: 0.85, roughness: 0.3 });
  const dark = mat('#2E3038', { roughness: 0.45, metalness: 0.4 });
  const add = (g, m, x, y, z, cast) => { const me = new THREE.Mesh(g, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = cast !== false; chassis.add(me); return me; };

  // chasis de tubos cromados (se curvan hacia arriba adelante)
  const rail = sx => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[sx * 0.33, 0.12, -0.9], [sx * 0.33, 0.12, -0.2], [sx * 0.3, 0.12, 0.45], [sx * 0.2, 0.2, 0.78]].map(p => new THREE.Vector3(...p))), 24, 0.026, 8);
  add(geo('railL', () => rail(-1)), chrome); add(geo('railR', () => rail(1)), chrome);
  add(geo('axleF', () => new THREE.CylinderGeometry(0.022, 0.022, 1.05, 8).rotateZ(Math.PI / 2)), chrome, 0, 0.15, 0.62);
  add(geo('axleR', () => new THREE.CylinderGeometry(0.03, 0.03, 1.22, 10).rotateZ(Math.PI / 2)), alu, 0, 0.17, -0.64);
  add(geo('tray', () => new THREE.BoxGeometry(0.58, 0.015, 1.2)), dark, 0, 0.1, 0.02);

  // trompa envolvente (vista de arriba en U) y cono central que sube hacia el volante
  const noseTop = smoothPts([[-0.56, 0.86], [-0.5, 1.0], [0, 1.04], [0.5, 1.0], [0.56, 0.86], [0.36, 0.8], [0.22, 0.66], [-0.22, 0.66], [-0.36, 0.8]], 64);
  add(extrudeUp('noseTop', noseTop, 0.17, 0.035), paint, 0, 0.12, 0);
  add(extrudeSide('noseCone', [[0.5, 0.0], [0.98, 0.0], [0.98, 0.1], [0.82, 0.16], [0.6, 0.26], [0.46, 0.3], [0.42, 0.24]], 0.44, 0.04), paint, 0, 0.16, 0);
  const plate = new THREE.Mesh(geo('plate', () => new THREE.CircleGeometry(0.11, 24)),
    new THREE.MeshStandardMaterial({ map: numberTexture(look.num == null ? 7 : look.num, body.f === 'carbono' ? '#1C1C22' : body.c), roughness: 0.35 }));
  plate.position.set(0, 0.37, 0.68); plate.rotation.x = -1.05; chassis.add(plate);
  // pontones laterales redondeados
  const pod = smoothPts([[-0.11, 0.42], [0.1, 0.4], [0.13, 0.0], [0.12, -0.42], [-0.1, -0.44], [-0.13, 0.0]], 40);
  for (const sx of [-1, 1]) {
    add(extrudeUp('pod', pod, 0.17, 0.035), paint, sx * 0.55, 0.1, -0.02);
    add(extrudeUp('podTop', smoothPts([[-0.07, 0.3], [0.07, 0.3], [0.08, -0.3], [-0.07, -0.3]], 24), 0.02, 0.008), black, sx * 0.55, 0.27, -0.02);
  }
  // paragolpes trasero que envuelve las ruedas
  add(extrudeUp('rearB', smoothPts([[-0.72, -0.86], [-0.66, -1.04], [0, -1.08], [0.66, -1.04], [0.72, -0.86], [0.6, -0.9], [0, -0.96], [-0.6, -0.9]], 64), 0.13, 0.03), black, 0, 0.13, 0);
  // asiento envolvente
  add(extrudeSide('seat', [[-0.42, 0.0], [-0.02, 0.0], [0.06, 0.06], [0.0, 0.12], [-0.28, 0.12], [-0.36, 0.2], [-0.4, 0.5], [-0.48, 0.5], [-0.5, 0.14]], 0.44, 0.04), black, 0, 0.12, 0);
  // tanque de combustible translúcido
  add(roundBoxGeo(0.2, 0.15, 0.22, 0.05), new THREE.MeshPhysicalMaterial({ color: '#F2EADA', roughness: 0.3, transmission: 0.25, thickness: 0.2, clearcoat: 0.5 }), 0, 0.27, 0.26);
  // motor: bloque, cilindro con aletas, filtro y escape cromado curvo
  add(roundBoxGeo(0.24, 0.22, 0.26, 0.04), alu, -0.44, 0.27, -0.42);
  const cyl = add(geo('cyl', () => new THREE.CylinderGeometry(0.075, 0.08, 0.2, 16)), alu, -0.44, 0.47, -0.42);
  for (let k = 0; k < 7; k++) add(geo('fin', () => new THREE.CylinderGeometry(0.11, 0.11, 0.012, 18)), chrome, -0.44, 0.39 + k * 0.025, -0.42, false);
  add(geo('plug', () => new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6)), dark, -0.44, 0.6, -0.42);
  add(geo('filter', () => new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16).rotateZ(Math.PI / 2)), mat('#D7262C', { roughness: 0.6 }), -0.3, 0.36, -0.25);
  const exh = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.44, 0.4, -0.32], [-0.36, 0.34, -0.2], [-0.22, 0.24, -0.3], [-0.1, 0.22, -0.62], [0.1, 0.22, -0.72]].map(p => new THREE.Vector3(...p))), 30, 0.03, 10);
  add(geo('exh', () => exh), chrome);
  add(geo('muffler', () => new THREE.CylinderGeometry(0.07, 0.07, 0.36, 18).rotateZ(Math.PI / 2)), chrome, 0.24, 0.22, -0.74);
  // cadena y corona en el eje trasero
  add(geo('sprocket', () => new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20).rotateZ(Math.PI / 2)), dark, -0.3, 0.17, -0.64);
  // columna y volante con rayos
  const col = add(geo('column', () => new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8)), chrome, 0, 0.36, 0.42);
  col.rotation.x = Math.PI / 2 - 0.95;
  const wheelS = new THREE.Group(); wheelS.position.set(0, 0.52, 0.24); wheelS.rotation.x = -0.75; chassis.add(wheelS);
  const rim = new THREE.Mesh(geo('steerRim', () => new THREE.TorusGeometry(0.14, 0.022, 10, 28)), black); rim.castShadow = true; wheelS.add(rim);
  for (const a of [0, 2.1, -2.1]) { const sp = new THREE.Mesh(geo('spoke', () => new THREE.BoxGeometry(0.02, 0.14, 0.012).translate(0, 0.07, 0)), alu); sp.rotation.z = a + Math.PI; wheelS.add(sp); }
  const hubD = new THREE.Mesh(geo('steerHub', () => new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16).rotateX(Math.PI / 2)), dark); wheelS.add(hubD);

  // piloto: traje, brazos con codo, guantes, piernas y casco ovalado
  const d0 = chassis.children.length;
  const suit = new THREE.MeshStandardMaterial({ color: '#25283A', roughness: 0.75 });
  const glove = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.6 });
  const torso = add(geo('torso', () => new THREE.CapsuleGeometry(0.16, 0.24, 6, 14).scale(1.15, 1, 0.9)), suit, 0, 0.56, -0.24);
  torso.rotation.x = -0.28;
  add(geo('collar', () => new THREE.TorusGeometry(0.1, 0.035, 8, 18).rotateX(Math.PI / 2)), mat('#E8322F', { roughness: 0.5 }), 0, 0.78, -0.18).material = paint;
  for (const sx of [-1, 1]) {
    const up = add(geo('upperArm', () => new THREE.CapsuleGeometry(0.05, 0.2, 4, 8)), suit, sx * 0.19, 0.62, -0.12);
    up.rotation.set(1.0, 0, -sx * 0.35);
    const fore = add(geo('foreArm', () => new THREE.CapsuleGeometry(0.045, 0.2, 4, 8)), suit, sx * 0.14, 0.57, 0.08);
    fore.rotation.set(1.45, 0, sx * 0.4);
    add(geo('glove', () => new THREE.SphereGeometry(0.048, 10, 8)), glove, sx * 0.12, 0.55, 0.2);
    const thigh = add(geo('thigh', () => new THREE.CapsuleGeometry(0.068, 0.3, 4, 8)), suit, sx * 0.12, 0.27, 0.02);
    thigh.rotation.x = Math.PI / 2 - 0.35;
    const shin = add(geo('shin', () => new THREE.CapsuleGeometry(0.058, 0.26, 4, 8)), suit, sx * 0.12, 0.22, 0.34);
    shin.rotation.x = Math.PI / 2 + 0.25;
    add(geo('shoe', () => new THREE.BoxGeometry(0.09, 0.08, 0.14)), glove, sx * 0.12, 0.2, 0.5);
  }
  const driverParts = chassis.children.slice(d0);
  const head = new THREE.Group(); head.position.set(0, 0.93, -0.16); chassis.add(head);
  const hMat = finishMat('#ffffff', helmet.f || 'brillo', helmetTexture(helmet));
  if (helmet.f === 'neon') { hMat.emissive = new THREE.Color(helmet.b); hMat.emissiveMap = helmetTexture(helmet); hMat.emissiveIntensity = 1.1; }
  const shell = new THREE.Mesh(geo('helmet', () => new THREE.SphereGeometry(0.17, 36, 24).scale(1, 1.02, 1.12)), hMat);
  shell.castShadow = true; head.add(shell);
  const visorM = new THREE.MeshPhysicalMaterial({ color: '#0B0C14', roughness: 0.04, metalness: 0.5, clearcoat: 1, envMapIntensity: 1.6 });
  const visor = new THREE.Mesh(geo('visor', () => new THREE.SphereGeometry(0.175, 28, 14, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.36, Math.PI * 0.26).scale(1, 1.02, 1.12)), visorM);
  head.add(visor);
  const chin = new THREE.Mesh(geo('chin', () => new THREE.TorusGeometry(0.12, 0.035, 8, 20, Math.PI).rotateX(Math.PI / 2).rotateY(-Math.PI / 2).translate(0, -0.08, 0.05)), hMat);
  head.add(chin);

  // ruedas: neumático redondeado (torno) con dibujo, aro con labio y tuerca
  const tyreM = new THREE.MeshStandardMaterial({ map: treadTexture(), roughness: 0.85 });
  const rimM = finishMat(rims.c, rims.f || 'metal');
  const wheels = [];
  const tyreGeo = (r, w) => geo('tyre' + r + w, () => {
    const p = [], hw = w / 2, rr = 0.035;
    p.push(new THREE.Vector2(r * 0.62, -hw));
    for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k / 6 * Math.PI / 2; p.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, -hw + rr + Math.sin(a) * rr)); }
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; p.push(new THREE.Vector2(r - rr + Math.cos(a) * rr, hw - rr + Math.sin(a) * rr)); }
    p.push(new THREE.Vector2(r * 0.62, hw));
    return new THREE.LatheGeometry(p, 28).rotateZ(Math.PI / 2);
  });
  const rimGeo = (r, w) => geo('rim' + r + w, () => {
    const hw = w / 2 + 0.004, p = [new THREE.Vector2(0.02, hw - 0.03), new THREE.Vector2(r * 0.3, hw - 0.01), new THREE.Vector2(r * 0.55, hw), new THREE.Vector2(r * 0.64, hw - 0.005), new THREE.Vector2(r * 0.64, -hw), new THREE.Vector2(r * 0.55, -hw)];
    return new THREE.LatheGeometry(p, 24).rotateZ(Math.PI / 2);
  });
  const mkWheel = (r, w, x, z, front) => {
    const pivot = new THREE.Group(); pivot.position.set(x, r, z);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(tyreGeo(r, w), tyreM); t.castShadow = true; spin.add(t);
    const rm = new THREE.Mesh(rimGeo(r, w), rimM); rm.scale.x = Math.sign(x); spin.add(rm);
    const nut = new THREE.Mesh(geo('nut', () => new THREE.CylinderGeometry(0.022, 0.022, 0.03, 6).rotateZ(Math.PI / 2)), chrome);
    nut.position.x = Math.sign(x) * (w / 2 + 0.01); spin.add(nut);
    root.add(pivot);
    wheels.push({ pivot, spin, r, front });
  };
  mkWheel(0.15, 0.13, -0.57, 0.62, true); mkWheel(0.15, 0.13, 0.57, 0.62, true);
  mkWheel(0.17, 0.2, -0.62, -0.64, false); mkWheel(0.17, 0.2, 0.62, -0.64, false);

  // sombra de contacto debajo del kart (siempre, aunque no haya sombras reales)
  if (typeof blobShadow === 'function') { const sh = blobShadow(1.7, 2.5, 0.55); sh.position.y = 0.02; root.add(sh); }

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

  root.userData = { chassis, wheels, head, wheelS, glowParts, driverParts };
  return root;
}

// ---------- Física ----------
// Rumbo h: el frente apunta a (sin h, cos h). La derecha es (-cos h, sin h).
// steer > 0 gira a la derecha.
function newPhys(x, z, h) {
  return { x, z, y: 0, h, vx: 0, vz: 0, yaw: 0, steer: 0, slip: 0, speed: 0, fwd: 0, lat: 0, hitT: 0, roll: 0, pitch: 0, slope: 0, wheelRot: 0 };
}

// Límites de la dirección. Ayuda de conducción: en recta (a velocidad) el volante tiene menos
// autoridad, así un toque no te manda contra la pared; en las curvas que vienen hay más agarre
// y giro. T.curveF[i] va de 0 (recta) a 1 (curva cerrada adelante).
function steerLimits(T, idx, sp, handbrake) {
  const f = T.curveF ? T.curveF[idx] : 1;
  const grip = (handbrake ? KART.slideGrip : KART.grip) * lerp(1, 1.18, f);
  const geoYaw = sp / KART.wheelbase * Math.tan(KART.steerLow);
  const gripYaw = grip * (handbrake ? 2.0 : 1.1) / Math.max(sp, 1.5);
  const auth = lerp(1, lerp(0.4, 1, f), clamp((sp - 6) / 10, 0, 1));
  return { grip, yawMax: Math.min(geoYaw, gripYaw) * (handbrake ? 1 : auth) };
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
  const L = steerLimits(T, idx, sp, inp.handbrake);
  const gripMax = L.grip, yawMax = L.yawMax;
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
      // roce suave: se quita la velocidad hacia la barrera (casi sin rebote) y se pierde poco
      p.vx -= T.nx[i] * s * vn * 1.15; p.vz -= T.nz[i] * s * vn * 1.15;
      const keep = clamp(1 - vn * 0.012, 0.86, 0.995);
      p.vx *= keep; p.vz *= keep;
      hit = vn;
      // la barrera endereza el kart para que siga andando
      const th = Math.atan2(T.tx[i], T.tz[i]);
      let d = th - p.h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < Math.PI / 2) { p.h += d * clamp(0.25 + vn * 0.06, 0, 0.6); p.yaw *= 0.5; }
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
