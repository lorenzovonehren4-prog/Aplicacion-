'use strict';
// Último Disparo: escena 3D. Renderizador, cielo, luces y los 4 escenarios (ciudad de día,
// puerto, ciudad de noche y desierto) armados con piezas simples y texturas dibujadas en canvas.
// El francotirador está en (0, H, 0) mirando hacia -Z; el objetivo camina sobre z = -dist.

const W = { solids: [], lamps: [], anim: [], tex: {} };

function initWorld(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  W.renderer = r;
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2600);
  W.cine = new THREE.PerspectiveCamera(42, 1, 0.02, 2600);
  W.scene.add(W.camera);
  W.skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, stars: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float stars; varying vec3 vP;' +
      'float h21(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }' +
      'void main(){ vec3 d = normalize(vP); float h = clamp(d.y * 1.5 + 0.06, 0.0, 1.0); vec3 c = mix(bot, top, pow(h, 0.65));' +
      'float sd = max(dot(d, sunDir), 0.0); c += sunCol * (pow(sd, 600.0) * 2.0 + pow(sd, 10.0) * 0.22);' +
      'if (stars > 0.0) { vec3 q = floor(d * 260.0); float s = step(0.9975, h21(q)) * smoothstep(0.0, 0.25, d.y); c += vec3(s) * stars; }' +
      'gl_FragColor = vec4(c, 1.0); }',
  });
  W.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), W.skyMat);
  W.sky.frustumCulled = false; W.sky.renderOrder = -1;
  W.scene.add(W.sky);
  W.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  W.sun = new THREE.DirectionalLight(0xffffff, 2);
  W.sun.shadow.mapSize.set(2048, 2048);
  W.sun.shadow.bias = -0.0005; W.sun.shadow.normalBias = 0.03;
  W.scene.add(W.hemi, W.sun, W.sun.target);
  W.scene.fog = new THREE.Fog(0xffffff, 200, 1500);
  makeTextures();
  applyQuality();
}

function applyQuality() {
  const hi = save.opt.quality !== 'baja';
  W.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1));
  W.renderer.shadowMap.enabled = hi;
  W.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  W.sun.castShadow = hi;
  W.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
}

function resizeWorld() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  for (const c of [W.camera, W.cine]) { c.aspect = w / h; c.updateProjectionMatrix(); }
}

// ---------------------------------------------------------------- utilidades
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function canvasTex(w, h, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}
function noise(ctx, w, h, a, n = 4000, light = true) {
  for (let i = 0; i < n; i++) {
    const v = Math.random();
    ctx.fillStyle = light && v > 0.5 ? `rgba(255,255,255,${a * Math.random()})` : `rgba(0,0,0,${a * Math.random()})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
// Caja con las UV escaladas para que la textura se repita cada tw × th metros.
function tiledBox(w, h, d, tw, th) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0] / tw, uv.getY(k) * dims[f][1] / th);
  }
  return g;
}
function planeTiled(w, d, tw, td) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tw, uv.getY(i) * d / td);
  return g;
}
const MAT = {};
function mat(key, opts) {
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, opts));
  return MAT[key];
}
function std(c, r = 0.8, m = 0) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m }); }

function makeTextures() {
  const T = W.tex;
  T.asphalt = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#3a3b3f'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.18, 9000); });
  T.tiles = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#b9b2a6'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.12, 5000);
    x.strokeStyle = 'rgba(70,60,50,.35)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); }
  });
  T.grass = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5d7d3a'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.25, 12000); });
  T.concrete = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8f8d88'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.15, 8000);
    x.strokeStyle = 'rgba(40,40,40,.3)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h);
    x.fillStyle = 'rgba(60,50,40,.12)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 0, 7); x.fill(); }
  });
  T.sand = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#d6b07a'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.16, 12000); });
  T.container = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 8) { const g = x.createLinearGradient(i, 0, i + 8, 0); g.addColorStop(0, '#bdbdbd'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#9a9a9a'); x.fillStyle = g; x.fillRect(i, 0, 8, h); }
    x.fillStyle = 'rgba(80,60,40,.18)'; for (let i = 0; i < 30; i++) x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 5, 2 + Math.random() * 10);
    x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, w, 5); x.fillRect(0, h - 5, w, 5);
  });
  // fachadas: 4 columnas × 4 pisos de ventanas (16 m × 14 m), de día y de noche
  const facade = (wall, win, frame, night, style) => canvasTex(512, 448, (x, w, h) => {
    x.fillStyle = wall; x.fillRect(0, 0, w, h); noise(x, w, h, 0.1, 6000);
    if (style === 'brick') { x.strokeStyle = 'rgba(0,0,0,.12)'; for (let yy = 0; yy < h; yy += 8) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); } }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const X = c * 128 + 28, Y = r * 112 + 22, ww = 72, hh = 66;
      x.fillStyle = frame; x.fillRect(X - 5, Y - 5, ww + 10, hh + 10);
      let col = win;
      if (night) { const v = Math.random(); col = v < 0.42 ? (Math.random() < 0.7 ? '#ffcf6e' : '#cfe6ff') : v < 0.5 ? '#ff9f5a' : '#141a26'; }
      const g = x.createLinearGradient(X, Y, X + ww, Y + hh); g.addColorStop(0, col); g.addColorStop(1, night ? col : '#1d2a3a');
      x.fillStyle = g; x.fillRect(X, Y, ww, hh);
      x.fillStyle = frame; x.fillRect(X + ww / 2 - 2, Y, 4, hh); x.fillRect(X, Y + hh * 0.4, ww, 3);
      if (!night) { x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(X, Y + hh); x.lineTo(X + 24, Y); x.lineTo(X + 36, Y); x.lineTo(X + 12, Y + hh); x.fill(); }
    }
  });
  T.facades = [
    facade('#c8b89e', '#5d7fa3', '#efe8dc', false), facade('#9b4a3a', '#5a7894', '#e3d7c4', false, 'brick'),
    facade('#7d8691', '#3e6286', '#c9ced4', false), facade('#e6dccb', '#4f7397', '#8b6f55', false), facade('#5f7f8f', '#9fc6e2', '#2d3f4a', false),
  ];
  T.night = [
    facade('#2a2a33', '', '#3b3b46', true), facade('#3a1f1c', '', '#4a3a36', true, 'brick'), facade('#23282f', '', '#343b45', true), facade('#312d29', '', '#463f38', true),
  ];
  T.roof = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#5b5a57'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.2, 3000); });
  T.water = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#1f4d6b'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(${150 + Math.random() * 100},${200 + Math.random() * 55},255,${0.08 + Math.random() * 0.15})`; x.lineWidth = 1 + Math.random() * 2; const X = Math.random() * w, Y = Math.random() * h; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + 8, Y - 3, X + 16 + Math.random() * 10, Y); x.stroke(); }
  });
}
const signTexCache = {};
function signTex(text, bg, fg, w = 512, h = 128) {
  const k = text + bg + fg + w;
  if (signTexCache[k]) return signTexCache[k];
  return (signTexCache[k] = canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; x.font = `700 ${Math.round(h * 0.56)}px Fredoka, Rubik, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, w / 2, h / 2 + 4);
  }, false));
}

// ---------------------------------------------------------------- piezas
function addTo(g, mesh, solid = true, thin = false) {
  mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh);
  if (solid) { mesh.userData.solid = true; if (thin) mesh.userData.thin = true; W.solids.push(mesh); }
  return mesh;
}
function box(g, w, h, d, m, x, y, z, solid = true, thin = false) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); return addTo(g, me, solid, thin);
}
function cyl(g, rt, rb, h, m, x, y, z, seg = 10, solid = true) {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); return addTo(g, me, solid);
}

function building(g, x, z, w, h, d, night, rand, faceZ = 1) {
  const tex = night ? W.tex.night[Math.floor(rand() * W.tex.night.length)] : W.tex.facades[Math.floor(rand() * W.tex.facades.length)];
  const key = 'fac' + tex.id;
  const fm = MAT[key] || (MAT[key] = new THREE.MeshStandardMaterial(night ? { map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.9 } : { map: tex, roughness: 0.8 }));
  const rm = mat('roof', { map: W.tex.roof, roughness: 0.95 });
  const geo = tiledBox(w, h, d, 16, 14);
  const me = new THREE.Mesh(geo, [fm, fm, rm, rm, fm, fm]);
  me.position.set(x, h / 2, z);
  addTo(g, me);
  // cornisa y cosas del techo
  box(g, w + 0.6, 0.5, d + 0.6, mat('cornice', { color: night ? 0x2a2a30 : 0xd8d2c6 }), x, h + 0.25, z, false);
  if (rand() < 0.6) box(g, 2.5, 1.6, 2, mat('ac', { color: 0x9a9da3, metalness: 0.4, roughness: 0.5 }), x + (rand() - 0.5) * w * 0.6, h + 1.3, z + (rand() - 0.5) * d * 0.5, false);
  if (rand() < 0.3) { cyl(g, 1.3, 1.3, 2.6, mat('tank', { color: 0x6d6a66 }), x - w * 0.25, h + 2.3, z, 12, false); }
  return me;
}

function tree(g, x, z, s = 1, kind = 'round') {
  cyl(g, 0.14 * s, 0.2 * s, 2.6 * s, mat('trunk', { color: 0x5a3f28 }), x, 1.3 * s, z, 7, true);
  const fm = mat('leaf' + kind, { color: kind === 'palm' ? 0x4f8a33 : 0x3f7a2e, roughness: 0.9, flatShading: true });
  const geo = W.tex.leafGeo || (W.tex.leafGeo = new THREE.IcosahedronGeometry(1, 1));
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geo, fm);
    m.scale.setScalar(s * (1.5 - i * 0.25));
    m.position.set(x + (i - 1) * 0.5 * s, (3.2 + i * 0.7) * s, z + ((i % 2) - 0.5) * 0.5 * s);
    addTo(g, m, true);
  }
}
function lamp(g, x, z, night, light, faceZ = -1) {
  const pm = mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 });
  cyl(g, 0.07, 0.1, 6.5, pm, x, 3.25, z, 8, false);
  box(g, 0.1, 0.1, 1.4, pm, x, 6.45, z + faceZ * 0.65, false);
  const bm = night ? mat('bulbOn', { color: 0xfff0c0, emissive: 0xffd88a, emissiveIntensity: 3 }) : mat('bulbOff', { color: 0xdddddd });
  box(g, 0.45, 0.14, 0.6, bm, x, 6.33, z + faceZ * 1.25, false);
  if (night && light) {
    const p = new THREE.PointLight(0xffc977, 70, 30, 1.6);
    p.position.set(x, 6.0, z + faceZ * 1.25);
    g.add(p); W.lamps.push(p);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    cone.position.set(x, 3.1, z + faceZ * 1.25); g.add(cone);
  }
}
const CAR_COLORS = [0xd8342c, 0x2b62c9, 0xf2f2f2, 0x1d1d1f, 0x8c9198, 0x2f8a4e, 0xe0b02a, 0x7a2440];
function car(g, x, z, rot, color, kind = 'car', thin = true) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = rot; g.add(c);
  const bm = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.55 });
  const glass = mat('glass', { color: 0x1a2632, roughness: 0.1, metalness: 0.8 });
  const wheel = mat('wheel', { color: 0x151515, roughness: 0.9 });
  const solid = (m) => { m.userData.solid = true; m.userData.thin = thin; W.solids.push(m); return m; };
  const B = (w, h, d, m, X, Y, Z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(X, Y, Z); me.castShadow = me.receiveShadow = true; c.add(me); return solid(me); };
  let L = 4.3, Wd = 1.8;
  if (kind === 'car' || kind === 'taxi') {
    B(Wd, 0.7, L, bm, 0, 0.62, 0); B(Wd * 0.9, 0.55, L * 0.5, bm, 0, 1.24, -0.2);
    B(Wd * 0.92, 0.45, L * 0.46, glass, 0, 1.24, -0.2).scale.set(1.01, 0.9, 1.02);
    if (kind === 'taxi') B(0.5, 0.18, 0.25, mat('taxiSign', { color: 0xffffff, emissive: 0xffe58a, emissiveIntensity: 1.2 }), 0, 1.6, -0.2);
  } else if (kind === 'van') {
    L = 5.2; Wd = 2.0;
    B(Wd, 2.2, L, bm, 0, 1.45, 0); B(Wd * 1.01, 0.6, 1.2, glass, 0, 1.9, L / 2 - 0.65);
  } else if (kind === 'bus') {
    L = 11; Wd = 2.5;
    B(Wd, 2.7, L, bm, 0, 1.75, 0); B(Wd * 1.01, 0.9, L * 0.9, glass, 0, 2.3, 0);
    B(Wd * 0.98, 0.1, L * 0.96, mat('busRoof', { color: 0xe8e8e8 }), 0, 3.15, 0);
  } else if (kind === 'truck') {
    L = 12; Wd = 2.5;
    B(Wd, 2.6, 3, bm, 0, 1.75, L / 2 - 1.5); B(Wd * 1.01, 0.8, 0.2, glass, 0, 2.4, L / 2 - 0.02);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, L - 3.6, 16), mat('tankSteel', { color: 0xd9dcdf, metalness: 0.75, roughness: 0.3 }));
    tank.rotation.x = Math.PI / 2; tank.position.set(0, 1.95, -1.6); tank.castShadow = true; c.add(tank); solid(tank);
  }
  const wg = W.tex.wheelGeo || (W.tex.wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateZ(Math.PI / 2));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(wg, wheel); w.position.set(sx * (Wd / 2 - 0.05), 0.36, sz * (L / 2 - 0.9)); c.add(w); }
  return c;
}
function container(g, x, y, z, rot, color, thin = true) {
  const m = MAT['cont' + color] || (MAT['cont' + color] = new THREE.MeshStandardMaterial({ map: W.tex.container, color, roughness: 0.7, metalness: 0.3 }));
  const me = new THREE.Mesh(tiledBox(2.44, 2.6, 6.06, 2.4, 2.6), m);
  me.position.set(x, y + 1.3, z); me.rotation.y = rot;
  addTo(g, me, true, thin);
  return me;
}
const CONT_COLORS = [0xc0392b, 0x2471a3, 0x1e8449, 0xd68910, 0x7d3c98, 0x839192, 0xe67e22, 0x117a65, 0xa93226];

function ground(g, tex, w, d, x, z, tw, y = 0, receive = true, color = 0xffffff) {
  const m = MAT['gr' + tex.id + color] || (MAT['gr' + tex.id + color] = new THREE.MeshStandardMaterial({ map: tex, color, roughness: 0.95 }));
  const me = new THREE.Mesh(planeTiled(w, d, tw, tw), m);
  me.position.set(x, y, z); me.receiveShadow = receive; g.add(me);
  me.userData.solid = true; W.solids.push(me);
  return me;
}
function stripes(g, x0, x1, z, color, dash = 3, gap = 3, w = 0.18, y = 0.02) {
  const m = mat('stripe' + color, { color, roughness: 0.6 });
  for (let x = x0; x < x1; x += dash + gap) { const me = new THREE.Mesh(new THREE.PlaneGeometry(dash, w).rotateX(-Math.PI / 2), m); me.position.set(x + dash / 2, y, z); g.add(me); }
}
function sign(g, text, bg, fg, w, h, x, y, z, rotY = 0, glow = false) {
  const t = signTex(text, bg, fg);
  const m = new THREE.MeshStandardMaterial(glow ? { map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.6 } : { map: t, roughness: 0.6 });
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.position.set(x, y, z); me.rotation.y = rotY; g.add(me);
  return me;
}

// ---------------------------------------------------------------- el rifle
function makeRifle(w) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.55, metalness: 0.25 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.35, metalness: 0.85 });
  const rub = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.95 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x274a6e, roughness: 0.05, metalness: 0.9, emissive: 0x0a1a2a });
  const B = (sx, sy, sz, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); me.position.set(x, y, z); g.add(me); return me; };
  const C = (r1, r2, l, m, x, y, z, seg = 16) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, l, seg), m); me.rotation.x = Math.PI / 2; me.position.set(x, y, z); g.add(me); return me; };
  // culata, empuñadura, cajón de mecanismos y guardamanos (el cañón apunta a -Z)
  B(0.05, 0.12, 0.3, body, 0, -0.03, 0.42).rotation.x = -0.08;
  B(0.055, 0.05, 0.08, rub, 0, -0.03, 0.58);
  B(0.04, 0.1, 0.05, body, 0, -0.1, 0.18).rotation.x = 0.3;
  B(0.06, 0.07, 0.36, metal, 0, 0.01, 0.06);
  B(0.065, 0.075, 0.42, body, 0, 0, -0.32);
  B(0.03, 0.05, 0.07, metal, 0, -0.06, 0.03);
  const bolt = C(0.008, 0.008, 0.06, metal, 0.045, 0.03, 0.12); bolt.rotation.set(0, 0, Math.PI / 2);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), metal); knob.position.set(0.08, 0.03, 0.12); g.add(knob);
  const barrelLen = w.id === 'titan' ? 0.75 : 0.62;
  C(0.013, 0.016, barrelLen, metal, 0, 0.012, -0.5 - barrelLen / 2 + 0.1);
  const tip = -0.4 - barrelLen;
  if (w.extra === 'silencio') C(0.026, 0.026, 0.24, rub, 0, 0.012, tip - 0.1, 18);
  if (w.extra === 'penetra') { B(0.06, 0.04, 0.09, metal, 0, 0.012, tip - 0.02); }
  // mira
  C(0.022, 0.022, 0.3, metal, 0, 0.085, 0.02, 18);
  C(0.032, 0.022, 0.08, metal, 0, 0.085, -0.15, 18);
  C(0.028, 0.022, 0.06, metal, 0, 0.085, 0.18, 18);
  if (w.extra === 'termica') B(0.05, 0.05, 0.12, metal, 0, 0.125, 0.0);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), glass); lens.position.set(0, 0.085, -0.191); lens.rotation.y = Math.PI; g.add(lens);
  B(0.012, 0.035, 0.02, metal, 0, 0.055, -0.05); B(0.012, 0.035, 0.02, metal, 0, 0.055, 0.1);
  C(0.006, 0.006, 0.03, metal, 0.03, 0.085, 0.02).rotation.set(0, 0, Math.PI / 2);
  // bípode plegado
  for (const s of [-1, 1]) { const l = C(0.006, 0.006, 0.22, metal, s * 0.02, -0.06, -0.55); l.rotation.x = Math.PI / 2 - 0.12; }
  g.userData.tipZ = tip - (w.extra === 'silencio' ? 0.22 : 0.02);
  return g;
}

// ---------------------------------------------------------------- escenarios
function clearLevel() {
  if (W.level) {
    W.scene.remove(W.level);
    W.level.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
  }
  W.solids = []; W.lamps = []; W.anim = [];
  W.level = new THREE.Group();
  W.scene.add(W.level);
}

// Arma el escenario de un nivel y devuelve su disposición (caminos, coberturas, cámara).
function buildLevel(L) {
  clearLevel();
  const g = W.level, map = L.map, rand = rng(L.n * 7919 + 13);
  const dist = L.dist, Zt = -dist;
  const night = map === 'noche';
  const H = map === 'desierto' ? 30 : map === 'puerto' ? 24 : 21;
  const lay = { H, dist, Zt, cam: new THREE.Vector3(0, H, 0), civPaths: [], covers: [], half: 7, coverZ: Zt + 3 };
  // la altura máxima que puede tener algo a dz metros delante del objetivo sin taparlo
  const slope = H / dist;
  lay.clear = dz => 1.9 + dz * slope - 0.6;

  setAmbience(map, L);
  // el lugar del francotirador (azotea, torre o cerro)
  perch(g, map, H, rand);

  if (map === 'dia' || map === 'noche') city(g, L, lay, rand, night);
  else if (map === 'puerto') port(g, L, lay, rand);
  else desert(g, L, lay, rand);

  // coberturas para los niveles en que el secuestrador se cubre
  if (L.mode === 'cubre') {
    // dos coberturas a los lados: queda a la vista en el medio (unos 5 m)
    [-5.3, 5.3].forEach((x, i) => coverPiece(g, map, x, lay.coverZ, i, rand, night));
  }
  return lay;
}

function setAmbience(map, L) {
  const S = {
    dia: { top: 0x3f8ae0, bot: 0xd4e8ff, sun: 0xfff2dc, sunI: 2.6, hemiS: 0xcfe4ff, hemiG: 0x6d5f4c, hemiI: 1.05, fog: 0xc8dcf0, near: 160, far: 900, exp: 1.0, dir: [0.5, 0.7, 0.25], stars: 0 },
    puerto: { top: 0x5a8fc4, bot: 0xe9dcc8, sun: 0xffe2b8, sunI: 2.3, hemiS: 0xd8e6f5, hemiG: 0x5d6168, hemiI: 1.0, fog: 0xc9d3dc, near: 150, far: 950, exp: 1.0, dir: [-0.6, 0.45, 0.2], stars: 0 },
    noche: { top: 0x050a1c, bot: 0x1c2140, sun: 0x8fa6ff, sunI: 0.35, hemiS: 0x3a4a8a, hemiG: 0x15131c, hemiI: 0.5, fog: 0x0b0f1f, near: 60, far: 520, exp: 1.25, dir: [-0.3, 0.8, 0.3], stars: 1 },
    desierto: { top: 0x3d84d6, bot: 0xf4d3a0, sun: 0xffe6c0, sunI: 3.0, hemiS: 0xffe9c9, hemiG: 0x9a6b3a, hemiI: 1.05, fog: 0xe6c9a0, near: 220, far: 1300, exp: 1.0, dir: [0.4, 0.62, -0.5], stars: 0 },
  }[map];
  if (L.n === 22) { S.hemiI = 0.35; } // apagón
  if (L.n === 29) { S.fog = 0xd9b98a; S.near = 90; S.far = 700; S.top = 0xc9a77a; S.bot = 0xe2c08f; } // tormenta de arena
  W.skyMat.uniforms.top.value.set(S.top); W.skyMat.uniforms.bot.value.set(S.bot);
  W.skyMat.uniforms.stars.value = S.stars;
  const d = new THREE.Vector3(...S.dir).normalize();
  W.skyMat.uniforms.sunDir.value.copy(d);
  W.skyMat.uniforms.sunCol.value.set(S.sun).multiplyScalar(map === 'noche' ? 0.5 : 1);
  W.sun.color.set(S.sun); W.sun.intensity = S.sunI;
  W.hemi.color.set(S.hemiS); W.hemi.groundColor.set(S.hemiG); W.hemi.intensity = S.hemiI;
  W.scene.fog.color.set(S.fog); W.scene.fog.near = S.near; W.scene.fog.far = S.far;
  W.renderer.toneMappingExposure = S.exp;
  // la sombra del sol cubre la zona del objetivo
  const tz = -L.dist;
  W.sun.position.set(d.x * 150, d.y * 150, tz + d.z * 150);
  W.sun.target.position.set(0, 0, tz);
  const sc = W.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 20; sc.far = 400; sc.updateProjectionMatrix();
  W.night = map === 'noche';
}

function perch(g, map, H, rand) {
  if (map === 'desierto') {
    // cerro de roca bajo el francotirador
    const rm = mat('rock', { color: 0xa0704a, roughness: 1, flatShading: true });
    const hill = new THREE.Mesh(new THREE.CylinderGeometry(9, 46, H - 1.2, 9, 3), rm);
    hill.position.set(0, (H - 1.2) / 2, 14); addTo(g, hill, false);
    const pos = hill.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > -(H - 1.2) / 2 + 0.1 && y < (H - 1.2) / 2 - 0.1) { pos.setX(i, pos.getX(i) * (0.85 + rand() * 0.3)); pos.setZ(i, pos.getZ(i) * (0.85 + rand() * 0.3)); } }
    hill.geometry.computeVertexNormals();
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + rand() * 0.5, 0), rm); r.position.set((i < 2 ? -1 : 1) * (3.5 + (i % 2) * 2 + rand()), H - 1.7, -0.5 - rand()); addTo(g, r, false); }
    return;
  }
  // azotea (o techo de la torre del puerto) con parapeto
  const wall = map === 'puerto' ? 0x7c8288 : map === 'noche' ? 0x3a3a42 : 0xb9ad98;
  const wm = mat('perch' + map, { color: wall, roughness: 0.9 });
  box(g, 16, H - 1.8, 12, wm, 0, (H - 1.8) / 2, 4, false);
  box(g, 16, 0.4, 0.35, wm, 0, H - 1.6, -1.9, false);
  box(g, 16.2, 0.1, 0.5, mat('perchCap', { color: 0xd6d0c4 }), 0, H - 1.35, -1.9, false);
  box(g, 2.2, 1.4, 1.6, mat('ac', { color: 0x9a9da3, metalness: 0.4, roughness: 0.5 }), -6, H - 1.1, 1.5, false);
  cyl(g, 0.04, 0.04, 6, mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 }), 6.5, H + 1.8, 2, 6, false);
}

function city(g, L, lay, rand, night) {
  const Zt = lay.Zt;
  ground(g, W.tex.grass, 600, 600, 0, Zt + 60, 8, -0.02, true, night ? 0x3a4a3a : 0xffffff);
  ground(g, W.tex.tiles, 140, 38, 0, Zt + 14, 4, 0, true, night ? 0x6a6670 : 0xffffff);   // plaza
  ground(g, W.tex.asphalt, 700, 14, 0, Zt - 12, 6, 0.01, true, night ? 0x9a9aa8 : 0xffffff); // pista
  ground(g, W.tex.tiles, 700, 6, 0, Zt - 22, 3, 0.03, true, night ? 0x6a6670 : 0xffffff);
  ground(g, W.tex.tiles, 700, 4, 0, Zt - 3, 3, 0.03, true, night ? 0x6a6670 : 0xffffff);
  box(g, 700, 0.18, 0.3, mat('curb', { color: 0xbfbab0 }), 0, 0.09, Zt - 5, false);
  box(g, 700, 0.18, 0.3, mat('curb', { color: 0xbfbab0 }), 0, 0.09, Zt - 19, false);
  stripes(g, -300, 300, Zt - 12, 0xf2f2f2, 3, 4);
  for (let i = 0; i < 7; i++) { const me = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 12).rotateX(-Math.PI / 2), mat('stripe' + 0xf2f2f2, { color: 0xf2f2f2 })); me.position.set(-16 + i * 1.1, 0.03, Zt - 12); g.add(me); }
  // edificios detrás de la pista
  let x = -170;
  while (x < 170) {
    const w = 12 + rand() * 12, h = 14 + rand() * 30, d = 16 + rand() * 6;
    building(g, x + w / 2, Zt - 24 - d / 2, w, h, d, night, rand);
    // tienda en el primer piso
    if (rand() < 0.5) {
      const aw = [0xc0392b, 0x1f6fb2, 0x2e8b57, 0xe0a020][Math.floor(rand() * 4)];
      const a = box(g, w * 0.8, 0.15, 1.6, mat('awn' + aw, { color: aw }), x + w / 2, 3.4, Zt - 24.8, false); a.rotation.x = 0.25;
    }
    x += w + 0.4;
  }
  const names = night ? [['CINE', '#16102a', '#ff4fd8'], ['HOTEL', '#101a2a', '#4fe0ff'], ['BAR', '#1a0f0f', '#ffcc33']] : [['BANCO', '#0d3b66', '#ffffff'], ['FARMACIA', '#1f7a3a', '#ffffff'], ['PANADERÍA', '#7a3b12', '#ffe9c2']];
  names.forEach((n, i) => sign(g, n[0], n[1], n[2], 7, 1.6, -26 + i * 26, 4.6, Zt - 24.6, 0, night));
  // segunda fila de edificios (horizonte)
  for (let i = 0; i < 14; i++) building(g, -260 + i * 40 + rand() * 10, Zt - 75 - rand() * 30, 22 + rand() * 14, 35 + rand() * 60, 24, night, rand);
  // edificios de los costados (enmarcan la plaza)
  for (const s of [-1, 1]) {
    let z = -14;
    while (z > Zt + 18) { const d = 14 + rand() * 8, w = 16 + rand() * 6, h = 12 + rand() * 22; building(g, s * (34 + w / 2 + rand() * 4), z - d / 2, w, h, d, night, rand); z -= d + 1; }
  }
  // árboles, bancas y postes en la plaza (fuera de la línea de tiro)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) tree(g, s * (16 + i * 9 + rand() * 3), Zt + 12 + rand() * 18, 0.9 + rand() * 0.3);
  for (let i = 0; i < 6; i++) tree(g, -30 + i * 12 + rand() * 3, Zt + 40 + rand() * 30, 1 + rand() * 0.4);
  const bench = mat('bench', { color: 0x6b4a2b }), iron = mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 });
  for (const bx of [-14, 14]) { box(g, 2, 0.08, 0.5, bench, bx, 0.48, Zt + 2.2, true, true); box(g, 2, 0.5, 0.06, bench, bx, 0.78, Zt + 2.45, true, true); box(g, 0.08, 0.45, 0.4, iron, bx - 0.9, 0.23, Zt + 2.2, false); box(g, 0.08, 0.45, 0.4, iron, bx + 0.9, 0.23, Zt + 2.2, false); }
  const nightLamps = L.n === 22 ? [-40, 40] : L.n === 19 ? [-26, 26] : [-12, 12, -40, 40];
  for (let lx = -56; lx <= 56; lx += 14) lamp(g, lx, Zt - 4.6, night, night && nightLamps.includes(lx), -1);
  if (night && L.n !== 22 && L.n !== 19) {
    // luz extra sobre el objetivo para que se pueda jugar sin mira térmica
    const p = new THREE.PointLight(0xffd69a, 60, 26, 1.5); p.position.set(0, 7, Zt - 1); g.add(p); W.lamps.push(p);
  }
  // paradero y quiosco
  const glassM = mat('stopGlass', { color: 0x9fc7e0, transparent: true, opacity: 0.35, roughness: 0.1 });
  box(g, 4, 0.12, 1.6, iron, 22, 2.5, Zt - 3.6, false); box(g, 4, 2.3, 0.05, glassM, 22, 1.25, Zt - 4.35, false);
  sign(g, 'PARADERO', '#0b5394', '#ffffff', 1.6, 0.4, 20.4, 2.75, Zt - 2.79);
  car(g, -24, Zt - 9, Math.PI / 2, CAR_COLORS[Math.floor(rand() * 8)], night ? 'taxi' : 'car');
  car(g, 30, Zt - 15, -Math.PI / 2, CAR_COLORS[Math.floor(rand() * 8)], 'car');
  car(g, -60, Zt - 15, -Math.PI / 2, 0xffffff, 'bus');
  // carros estacionados al frente
  for (let i = 0; i < 8; i++) car(g, -36 + i * 9 + rand() * 2, Zt + 34 + rand() * 4, rand() < 0.5 ? 0 : Math.PI, CAR_COLORS[Math.floor(rand() * 8)], night && rand() < 0.4 ? 'taxi' : 'car');
  // caminos de civiles
  lay.civPaths.push(
    { a: [-30, Zt - 1.2], b: [30, Zt - 1.2] }, { a: [28, Zt + 4.5], b: [-28, Zt + 4.5] }, { a: [-26, Zt + 8], b: [26, Zt + 8] },
    { a: [30, Zt - 21.5], b: [-30, Zt - 21.5] }, { a: [-22, Zt + 0.9], b: [22, Zt + 0.9] }, { a: [-14, Zt + 14], b: [14, Zt + 6] },
    { a: [26, Zt - 2.5], b: [-26, Zt - 2.5] },
  );
}

function port(g, L, lay, rand) {
  const Zt = lay.Zt;
  ground(g, W.tex.concrete, 700, 400, 0, Zt + 120, 8, 0);
  ground(g, W.tex.concrete, 700, 30, 0, Zt - 7, 8, 0.01);
  // muelle, agua y barco
  box(g, 700, 3, 3, mat('quay', { color: 0x6d6a64 }), 0, -1.5, Zt - 23.5, false);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1200).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: W.tex.water, roughness: 0.25, metalness: 0.4, color: 0x9fc4da }));
  W.tex.water.repeat.set(120, 60);
  water.position.set(0, -1.6, Zt - 625); g.add(water);
  W.anim.push(dt => { W.tex.water.offset.x += dt * 0.004; W.tex.water.offset.y += dt * 0.002; });
  const hull = mat('hull', { color: 0x1d3c5a, roughness: 0.6 }), red = mat('hullRed', { color: 0x9b2a22 });
  box(g, 130, 9, 22, hull, 10, 3, Zt - 48, false); box(g, 130, 3, 22.2, red, 10, -1.5, Zt - 48, false);
  box(g, 18, 14, 18, mat('bridge', { color: 0xf0eee8 }), 60, 14.5, Zt - 48, false);
  for (let i = 0; i < 26; i++) container(g, -48 + (i % 13) * 7.2, 7.5 + Math.floor(i / 13) * 2.6, Zt - 48 + (rand() - 0.5) * 6, Math.PI / 2, CONT_COLORS[Math.floor(rand() * 9)], false);
  // grúas pórtico
  const crane = mat('crane', { color: 0xe8862a, roughness: 0.6, metalness: 0.3 });
  for (const cx of [-34, 36]) {
    for (const s of [-1, 1]) for (const zz of [Zt - 9, Zt - 21]) box(g, 1.2, 38, 1.2, crane, cx + s * 7, 19, zz, false);
    box(g, 16, 2.2, 2.2, crane, cx, 37, Zt - 9, false); box(g, 16, 2.2, 2.2, crane, cx, 37, Zt - 21, false);
    box(g, 4, 2.4, 70, crane, cx, 40, Zt - 30, false);
    box(g, 4, 3, 4, mat('cab', { color: 0x30363d }), cx, 37, Zt - 36, false);
  }
  // pilas de contenedores detrás y a los costados
  for (let x = -90; x < 90; x += 7.4) {
    if (Math.abs(x) < 3) continue;
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) container(g, x, k * 2.6, Zt - 13 + (rand() - 0.5) * 0.6, 0, CONT_COLORS[Math.floor(rand() * 9)], false);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) container(g, s * (16 + j * 3.2), k * 2.6, Zt + 4 + i * 7, 0, CONT_COLORS[Math.floor(rand() * 9)], false);
  }
  // galpones
  for (const s of [-1, 1]) {
    const wm = mat('shed', { color: 0x8a96a3, roughness: 0.7, metalness: 0.3 });
    box(g, 30, 12, 40, wm, s * 50, 6, Zt + 40, false);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 40, 16, 1, false, 0, Math.PI), wm);
    roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.scale.set(1, 1, 0.35); roof.position.set(s * 50, 12, Zt + 40); g.add(roof);
  }
  // montacargas y bolardos
  const fl = mat('fork', { color: 0xf1c40f, roughness: 0.5 });
  for (const fx of [-10, 13]) { box(g, 1.2, 1.4, 2.2, fl, fx, 0.9, Zt - 5, true, true); box(g, 1.1, 1.1, 0.8, mat('glass', { color: 0x1a2632, roughness: 0.1, metalness: 0.8 }), fx, 2.0, Zt - 4.6, true, true); box(g, 0.1, 2.6, 0.1, mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 }), fx - 0.4, 1.3, Zt - 6.2, false); }
  for (let bx = -60; bx <= 60; bx += 8) cyl(g, 0.25, 0.3, 0.7, mat('bollard', { color: 0x222222 }), bx, 0.35, Zt - 21.5, 10, false);
  // torres de luz
  for (const tx of [-24, 24]) { cyl(g, 0.25, 0.35, 22, mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 }), tx, 11, Zt + 10, 8, false); box(g, 3, 1.2, 0.5, mat('bulbOff', { color: 0xdddddd }), tx, 22, Zt + 10, false); }
  lay.civPaths.push(
    { a: [-24, Zt - 1.5], b: [24, Zt - 1.5] }, { a: [22, Zt + 4.5], b: [-22, Zt + 4.5] }, { a: [-20, Zt + 8], b: [20, Zt + 8] },
    { a: [20, Zt - 7], b: [-20, Zt - 7] }, { a: [-12, Zt + 0.9], b: [12, Zt + 0.9] }, { a: [18, Zt + 12], b: [-18, Zt + 3] },
  );
}

function desert(g, L, lay, rand) {
  const Zt = lay.Zt;
  // arena con dunas suaves lejos de la zona de tiro
  const geo = new THREE.PlaneGeometry(2400, 2400, 120, 120); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) + (Zt + 200);
    const dx = Math.max(0, Math.abs(x) - 80), dz = Math.max(0, Math.abs(z - Zt) - 70);
    const far = Math.min(1, Math.hypot(dx, dz) / 200);
    pos.setY(i, far * (Math.sin(x * 0.012) * 9 + Math.sin(z * 0.017 + x * 0.004) * 7 + 6));
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 300, uv.getY(i) * 300);
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: W.tex.sand, roughness: 1 }));
  sand.position.z = Zt + 200; sand.receiveShadow = true; g.add(sand);
  sand.userData.solid = true; W.solids.push(sand);
  // carretera
  ground(g, W.tex.asphalt, 900, 10, 0, Zt + 16, 6, 0.02);
  stripes(g, -400, 400, Zt + 14.6, 0xf2c200, 4, 0.01, 0.15, 0.04); stripes(g, -400, 400, Zt + 15, 0xf2c200, 4, 0.01, 0.15, 0.04);
  ground(g, W.tex.concrete, 50, 34, 0, Zt - 4, 6, 0.03);
  // gasolinera: techo, surtidores y minimarket
  const white = mat('stationWhite', { color: 0xf2f2f2 }), redM = mat('stationRed', { color: 0xc8261c });
  for (const px of [-9, 9]) for (const pz of [Zt - 7.5, Zt - 1.5]) box(g, 0.5, 5.4, 0.5, white, px, 2.7, pz, false);
  box(g, 22, 0.7, 10, white, 0, 5.7, Zt - 4.5, false); box(g, 22.2, 0.5, 10.2, redM, 0, 5.3, Zt - 4.5, false);
  sign(g, 'GASOLINERA', '#c8261c', '#ffffff', 8, 1.2, 0, 5.4, Zt + 0.6);
  for (const px of [-5, 0, 5]) { box(g, 1.2, 1.9, 0.6, redM, px, 0.95, Zt - 4.5, true, true); box(g, 1.3, 0.2, 0.7, white, px, 2, Zt - 4.5, false); box(g, 3.2, 0.2, 1.2, white, px, 0.1, Zt - 4.5, false); }
  box(g, 20, 4.6, 9, mat('store', { color: 0xe6d6b8 }), 0, 2.3, Zt - 16, false);
  box(g, 20.4, 0.5, 9.4, redM, 0, 4.85, Zt - 16, false);
  box(g, 6, 2.6, 0.1, mat('glass', { color: 0x1a2632, roughness: 0.1, metalness: 0.8 }), -3, 1.5, Zt - 11.45, false);
  sign(g, 'MINIMARKET', '#1d3557', '#ffd166', 6, 1.0, 4.5, 3.6, Zt - 11.44);
  // poste del precio
  cyl(g, 0.2, 0.2, 9, white, 16, 4.5, Zt + 3, 8, false); sign(g, 'GAS 24H', '#c8261c', '#ffffff', 3.6, 1.6, 16, 8.4, Zt + 3.12);
  // tanque de agua, postes, cactus, rocas y mesetas lejanas
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) cyl(g, 0.12, 0.15, 8, mat('woodPole', { color: 0x5a4130 }), s * (14 + i * 22), 4, Zt - 24, 6, false);
  cyl(g, 3, 3, 4, mat('wtank', { color: 0x9aa3ab, metalness: 0.5, roughness: 0.4 }), -26, 11, Zt - 14, 16, false);
  for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(g, 0.15, 0.15, 9, mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 }), -26 + s * 2, 4.5, Zt - 14 + t * 2, 6, false);
  const cac = mat('cactus', { color: 0x4c7a3a, roughness: 0.9 });
  for (let i = 0; i < 26; i++) {
    const cx = (rand() - 0.5) * 220, cz = Zt + (rand() - 0.5) * 160;
    if (Math.abs(cx) < 26 && cz > Zt - 26 && cz < Zt + 70) continue;
    const h = 2 + rand() * 3; cyl(g, 0.3, 0.35, h, cac, cx, h / 2, cz, 8, true);
    if (rand() < 0.7) { const a = cyl(g, 0.2, 0.2, 1.4, cac, cx + 0.6, h * 0.6, cz, 8, true); a.rotation.z = 0.2; }
  }
  const rockM = mat('rock', { color: 0xa0704a, roughness: 1, flatShading: true });
  for (let i = 0; i < 30; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rand() * 1.4, 0), rockM); r.position.set((rand() - 0.5) * 260, 0.2, Zt + (rand() - 0.5) * 200); if (Math.abs(r.position.x) < 24 && r.position.z > Zt - 26 && r.position.z < Zt + 70) continue; addTo(g, r, true); }
  const mesa = mat('mesa', { color: 0xb5643a, roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(40 + rand() * 50, 70 + rand() * 60, 50 + rand() * 70, 7), mesa); m.position.set(-700 + i * 170 + rand() * 60, 20, Zt - 520 - rand() * 300); g.add(m); }
  car(g, -30, Zt + 16, Math.PI / 2, 0xd9dcdf, 'truck', false);
  car(g, 12, Zt - 9, Math.PI / 2 + 0.2, CAR_COLORS[Math.floor(rand() * 8)], 'car');
  lay.civPaths.push(
    { a: [-22, Zt - 1.6], b: [22, Zt - 1.6] }, { a: [20, Zt + 4.5], b: [-20, Zt + 4.5] }, { a: [-18, Zt + 8], b: [18, Zt + 8] },
    { a: [-12, Zt - 9.5], b: [12, Zt - 9.5] }, { a: [14, Zt + 0.9], b: [-14, Zt + 0.9] }, { a: [-16, Zt + 11], b: [16, Zt + 3] },
  );
}

// Cosas altas que tapan al secuestrador en los niveles "se cubre".
function coverPiece(g, map, x, z, i, rand, night) {
  if (map === 'puerto') { container(g, x, 0, z, Math.PI / 2, CONT_COLORS[(i * 3 + 1) % 9], true); return; }
  const col = map === 'desierto' ? [0xe8e2d4, 0x8a3324][i] : night ? 0xf2c200 : [0xf2f2f2, 0x2b62c9][i];
  car(g, x, z, Math.PI / 2, col, 'van', true);
}
