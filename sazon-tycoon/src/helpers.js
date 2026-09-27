function noise(x, w, h, n, light, dark) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (light * Math.random()).toFixed(3) + ')' : 'rgba(0,0,0,' + (dark * Math.random()).toFixed(3) + ')';
    const s = Math.random() < 0.1 ? 3 : 1.5; x.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

function fitFont(x, text, maxW, size, font) {
  const wt = font === FONT_D ? '700 ' : '';
  let fs = size; x.font = wt + fs + 'px ' + font;
  while (x.measureText(text).width > maxW && fs > 8) { fs -= 2; x.font = wt + fs + 'px ' + font; }
  return fs;
}

function stripeTex(c1, c2, n) { return canvasTex('st' + c1 + c2 + n, 128, 16, (x, w, h) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * w / n, 0, w / n + 1, h); } }); }

function signTex(text, bg, fg, w, h) {
  w = w || 256; h = h || 104;
  return canvasTex('sg' + text + bg + fg + w + h, w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.strokeStyle = INK; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = fg || (lum(bg) > 0.6 ? INK : '#FFFFFF');
    const fs = fitFont(x, text, w - 34, Math.floor(h * 0.52), FONT_D);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + fs * 0.06);
  });
}

function lum(hex) { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + ((1 << 24) + ((r | 0) << 16) + ((g | 0) << 8) + (b | 0)).toString(16).slice(1);
}

function pickR(r, arr) { return arr[Math.floor(r() * arr.length)]; }


function M(color, o) {
  o = o || {};
  const key = String(color) + '|' + (o.phong ? 'p' : '') + (o.basic ? 'b' : '') + (o.em || '') + (o.op || '') + (o.ds ? 'd' : '') + (o.add ? 'a' : '') + (o.flat ? 'f' : '') + (o.map ? o.map.uuid : '') + (o.shin || '');
  let m = MC.get(key);
  if (m) return m;
  const base = { color: new THREE.Color(color) };
  if (o.map) base.map = o.map;
  if (o.op !== undefined) { base.transparent = true; base.opacity = o.op; }
  if (o.ds) base.side = THREE.DoubleSide;
  if (o.basic) { m = new THREE.MeshBasicMaterial(base); if (o.add) { m.blending = THREE.AdditiveBlending; m.depthWrite = false; } }
  else if (QCFG.pbr) {
    // PBR: lo "brillante" (phong) queda pulido y lo muy brillante (shin >= 140) es metálico; el resto, mate
    const shin = o.shin || 70, rough = o.phong ? clamp(1 - shin / 190, 0.14, 0.62) : 0.78, metal = o.phong && shin >= 140 ? 0.65 : 0;
    m = new THREE.MeshStandardMaterial(Object.assign(base, { roughness: rough, metalness: metal }, o.em ? { emissive: new THREE.Color(o.em), emissiveIntensity: 1 } : {}));
  }
  else if (o.phong) m = new THREE.MeshPhongMaterial(Object.assign(base, { shininess: o.shin || 70, specular: new THREE.Color(0x3a3a3a) }));
  else m = new THREE.MeshLambertMaterial(Object.assign(base, o.em ? { emissive: new THREE.Color(o.em), emissiveIntensity: 1 } : {}));
  if (o.flat) m.flatShading = true;
  MC.set(key, m);
  return m;
}

function canvasTex(key, w, h, draw, rep) {
  if (key && TC.has(key)) return TC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  if (x) draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (key) TC.set(key, t);
  return t;
}

function mesh(parent, geo, mat, sx, sy, sz, x, y, z, cast) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  if (cast) m.castShadow = true;
  parent.add(m); return m;
}

function plane(p, mat, w, h, x, y, z) { const m = new THREE.Mesh(GPL, mat); m.scale.set(w, h, 1); m.position.set(x, y, z); p.add(m); return m; }

function wheel(p, r, wdt, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = 'YXZ';
  const t = mesh(g, GC, MAT.tire, r, wdt, r, 0, 0, 0, true); t.rotation.z = Math.PI / 2;
  const h = mesh(g, GC8, MAT.rim, r * 0.55, wdt + 0.6, r * 0.55, 0, 0, 0, false); h.rotation.z = Math.PI / 2;
  p.add(g); return g;
}


function makeTree(p, x, z, rs, s) {
  s = s || 1;
  const r = mulberry32(rs);
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cyl(g, M('#5A4030'), 2.6 * s, 34 * s, 0, 17 * s, 0, true);
  const cols = ['#3E6A34', '#4B7B3E', '#355E2D', '#56884A'];
  for (let i = 0; i < 5; i++) { const c = mesh(g, GI, M(cols[i % 4], { flat: true }), 1, 1, 1, (r() - 0.5) * 22 * s, (40 + r() * 16) * s, (r() - 0.5) * 22 * s, true); c.scale.setScalar((13 + r() * 8) * s); c.rotation.set(r() * 3, r() * 3, 0); }
  p.add(g); return g;
}

// Extremidades y torso: cápsulas redondeadas (calidad media/alta) o cajas (baja)
function limb(p, mat, w, h, d, x, y, z, cast) { return QCFG.round ? mesh(p, GCAP, mat, w, h / 2, d, x, y, z, cast !== false) : box(p, mat, w, h, d, x, y, z, cast); }
// Sombra de contacto suave bajo personas y mesas: da peso aunque no haya sombras reales
let BLOB_MAT = null;
function blobShadow(p, r) {
  if (!BLOB_MAT) BLOB_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, map: T.soft, transparent: true, opacity: QCFG.shadows ? 0.45 : 0.6, depthWrite: false });
  const m = new THREE.Mesh(GPL, BLOB_MAT); m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.position.y = 0.7; m.renderOrder = 1; m.userData.keep = true;
  p.add(m); return m;
}

function makePalm(p, x, z, rs) {
  const r = mulberry32(rs), g = new THREE.Group(); g.position.set(x, 0, z);
  const trunk = M('#8A6A48'), lean = (r() - 0.5) * 0.25;
  for (let i = 0; i < 7; i++) cyl(g, trunk, 4 - i * 0.3, 20, lean * i * 20, 10 + i * 19, 0, true);
  const top = new THREE.Group(); top.position.set(lean * 140, 140, 0); g.add(top);
  const leaf = M('#3E7A3A', { flat: true });
  for (let i = 0; i < 7; i++) { const l = box(top, leaf, 8, 2, 62, 0, 0, 0, true); const a = i / 7 * Math.PI * 2; l.position.set(Math.sin(a) * 26, -6, Math.cos(a) * 26); l.rotation.order = 'YXZ'; l.rotation.set(0.45, a, 0); }
  p.add(g); return g;
}

function makePerson(look, opts) {
  opts = opts || {};
  const root = new THREE.Group();
  const cast = !isTouch;
  const skin = M(look.skin), shirt = M(look.shirt), pants = M(look.pants || '#2A3550'), hair = M(look.hair || '#1A1110');
  // piernas con rodilla
  const thighs = [], shins = [];
  for (const sx of [-2.7, 2.7]) {
    const th = new THREE.Group(); th.position.set(sx, 17, 0);
    limb(th, pants, 4.6, 10, 4.8, 0, -4.2, 0, cast);
    const sh = new THREE.Group(); sh.position.set(0, -8.4, 0);
    limb(sh, pants, 4.2, 9.2, 4.4, 0, -4.1, 0, cast);
    const shoe = QCFG.round ? sph(sh, MAT.dark, 1, 0, -7.9, -1.2, cast) : box(sh, MAT.dark, 4.5, 2.6, 7, 0, -7.9, -1.2, cast); if (QCFG.round) shoe.scale.set(2.5, 1.6, 3.8);
    th.add(sh); root.add(th); thighs.push(th); shins.push(sh);
  }
  if (look.kind === 'senora') { const sk = mesh(root, GC, M(look.bundle[0]), 7.4, 13, 6.4, 0, 12, 0, cast); sk.scale.set(7.4, 13, 6.4); }
  // tronco (se inclina, respira y se balancea)
  const body = new THREE.Group(); body.position.set(0, 17, 0); root.add(body);
  limb(body, shirt, 11.4, 14.5, 7, 0, 7, 0, cast);
  limb(body, pants, 10.8, 4, 6.4, 0, 0.8, 0, false);
  if (look.kind === 'escolar') { box(body, M('#6B6F76'), 11.2, 4, 6.8, 0, 0.5, 0, cast); box(body, M(look.bag), 8.5, 10, 4.5, 0, 8, 5.2, cast); }
  else if (look.bag) box(body, M(look.bag), 3, 8, 7, 6.4, 1, 0, cast);
  if (look.bundle) { const bt = stripeTex(look.bundle[1], look.bundle[2], 8); box(body, M('#FFFFFF', { map: bt }), 12, 10, 5.5, 0, 8, 5.5, cast); }
  if (look.pouch) box(body, M('#26262C'), 7, 3.5, 2, 0, 1.5, -3.8, cast);
  if (look.vest === true) { box(body, M('#FF7A1A'), 11.4, 11, 7, 0, 7.5, 0, cast); box(body, MAT.chrome, 11.6, 1.4, 7.2, 0, 6, 0, false); }
  else if (look.vest) { limb(body, M(look.vest), 11.9, 12.5, 7.4, 0, 7.5, 0, cast); box(body, M(look.shirt), 3.5, 10, 1, 0, 8, -3.5, false); }
  if (look.apron) box(body, M(look.apron), 10, 12, 1, 0, 3, -3.6, false);
  // brazos con codo
  const arms = [], fores = [];
  for (const sx of [-6.9, 6.9]) {
    const ag = new THREE.Group(); ag.position.set(sx, 12.5, 0);
    limb(ag, shirt, 3.6, 7.6, 3.9, 0, -3.1, 0, cast);
    const fa = new THREE.Group(); fa.position.set(0, -6.2, 0);
    limb(fa, look.kind === 'senora' || look.long ? shirt : skin, 3.1, 6.8, 3.3, 0, -3, 0, cast);
    sph(fa, skin, 1.9, 0, -6.6, 0, false);
    ag.add(fa); body.add(ag); arms.push(ag); fores.push(fa);
  }
  // cabeza (mira a los lados)
  const head = new THREE.Group(); head.position.set(0, 14, 0); body.add(head);
  sph(head, skin, 1.9, 0, 0.2, 0, false);
  const hd = sph(head, skin, 4.7, 0, 4.6, 0, cast); hd.scale.set(4.5, 4.9, 4.6);
  if (look.hat !== 'casco') { const hr = sph(head, hair, 4.9, 0, 5.9, 0.8, false); hr.scale.set(4.9, 3.7, 4.9); }
  if (look.braids) { box(head, hair, 1.6, 10, 1.6, -2.2, -1, 4.2, false); box(head, hair, 1.6, 10, 1.6, 2.2, -1, 4.2, false); }
  if (look.hat === 'gorra') { const hc = M(look.hatColor); cyl(head, hc, 5, 2.6, 0, 8.3, 0.3, false); box(head, hc, 6.4, 0.9, 4.6, 0, 7.2, -5.2, false); }
  else if (look.hat === 'sombrero') { cyl(head, M('#EFE6CC'), 8.6, 0.8, 0, 8.6, 0, cast); cyl(head, M('#F6EFDA'), 4.5, 5, 0, 11, 0, false); cyl(head, M(INK), 4.6, 1.1, 0, 9.4, 0, false); }
  else if (look.hat === 'chef') { cyl(head, M('#FFFFFF'), 4.8, 7, 0, 10.5, 0.3, false); const pf = sph(head, M('#FFFFFF'), 5.8, 0, 15, 0.3, false); pf.scale.set(6.2, 4.2, 6.2); }
  else if (look.hat === 'casco') { const cs = sph(head, M(look.hatColor, { phong: true }), 5.6, 0, 5.6, 0.4, cast); cs.scale.set(5.5, 5.6, 5.9); box(head, MAT.glass, 7, 3.2, 1.6, 0, 4.6, -5.3, false); }
  box(head, MAT.dark, 1.1, 1.3, 0.6, -1.7, 5, -4.4, false); box(head, MAT.dark, 1.1, 1.3, 0.6, 1.7, 5, -4.4, false);
  box(head, M(shade(look.skin, -0.25)), 2.6, 0.8, 0.6, 0, 2.6, -4.5, false);
  if (look.clip) box(fores[1], M('#8B5E3C'), 6, 8, 1, 0, -6, -3, false);
  blobShadow(root, 13);
  root.userData = { legs: thighs, shins, arms, fores, body, head, seed: Math.random() * 10 };
  root.scale.setScalar((look.scale || 1) * (opts.scale || 1));
  return root;
}
// Animación de personas: caminar, correr, esperar, saludar, pedir parada, hablar por celular, asustarse, festejar.

function posePerson(m, phase, walking, wave, t, seated, ex) {
  const u = m.userData; if (!u || !u.body) return;
  ex = ex || {};
  const run = !!ex.run, amp = walking ? (run ? 1 : 0.62) : 0;
  const s = Math.sin(phase), c = Math.cos(phase), sd = u.seed;
  if (seated) { u.legs[0].rotation.x = u.legs[1].rotation.x = 1.45; u.shins[0].rotation.x = u.shins[1].rotation.x = -1.45; }
  else {
    u.legs[0].rotation.x = s * amp * 0.85; u.legs[1].rotation.x = -s * amp * 0.85;
    u.shins[0].rotation.x = -Math.max(0, c) * amp * (run ? 1.6 : 0.9); u.shins[1].rotation.x = -Math.max(0, -c) * amp * (run ? 1.6 : 0.9);
  }
  const b = u.body;
  b.position.y = 17 + (walking ? Math.abs(c) * (run ? 1.8 : 0.9) : 0);
  b.rotation.x = walking ? (run ? -0.3 : -0.05) : 0;
  b.rotation.y = walking ? s * 0.14 * amp : 0;
  b.rotation.z = walking ? s * 0.04 * amp : Math.sin(t * 0.7 + sd) * 0.025;
  b.scale.y = walking ? 1 : 1 + Math.sin(t * 2.1 + sd) * 0.018;
  u.head.rotation.y = walking ? -s * 0.1 * amp : (ex.look !== undefined ? ex.look : Math.sin(t * 0.45 + sd) * 0.55);
  u.head.rotation.x = 0; u.head.rotation.z = 0;
  const [aL, aR] = u.arms, [fL, fR] = u.fores;
  aL.rotation.set(-s * amp * 0.8, 0, -0.06); aR.rotation.set(s * amp * 0.8, 0, 0.06);
  fL.rotation.set(run ? 1.5 : 0.25 + amp * 0.25, 0, 0); fR.rotation.set(run ? 1.5 : 0.25 + amp * 0.25, 0, 0);
  if (ex.panic) {
    const k = Math.sin(t * 20) * 0.25;
    aL.rotation.set(0, 0, -2.5 + k); aR.rotation.set(0, 0, 2.5 - k); fL.rotation.x = fR.rotation.x = 0.4; b.rotation.x = 0.15;
  } else if (ex.cheer) {
    aL.rotation.set(0, 0, -2.7 + Math.sin(t * 9) * 0.25); aR.rotation.set(0, 0, 2.7 - Math.sin(t * 9 + 1) * 0.25); fL.rotation.x = fR.rotation.x = 0.2;
    b.position.y += Math.abs(Math.sin(t * 7 + sd)) * 3;
  } else if (ex.hail) {
    aR.rotation.set(2.1, 0, 0.25); fR.rotation.set(0.25 + Math.sin(t * 7 + sd) * 0.25, 0, 0); u.head.rotation.y = 0.15;
  } else if (wave) {
    aR.rotation.set(0.3, 0, 2.6 + Math.sin(t * 11 + sd) * 0.3); fR.rotation.set(0, 0, Math.sin(t * 11 + sd) * 0.5);
  } else if (ex.phone && !walking) {
    aR.rotation.set(0.6, 0, 0.45); fR.rotation.set(2.4, 0, 0); u.head.rotation.z = 0.18; u.head.rotation.y = Math.sin(t * 0.3 + sd) * 0.2;
  } else if (ex.hold) {
    aL.rotation.set(0, 0, -2.7); fL.rotation.set(0.3, 0, 0);
  }
  m.position.y = (m.position.y || 0);
}


function vcMat(kind, src) {
  if (!VC[kind]) {
    if (kind === 'vp') VC[kind] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.35 });
    else if (kind[1] === 's') VC[kind] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: src.roughness, metalness: src.metalness, flatShading: !!src.flatShading });
    else VC[kind] = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: kind === 'vlf' });
  }
  return VC[kind];
}

function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const hasUV = geos.every(g => g.attributes.uv), hasC = geos.every(g => g.attributes.color);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = hasUV ? new Float32Array(n * 2) : null, col = hasC ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.computeBoundingSphere();
  return m;
}

function flatten(parent, grp) {
  parent.updateMatrixWorld(true);
  for (const c of grp.children.slice()) { if (c.isGroup) flatten(grp, c); }
  grp.updateMatrixWorld(true);
  for (const c of grp.children.slice()) parent.attach(c);
  parent.remove(grp);
}

function bake(node) {
  const buckets = new Map(); const taken = [];
  for (const ch of node.children.slice()) {
    if (ch.isMesh && !ch.isInstancedMesh && !ch.userData.keep && !Array.isArray(ch.material) && !(ch.geometry && ch.geometry.type === 'ConeGeometry' && ch.material.blending === THREE.AdditiveBlending)) {
      const m = ch.material;
      const plain = !m.map && !m.transparent && !m.isMeshBasicMaterial && !(m.emissive && m.emissive.getHex());
      let key, mat;
      if (plain) { key = m.isMeshStandardMaterial ? 'vs' + m.roughness.toFixed(2) + m.metalness + (m.flatShading ? 'f' : '') : m.isMeshPhongMaterial ? 'vp' : (m.flatShading ? 'vlf' : 'vl'); mat = vcMat(key, m); }
      else { key = m.uuid; mat = m; }
      let b = buckets.get(key); if (!b) { b = { mat, geos: [], cast: false }; buckets.set(key, b); }
      ch.updateMatrix();
      const geo = (ch.geometry.index ? ch.geometry.toNonIndexed() : ch.geometry.clone());
      geo.applyMatrix4(ch.matrix);
      if (plain) { const cnt = geo.attributes.position.count, arr = new Float32Array(cnt * 3), cc = m.color; for (let i = 0; i < cnt; i++) { arr[i * 3] = cc.r; arr[i * 3 + 1] = cc.g; arr[i * 3 + 2] = cc.b; } geo.setAttribute('color', new THREE.BufferAttribute(arr, 3)); }
      b.geos.push(geo); b.cast = b.cast || ch.castShadow;
      taken.push(ch);
    } else if (!ch.isMesh && !ch.isSprite && ch.children && ch.children.length) bake(ch);
  }
  if (taken.length < 2) return node;
  for (const t of taken) node.remove(t);
  for (const b of buckets.values()) {
    const mm = new THREE.Mesh(mergeGeos(b.geos), b.mat);
    mm.castShadow = b.cast; mm.receiveShadow = true;
    node.add(mm);
    for (const g of b.geos) g.dispose();
  }
  return node;
}


function facadeTex(color, floors, brick, seed) {
  const key = 'fc' + color + floors + (brick ? 'b' : '') + (seed % 2);
  return canvasTex(key, 256, 100 * floors + 12, (x, w, h) => {
    const r = mulberry32(seed + floors * 7);
    const FH = 100, painted = brick ? Math.max(1, floors - 1) : floors;
    x.fillStyle = color; x.fillRect(0, 0, w, h);
    noise(x, w, h, 2200, 0.1, 0.12);
    for (let f = 0; f < floors; f++) {
      const yT = h - (f + 1) * FH;
      if (brick && f >= painted) {
        for (let rr = 0; rr < 12; rr++) for (let c = -1; c < 9; c++) { x.fillStyle = ['#B5553A', '#A94E34', '#BE6044'][(rr + c + 9) % 3]; x.fillRect(c * 32 + (rr % 2) * 16 + 1, yT + rr * 8 + 1, 30, 6); }
        x.fillStyle = '#2A221E'; x.fillRect(40, yT + 22, 64, 50); x.fillRect(150, yT + 22, 64, 50);
        x.fillStyle = '#7F7B76'; x.fillRect(0, yT, 14, FH); x.fillRect(w - 14, yT, 14, FH);
        continue;
      }
      x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, yT, w, 5);
      if (f === 0) {
        const sx = 16, sw = w - 32, sy = yT + 16, sh = FH - 16;
        if (r() < 0.55) {
          x.fillStyle = '#2B2522'; x.fillRect(sx, sy, sw, sh);
          const cols = ['#FF2E88', '#FFE14D', '#19D46E', '#2E6BFF', '#FF7A1A', '#FFFFFF'];
          for (let i = 0; i < 26; i++) { x.fillStyle = cols[i % 6]; x.fillRect(sx + 8 + (i % 13) * 16, sy + 12 + Math.floor(i / 13) * 22, 10, 14); }
          x.fillStyle = '#8B5E3C'; x.fillRect(sx, sy + sh - 22, sw, 22);
          x.fillStyle = '#9EA4AA'; x.fillRect(sx, sy, sw, 18);
          x.strokeStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(sx, sy + 5 + i * 5); x.lineTo(sx + sw, sy + 5 + i * 5); x.stroke(); }
        } else {
          x.fillStyle = '#A3A9AF'; x.fillRect(sx, sy, sw, sh);
          x.strokeStyle = 'rgba(40,40,45,0.45)'; x.lineWidth = 2;
          for (let yy = sy + 4; yy < sy + sh; yy += 7) { x.beginPath(); x.moveTo(sx, yy); x.lineTo(sx + sw, yy); x.stroke(); }
          x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(sx + sw / 2 - 12, sy + sh - 8, 24, 5);
          if (r() < 0.5) { x.fillStyle = '#E23B3B'; x.font = '700 18px ' + FONT_D; x.textAlign = 'center'; x.fillText(pickR(r, ['SE ALQUILA', 'NO ESTACIONAR', 'CERRADO']), w / 2, sy + sh / 2); }
        }
        x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(sx, sy, sw, sh);
      } else {
        for (const wx of [26, 146]) {
          const wy = yT + 18, ww = 84, wh = 58;
          x.fillStyle = '#EDEDED'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
          const gg = x.createLinearGradient(wx, wy, wx + ww, wy + wh); gg.addColorStop(0, '#5D7896'); gg.addColorStop(0.55, '#2F4257'); gg.addColorStop(1, '#253445');
          x.fillStyle = gg; x.fillRect(wx, wy, ww, wh);
          x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(wx + 10, wy + wh - 8); x.lineTo(wx + 38, wy + 8); x.stroke();
          x.fillStyle = '#EDEDED'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
          if (r() < 0.5) { x.fillStyle = '#26262C'; for (let b = wx + 6; b < wx + ww; b += 9) x.fillRect(b, wy, 2, wh); x.fillRect(wx, wy + wh / 2 - 1, ww, 2); }
          if (r() < 0.25) { x.fillStyle = pickR(r, ['#FF2E88', '#FFE14D', '#2E6BFF', '#FFFFFF']); x.fillRect(wx + 4, wy + 4, 22, wh - 8); }
          if (r() < 0.3) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(wx - 10, wy + wh + 4, ww + 20, 7); x.fillStyle = '#26262C'; for (let b = wx - 8; b < wx + ww + 10; b += 8) x.fillRect(b, wy + wh - 14, 2, 18); }
        }
      }
    }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 0, w, 10);
  });
}

const box = (p, mat, w, h, d, x, y, z, cast) => mesh(p, GB, mat, w, h, d, x, y, z, cast !== false);

const cyl = (p, mat, r, h, x, y, z, cast) => mesh(p, GC, mat, r, h, r, x, y, z, cast !== false);

const sph = (p, mat, r, x, y, z, cast) => mesh(p, GS, mat, r, r, r, x, y, z, cast !== false);
