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
  W.pmrem = new THREE.PMREMGenerator(r);
  W.envs = {};
  applyQuality();
}

// Mapa de entorno para los reflejos (pintura, vidrios, metal, agua): cielo, sol y siluetas.
function makeEnv(map, S) {
  if (W.envs[map]) return W.envs[map];
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16), col = [], top = new THREE.Color(S.top), bot = new THREE.Color(S.bot), gr = new THREE.Color(S.hemiG).multiplyScalar(0.7), c = new THREE.Color();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 50; if (y < 0) c.copy(gr); else c.copy(bot).lerp(top, Math.pow(y, 0.6)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  if (map !== 'noche') { const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(S.sun).multiplyScalar(25) })); sun.position.set(...S.dir).normalize().multiplyScalar(40); s.add(sun); }
  if (map !== 'desierto') {
    const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(S.hemiG).multiplyScalar(map === 'noche' ? 0.25 : 0.8) });
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc870).multiplyScalar(map === 'noche' ? 5 : 0) });
    for (let k = 0; k < 22; k++) {
      const a = k / 22 * Math.PI * 2, h = 6 + (k * 7 % 5) * 3, b = new THREE.Mesh(new THREE.BoxGeometry(9, h, 4), bm);
      b.position.set(Math.cos(a) * 38, h / 2 - 2, Math.sin(a) * 38); b.lookAt(0, h / 2 - 2, 0); s.add(b);
      if (map === 'noche') for (let q = 0; q < 3; q++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), lm); l.position.copy(b.position).multiplyScalar(0.94); l.position.y = 1 + q * 2.4; l.position.x += (q - 1) * 2; l.lookAt(0, l.position.y, 0); s.add(l); }
    }
  }
  const env = W.pmrem.fromScene(s, 0.03).texture;
  return (W.envs[map] = env);
}
const POST_LOOK = {
  dia: { bloom: 0.3, threshold: 1.0, vignette: 0.26, sat: 1.12, tint: [1.02, 1.0, 0.97] },
  puerto: { bloom: 0.35, threshold: 0.95, vignette: 0.28, sat: 1.08, tint: [0.98, 1.0, 1.03] },
  noche: { bloom: 1.0, threshold: 0.5, vignette: 0.4, sat: 1.15, tint: [0.88, 0.96, 1.12] },
  desierto: { bloom: 0.4, threshold: 0.95, vignette: 0.3, sat: 1.1, tint: [1.08, 1.0, 0.9] },
};

function applyQuality() {
  const hi = save.opt.quality !== 'baja';
  W.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1));
  W.renderer.shadowMap.enabled = hi;
  if (hi && !POST.qscene) initPost(); else if (POST.qscene) { POST.on = hi; resizePost(); }
  W.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  W.sun.castShadow = hi;
  W.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
}

function resizeWorld() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  for (const c of [W.camera, W.cine]) { c.aspect = w / h; c.updateProjectionMatrix(); }
  resizePost();
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
  T.sand = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#e0c49a'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.14, 12000); for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(120,80,40,.08)'; x.lineWidth = 2; const yy = Math.random() * h; x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy - 6, w * 0.6, yy + 6, w, yy); x.stroke(); } });
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

function building(g, x, z, w, h, d, night, rand, face = null) {
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
  if (face) facadeDetail(g, x, z, w, h, d, face, night, rand);
  return me;
}

// Detalle de la fachada que mira a la cámara: cornisas por piso, balcones con baranda y la
// planta baja con vitrinas, marcos y toldos. Todo junto en una sola malla por edificio.
function facadeDetail(g, x, z, w, h, d, face, night, rand) {
  // marco local de la fachada: a lo largo (ax), hacia afuera (nx)
  const alongX = face === 'z';
  const fw = alongX ? w : d, out = alongX ? d / 2 : w / 2, sgn = face === '-x' ? -1 : 1;
  const parts = [], wall = night ? 0x2e2e36 : [0xe9e2d4, 0xd8cfbf, 0xc9c3b8][Math.floor(rand() * 3)];
  const P = (bw, bh, bd, u, y, o, c) => {
    // u: posición a lo largo de la fachada (0 = borde izquierdo mirando la fachada), o: hacia afuera
    const lx = -fw / 2 + u;
    const m = new THREE.Matrix4();
    if (alongX) m.makeTranslation(x + lx, y, z + out + o);
    else { m.makeRotationY(sgn * Math.PI / 2); m.setPosition(x + sgn * (out + o), y, z - sgn * lx); }
    parts.push({ geo: new THREE.BoxGeometry(bw, bh, bd), m, c });
  };
  const floors = Math.floor(h / 3.5);
  for (let k = 1; k < floors; k++) P(fw + 0.1, 0.16, 0.18, fw / 2, k * 3.5, 0.06, wall);
  // planta baja: vitrina oscura con marco y un toldo de color
  const shop = rand() < 0.75;
  if (shop) {
    P(fw - 0.6, 2.6, 0.05, fw / 2, 1.55, 0.03, night ? 0x2a3242 : 0x1b2633);
    for (let u = 0.3; u < fw; u += 3) P(0.16, 2.9, 0.12, u, 1.45, 0.06, 0x2a2a2a);
    P(fw - 0.4, 0.22, 0.14, fw / 2, 2.95, 0.07, 0x2a2a2a);
    const aw = [0xc0392b, 0x1f6fb2, 0x2e8b57, 0xe0a020, 0x6a3d9a][Math.floor(rand() * 5)];
    for (let i = 0; i < 6; i++) P(fw - 0.8, 0.06, 0.32, fw / 2, 3.45 - i * 0.07, 0.25 + i * 0.3, i % 2 ? aw : 0xf2efe8);
  }
  // balcones en algunas ventanas
  const cols = Math.floor(fw / 4);
  for (let k = 1; k < floors - 1; k++) for (let c = 0; c < cols; c++) {
    if (rand() > 0.28) continue;
    const u = c * 4 + 2, y = k * 3.5 + 0.72;
    P(2.9, 0.14, 0.95, u, y, 0.47, wall);
    P(2.9, 0.06, 0.06, u, y + 1.0, 0.92, 0x2b2d31);
    P(0.06, 1.0, 0.95, u - 1.42, y + 0.5, 0.47, 0x2b2d31); P(0.06, 1.0, 0.95, u + 1.42, y + 0.5, 0.47, 0x2b2d31);
    for (let q = -1.2; q <= 1.25; q += 0.3) P(0.025, 0.95, 0.025, u + q, y + 0.5, 0.92, 0x2b2d31);
    if (rand() < 0.4) P(0.5, 0.35, 0.3, u + 0.8, y + 0.25, 0.4, 0xb4552f); // maceta
  }
  // aire acondicionado colgado en la fachada
  for (let i = 0; i < Math.floor(fw / 8); i++) if (rand() < 0.5) P(0.8, 0.55, 0.45, 1 + rand() * (fw - 2), 3.5 * (1 + Math.floor(rand() * (floors - 1))) + 0.4, 0.25, 0xd5d7da);
  if (!parts.length) return;
  W.detailMat = W.detailMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 });
  const me = new THREE.Mesh(mergeGeos(parts), W.detailMat);
  me.castShadow = true; me.receiveShadow = true;
  g.add(me); me.userData.solid = true; W.solids.push(me);
}

// Árbol en una sola malla: tronco con ramas y copa de varias bolas con tonos de verde distintos
// (o pino de conos). Se deforman un poco los vértices para que no se vean perfectos.
function tree(g, x, z, s = 1, kind = 'round') {
  const R = rng(Math.floor(x * 131 + z * 71));
  const parts = [], bark = 0x5b4330;
  const M = (geo, px, py, pz, c, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
    parts.push({ geo, m, c });
  };
  const leafG = W.tex.leafG || (W.tex.leafG = (() => { const g2 = new THREE.IcosahedronGeometry(1, 2); const p = g2.attributes.position; for (let k = 0; k < p.count; k++) { const f = 1 + (Math.sin(p.getX(k) * 7.1) + Math.cos(p.getZ(k) * 6.3) + Math.sin(p.getY(k) * 5.7)) * 0.06; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f, p.getZ(k) * f); } g2.computeVertexNormals(); return g2; })());
  const trunkG = W.tex.trunkG || (W.tex.trunkG = new THREE.CylinderGeometry(0.6, 1, 1, 8));
  const coneG = W.tex.coneG || (W.tex.coneG = new THREE.ConeGeometry(1, 1, 10));
  const greens = kind === 'pine' ? [0x2f5a2c, 0x35663a, 0x284f2a] : [0x3f7a2e, 0x4b8a34, 0x356b28, 0x5a9a3c, 0x447f30];
  if (kind === 'pine') {
    M(trunkG, 0, 1.0 * s, 0, bark, 0.18 * s, 2 * s, 0.18 * s);
    for (let k = 0; k < 4; k++) M(coneG, 0, (2.2 + k * 1.1) * s, 0, greens[k % 3], (1.9 - k * 0.38) * s, 2.0 * s, (1.9 - k * 0.38) * s);
  } else {
    const th = kind === 'tall' ? 4.2 : 2.6;
    M(trunkG, 0, th / 2 * s, 0, bark, 0.16 * s, th * s, 0.16 * s);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); M(trunkG, Math.cos(a) * 0.35 * s, (th - 0.2) * s, Math.sin(a) * 0.35 * s, bark, 0.06 * s, 1.1 * s, 0.06 * s, Math.sin(a) * 0.7, -Math.cos(a) * 0.7); }
    const n = kind === 'tall' ? 5 : 7;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + R(), r = k === 0 ? 0 : (0.7 + R() * 0.5) * s, sz = (k === 0 ? 1.5 : 1.0 + R() * 0.4) * s * (kind === 'tall' ? 0.8 : 1);
      M(leafG, Math.cos(a) * r, (th + 0.9 + (k === 0 ? 0.6 : R() * 0.9)) * s, Math.sin(a) * r, greens[Math.floor(R() * greens.length)], sz, sz * 0.9, sz);
    }
  }
  const mat2 = W.treeMat || (W.treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }));
  const me = new THREE.Mesh(mergeGeos(parts), mat2);
  me.position.set(x, 0, z); me.castShadow = true; me.receiveShadow = true;
  g.add(me); me.userData.solid = true; W.solids.push(me);
  return me;
}
// Parque frente a la azotea: senderos, setos, pileta con agua y chorro, flores, bancas y faroles.
function park(g, Zt, night, rand) {
  const z0 = Zt + 30, z1 = -6;
  const path = (x0, za, x1, zb, w) => {
    const len = Math.hypot(x1 - x0, zb - za), me = new THREE.Mesh(planeTiled(w, len, 2, 2), MAT['parkPath'] || (MAT['parkPath'] = new THREE.MeshStandardMaterial({ map: W.tex.tiles, color: night ? 0x5a5650 : 0xc9bfae, roughness: 0.95 })));
    me.position.set((x0 + x1) / 2, 0.015, (za + zb) / 2); me.rotation.y = Math.atan2(x1 - x0, zb - za); me.receiveShadow = true; g.add(me);
  };
  // la pileta va al medio del parque; si hay poco espacio (tiros cortos) sólo árboles y flores
  const fz = (z0 + z1) / 2, big = z1 - z0 > 34;
  if (!big) {
    path(0, z1, 0, z0, 4);
    for (let k = 0; k < 8; k++) tree(g, (rand() < 0.5 ? -1 : 1) * (8 + rand() * 30), z0 + 4 + rand() * (z1 - z0 - 8), 0.9 + rand() * 0.3, rand() < 0.3 ? 'pine' : 'round');
    return [{ a: [-2.5, z0 + 2], b: [-2.5, z1 - 2] }];
  }
  path(0, z1, 0, fz + 7, 4); path(0, fz - 7, 0, z0, 4);
  path(-40, fz, -7, fz, 3); path(7, fz, 40, fz, 3);
  path(-30, z0 + 2, -6, fz - 5, 2.5); path(30, z0 + 2, 6, fz - 5, 2.5);
  // pileta: borde de piedra, agua animada, columna y chorro
  const stone = mat('stone', { color: night ? 0x6a6660 : 0xd2cbbd, roughness: 0.85 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6, 0.45, 10, 40), stone); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.45, fz); addTo(g, ring, false);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9, 40).rotateX(-Math.PI / 2), MAT['parkPath']); plaza.position.set(0, 0.012, fz); plaza.receiveShadow = true; g.add(plaza);
  const wtex = W.tex.water;
  const water = new THREE.Mesh(new THREE.CircleGeometry(5.8, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: wtex, color: 0x9fd0e8, roughness: 0.08, metalness: 0.3, envMapIntensity: 1.5 }));
  water.position.set(0, 0.55, fz); g.add(water);
  cyl(g, 0.5, 0.8, 2.2, stone, 0, 1.1, fz, 16, false);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.6, 0.5, 24), stone); bowl.position.set(0, 2.3, fz); addTo(g, bowl, false);
  const jetM = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.55, roughness: 0.05, emissive: night ? 0x335566 : 0x000000 });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 2.2, 10, 1, true), jetM); jet.position.set(0, 3.6, fz); g.add(jet);
  W.anim.push(dt => {
    wtex.offset.x += dt * 0.01;
    if (Math.random() < 0.6) FX.spawn(new THREE.Vector3(0, 4.6, fz), 0xe8f6ff, 1, 2.2, 1.0, 0.18, false, 0.2);
  });
  // setos, flores y bancas a los lados del sendero
  const hedge = mat('hedge', { color: 0x2f6a2a, roughness: 0.95, flatShading: true });
  const hedgeG = W.tex.hedgeG || (W.tex.hedgeG = new THREE.CapsuleGeometry(0.45, 1, 4, 8).rotateZ(Math.PI / 2));
  for (const sx of [-1, 1]) for (let zz = fz + 10; zz < z1 - 4; zz += 4.2) { const h = new THREE.Mesh(hedgeG, hedge); h.scale.set(1.6, 0.9, 0.9); h.position.set(sx * 3.2, 0.45, zz); addTo(g, h, true); }
  const flowers = [0xe8384f, 0xf4c430, 0xffffff, 0xb04fd0, 0xff7a3d];
  const fg = W.tex.flowerG || (W.tex.flowerG = new THREE.IcosahedronGeometry(0.16, 0));
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const cx = sx * (12 + k * 8), cz = fz + (rand() - 0.5) * 10;
    const bed = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 20), mat('soil', { color: 0x4a3626 })); bed.position.set(cx, 0.15, cz); addTo(g, bed, false);
    const parts = [];
    for (let q = 0; q < 40; q++) { const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 2; parts.push({ geo: fg, m: new THREE.Matrix4().makeTranslation(cx + Math.cos(a) * r, 0.42 + rand() * 0.1, cz + Math.sin(a) * r), c: flowers[Math.floor(rand() * flowers.length)] }); }
    const fm = new THREE.Mesh(mergeGeos(parts), W.treeMat); g.add(fm);
  }
  const bench = mat('bench', { color: 0x6b4a2b }), iron = mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 });
  for (const [bx, bz, ry] of [[-3, fz - 10, Math.PI / 2], [3, fz - 10, -Math.PI / 2], [-3, fz + 11, Math.PI / 2], [3, fz + 11, -Math.PI / 2], [-12, fz - 2.6, 0], [12, fz - 2.6, 0]]) {
    const b = new THREE.Group(); b.position.set(bx, 0, bz); b.rotation.y = ry; g.add(b);
    box(b, 1.9, 0.07, 0.48, bench, 0, 0.46, 0, false); box(b, 1.9, 0.42, 0.06, bench, 0, 0.76, -0.24, false);
    for (const lx of [-0.85, 0.85]) box(b, 0.06, 0.46, 0.5, iron, lx, 0.23, 0, false);
  }
  for (const [lx, lz] of [[-5, fz - 12], [5, fz - 12], [-5, fz + 12], [5, fz + 12], [-10, fz + 4], [10, fz + 4]]) lamp(g, lx, lz, night, false, 1);
  for (let k = 0; k < 10; k++) { const x = (rand() < 0.5 ? -1 : 1) * (8 + rand() * 40), z = z0 + 8 + rand() * (z1 - z0 - 14); if (Math.abs(z - fz) < 10 && Math.abs(x) < 12) continue; tree(g, x, z, 0.9 + rand() * 0.4, rand() < 0.3 ? 'pine' : rand() < 0.3 ? 'tall' : 'round'); }
  return [{ a: [-3.5, fz - 9], b: [-3.5, z0 + 3] }, { a: [3.5, z0 + 3], b: [3.5, fz + 12] }, { a: [-35, fz - 1.5], b: [-8, fz - 1.5] }, { a: [8, fz + 1.5], b: [35, fz + 1.5] }];
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
// Coloca un vehículo. kind: car (auto al azar), taxi, van, bus, truck (cisterna).
function car(g, x, z, rot, color, kind = 'car', thin = true) {
  let c;
  if (kind === 'bus') c = makeBus(color, { night: W.night });
  else if (kind === 'truck') c = makeTanker(color, { night: W.night });
  else if (kind === 'van') c = makeCar('van', color, { night: W.night });
  else if (kind === 'taxi') c = makeCar('sedan', 0xf2c200, { taxi: true, night: W.night });
  else c = makeCar(['sedan', 'hatch', 'sedan', 'sport', 'pickup', 'muscle'][Math.floor(Math.abs(Math.sin(x * 12.9 + z * 78.2)) * 6)], color, { night: W.night });
  c.position.set(x, 0, z); c.rotation.y = rot;
  g.add(c);
  c.traverse(o => { if (o.isMesh && !o.material.transparent) { o.userData.solid = true; o.userData.thin = thin; W.solids.push(o); } });
  return c;
}
// Tráfico que circula por la pista (de fondo): da vida a la ciudad y al desierto.
function traffic(g, lanes, n, rand, night) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const ln = lanes[i % lanes.length];
    const kind = rand() < 0.12 ? 'bus' : night && rand() < 0.4 ? 'taxi' : rand() < 0.15 ? 'van' : 'car';
    const c = car(g, ln.x0 + rand() * (ln.x1 - ln.x0), ln.z, ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2, CAR_COLORS[Math.floor(rand() * 8)], kind, true);
    cars.push({ c, ln, v: (ln.v || 9) * (0.8 + rand() * 0.4) });
  }
  W.anim.push(dt => {
    for (const k of cars) {
      k.c.position.x += k.ln.dir * k.v * dt;
      if (k.ln.dir > 0 && k.c.position.x > k.ln.x1) k.c.position.x = k.ln.x0;
      if (k.ln.dir < 0 && k.c.position.x < k.ln.x0) k.c.position.x = k.ln.x1;
      const w = k.c.userData.wheels; if (w) for (const wh of w) wh.children[0].rotation.x += k.v * dt / k.c.userData.r;
    }
  });
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
// Rifle de cerrojo: culata y guardamanos de un solo perfil lateral extruido con bisel (bordes
// redondos), cajón y cañón metálicos con estrías, mira torneada (campanas, torretas, anillos y
// lente), cerrojo, cargador, gatillo y bípode plegado. El cañón apunta a -Z.
function makeRifle(w) {
  const g = new THREE.Group();
  const poly = new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.62, metalness: 0.1, map: W.tex.polymer || (W.tex.polymer = canvasTex(128, 128, (x, cw, ch) => { x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, cw, ch); noise(x, cw, ch, 0.12, 5000); })) });
  const metal = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.32, metalness: 0.9, envMapIntensity: 1.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.6 });
  const rub = new THREE.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.95 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1b3d63, roughness: 0.02, metalness: 0.2, clearcoat: 1, envMapIntensity: 2, emissive: 0x06121e });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.castShadow = true; g.add(me); return me; };
  const tubeZ = (r1, r2, l, seg = 20) => new THREE.CylinderGeometry(r1, r2, l, seg).rotateX(Math.PI / 2);
  // culata + empuñadura + guardamanos (perfil en z, y)
  const sh = new THREE.Shape(), P = [
    [0.62, 0.035], [0.62, -0.115], [0.5, -0.1], [0.3, -0.07], [0.22, -0.06], [0.2, -0.075], [0.165, -0.18], [0.12, -0.17], [0.13, -0.08],
    [0.06, -0.05], [-0.1, -0.045], [-0.5, -0.04], [-0.56, -0.025], [-0.56, 0.012], [-0.12, 0.016], [0.13, 0.016], [0.26, 0.03], [0.34, 0.058], [0.56, 0.06],
  ];
  sh.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) sh.lineTo(P[i][0], P[i][1]); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(0.23, -0.035); hole.lineTo(0.31, -0.045); hole.quadraticCurveTo(0.34, -0.02, 0.31, 0.02); hole.lineTo(0.27, 0.02); hole.quadraticCurveTo(0.23, 0.0, 0.23, -0.035);
  sh.holes.push(hole);
  const stock = new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 8 });
  stock.translate(0, 0, -0.016); stock.rotateY(-Math.PI / 2);
  add(stock, poly, 0, 0, 0);
  add(new THREE.BoxGeometry(0.06, 0.15, 0.025), rub, 0, -0.04, 0.635);
  add(new THREE.BoxGeometry(0.045, 0.02, 0.2), dark, 0, 0.075, 0.45); // carrillera
  // cajón, cerrojo y cargador
  add(tubeZ(0.022, 0.022, 0.3, 24), metal, 0, 0.032, 0.03);
  add(new THREE.BoxGeometry(0.03, 0.012, 0.32), metal, 0, 0.058, 0.03); // riel
  for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.034, 0.006, 0.012), dark, 0, 0.067, -0.09 + i * 0.03);
  add(tubeZ(0.009, 0.009, 0.07, 10), metal, 0.03, 0.035, 0.13, 0, 0, 0).rotation.set(0, Math.PI / 2, 0);
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 8), metal, 0.05, 0.02, 0.135, 0, 0, Math.PI / 2.6);
  add(new THREE.SphereGeometry(0.012, 12, 10), dark, 0.07, 0.004, 0.135);
  add(new THREE.BoxGeometry(0.036, 0.075, 0.09), dark, 0, -0.07, -0.02, -0.1, 0, 0);
  add(new THREE.TorusGeometry(0.03, 0.004, 6, 16, Math.PI), dark, 0, -0.05, 0.1, 0, Math.PI / 2, Math.PI);
  add(new THREE.BoxGeometry(0.006, 0.03, 0.008), metal, 0, -0.06, 0.1, 0.4, 0, 0);
  // cañón con estrías y boca (silenciador o freno según el arma)
  const bl = w.id === 'titan' ? 0.72 : 0.6;
  add(tubeZ(0.012, 0.016, bl, 20), metal, 0, 0.032, -0.12 - bl / 2);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(new THREE.BoxGeometry(0.003, 0.003, bl * 0.6), dark, Math.cos(a) * 0.0135, 0.032 + Math.sin(a) * 0.0135, -0.2 - bl * 0.3); }
  let tip = -0.12 - bl;
  if (w.extra === 'silencio') { add(tubeZ(0.026, 0.026, 0.24, 24), dark, 0, 0.032, tip - 0.11); for (let k = 0; k < 4; k++) add(tubeZ(0.0265, 0.0265, 0.006, 24), metal, 0, 0.032, tip - 0.02 - k * 0.06); tip -= 0.23; }
  else if (w.extra === 'penetra') { const mb = add(new THREE.BoxGeometry(0.05, 0.034, 0.1), metal, 0, 0.032, tip - 0.045); for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.004, 0.022, 0.012), dark, sx * 0.026, 0.032, tip - 0.015 - k * 0.03); void mb; tip -= 0.1; }
  else { add(tubeZ(0.018, 0.016, 0.05, 16), metal, 0, 0.032, tip - 0.025); tip -= 0.05; }
  // mira: perfil torneado (campana delantera, tubo, ocular)
  const prof = [[0.0, -0.2], [0.033, -0.2], [0.034, -0.185], [0.031, -0.14], [0.018, -0.11], [0.017, 0.1], [0.024, 0.15], [0.026, 0.19], [0.0, 0.19]];
  const scope = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32); scope.rotateX(-Math.PI / 2);
  const sy = w.extra === 'termica' ? 0.11 : 0.1;
  add(scope, metal, 0, sy, 0.03);
  const lens = new THREE.CircleGeometry(0.03, 24); add(lens, glass, 0, sy, 0.03 - 0.2 - 0.001, 0, Math.PI, 0);
  add(new THREE.CircleGeometry(0.022, 20), glass, 0, sy, 0.03 + 0.191);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 16), metal, 0, sy + 0.028, 0.0);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 16), metal, 0.028, sy, 0.0, 0, 0, Math.PI / 2);
  for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.002, 0.03, 0.006), dark, Math.cos(k) * 0.0125, sy + 0.028, Math.sin(k) * 0.0125);
  for (const rz of [-0.06, 0.09]) { add(new THREE.TorusGeometry(0.019, 0.005, 8, 20), dark, 0, sy, 0.03 + rz); add(new THREE.BoxGeometry(0.03, sy - 0.06, 0.02), dark, 0, (sy + 0.06) / 2 - 0.0, 0.03 + rz); }
  if (w.extra === 'termica') { add(new THREE.BoxGeometry(0.05, 0.035, 0.1), dark, 0, sy + 0.04, 0.02); add(new THREE.CircleGeometry(0.012, 16), new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0xff3322, emissiveIntensity: 1.5 }), 0.026, sy + 0.04, 0.0, 0, Math.PI / 2, 0); }
  // bípode plegado bajo el guardamanos
  add(new THREE.BoxGeometry(0.04, 0.02, 0.03), dark, 0, -0.055, -0.46);
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.2, 8), metal, sx * 0.016, -0.065, -0.36, Math.PI / 2, 0, 0);
  for (const zz of [0.52, -0.5]) add(new THREE.TorusGeometry(0.008, 0.002, 4, 8), metal, 0.03, -0.06, zz, 0, Math.PI / 2, 0);
  g.userData.tipZ = tip;
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
    dia: { top: 0x3f8ae0, bot: 0xd4e8ff, sun: 0xfff2dc, sunI: 2.3, hemiS: 0xcfe4ff, hemiG: 0x6d5f4c, hemiI: 1.05, fog: 0xc8dcf0, near: 160, far: 900, exp: 1.0, dir: [0.5, 0.7, 0.25], stars: 0 },
    puerto: { top: 0x3f7cc0, bot: 0xd6dfe6, sun: 0xffe2b8, sunI: 2.5, hemiS: 0xc9dbee, hemiG: 0x55595e, hemiI: 0.75, fog: 0xbfcad4, near: 260, far: 1500, exp: 0.86, dir: [-0.6, 0.45, 0.2], stars: 0 },
    noche: { top: 0x050a1c, bot: 0x1c2140, sun: 0x8fa6ff, sunI: 0.35, hemiS: 0x3a4a8a, hemiG: 0x15131c, hemiI: 0.5, fog: 0x0b0f1f, near: 60, far: 520, exp: 1.25, dir: [-0.3, 0.8, 0.3], stars: 1 },
    desierto: { top: 0x2f78d0, bot: 0xeccfa0, sun: 0xffe6c0, sunI: 2.9, hemiS: 0xffe2bd, hemiG: 0x8a5a30, hemiI: 0.8, fog: 0xdcc199, near: 420, far: 2400, exp: 0.84, dir: [0.4, 0.62, -0.5], stars: 0 },
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
  W.scene.environment = makeEnv(map + (L.n === 29 ? 't' : ''), S);
  setPostLook(POST_LOOK[map]);
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
  const wm = mat('perch' + map, { color: wall, roughness: 0.9, map: W.tex.concrete });
  box(g, 16, H - 1.8, 12, wm, 0, (H - 1.8) / 2, 4, false);
  box(g, 16, 0.4, 0.35, wm, 0, H - 1.6, -1.9, false);
  box(g, 16.2, 0.1, 0.5, mat('perchCap', { color: 0xd6d0c4 }), 0, H - 1.35, -1.9, false);
  box(g, 2.2, 1.4, 1.6, mat('ac', { color: 0x9a9da3, metalness: 0.4, roughness: 0.5 }), -6, H - 1.1, 1.5, false);
  cyl(g, 0.04, 0.04, 6, mat('pole', { color: 0x2d3036, metalness: 0.6, roughness: 0.45 }), 6.5, H + 1.8, 2, 6, false);
}

function city(g, L, lay, rand, night) {
  const Zt = lay.Zt;
  ground(g, W.tex.grass, 600, 600, 0, Zt + 60, 8, -0.02, true, night ? 0x3a4a3a : 0xffffff);
  ground(g, W.tex.tiles, 140, 38, 0, Zt + 14, 4, 0, true, night ? 0x6a6670 : 0xd6d0c6);   // plaza
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
    building(g, x + w / 2, Zt - 24 - d / 2, w, h, d, night, rand, Math.abs(x) < 110 ? 'z' : null);
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
    while (z > Zt + 18) { const d = 14 + rand() * 8, w = 16 + rand() * 6, h = 12 + rand() * 22; building(g, s * (34 + w / 2 + rand() * 4), z - d / 2, w, h, d, night, rand, s < 0 ? 'x' : '-x'); z -= d + 1; }
  }
  // árboles, bancas y postes en la plaza (fuera de la línea de tiro)
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) tree(g, s * (16 + i * 9 + rand() * 3), Zt + 12 + rand() * 18, 0.9 + rand() * 0.3, i % 3 === 2 ? 'tall' : 'round');
  lay.parkPaths = park(g, Zt, night, rand);
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
  traffic(g, [{ z: Zt - 9.2, dir: 1, x0: -170, x1: 170, v: 9 }, { z: Zt - 14.8, dir: -1, x0: -170, x1: 170, v: 8 }], 9, rand, night);
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
    const wm = MAT['shed'] || (MAT['shed'] = new THREE.MeshStandardMaterial({ map: W.tex.container, color: 0x7f9bb3, roughness: 0.6, metalness: 0.35 }));
    const sh = new THREE.Mesh(tiledBox(30, 12, 40, 3, 12), wm); sh.position.set(s * 50, 6, Zt + 40); addTo(g, sh, false);
    const fx = s * 50 - s * 15.05;
    for (const dz of [-10, 8]) { const door = box(g, 0.1, 7, 8, mat('shedDoor', { color: 0x3a4048, roughness: 0.6, metalness: 0.4 }), fx, 3.5, Zt + 40 + dz, false); door.material.map = W.tex.container; }
    sign(g, s < 0 ? 'ALMACÉN 3' : 'ALMACÉN 4', '#0b3d66', '#ffffff', 8, 1.6, fx - s * 0.06, 9.5, Zt + 40, s < 0 ? Math.PI / 2 : -Math.PI / 2);
    box(g, 30.4, 0.4, 0.4, mat('crane', { color: 0xe8862a }), s * 50, 12.1, Zt + 20.1, false);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 40, 16, 1, false, 0, Math.PI), wm);
    roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.scale.set(1, 1, 0.35); roof.position.set(s * 50, 12, Zt + 40); g.add(roof);
  }
  // líneas pintadas en el piso y más pilas de contenedores a los costados de la cámara
  stripes(g, -60, 60, Zt + 5.5, 0xf2c200, 2.5, 1.5, 0.22, 0.03); stripes(g, -60, 60, Zt - 3.5, 0xf2c200, 2.5, 1.5, 0.22, 0.03);
  for (let x = -28; x <= 28; x += 7) { const me = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 8).rotateX(-Math.PI / 2), mat('stripe' + 0xf2f2f2, { color: 0xf2f2f2 })); me.position.set(x, 0.03, Zt + 12); g.add(me); }
  for (const sx of [-1, 1]) for (let zz = Zt + 30; zz < -8; zz += 7) for (let j = 0; j < 2; j++) {
    const n = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) container(g, sx * (22 + j * 2.6 + rand() * 0.3), k * 2.6, zz, 0, CONT_COLORS[Math.floor(rand() * 9)], false);
  }
  car(g, 10, Zt + 18, 0.3, 0x1f4f8a, 'truck', true); car(g, -12, Zt + 22, -0.2, 0xc8261c, 'van', true);
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
  const col = [], cA = new THREE.Color(0xe6cfa6), cB = new THREE.Color(0xc4a27a), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const n = geo.attributes.normal.getY(i), h = pos.getY(i); cc.copy(cA).lerp(cB, Math.min(1, (1 - n) * 6 + Math.max(0, -Math.sin(pos.getX(i) * 0.03)) * 0.15)); cc.offsetHSL(0, 0, h * 0.004); col.push(cc.r, cc.g, cc.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const sand = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: W.tex.sand, roughness: 1, vertexColors: true }));
  sand.position.z = Zt + 200; sand.receiveShadow = true; g.add(sand);
  sand.userData.solid = true; W.solids.push(sand);
  // arbustos secos y rocas cerca del cerro, y un camino de tierra hasta la gasolinera
  const shrubG = new THREE.IcosahedronGeometry(0.5, 1), shrubs = [], rocksP = [];
  for (let k = 0; k < 120; k++) {
    const x = (rand() - 0.5) * 140, z = Zt + 26 + rand() * (-Zt - 20);
    if (Math.abs(x) < 4) continue;
    const sc = 0.4 + rand() * 0.9;
    shrubs.push({ geo: shrubG, m: new THREE.Matrix4().compose(new THREE.Vector3(x, sc * 0.3, z), new THREE.Quaternion(), new THREE.Vector3(sc * 1.3, sc * 0.7, sc * 1.3)), c: [0x7a7a3e, 0x6b6a34, 0x8a7b48, 0x5f6b38][Math.floor(rand() * 4)] });
    if (rand() < 0.3) rocksP.push({ geo: shrubG, m: new THREE.Matrix4().compose(new THREE.Vector3(x + 2, 0.1, z + 1), new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(), rand(), rand())), new THREE.Vector3(sc, sc * 0.6, sc * 0.8)), c: [0x9a6a44, 0x8a5c3a, 0xa87850][Math.floor(rand() * 3)] });
  }
  W.treeMat = W.treeMat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  const sh1 = new THREE.Mesh(mergeGeos(shrubs.concat(rocksP)), W.treeMat); sh1.castShadow = true; sh1.receiveShadow = true; g.add(sh1);
  const dirt = new THREE.Mesh(planeTiled(5, -Zt - 10, 4, 4), new THREE.MeshStandardMaterial({ map: W.tex.sand, color: 0xcdb08a, roughness: 1, transparent: true, opacity: 0.7 }));
  dirt.position.set(0, 0.02, Zt / 2 + 6); dirt.receiveShadow = true; g.add(dirt);
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
  car(g, -30, Zt + 23, Math.PI / 2, 0xc8261c, 'truck', false);
  car(g, 12, Zt - 9, Math.PI / 2 + 0.2, CAR_COLORS[Math.floor(rand() * 8)], 'car');
  car(g, -8, Zt - 9.5, Math.PI / 2 - 0.15, CAR_COLORS[Math.floor(rand() * 8)], 'car');
  traffic(g, [{ z: Zt + 13.8, dir: 1, x0: -400, x1: 400, v: 18 }, { z: Zt + 18.2, dir: -1, x0: -400, x1: 400, v: 16 }], 4, rand, false);
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
