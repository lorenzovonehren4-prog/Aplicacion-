'use strict';
// Código Rojo: todo lo que se dibuja. Cielo y hora del día, calles con sus líneas, veredas,
// casas, tiendas, parque, grifo, colegio, canal con puentes, cerro con túnel, rampas,
// semáforos, postes, árboles, paredes rojas del borde, bolsas, guarida y efectos.

const W = { anim: [], t: 0, lodHooks: [] };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function noiseFill(g, w, h, base, spread, n) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * spread; g.fillStyle = `rgba(${v > 0 ? '255,255,255' : '0,0,0'},${Math.abs(v)})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}

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
const M4 = () => new THREE.Matrix4();
const boxAt = (w, h, d, x, y, z, ry = 0) => ({ geo: new THREE.BoxGeometry(w, h, d), m: M4().makeRotationY(ry).setPosition(x, y, z) });

// ---------- sólo para la sombra ----------
// Copias livianas que sólo se dibujan en el pase de sombras: están ocultas y se muestran
// mientras el renderer arma el mapa de sombras (hookShadowPass). userData.shadowOn = false las
// deja fuera también de ese pase.
const SHADOW_ONLY = new Set();
function shadowOnly(o) { o.visible = false; o.castShadow = true; o.receiveShadow = false; SHADOW_ONLY.add(o); return o; }
function hookShadowPass(r) {
  const sm = r.shadowMap, render = sm.render;
  sm.render = function (lights, scene, camera) {
    for (const o of SHADOW_ONLY) o.visible = o.userData.shadowOn !== false;
    try { render.call(this, lights, scene, camera); } finally { for (const o of SHADOW_ONLY) o.visible = false; }
  };
}

// ---------- sombras por sector ----------
// Lo fijo del barrio se dibuja con pocas mallas grandes (pocas llamadas de dibujo), pero esas
// mallas no proyectan sombra: para el mapa de sombras hay una copia partida en sectores de 90 m
// (una manzana), sólo con posiciones (shadowOnly). Así el pase de sombras sólo dibuja los
// sectores cerca del jugador, con una llamada por sector.
// Para que algo nuevo y fijo proyecte sombra: shadowCast(geo[, matriz]).
const SECTOR = 90;
const SHADOW = { tris: new Map(), meshes: [] };
const sectorKey = (x, z) => Math.floor((x + 270) / SECTOR) * 100 + Math.floor((z + 270) / SECTOR);
function shadowCast(geo, mtx) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, v = new THREE.Vector3(), t = new Array(9);
  for (let i = 0; i + 2 < p.count; i += 3) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(p, i + k); if (mtx) v.applyMatrix4(mtx);
      t[k * 3] = v.x; t[k * 3 + 1] = v.y; t[k * 3 + 2] = v.z;
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z);
    }
    // los triángulos enormes (muros del canal) van aparte para no agrandar un sector
    const key = x1 - x0 > SECTOR || z1 - z0 > SECTOR ? 'grande' : sectorKey((x0 + x1) / 2, (z0 + z1) / 2);
    let arr = SHADOW.tris.get(key);
    if (!arr) SHADOW.tris.set(key, arr = []);
    for (let k = 0; k < 9; k++) arr.push(t[k]);
  }
}
function buildShadowSectors(G) {
  const mat = new THREE.MeshBasicMaterial();
  for (const [key, arr] of SHADOW.tris) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const m = shadowOnly(new THREE.Mesh(geo, mat));
    m.matrixAutoUpdate = false; m.userData.sector = key;
    G.add(m); SHADOW.meshes.push(m);
  }
  SHADOW.tris.clear();
}

// ---------- objetos repetidos con nivel de detalle ----------
// Carros estacionados, árboles, arbustos y buzones. Cada nivel de detalle es un InstancedMesh y en
// cada cuadro (updateLods) las instancias se reparten según la distancia a la cámara: cerca el
// modelo completo, más lejos uno liviano y, pasado el último nivel, nada. Las que quedan fuera de
// la vista se descartan una por una. La sombra va aparte: un InstancedMesh sólo para la sombra
// (shadowOnly) con un modelo liviano y sólo las instancias que caen en el recorte de la sombra.
// items: [{ x, y, z, m: Matrix4, c?: Color, s?: escala del radio }]
// levels: [{ geo, mat, far }]; opts: { shadow: geo para la sombra }
const LODS = [];
function lodSet(G, items, levels, opts = {}) {
  const n = items.length;
  if (!n) return null;
  const set = { items, n, mats: new Float32Array(n * 16), cols: items[0].c ? new Float32Array(n * 3) : null, levels: [] };
  items.forEach((it, i) => { it.m.toArray(set.mats, i * 16); if (set.cols) it.c.toArray(set.cols, i * 3); it.s = it.s || 1; });
  const mk = (geo, mat, far) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (set.cols) { mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage); }
    mesh.frustumCulled = false; mesh.receiveShadow = true;
    mesh.count = 0; mesh.visible = false;
    G.add(mesh);
    geo.computeBoundingSphere();
    const bs = geo.boundingSphere;
    return { mesh, far2: far * far, r: bs.radius + bs.center.length(), cy: bs.center.y, idx: new Int32Array(n), cnt: 0 };
  };
  for (const L of levels) set.levels.push(mk(L.geo, L.mat, L.far));
  if (opts.shadow) {
    set.shadow = mk(opts.shadow, levels[0].mat, Infinity);
    shadowOnly(set.shadow.mesh).userData.shadowOn = false; set.shadow.only = true;
  }
  LODS.push(set);
  return set;
}
const _frus = new THREE.Frustum(), _pv = new THREE.Matrix4(), _sph = new THREE.Sphere(), _lc = new THREE.Vector3();
function lodFill(set, L) {
  if (!L.changed && L.cnt === L.prev) return;
  const mesh = L.mesh, ma = mesh.instanceMatrix.array, ca = mesh.instanceColor && mesh.instanceColor.array;
  for (let j = 0; j < L.cnt; j++) {
    const i = L.idx[j];
    for (let e = 0; e < 16; e++) ma[j * 16 + e] = set.mats[i * 16 + e];
    if (ca) { ca[j * 3] = set.cols[i * 3]; ca[j * 3 + 1] = set.cols[i * 3 + 1]; ca[j * 3 + 2] = set.cols[i * 3 + 2]; }
  }
  mesh.count = L.cnt;
  if (L.only) mesh.userData.shadowOn = L.cnt > 0; else mesh.visible = L.cnt > 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (ca) mesh.instanceColor.needsUpdate = true;
}
function updateLods(cam) {
  cam.updateWorldMatrix(true, false);
  _pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _frus.setFromProjectionMatrix(_pv);
  _lc.setFromMatrixPosition(cam.matrixWorld);
  const cx = _lc.x, cz = _lc.z, sun = W.sun, sh = W.renderer.shadowMap.enabled && sun.castShadow;
  let sf = null;
  if (sh) { sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.updateMatrices(sun); sf = sun.shadow.getFrustum(); }
  for (const f of W.lodHooks) f(_lc);
  for (const set of LODS) {
    const lv = set.levels, nl = lv.length, S = set.shadow;
    for (const L of lv) { L.prev = L.cnt; L.cnt = 0; L.changed = false; }
    if (S) { S.prev = S.cnt; S.cnt = 0; S.changed = false; }
    for (let i = 0; i < set.n; i++) {
      const it = set.items[i];
      if (sf && S) {
        _sph.center.set(it.x, it.y + S.cy * it.s, it.z); _sph.radius = S.r * it.s;
        if (sf.intersectsSphere(_sph)) { if (S.idx[S.cnt] !== i) S.changed = true; S.idx[S.cnt++] = i; }
      }
      const dx = it.x - cx, dz = it.z - cz, d2 = dx * dx + dz * dz;
      let k = 0;
      while (k < nl && d2 > lv[k].far2) k++;
      if (k === nl) continue;
      const L = lv[k];
      _sph.center.set(it.x, it.y + L.cy * it.s, it.z); _sph.radius = L.r * it.s;
      if (!_frus.intersectsSphere(_sph)) continue;
      if (L.idx[L.cnt] !== i) L.changed = true;
      L.idx[L.cnt++] = i;
    }
    for (const L of lv) lodFill(set, L);
    if (S) lodFill(set, S);
  }
}

// ---------- hora del día ----------
const TIMES = {
  dia: { name: 'Día', skyTop: 0x4a8fd9, skyBot: 0xd3e7f4, sun: 0xfff2dc, sunI: 2.6, sunDir: [0.5, 0.75, 0.3], hemiSky: 0xd8ecff, hemiGround: 0x6a6450, hemiI: 1.1, fog: 0xc6d6e3, near: 220, far: 1700, exp: 1.0, win: 0.0, lamps: 0 },
  tarde: { name: 'Atardecer', skyTop: 0x34508f, skyBot: 0xffad72, sun: 0xffb27a, sunI: 2.1, sunDir: [-0.7, 0.28, -0.4], hemiSky: 0xffc9a8, hemiGround: 0x5a4a50, hemiI: 0.85, fog: 0xe0ab8e, near: 180, far: 1450, exp: 1.05, win: 0.5, lamps: 0.4 },
  noche: { name: 'Noche', skyTop: 0x04070f, skyBot: 0x16203a, sun: 0x9fb4ff, sunI: 0.35, sunDir: [0.3, 0.8, 0.2], hemiSky: 0x50609a, hemiGround: 0x14141c, hemiI: 0.38, fog: 0x0b1020, near: 60, far: 900, exp: 1.3, win: 1.0, lamps: 1 },
};

function initWorld(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.localClippingEnabled = true;
  W.renderer = r;
  hookShadowPass(r);
  W.pmrem = new THREE.PMREMGenerator(r);
  W.envs = {};
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 4000);
  W.scene.add(W.camera);
  W.skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;' +
      'void main(){ float h = clamp(vP.y * 1.5 + 0.1, 0.0, 1.0); vec3 c = mix(bot, top, pow(h, 0.65));' +
      'float sd = max(dot(normalize(vP), sunDir), 0.0); c += sunCol * (pow(sd, 500.0) * 1.5 + pow(sd, 10.0) * 0.2); gl_FragColor = vec4(c, 1.0); }',
  });
  W.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), W.skyMat);
  W.sky.frustumCulled = false; W.sky.renderOrder = -1;
  W.scene.add(W.sky);
  W.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  W.sun = new THREE.DirectionalLight(0xffffff, 2);
  W.sun.shadow.mapSize.set(2048, 2048);
  const sc = W.sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 300;
  W.sun.shadow.bias = -0.0005; W.sun.shadow.normalBias = 0.05;
  W.scene.add(W.hemi, W.sun, W.sun.target);
  W.sunDir = new THREE.Vector3(0.5, 0.75, 0.3).normalize();
  W.scene.fog = new THREE.Fog(0xffffff, 100, 900);
  W.stars = makeStars(); W.scene.add(W.stars);
  buildCityData();
  buildCityMeshes();
  fxInit();
  applyQuality();
}

// Niveles de gráficos (Opciones → Gráficos: Auto, Altos, Medios o Bajos). En save.opt.graficos va
// lo que eligió el jugador y en save.opt.quality se sigue guardando 'alta' o 'baja' como antes.
// Con Auto, save.opt.autoNivel es el nivel al que llegó (ver autoGfx en ui.js).
// pr: tope de resolución (pixelRatio), peds: personas en la calle, smoke/fire: partículas.
const GFX = {
  alta: { name: 'Altos', pr: 1.5, shadows: true, shadowSize: 2048, post: true, msaa: 4, bloom: [2, 4, 8], fxaa: false, peds: 14, smoke: 120, fire: 90 },
  media: { name: 'Medios', pr: 1, shadows: true, shadowSize: 1024, post: true, msaa: 0, bloom: [4, 8], fxaa: true, peds: 10, smoke: 80, fire: 60 },
  baja: { name: 'Bajos', pr: 1, shadows: false, post: false, peds: 6, smoke: 50, fire: 40 },
};
const GFX_ORDER = ['alta', 'media', 'baja'];
function gfxLevel() {
  if (save.opt.quality === 'baja') return 'baja';
  const g = save.opt.graficos;
  return g === 'media' || (g === 'auto' && save.opt.autoNivel === 'media') ? 'media' : 'alta';
}
function applyQuality() {
  const id = gfxLevel(), Q = GFX[id], r = W.renderer, sh = W.sun.shadow;
  W.gfx = id;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr) * (W.autoScale || 1));
  r.shadowMap.enabled = Q.shadows;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.sun.castShadow = Q.shadows;
  if (Q.shadows && sh.mapSize.x !== Q.shadowSize) { sh.mapSize.set(Q.shadowSize, Q.shadowSize); if (sh.map) { sh.map.dispose(); sh.map = null; } }
  setPostLevel(Q);
  if (POST.on && W.time) setPostLook(POST_LOOK[W.time]);
  PEDS.max = Q.peds; FX.max.smoke = Q.smoke; FX.max.fire = Q.fire;
  W.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
}
// Compila de antemano los materiales de todo lo que hay en la escena (también lo escondido:
// carros de lejos, humo, piezas), para que no haya tirones cuando algo aparece por primera vez.
function warmUp() {
  const r = W.renderer;
  r.setRenderTarget(POST.on ? POST.rt : null);
  r.compile(W.scene, W.camera);
  r.setRenderTarget(null);
}
function resizeWorld() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h;
  W.baseFov = w < h ? 85 : 64;
  W.camera.fov = W.baseFov;
  W.camera.updateProjectionMatrix();
  resizePost();
}

// Mapa de entorno para los reflejos (pintura, vidrios, agua): cielo, sol y siluetas de casas.
function makeEnv(id) {
  if (W.envs[id]) return W.envs[id];
  const T = TIMES[id], s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 16), col = [], top = new THREE.Color(T.skyTop), bot = new THREE.Color(T.skyBot), gr = new THREE.Color(T.hemiGround).multiplyScalar(0.6), c = new THREE.Color();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 50; if (y < 0) c.copy(gr); else c.copy(bot).lerp(top, Math.pow(y, 0.6)); col.push(c.r, c.g, c.b); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  if (id !== 'noche') { const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.sun).multiplyScalar(id === 'dia' ? 30 : 16) })); sun.position.set(T.sunDir[0], T.sunDir[1], T.sunDir[2]).normalize().multiplyScalar(40); s.add(sun); }
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.hemiGround).multiplyScalar(id === 'noche' ? 0.3 : 0.7) });
  const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc870).multiplyScalar(id === 'noche' ? 6 : 0) });
  for (let k = 0; k < 22; k++) {
    const a = k / 22 * Math.PI * 2, h = 4 + (k * 7 % 5) * 2.5, b = new THREE.Mesh(new THREE.BoxGeometry(9, h, 4), bm);
    b.position.set(Math.cos(a) * 38, h / 2 - 2, Math.sin(a) * 38); b.lookAt(0, h / 2 - 2, 0); s.add(b);
    if (id === 'noche') { const l = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), lm); l.position.copy(b.position).multiplyScalar(0.94); l.position.y = 1 + (k % 3); l.lookAt(0, l.position.y, 0); s.add(l); }
  }
  const env = W.pmrem.fromScene(s, 0.03).texture;
  W.envs[id] = env;
  return env;
}
const POST_LOOK = {
  dia: { bloom: 0.32, threshold: 1.0, vignette: 0.24, sat: 1.12, tint: [1.0, 1.0, 1.0] },
  tarde: { bloom: 0.55, threshold: 0.82, vignette: 0.3, sat: 1.16, tint: [1.06, 0.98, 0.9] },
  noche: { bloom: 0.95, threshold: 0.55, vignette: 0.38, sat: 1.12, tint: [0.9, 0.96, 1.1] },
};

function setTimeOfDay(id) {
  const T = TIMES[id] || TIMES.dia;
  W.time = id;
  W.skyMat.uniforms.top.value.set(T.skyTop); W.skyMat.uniforms.bot.value.set(T.skyBot);
  W.sunDir.set(...T.sunDir).normalize();
  W.skyMat.uniforms.sunDir.value.copy(W.sunDir);
  W.skyMat.uniforms.sunCol.value.set(id === 'noche' ? 0x000000 : T.sun);
  W.sun.color.set(T.sun); W.sun.intensity = T.sunI;
  W.hemi.color.set(T.hemiSky); W.hemi.groundColor.set(T.hemiGround); W.hemi.intensity = T.hemiI;
  W.scene.fog.color.set(T.fog); W.scene.fog.near = T.near; W.scene.fog.far = T.far;
  W.renderer.toneMappingExposure = T.exp;
  W.winMat.emissiveIntensity = T.win * 1.4;
  W.lampMat.emissiveIntensity = T.lamps * 3;
  W.lampGlow.visible = T.lamps > 0.3;
  W.lampGlow.material.opacity = T.lamps * 0.55;
  W.stars.visible = id === 'noche';
  if (W.towerMat) { W.towerMat.emissiveIntensity = T.win * 2.2; W.towerLights.visible = id !== 'dia'; }
  if (W.clouds) { W.clouds.visible = id !== 'noche'; W.cloudMat.color.set(id === 'tarde' ? 0xffc0a0 : 0xffffff); }
  W.scene.environment = makeEnv(id);
  setPostLook(POST_LOOK[id]);
  W.tunnelLights.emissiveIntensity = 2.2;
  if (FX.mat) FX.mat.uniforms.uLight.value = clamp(T.hemiI * 0.9, 0.3, 1);   // el humo no brilla de noche
  CAR_LOD.glow.value = id === 'noche' ? 2.2 : id === 'tarde' ? 1.4 : 1;      // faros de los carros lejanos
}

function makeStars() {
  const n = 1200, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * 0.95 + 0.05, a = Math.random() * 6.283, rr = Math.sqrt(1 - u * u); pos[i * 3] = Math.cos(a) * rr * 2600; pos[i * 3 + 1] = u * 2600; pos[i * 3 + 2] = Math.sin(a) * rr * 2600; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2, sizeAttenuation: false, fog: false }));
  p.frustumCulled = false;
  return p;
}

// ---------- texturas ----------
function asphaltTex() {
  return canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#4a4b4f', 0.35, 9000);
    for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(20,20,20,0.12)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 10 + Math.random() * 30, 6 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(15,15,15,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 30; y += Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
  }, true);
}
function grassTex() {
  return canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#5a8239', 0.3, 30000);
    // manchas claras y oscuras (pasto seco, tierra) para que no se note la repetición
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); const c = Math.random() < 0.5 ? '120,140,60' : Math.random() < 0.5 ? '40,70,25' : '140,120,70'; gr.addColorStop(0, `rgba(${c},0.28)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 2600; i++) { g.strokeStyle = ['#4a722e', '#6e9a46', '#81a955', '#3f6427'][i % 4]; g.lineWidth = 1; const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4); g.stroke(); }
  }, true);
}
function sidewalkTex() {
  return canvasTex(128, 128, (g, w, h) => {
    noiseFill(g, w, h, '#b9b6ae', 0.18, 2500);
    g.strokeStyle = 'rgba(80,80,80,0.35)'; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  }, true);
}
function wallTex() {
  // la pared roja del borde: rejilla luminosa
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = 'rgba(255,40,40,0.55)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,190,190,0.95)'; g.lineWidth = 3;
    for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 2); g.lineTo(w, 2); g.stroke();
  }, true);
}
function stripeTex() { return canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#f3c522'; g.fillRect(0, 0, w, h); g.fillStyle = '#181818'; for (let i = -64; i < 128; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 11, 0); g.lineTo(i + 11 - 64, h); g.lineTo(i - 64, h); g.fill(); } }, true); }
function signTex(text, bg, fg) {
  return canvasTex(512, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '900 68px Rubik, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); });
}

// ---------- el barrio en 3D ----------
function buildCityMeshes() {
  const G = new THREE.Group();
  W.city = G; W.scene.add(G);
  const asphalt = new THREE.MeshLambertMaterial({ map: asphaltTex(), side: THREE.DoubleSide });   // (las tiras de un eje quedan al revés)
  asphalt.map.repeat.set(1, 1);
  // pasto (con hueco para el canal)
  const grass = grassTex(); grass.repeat.set(80, 34);
  const gMat = new THREE.MeshLambertMaterial({ map: grass });
  for (const sg of [-1, 1]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1600, 800 - CANAL), gMat);
    pl.rotation.x = -Math.PI / 2; pl.position.set(0, -0.02, sg * (CANAL + (800 - CANAL) / 2));
    pl.receiveShadow = true; G.add(pl);
  }
  // calles: una tira por calle siguiendo la altura (puentes)
  const roadGeo = [];
  const strip = (ax, c, from, to) => {
    const pos = [], uv = [], idx = [];
    const step = 3, n = Math.ceil((to - from) / step);
    for (let k = 0; k <= n; k++) {
      const t = from + (to - from) * k / n;
      for (const sd of [-1, 1]) {
        const x = ax === 'z' ? c + sd * ROAD_W / 2 : t, z = ax === 'z' ? t : c + sd * ROAD_W / 2;
        const y = (ax === 'z' ? groundH(c, t) : 0) + (ax === 'z' ? 0.03 : 0.02);
        pos.push(x, y, z); uv.push(sd < 0 ? 0 : ROAD_W / 8, t / 8);
      }
      if (k < n) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    roadGeo.push(g);
  };
  for (const g of GRID) { strip('z', g, -231, 231); strip('x', g, -231, 231); }
  for (const g of roadGeo) { const m = new THREE.Mesh(g, asphalt); m.receiveShadow = true; G.add(m); }
  // líneas pintadas (sólo entre cruces), pasos de cebra
  const marks = [];
  for (const c of GRID) for (let k = 0; k < GRID.length - 1; k++) {
    const a = GRID[k] + ROAD_W / 2 + 3, b = GRID[k + 1] - ROAD_W / 2 - 3;
    for (const ax of ['z', 'x']) {
      for (let t = a; t < b - 2; t += 6) {
        const mid = t + 1.5, y = (ax === 'z' ? groundH(c, mid) : 0) + 0.06;
        marks.push(ax === 'z' ? { geo: new THREE.PlaneGeometry(0.22, 3).rotateX(-Math.PI / 2), m: M4().setPosition(c, y, mid), c: 0xf0c020 } : { geo: new THREE.PlaneGeometry(3, 0.22).rotateX(-Math.PI / 2), m: M4().setPosition(mid, y, c), c: 0xf0c020 });
      }
      for (const sd of [-1, 1]) {
        const off = sd * (ROAD_W / 2 - 0.5), len = b - a, mid = (a + b) / 2;
        if (ax === 'z' && Math.abs(mid) < CANAL + 10) {
          for (let t = a; t < b; t += 3) marks.push({ geo: new THREE.PlaneGeometry(0.18, 3.05).rotateX(-Math.PI / 2), m: M4().setPosition(c + off, groundH(c, t + 1.5) + 0.06, t + 1.5), c: 0xeeeeee });
        } else marks.push(ax === 'z' ? { geo: new THREE.PlaneGeometry(0.18, len).rotateX(-Math.PI / 2), m: M4().setPosition(c + off, 0.05, mid), c: 0xeeeeee } : { geo: new THREE.PlaneGeometry(len, 0.18).rotateX(-Math.PI / 2), m: M4().setPosition(mid, 0.05, c + off), c: 0xeeeeee });
      }
    }
  }
  for (const n of CITY.nodes) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const cx = n.x + dx * (ROAD_W / 2 + 1.6), cz = n.z + dz * (ROAD_W / 2 + 1.6);
    if (Math.abs(cx) > 231 || Math.abs(cz) > 231) continue;
    for (let s = -ROAD_W / 2 + 0.8; s < ROAD_W / 2; s += 1.2) {
      marks.push(dx ? { geo: new THREE.PlaneGeometry(2.6, 0.6).rotateX(-Math.PI / 2), m: M4().setPosition(cx, 0.05, n.z + s), c: 0xf2f2f2 } : { geo: new THREE.PlaneGeometry(0.6, 2.6).rotateX(-Math.PI / 2), m: M4().setPosition(n.x + s, 0.05, cz), c: 0xf2f2f2 });
    }
  }
  G.add(new THREE.Mesh(mergeGeos(marks), new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2 })));
  // veredas alrededor de cada manzana
  const walk = sidewalkTex(); walk.repeat.set(1, 1);
  const sw = [];
  for (let ci = 0; ci < GRID.length - 1; ci++) for (let cj = 0; cj < GRID.length - 1; cj++) {
    const k = cellKind(ci, cj);
    if (k === 'canal') continue;
    const x0 = GRID[ci] + ROAD_W / 2, x1 = GRID[ci + 1] - ROAD_W / 2, z0 = GRID[cj] + ROAD_W / 2, z1 = GRID[cj + 1] - ROAD_W / 2, wd = 3;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    sw.push(boxAt(x1 - x0, 0.16, wd, cx, 0.08, z0 + wd / 2), boxAt(x1 - x0, 0.16, wd, cx, 0.08, z1 - wd / 2), boxAt(wd, 0.16, z1 - z0 - wd * 2, x0 + wd / 2, 0.08, cz), boxAt(wd, 0.16, z1 - z0 - wd * 2, x1 - wd / 2, 0.08, cz));
  }
  // malecón del canal
  for (const sg of [-1, 1]) sw.push(boxAt(2 * LIMIT, 0.16, 45 - ROAD_W / 2 - CANAL, 0, 0.08, sg * (CANAL + (45 - ROAD_W / 2 - CANAL) / 2)));
  sw.forEach(p => { p.c = 0xffffff; });
  const swMesh = new THREE.Mesh(mergeGeos(sw), new THREE.MeshLambertMaterial({ map: walk, vertexColors: true }));
  swMesh.receiveShadow = true;
  // uv en metros para que la textura no se estire
  const sp = swMesh.geometry.attributes.position, su = swMesh.geometry.attributes.uv;
  for (let i = 0; i < sp.count; i++) su.setXY(i, (sp.getX(i) + sp.getY(i)) / 4, (sp.getZ(i) + sp.getY(i)) / 4);
  G.add(swMesh);
  buildCanal(G);
  buildHill(G);
  buildHouses(G);
  buildSpecial(G);
  buildTrees(G);
  buildProps(G);
  buildClouds(G);
  buildStreetStuff(G);
  buildRamps(G);
  buildBorder(G);
  buildOutside(G);
  buildShadowSectors(G);
}

function buildCanal(G) {
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2 * LIMIT + 300, CANAL * 2), new THREE.MeshStandardMaterial({ color: 0x2c5f6e, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -2.2; G.add(water);
  W.anim.push(t => { water.position.y = -2.2 + Math.sin(t * 0.8) * 0.05; });
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(2 * LIMIT + 300, CANAL * 2), new THREE.MeshLambertMaterial({ color: 0x1f3a30 }));
  bed.rotation.x = -Math.PI / 2; bed.position.y = -4; G.add(bed);
  const parts = [];
  // muros de piedra a los lados del canal
  for (const sg of [-1, 1]) parts.push({ ...boxAt(2 * LIMIT + 300, 4.4, 0.8, 0, -1.9, sg * (CANAL + 0.4)), c: 0x8d8678 });
  // barandas del malecón (entre puentes)
  const xs = [-LIMIT, ...GRID, LIMIT];
  for (let k = 0; k < xs.length - 1; k++) {
    const a = xs[k] + (k ? ROAD_W / 2 + 0.6 : 0), b = xs[k + 1] - (k < xs.length - 2 ? ROAD_W / 2 + 0.6 : 0);
    for (const sg of [-1, 1]) {
      parts.push({ ...boxAt(b - a, 0.12, 0.12, (a + b) / 2, 1.05, sg * (CANAL + 0.5)), c: 0x2d3540 });
      for (let x = a; x <= b; x += 3) parts.push({ ...boxAt(0.1, 1, 0.1, x, 0.5, sg * (CANAL + 0.5)), c: 0x2d3540 });
    }
  }
  // puentes: baranda que sigue el arco, viga y pilares
  for (const gx of GRID) {
    for (let z = -CANAL - 7; z < CANAL + 7; z += 2) {
      const y0 = groundH(gx, z), y1 = groundH(gx, z + 2), ang = Math.atan2(y1 - y0, 2);
      for (const sd of [-1, 1]) {
        parts.push({ geo: new THREE.BoxGeometry(0.35, 1.1, 2.05), m: M4().makeRotationX(-ang).setPosition(gx + sd * (ROAD_W / 2 + 0.2), (y0 + y1) / 2 + 0.55, z + 1), c: 0xd6d1c4 });
      }
      parts.push({ geo: new THREE.BoxGeometry(ROAD_W + 0.8, 0.8, 2.05), m: M4().makeRotationX(-ang).setPosition(gx, (y0 + y1) / 2 - 0.4, z + 1), c: 0xa8a294 });
    }
    for (const sz of [-12, 12]) parts.push({ ...boxAt(1.4, 5, 1.4, gx, -2, sz), c: 0x9a9486 });
  }
  const m = new THREE.Mesh(mergeGeos(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true; G.add(m); shadowCast(m.geometry);
}

function buildHill(G) {
  // cerro: malla de alturas; sobre el túnel nunca baja de 8,5 m
  const x0 = HILL.x0 - 0.5, x1 = HILL.x1 + 0.5, z0 = HILL.z0 - 0.5, z1 = HILL.z1 + 0.5, nx = 30, nz = 60;
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const r = rng(77);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
    const ex = Math.min(x - x0, x1 - x) / ((x1 - x0) / 2), ez = Math.min(z - z0, z1 - z) / ((z1 - z0) / 2);
    const e = Math.min(1, Math.min(ex, ez) * 1.6);
    let h = 34 * Math.pow(Math.sin(e * Math.PI / 2), 0.8) * (0.85 + r() * 0.3);
    if (Math.abs(z - 135) < ROAD_W / 2 + 2.5) h = Math.max(h, 8.6);
    p.setY(i, h);
    c.set(h > 26 ? 0x8c8f7a : 0x557a3a).lerp(new THREE.Color(0x3f6a2c), r() * 0.4);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const hill = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  hill.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  hill.receiveShadow = true; hill.castShadow = true;
  G.add(hill);
  // túnel: paredes, techo, luces y bocas de concreto
  const parts = [], len = HILL.x1 - HILL.x0 + 1, cx = (HILL.x0 + HILL.x1) / 2, hz = 135;
  parts.push({ ...boxAt(len, 7.5, 0.6, cx, 3.75, hz - ROAD_W / 2 - 0.3), c: 0x8a8a86 }, { ...boxAt(len, 7.5, 0.6, cx, 3.75, hz + ROAD_W / 2 + 0.3), c: 0x8a8a86 });
  parts.push({ ...boxAt(len, 0.6, ROAD_W + 1.2, cx, 7.5, hz), c: 0x5d5d5a });
  for (const px of [HILL.x0 - 0.2, HILL.x1 + 0.2]) {
    parts.push({ ...boxAt(1.2, 9.6, 3.2, px, 4.8, hz - ROAD_W / 2 - 1.6), c: 0xb7b3a8 }, { ...boxAt(1.2, 9.6, 3.2, px, 4.8, hz + ROAD_W / 2 + 1.6), c: 0xb7b3a8 });
    parts.push({ ...boxAt(1.2, 2.2, ROAD_W + 6.4, px, 8.6, hz), c: 0xb7b3a8 });
  }
  const tm = new THREE.Mesh(mergeGeos(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  tm.receiveShadow = true; G.add(tm);
  W.tunnelLights = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc860, emissiveIntensity: 2 });
  const lg = [];
  for (let x = HILL.x0 + 4; x < HILL.x1; x += 8) lg.push(boxAt(2.5, 0.15, 0.4, x, 7.1, hz));
  G.add(new THREE.Mesh(mergeGeos(lg.map(o => ({ ...o, c: 0xffffff }))), W.tunnelLights));
  // letrero sobre la boca
  for (const [px, ry] of [[HILL.x0 - 0.9, -Math.PI / 2], [HILL.x1 + 0.9, Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: signTex('TÚNEL CERRO VERDE', '#1f6e3a', '#fff') }));
    s.position.set(px, 8.6, hz); s.rotation.y = ry; G.add(s);
  }
  // luz interior para que se vea de día
  const tl = new THREE.PointLight(0xffd090, 60, 40, 1.2); tl.position.set(cx, 6, hz); G.add(tl);
}

// Casas y tiendas con detalle: paredes con textura (tarrajeo o siding) y zócalo oscuro,
// techos de tejas con alero y chimenea, ventanas con marco y alféizar (brillan de noche),
// puerta con techito, cochera con portón y entrada de concreto, buzón, cerco o seto y arbustos.
function plasterTex() {
  return canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#ffffff', 0.14, 9000);
    g.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
  }, true);
}
function roofTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w; x += 16) {
      const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x + 1, y + 1, 14, 13);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + 13, 16, 3);
    }
  }, true);
}
function garageTex() { return canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 6; y < h; y += 10) g.fillRect(0, y, w, 2); }, true); }
// UV en metros según la cara (para que la textura no se estire)
function worldUV(geo, scale) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    if (ny > 0.7) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale);
    else if (nx > 0.7) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale);
    else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale);
  }
  uv.needsUpdate = true;
  return geo;
}
function buildHouses(G) {
  const walls = [], roofs = [], wins = [], trims = [], white = [], gar = [], conc = [], hedge = [];
  const WALLC = [0xf1e3c8, 0xe8c9a4, 0xd9e2e8, 0xf4d6d0, 0xd6e6cf, 0xe9dfa8, 0xcfc6e6, 0xf6efe4, 0xd8b896, 0xc8d8e8, 0xf0c8a0];
  const ROOFC = [0x9c4434, 0x7a5040, 0x4a5260, 0xa86040, 0x6a6e58, 0x8a3a30];
  CITY.mailboxes = []; CITY.bushes = [];
  for (const l of CITY.lots) {
    if (l.kind !== 'casa' && l.kind !== 'tienda') continue;
    const r = rng(l.seed || 7);
    const h = l.floors * 3.2, wc = l.kind === 'tienda' ? 0xeceae4 : WALLC[Math.floor(l.hue * WALLC.length)];
    walls.push({ ...boxAt(l.sx, h, l.sz, l.x, h / 2, l.z), c: wc });
    // zócalo oscuro (como sombra al pie de la pared)
    trims.push({ ...boxAt(l.sx + 0.06, 0.45, l.sz + 0.06, l.x, 0.22, l.z), c: 0x6d6a64 });
    const fx = l.face === 'w' ? -1 : l.face === 'e' ? 1 : 0, fz = l.face === 's' ? -1 : l.face === 'n' ? 1 : 0;
    const frontW = fx ? l.sz : l.sx, frontD = fx ? l.sx : l.sz;
    // pone una caja pegada al frente, desplazada `along` a lo ancho
    const onFront = (along, y, w, hh, depth, c, list, out = 0) => {
      const px = l.x + fx * (frontD / 2 + depth / 2 + out) + (fz ? along : 0), pz = l.z + fz * (frontD / 2 + depth / 2 + out) + (fx ? along : 0);
      list.push({ ...boxAt(fx ? depth : w, hh, fz ? depth : w, px, y, pz), c });
    };
    const winBox = (along, y, w, hh, list = wins) => {
      onFront(along, y, w + 0.24, hh + 0.24, 0.08, 0xf4f2ec, white);                  // marco
      onFront(along, y - hh / 2 - 0.1, w + 0.36, 0.08, 0.2, 0xe8e4da, white);         // alféizar
      onFront(along, y, w, hh, 0.1, 0x7fa8c4, list, 0.02);
      onFront(along, y, 0.06, hh, 0.12, 0xf4f2ec, white, 0.02);                       // cruz
    };
    if (l.kind === 'tienda') {
      onFront(0, 1.7, frontW * 0.82, 2.6, 0.1, 0x9fd0ea, wins, 0.02);
      onFront(0, 1.7, frontW * 0.86, 2.8, 0.06, 0x2a2d33, trims);
      const sc = [0xd8382c, 0x2b7de0, 0x2a9d58, 0xf0a020][Math.floor(l.hue * 4)];
      onFront(0, h + 0.75, frontW * 0.92, 1.3, 0.3, sc, trims);
      onFront(0, 3.25, frontW * 0.9, 0.12, 1.6, sc, trims);                            // toldo
      roofs.push({ ...boxAt(l.sx + 0.5, 0.5, l.sz + 0.5, l.x, h + 0.25, l.z), c: 0x7a7a76 });
      for (let k = 0; k < 2; k++) roofs.push({ ...boxAt(1.4, 0.8, 1, l.x + (k ? 1 : -1) * l.sx * 0.2, h + 0.9, l.z), c: 0xb8b8b4 });
    } else {
      // ventanas por piso; puerta con techito
      const doorAt = frontW * (r() < 0.5 ? -0.1 : 0.1);
      for (let f = 0; f < l.floors; f++) for (const a of [-frontW * 0.32, frontW * 0.32]) winBox(a, f * 3.2 + 1.75, 1.3, 1.25);
      if (l.floors > 1) winBox(0, 3.2 + 1.75, 1.0, 1.1);
      onFront(doorAt, 1.08, 1.05, 2.15, 0.1, [0x6a4430, 0x2e4a6a, 0x8a2a2a, 0x3a5a3a][Math.floor(r() * 4)], trims, 0.02);
      onFront(doorAt, 1.08, 1.3, 2.35, 0.06, 0xf4f2ec, white);
      onFront(doorAt, 2.55, 2.2, 0.12, 1.3, 0xe8e4da, white);                         // techito
      for (const sd of [-1, 1]) onFront(doorAt + sd * 0.95, 1.25, 0.12, 2.5, 0.12, 0xf4f2ec, white, 1.1);
      onFront(doorAt, 0.1, 2.0, 0.2, 1.3, 0xb8b4aa, conc);                            // escalón
      // ventanas laterales
      for (let f = 0; f < l.floors; f++) for (const sd of [-1, 1]) {
        const px = l.x + (fz ? sd * (l.sx / 2 + 0.06) : 0), pz = l.z + (fx ? sd * (l.sz / 2 + 0.06) : 0);
        wins.push({ ...boxAt(fz ? 0.1 : 1.2, 1.2, fx ? 0.1 : 1.2, px, f * 3.2 + 1.75, pz), c: 0x7fa8c4 });
        white.push({ ...boxAt(fz ? 0.07 : 1.45, 1.45, fx ? 0.07 : 1.45, px, f * 3.2 + 1.75, pz), c: 0xf4f2ec });
      }
      // techo de dos aguas con alero, o plano con parapeto
      const rc = ROOFC[Math.floor(l.roof * ROOFC.length)];
      if (l.roof < 0.75) {
        const along = l.sx > l.sz ? 'x' : 'z', L = Math.max(l.sx, l.sz) + 0.9, S = Math.min(l.sx, l.sz) + 1.2;
        const sh = new THREE.Shape(); sh.moveTo(-S / 2, 0); sh.lineTo(S / 2, 0); sh.lineTo(0, S * 0.36); sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); geo.translate(0, -0.05, -L / 2);
        roofs.push({ geo, m: M4().makeRotationY(along === 'x' ? Math.PI / 2 : 0).setPosition(l.x, h, l.z), c: rc });
        // frontón (triángulo de pared bajo el techo)
        const gs = new THREE.Shape(); gs.moveTo(-S / 2 + 0.6, 0); gs.lineTo(S / 2 - 0.6, 0); gs.lineTo(0, (S - 1.2) * 0.36); gs.closePath();
        const gg = new THREE.ExtrudeGeometry(gs, { depth: L - 1, bevelEnabled: false }); gg.translate(0, 0, -(L - 1) / 2);
        walls.push({ geo: gg, m: M4().makeRotationY(along === 'x' ? Math.PI / 2 : 0).setPosition(l.x, h - 0.02, l.z), c: wc });
        if (r() < 0.6) roofs.push({ ...boxAt(0.8, 2.2, 0.8, l.x + (along === 'x' ? l.sx * 0.25 : 0.9), h + S * 0.22, l.z + (along === 'x' ? 0.9 : l.sz * 0.25)), c: 0x8a5a48 });
      } else {
        roofs.push({ ...boxAt(l.sx + 0.4, 0.35, l.sz + 0.4, l.x, h + 0.17, l.z), c: 0x8a8780 });
        roofs.push({ ...boxAt(l.sx + 0.4, 0.6, 0.2, l.x, h + 0.5, l.z + l.sz / 2 + 0.1), c: wc }, { ...boxAt(l.sx + 0.4, 0.6, 0.2, l.x, h + 0.5, l.z - l.sz / 2 - 0.1), c: wc });
        roofs.push({ ...boxAt(1.4, 0.9, 1, l.x + l.sx * 0.2, h + 0.8, l.z), c: 0x5a8ab0 });   // tanque de agua
      }
      // cochera al costado: portón y entrada de concreto hasta la vereda
      if (r() < 0.6) {
        const side = r() < 0.5 ? -1 : 1, along = side * (frontW / 2 - 1.8);
        onFront(along, 1.15, 2.6, 2.3, 0.08, 0xe0dcd2, gar, 0.02);
        const dl = 6.5, px = l.x + fx * (frontD / 2 + dl / 2) + (fz ? along : 0), pz = l.z + fz * (frontD / 2 + dl / 2) + (fx ? along : 0);
        conc.push({ ...boxAt(fx ? dl : 3, 0.06, fz ? dl : 3, px, 0.03, pz), c: 0xbdb9b0 });
      }
      // buzón y cerco o seto en el borde del lote
      CITY.mailboxes.push({ x: l.x + fx * (frontD / 2 + 3.6) + (fz ? frontW / 2 - 0.5 : 0), z: l.z + fz * (frontD / 2 + 3.6) + (fx ? frontW / 2 - 0.5 : 0), r: fx ? Math.PI / 2 : 0 });
      if (r() < 0.55) {
        const hx = l.x + fx * (frontD / 2 + 3.9), hz = l.z + fz * (frontD / 2 + 3.9);
        hedge.push({ ...boxAt(fx ? 0.7 : frontW * 0.45, 0.9, fz ? 0.7 : frontW * 0.45, hx + (fz ? -frontW * 0.28 : 0), 0.45, hz + (fx ? -frontW * 0.28 : 0)), c: r() < 0.5 ? 0x3f7a34 : 0x4c8a3c });
      }
      for (let k = 0; k < 3; k++) CITY.bushes.push({ x: l.x + fx * (frontD / 2 + 0.8) + (fz ? (r() - 0.5) * frontW : 0), z: l.z + fz * (frontD / 2 + 0.8) + (fx ? (r() - 0.5) * frontW : 0), s: 0.5 + r() * 0.5 });
    }
  }
  W.plaster = W.plaster || plasterTex(); W.roofTx = W.roofTx || roofTex();
  const mw = new THREE.Mesh(worldUV(mergeGeos(walls), 3), new THREE.MeshLambertMaterial({ vertexColors: true, map: W.plaster }));
  const mr = new THREE.Mesh(worldUV(mergeGeos(roofs), 2.5), new THREE.MeshLambertMaterial({ vertexColors: true, map: W.roofTx }));
  W.winMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.4, envMapIntensity: 1.4, emissive: 0xffc870, emissiveIntensity: 0 });
  const mwin = new THREE.Mesh(mergeGeos(wins), W.winMat);
  const mt = new THREE.Mesh(mergeGeos(trims), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const mwh = new THREE.Mesh(mergeGeos(white), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const mg = new THREE.Mesh(worldUV(mergeGeos(gar), 1.2), new THREE.MeshLambertMaterial({ vertexColors: true, map: garageTex() }));
  const mc = new THREE.Mesh(mergeGeos(conc), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const mh = new THREE.Mesh(mergeGeos(hedge), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  for (const m of [mw, mr, mt, mwh, mg, mh]) { m.receiveShadow = true; shadowCast(m.geometry); }
  mc.receiveShadow = true;
  G.add(mw, mr, mwin, mt, mwh, mg, mc, mh);
  // piscinas
  const pools = [];
  for (const l of CITY.lots) if (l.kind === 'piscina') pools.push({ ...boxAt(8, 0.1, 5, l.x, 0.12, l.z), c: 0x3ab0d8 }, { ...boxAt(9, 0.12, 6, l.x, 0.06, l.z), c: 0xe6e2d8 });
  if (pools.length) G.add(new THREE.Mesh(mergeGeos(pools), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.1, metalness: 0.2 })));
}

function buildSpecial(G) {
  const parts = [];
  for (const l of CITY.lots) {
    if (l.kind === 'parque') {
      parts.push({ ...boxAt(8, 0.8, 8, l.x, 0.4, l.z), c: 0xbdb8ad }, { ...boxAt(6.6, 0.3, 6.6, l.x, 0.8, l.z), c: 0x4ab0d8 }, { ...boxAt(0.8, 2.4, 0.8, l.x, 1.6, l.z), c: 0xbdb8ad });
      // caminos
      parts.push({ ...boxAt(l.sx, 0.06, 3, l.x, 0.03, l.z), c: 0xcab894 }, { ...boxAt(3, 0.06, l.sz, l.x, 0.03, l.z), c: 0xcab894 });
      for (const [dx, dz] of [[12, 6], [-12, -6], [6, -12], [-6, 12]]) parts.push({ ...boxAt(2.2, 0.5, 0.6, l.x + dx, 0.25, l.z + dz), c: 0x7a5236 });
    } else if (l.kind === 'grifo') {
      const X0 = l.x - l.sx / 2, Z0 = l.z - l.sz / 2;
      parts.push({ ...boxAt(l.sx, 0.05, l.sz, l.x, 0.025, l.z), c: 0x5a5c60 });
      parts.push({ ...boxAt(26, 0.6, 14, X0 + 27, 6.3, Z0 + 30), c: 0xf0f0f0 }, { ...boxAt(26.2, 0.8, 0.3, X0 + 27, 6.0, Z0 + 23), c: 0xd8282c });
      for (const px of [X0 + 18, X0 + 36]) parts.push({ ...boxAt(0.5, 6, 0.5, px, 3, Z0 + 30), c: 0xdddddd });
      for (const [px, pz] of [[X0 + 20, Z0 + 30], [X0 + 34, Z0 + 30]]) parts.push({ ...boxAt(1.6, 1.5, 4.6, px, 0.75, pz), c: 0xd8282c });
      parts.push({ ...boxAt(26, 5, 24, X0 + 57, 2.5, Z0 + 58), c: 0xe8e4dc }, { ...boxAt(26.4, 1, 0.3, X0 + 57, 4.4, Z0 + 45.8), c: 0xd8282c });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: signTex('GRIFO EL BARRIO', '#d8282c', '#fff') }));
      s.position.set(X0 + 57, 4.4, Z0 + 45.6); s.rotation.y = Math.PI; G.add(s);
    } else if (l.kind === 'colegio') {
      const X0 = l.x - l.sx / 2, X1 = l.x + l.sx / 2, Z1 = l.z + l.sz / 2, Z0 = l.z - l.sz / 2;
      parts.push({ ...boxAt(X1 - X0 - 4, 9, 20, l.x, 4.5, Z1 - 12), c: 0xe0b070 }, { ...boxAt(X1 - X0 - 3.6, 0.5, 20.4, l.x, 9.25, Z1 - 12), c: 0x7a3a2a });
      for (let x = X0 + 6; x < X1 - 4; x += 5) for (const y of [2.5, 6.5]) parts.push({ ...boxAt(2.4, 1.6, 0.1, x, y, Z1 - 22.06), c: 0x8fb6cf });
      // cancha de fútbol
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(48, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: 0.95 }));
      pitch.position.set(l.x, 0.05, Z0 + 20); pitch.receiveShadow = true; G.add(pitch);
      for (const gx of [l.x - 24, l.x + 24]) parts.push({ ...boxAt(0.2, 2.4, 7, gx, 1.2, Z0 + 20), c: 0xffffff });
      const s = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.4), new THREE.MeshBasicMaterial({ map: signTex('COLEGIO N.º 7', '#1e4f8f', '#fff') }));
      s.position.set(l.x, 7.6, Z1 - 22.1); s.rotation.y = Math.PI; G.add(s);
    }
  }
  const m = new THREE.Mesh(mergeGeos(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.receiveShadow = true; G.add(m); shadowCast(m.geometry);
}

// Cancha con franjas de pasto y líneas pintadas.
function pitchTex() {
  return canvasTex(512, 320, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#3d8c3e' : '#469a45'; g.fillRect(i * w / 12, 0, w / 12 + 1, h); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20); g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 44, 0, Math.PI * 2); g.stroke();
    for (const x of [10, w - 10]) { const s = x < w / 2 ? 1 : -1; g.strokeRect(Math.min(x, x + s * 80), h / 2 - 80, 80, 160); g.strokeRect(Math.min(x, x + s * 30), h / 2 - 40, 30, 80); }
  }, false);
}

// Árboles: 3 tipos (frondoso, alto y pino), cada uno con tronco, ramas y copa de varias bolas
// en tonos de verde; se dibujan con instancias. lv: 0 completo, 1 liviano (de 80 m en adelante y
// para la sombra), 2 muy liviano (de lejos).
function treeGeo(kind, lv = 0) {
  const parts = [], bark = 0x5b4330;
  const R = (() => { let a = kind.length * 977; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  const P = (geo, x, y, z, c, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => parts.push({ geo, m: M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz)), c });
  const leaf = new THREE.IcosahedronGeometry(1, 2 - lv), lp = leaf.attributes.position;
  for (let k = 0; k < lp.count; k++) { const f = 1 + (Math.sin(lp.getX(k) * 7.1) + Math.cos(lp.getZ(k) * 6.3) + Math.sin(lp.getY(k) * 5.7)) * 0.06; lp.setXYZ(k, lp.getX(k) * f, lp.getY(k) * f, lp.getZ(k) * f); }
  const trunk = new THREE.CylinderGeometry(0.6, 1, 1, [8, 6, 5][lv], 1, lv > 0), cone = new THREE.ConeGeometry(1, 1, [10, 8, 6][lv]);
  const greens = kind === 'pine' ? [0x2f5a2c, 0x35663a, 0x284f2a] : [0x3f7a2e, 0x4b8a34, 0x356b28, 0x5a9a3c, 0x447f30];
  if (kind === 'pine') {
    P(trunk, 0, 1, 0, bark, 0.2, 2, 0.2);
    for (let k = 0; k < 4; k++) P(cone, 0, 2.3 + k * 1.15, 0, greens[k % 3], 2 - k * 0.4, 2.1, 2 - k * 0.4);
  } else {
    const th = kind === 'tall' ? 4 : 2.5;
    P(trunk, 0, th / 2, 0, bark, 0.17, th, 0.17);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(); if (lv < 2) P(trunk, Math.cos(a) * 0.35, th - 0.2, Math.sin(a) * 0.35, bark, 0.06, 1.1, 0.06, Math.sin(a) * 0.7, -Math.cos(a) * 0.7); }
    const n = kind === 'tall' ? 5 : 7;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + R(), r = k === 0 ? 0 : 0.7 + R() * 0.5, sz = (k === 0 ? 1.6 : 1.05 + R() * 0.4) * (kind === 'tall' ? 0.8 : 1);
      P(leaf, Math.cos(a) * r, th + 0.9 + (k === 0 ? 0.6 : R() * 0.9), Math.sin(a) * r, greens[Math.floor(R() * greens.length)], sz, sz * 0.9, sz);
    }
  }
  return mergeGeos(parts);
}
function buildTrees(G) {
  const kinds = ['round', 'tall', 'pine'], mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
  const by = kinds.map(() => []);
  CITY.trees.forEach(t => by[Math.floor(Math.abs(Math.sin(t.x * 3.1 + t.z * 1.7)) * 2.999)].push(t));
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(), e = new THREE.Euler();
  kinds.forEach((k, ki) => {
    const items = by[ki].map(t => { e.set(0, t.x * 13 % 6, 0); q.setFromEuler(e); return { x: t.x, y: 0, z: t.z, s: t.s * 0.95, m: M4().compose(new THREE.Vector3(t.x, 0, t.z), q, sc.setScalar(t.s * 0.95)) }; });
    const g1 = treeGeo(k, 1);
    lodSet(G, items, [{ geo: treeGeo(k, 0), mat, far: 80 }, { geo: g1, mat, far: 230 }, { geo: treeGeo(k, 2), mat, far: 900 }], { shadow: g1 });
  });
}

// Postes de luz, semáforos y nombres de calles.
function buildStreetStuff(G) {
  const poles = [], heads = [];
  const lampPts = [];
  for (const c of GRID) for (let k = 0; k < GRID.length - 1; k++) {
    for (let t = GRID[k] + 18; t < GRID[k + 1] - 12; t += 30) {
      for (const ax of ['z', 'x']) {
        if (ax === 'z' && Math.abs(t) < CANAL + 8) continue;
        const sd = (Math.round(t / 30) % 2) ? 1 : -1;
        const x = ax === 'z' ? c + sd * (ROAD_W / 2 + 1) : t, z = ax === 'z' ? t : c + sd * (ROAD_W / 2 + 1);
        if (Math.abs(x) > 231 || Math.abs(z) > 231) continue;
        if (x > HILL.x0 - 2 && x < HILL.x1 + 2 && Math.abs(z - 135) < 10) continue;
        lampPts.push({ x, z, ax, sd });
      }
    }
  }
  for (const p of lampPts) {
    poles.push({ ...boxAt(0.18, 7, 0.18, p.x, 3.5, p.z), c: 0x3a3f46 });
    const ox = p.ax === 'z' ? -p.sd * 1.4 : 0, oz = p.ax === 'x' ? -p.sd * 1.4 : 0;
    poles.push({ ...boxAt(p.ax === 'z' ? 1.6 : 0.14, 0.14, p.ax === 'x' ? 1.6 : 0.14, p.x + ox / 2, 7, p.z + oz / 2), c: 0x3a3f46 });
    heads.push({ ...boxAt(0.9, 0.22, 0.5, p.x + ox, 6.9, p.z + oz), c: 0xffffff });
    p.hx = p.x + ox; p.hz = p.z + oz;
  }
  // semáforos: un poste en cada esquina con dos cabezales (uno para cada calle)
  CITY.lightHeads = [];
  for (const n of CITY.nodes) for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const px = n.x + cx * (ROAD_W / 2 + 1.2), pz = n.z + cz * (ROAD_W / 2 + 1.2);
    if (Math.abs(px) > 236 || Math.abs(pz) > 236) continue;
    poles.push({ ...boxAt(0.2, 4.2, 0.2, px, 2.1, pz), c: 0x22262c });
    // cabezal para los que vienen por la calle norte-sur (miran hacia z) y para los de este-oeste
    for (const axis of ['z', 'x']) {
      const hx = px + (axis === 'x' ? 0 : 0), hz = pz;
      const fz = axis === 'z' ? cz : 0, fx = axis === 'x' ? cx : 0;   // hacia dónde mira
      poles.push({ ...boxAt(axis === 'x' ? 0.3 : 0.5, 1.5, axis === 'x' ? 0.5 : 0.3, hx, 3.6, hz), c: 0x15171a });
      ['rojo', 'ambar', 'verde'].forEach((col, k) => CITY.lightHeads.push({ node: n, axis, col, x: hx + fx * 0.15, y: 4.1 - k * 0.45, z: hz + fz * 0.15, ry: axis === 'z' ? (fz > 0 ? 0 : Math.PI) : (fx > 0 ? Math.PI / 2 : -Math.PI / 2) }));
    }
  }
  const pm = new THREE.Mesh(mergeGeos(poles), new THREE.MeshLambertMaterial({ vertexColors: true }));
  G.add(pm); shadowCast(pm.geometry);
  W.lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd890, emissiveIntensity: 0 });
  G.add(new THREE.Mesh(mergeGeos(heads), W.lampMat));
  // halo de luz bajo cada poste (de noche)
  const glowTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,215,140,1)'); r.addColorStop(1, 'rgba(255,215,140,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const glowGeo = mergeGeos(lampPts.map(p => ({ geo: new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2), m: M4().setPosition(p.hx, 0.08, p.hz), c: 0xffffff })));
  W.lampGlow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  G.add(W.lampGlow);
  // focos de semáforo: una lente abombada (8 lados) por luz; el color cambia con el ciclo
  const lg = new THREE.LatheGeometry([new THREE.Vector2(0.17, 0), new THREE.Vector2(0.13, 0.06), new THREE.Vector2(0, 0.085)], 8).rotateX(Math.PI / 2);
  W.tl = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: 0xffffff }), CITY.lightHeads.length);
  const mtx = M4(), off = new THREE.Color(0x111111);
  CITY.lightHeads.forEach((h, i) => { mtx.makeRotationY(h.ry).setPosition(h.x, h.y, h.z); W.tl.setMatrixAt(i, mtx); W.tl.setColorAt(i, off); });
  G.add(W.tl);
  W.tlColors = { rojo: new THREE.Color(0xff2a1a).multiplyScalar(2), ambar: new THREE.Color(0xffb020).multiplyScalar(2), verde: new THREE.Color(0x30ff6a).multiplyScalar(1.6), off: new THREE.Color(0x1a1a1a) };
}
// Los semáforos cambian en segundos enteros: basta con revisarlos 4 veces por segundo.
function updateLights(t) {
  if (!W.tl) return;
  const k = Math.floor(t * 4);
  if (k === W.tlK) return;
  W.tlK = k;
  CITY.lightHeads.forEach((h, i) => W.tl.setColorAt(i, lightState(h.node, h.axis, t) === h.col ? W.tlColors[h.col] : W.tlColors.off));
  W.tl.instanceColor.needsUpdate = true;
}

function buildRamps(G) {
  const tex = stripeTex(); tex.repeat.set(2, 1);
  for (const r of CITY.ramps) {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(r.len, 0); sh.lineTo(r.len, r.h); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: r.w, bevelEnabled: false }); geo.translate(0, 0, -r.w / 2);
    const m = new THREE.Mesh(geo, [new THREE.MeshLambertMaterial({ color: 0x8a8a8a }), new THREE.MeshLambertMaterial({ map: tex })]);
    // el eje x de la forma apunta a lo largo de la rampa
    const ang = r.ax === 'x' ? (r.sg > 0 ? 0 : Math.PI) : (r.sg > 0 ? -Math.PI / 2 : Math.PI / 2);
    m.rotation.y = ang; m.position.set(r.x, 0, r.z);
    m.receiveShadow = true; m.updateMatrix();
    G.add(m); shadowCast(geo, m.matrix);
  }
}

// Paredes rojas del borde: 60 % transparentes, se ven bien y no se pueden pasar.
function buildBorder(G) {
  const tex = wallTex(); tex.repeat.set(2 * LIMIT / 12, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, color: 0xffffff });
  W.borderMat = mat;
  for (const [x, z, ry] of [[0, LIMIT, 0], [0, -LIMIT, 0], [LIMIT, 0, Math.PI / 2], [-LIMIT, 0, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * LIMIT, 12), mat);
    m.position.set(x, 6, z); m.rotation.y = ry; m.renderOrder = 5;
    G.add(m);
  }
  W.anim.push(t => { mat.opacity = 0.4 + Math.sin(t * 2) * 0.04 + (W.wallFlash || 0) * 0.35; W.wallFlash = Math.max(0, (W.wallFlash || 0) - 0.03); tex.offset.y = (t * 0.05) % 1; });
}

// Afuera del barrio: cerros con relieve (como los de Lima), la ciudad a lo lejos con ventanas
// que se prenden de noche y torres de alta tensión.
function vnoise(x, y, seed) {
  const h = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}
function fbm(x, y, seed, oct = 5) { let a = 0, f = 1, w = 0.5, t = 0; for (let k = 0; k < oct; k++) { a += vnoise(x * f, y * f, seed + k) * w; t += w; f *= 2.03; w *= 0.5; } return a / t; }
function towerTex() {
  // fachada con ventanas (8 x 16 por textura = 24 m x 48 m): color y luces prendidas al azar
  const mk = lit => canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#c4c1b8'; g.fillRect(0, 0, w, h);
    const r2 = rng(3);
    for (let y = 0; y < h; y += 16) {
      if (!lit) { g.fillStyle = '#a9a69d'; g.fillRect(0, y + 13, w, 3); }
      for (let x = 0; x < w; x += 16) {
        const on = r2() < 0.4, warm = r2() < 0.6;
        if (lit) { if (on) { g.fillStyle = warm ? '#ffcf8a' : '#e9f2ff'; g.fillRect(x + 3, y + 3, 10, 9); } }
        else { g.fillStyle = on ? '#5d6b7c' : '#3c4654'; g.fillRect(x + 3, y + 3, 10, 9); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 3, y + 3, 10, 2); }
      }
    }
  }, true);
  return { map: mk(false), em: mk(true) };
}
function buildOutside(G) {
  // relieve: un anillo alrededor que sube a cerros
  const segA = 160, segR = 30, r0 = 470, r1 = 1500;
  const pos = [], col = [], idx = [];
  const cGreen = new THREE.Color(0x6f8a4a), cDry = new THREE.Color(0x9a8a62), cRock = new THREE.Color(0x8a7f74), cDark = new THREE.Color(0x56683c), c = new THREE.Color();
  for (let j = 0; j <= segR; j++) {
    const t = j / segR, r = r0 + (r1 - r0) * Math.pow(t, 1.4);
    for (let i = 0; i <= segA; i++) {
      const a = i / segA * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const ax = ca * 3 + 10, ay = sa * 3 + 10;                       // ruido continuo alrededor del anillo
      const rise = clamp((r - 540) / 500, 0, 1);
      const ridge = 1 - Math.abs(fbm(ax * 1.3 + t * 2, ay * 1.3 + t * 2, 5) * 2 - 1);
      let h = -4 + rise * rise * (90 + 260 * fbm(ax + t * 1.5, ay + t * 1.5, 1)) + rise * ridge * 90;
      // a lo lejos de un lado, la ciudad: más plano
      const city = clamp(1 - Math.abs(wrapAng(a - 0.6)) / 0.7, 0, 1);
      h *= 1 - city * 0.75;
      pos.push(ca * r, h, sa * r);
      const n = fbm(ax * 4 + t * 6, ay * 4, 9, 3);
      c.copy(cGreen).lerp(cDark, n).lerp(cDry, clamp((h - 60) / 140, 0, 1)).lerp(cRock, clamp((h - 170) / 120, 0, 1) * 0.8);
      col.push(c.r, c.g, c.b);
      if (i < segA && j < segR) { const k = j * (segA + 1) + i; idx.push(k, k + segA + 1, k + 1, k + 1, k + segA + 1, k + segA + 2); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const hills = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  G.add(hills);
  // la ciudad a lo lejos: torres con ventanas
  const tt = towerTex();
  W.towerMat = new THREE.MeshStandardMaterial({ map: tt.map, emissiveMap: tt.em, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.6, metalness: 0.2 });
  const r = rng(9), parts = [];
  for (let i = 0; i < 46; i++) {
    const a = 0.6 + (r() - 0.5) * 1.3, d = 420 + r() * 330, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const w = 18 + r() * 20, dpt = 18 + r() * 20, h = Math.round((18 + Math.pow(r(), 1.8) * 85) / 3) * 3;
    const g = new THREE.BoxGeometry(w, h, dpt);
    // uv en metros para que las ventanas tengan el mismo tamaño
    const uv = g.attributes.uv, p = g.attributes.position, nr = g.attributes.normal;
    for (let k = 0; k < uv.count; k++) { const horiz = Math.abs(nr.getX(k)) > 0.5 ? p.getZ(k) : p.getX(k); uv.setXY(k, (horiz + 50) / 24, (p.getY(k) + h / 2) / 48); }
    parts.push({ geo: g, m: M4().makeRotationY(a).setPosition(x, h / 2, z), c: [0xffffff, 0xe6d9c4, 0xc9d3de, 0xd9c2b0][Math.floor(r() * 4)] });
  }
  const towers = new THREE.Mesh(mergeGeos(parts), W.towerMat);
  W.towerMat.vertexColors = true;
  G.add(towers);
  // luces de aviso rojas en las torres más altas y torres de alta tensión en los cerros
  const tl = [];
  for (const p of parts) { const e = p.m.elements; const hgt = p.geo.parameters.height; if (hgt > 70) tl.push(e[12], hgt + 1, e[14]); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tl, 3));
  W.towerLights = new THREE.Points(tg, new THREE.PointsMaterial({ color: 0xff3020, size: 4, sizeAttenuation: false, fog: false }));
  G.add(W.towerLights);
}

// ---------- marcadores: guarida y bolsas ----------
function makeMarker(x, z, color) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.y = 30;
  const ring = new THREE.Mesh(new THREE.RingGeometry(4, 5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.position.y = 0.15;
  g.add(beam, ring); g.position.set(x, groundH(x, z), z);
  W.anim.push(t => { ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08); beam.material.opacity = 0.15 + Math.sin(t * 2) * 0.05; });
  W.scene.add(g);
  return g;
}
function makeBag() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.7, emissive: 0x1a4a10, emissiveIntensity: 0.5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 14, 10), mat); body.scale.y = 0.9;
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 8), mat); knot.position.y = 0.62;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: signTex('S/', '#3f8f3a', '#ffe680'), transparent: true }));
  sign.position.set(0, 0, 0.61);
  g.add(body, knot, sign);
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.4, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  glow.position.y = -1;
  g.add(glow);
  return g;
}

// ---------- efectos (chispas, humo, fuego, piezas) ----------
// El humo y el fuego son cuadrados que miran a la cámara, todos en una sola malla instanciada
// (1 llamada de dibujo, sin crear materiales). Cada partícula se mueve en la CPU y se copia a
// atributos por instancia. Se mezclan con alfa premultiplicado: el humo tapa y el fuego suma luz,
// en la misma pasada. Las piezas que saltan en los choques también van en un InstancedMesh.
const FX = { sp: [], smoke: [], debris: [], fire: [], max: { smoke: 120, fire: 90 } };
const FX_N = 240, DEBRIS_N = 80;
function fxTex() {
  // atlas de 2 cuadros: bocanada de humo (con volutas) y brillo redondo (fuego)
  return canvasTex(256, 128, g => {
    const r2 = rng(41);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, d = i ? 18 + r2() * 14 : 0, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = i ? 22 + r2() * 12 : 34;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${r2() * 0.18})`; g.beginPath(); g.arc(20 + r2() * 88, 20 + r2() * 88, 2 + r2() * 6, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    const gr = g.createRadialGradient(192, 64, 2, 192, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(128, 0, 128, 128);
  });
}
function fxInit() {
  const n = 600, pos = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  FX.sparks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc860, size: 0.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  FX.sparks.frustumCulled = false;
  W.scene.add(FX.sparks);
  // marcas de llantas: un búfer circular de cuadritos en el piso
  const SK = 1600, sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SK * 6 * 3), 3));
  sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SK * 6 * 3), 3));
  FX.skid = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, blending: THREE.MultiplyBlending, premultipliedAlpha: true }));
  FX.skid.frustumCulled = false; FX.skid.renderOrder = 2; FX.skidN = SK; FX.skidI = 0; FX.skidUsed = 0;
  W.scene.add(FX.skid);
  // humo y fuego
  const pg = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(1, 1);
  pg.index = q.index; pg.setAttribute('position', q.attributes.position); pg.setAttribute('uv', q.attributes.uv);
  FX.iPos = new THREE.InstancedBufferAttribute(new Float32Array(FX_N * 3), 3).setUsage(THREE.DynamicDrawUsage);
  FX.iCol = new THREE.InstancedBufferAttribute(new Float32Array(FX_N * 4), 4).setUsage(THREE.DynamicDrawUsage);
  FX.iMisc = new THREE.InstancedBufferAttribute(new Float32Array(FX_N * 3), 3).setUsage(THREE.DynamicDrawUsage);
  pg.setAttribute('iPos', FX.iPos); pg.setAttribute('iCol', FX.iCol); pg.setAttribute('iMisc', FX.iMisc);
  pg.instanceCount = 0;
  FX.mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, uLight: { value: 1 } }]),
    vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec3 iMisc;
      varying vec2 vUv; varying vec4 vCol; varying float vAdd;
      #include <fog_pars_vertex>
      void main() {
        vUv = vec2((uv.x + iMisc.z) * 0.5, uv.y); vCol = iCol; vAdd = iMisc.z;
        vec4 mvPosition = modelViewMatrix * vec4(iPos, 1.0);
        float c = cos(iMisc.y), s = sin(iMisc.y);
        vec2 q = position.xy * iMisc.x;
        mvPosition.xy += vec2(c * q.x - s * q.y, s * q.x + c * q.y);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D map; uniform float uLight;
      varying vec2 vUv; varying vec4 vCol; varying float vAdd;
      #include <fog_pars_fragment>
      void main() {
        float a = texture2D(map, vUv).a * vCol.a;
        vec3 c = vCol.rgb * mix(uLight, 1.0, vAdd);
        #ifdef USE_FOG
          float f = smoothstep(fogNear, fogFar, vFogDepth);
          c = mix(mix(c, fogColor, f), c * (1.0 - f), vAdd);
        #endif
        gl_FragColor = vec4(c * a, a * (1.0 - vAdd));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    fog: true, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
  });
  FX.mat.uniforms.map.value = FX.tex = fxTex();
  FX.mesh = new THREE.Mesh(pg, FX.mat);
  FX.mesh.frustumCulled = false; FX.mesh.renderOrder = 3;
  W.scene.add(FX.mesh);
  FX.list = [];
  // piezas sueltas de los choques
  FX.bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1.4), new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35 }), DEBRIS_N);
  FX.bits.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  FX.bits.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS_N * 3), 3);
  FX.bits.frustumCulled = false; FX.bits.count = 0;
  W.scene.add(FX.bits);
}
function fxClear() {
  FX.fire = []; FX.smoke = []; FX.debris = []; FX.sp = [];
  FX.skidUsed = 0; FX.skidI = 0; FX.skid.geometry.setDrawRange(0, 0);
  FX.mesh.geometry.instanceCount = 0; FX.bits.count = 0;
}
function fxSparks(x, y, z, n, spd = 6) { for (let i = 0; i < n && FX.sp.length < 600; i++) FX.sp.push({ x, y, z, vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd * 0.6, vz: (Math.random() - 0.5) * spd, life: 0.25 + Math.random() * 0.45 }); }
function fxSmoke(x, y, z, n, col = 0x666666, size = 1.4, life = 2) {
  for (let i = 0; i < n; i++) {
    if (FX.smoke.length >= FX.max.smoke) FX.smoke.shift();
    FX.smoke.push({ x: x + (Math.random() - 0.5) * 0.6, y, z: z + (Math.random() - 0.5) * 0.6, size: size * (0.6 + Math.random() * 0.5), life, t: 0, vy: 0.5 + Math.random(), vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), grow: size * 0.8, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.8, col: new THREE.Color(col) });
  }
}
// Un tramo de marca de llanta de a hasta b (ancho w), oscuridad k (0..1).
function fxSkid(ax, az, bx, bz, w, k) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
  if (L < 0.05 || L > 3) return;
  const nx = -dz / L * w / 2, nz = dx / L * w / 2;
  const ya = groundH(ax, az) + 0.045, yb = groundH(bx, bz) + 0.045;
  const P = FX.skid.geometry.attributes.position, C = FX.skid.geometry.attributes.color, i = FX.skidI * 6;
  const v = [[ax + nx, ya, az + nz], [ax - nx, ya, az - nz], [bx + nx, yb, bz + nz], [ax - nx, ya, az - nz], [bx - nx, yb, bz - nz], [bx + nx, yb, bz + nz]];
  const c = 1 - 0.7 * k;                                             // con mezcla multiplicativa: 1 = no se ve
  v.forEach((p, j) => { P.setXYZ(i + j, p[0], p[1], p[2]); C.setXYZ(i + j, c, c, c); });
  FX.skidI = (FX.skidI + 1) % FX.skidN; FX.skidUsed = Math.min(FX.skidN, FX.skidUsed + 1);
  FX.skid.geometry.setDrawRange(0, FX.skidUsed * 6);
  P.needsUpdate = true; C.needsUpdate = true;
}
// Fuego: llamas cortas y brillantes que suben (motor destrozado, nitro).
const FIRE_HOT = new THREE.Color(0xffb040), FIRE_END = new THREE.Color(0xff4a10);
function fxFire(x, y, z, n, size = 0.9, col = 0xff7a20) {
  for (let i = 0; i < n; i++) {
    if (FX.fire.length >= FX.max.fire) FX.fire.shift();
    FX.fire.push({ x: x + (Math.random() - 0.5) * 0.4, y, z: z + (Math.random() - 0.5) * 0.4, s0: size * (0.6 + Math.random() * 0.6), life: 0.35 + Math.random() * 0.3, t: 0, vy: 1.5 + Math.random() * 1.5, rot: Math.random() * 6.28, blue: col !== 0xff7a20 ? new THREE.Color(col) : null });
  }
}
const GLASS_C = new THREE.Color(0xbfe3ff);
function fxBits(x, y, z, n, color, spd = 6) {
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    const s = 0.1 + Math.random() * 0.25;
    FX.debris.push({ x, y, z, s, col: i % 3 ? c : GLASS_C, vx: (Math.random() - 0.5) * spd, vy: 2 + Math.random() * spd * 0.5, vz: (Math.random() - 0.5) * spd, ax: Math.random() * 10, rx: 0, ry: 0, t: 0 });
  }
  while (FX.debris.length > DEBRIS_N) FX.debris.shift();
}
const _fxM = new THREE.Matrix4(), _fxQ = new THREE.Quaternion(), _fxE = new THREE.Euler(), _fxV = new THREE.Vector3(), _fxS = new THREE.Vector3(), _fxC = new THREE.Color();
function fxUpdate(dt) {
  const pos = FX.sparks.geometry.attributes.position.array;
  FX.sp = FX.sp.filter(p => (p.life -= dt) > 0);
  FX.sp.forEach((p, i) => { p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  FX.sparks.geometry.setDrawRange(0, FX.sp.length); FX.sparks.geometry.attributes.position.needsUpdate = true;
  for (const p of FX.smoke) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt; p.rot += p.spin * dt; }
  FX.smoke = FX.smoke.filter(p => p.t < p.life);
  for (const p of FX.fire) { p.t += dt; p.y += p.vy * dt; }
  FX.fire = FX.fire.filter(p => p.t < p.life);
  for (const d of FX.debris) {
    d.t += dt;
    if (d.rest) continue;
    d.vy -= 9.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.ax * dt; d.ry += d.ax * 0.7 * dt;
    const gy = groundH(d.x, d.z) + 0.05;
    if (d.y < gy) { d.y = gy; d.vy = Math.abs(d.vy) * 0.3; d.vx *= 0.5; d.vz *= 0.5; d.ax *= 0.5; if (Math.abs(d.vy) < 0.5) d.rest = true; }
  }
  fxWrite();
}
// Copia las partículas vivas a los atributos (del fondo hacia la cámara, para que el humo tape bien).
function fxWrite() {
  const L = FX.list; L.length = 0;
  for (const p of FX.smoke) L.push(p);
  for (const p of FX.fire) L.push(p);
  const cam = W.camera.matrixWorld.elements, cx = cam[12], cy = cam[13], cz = cam[14];
  for (const p of L) p.d = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2;
  L.sort((a, b) => b.d - a.d);
  const P = FX.iPos.array, C = FX.iCol.array, M = FX.iMisc.array, n = Math.min(L.length, FX_N);
  for (let i = 0; i < n; i++) {
    const p = L[i];
    P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
    if (p.s0 !== undefined) {
      // fuego: amarillo al nacer, naranja al apagarse; se achica
      const k = p.t / p.life;
      _fxC.copy(p.blue || (k < 0.4 ? FIRE_HOT : FIRE_END)).multiplyScalar(2.2);
      C[i * 4] = _fxC.r; C[i * 4 + 1] = _fxC.g; C[i * 4 + 2] = _fxC.b; C[i * 4 + 3] = 0.9 * (1 - k);
      M[i * 3] = p.s0 * (1 - k * 0.6); M[i * 3 + 1] = p.rot; M[i * 3 + 2] = 1;
    } else {
      C[i * 4] = p.col.r; C[i * 4 + 1] = p.col.g; C[i * 4 + 2] = p.col.b; C[i * 4 + 3] = Math.max(0, 0.6 * (1 - p.t / p.life)) * Math.min(1, p.t * 8);
      M[i * 3] = p.size * 1.25; M[i * 3 + 1] = p.rot; M[i * 3 + 2] = 0;
    }
  }
  FX.mesh.geometry.instanceCount = n;
  FX.iPos.needsUpdate = FX.iCol.needsUpdate = FX.iMisc.needsUpdate = true;
  // piezas
  const B = FX.bits;
  FX.debris.forEach((d, i) => {
    _fxE.set(d.rx, d.ry, 0); _fxQ.setFromEuler(_fxE);
    B.setMatrixAt(i, _fxM.compose(_fxV.set(d.x, d.y, d.z), _fxQ, _fxS.setScalar(d.s)));
    B.setColorAt(i, d.col);
  });
  B.count = FX.debris.length;
  if (B.count) { B.instanceMatrix.needsUpdate = true; B.instanceColor.needsUpdate = true; }
}

function updateWorld(t, dt) {
  W.t = t;
  for (const f of W.anim) f(t, dt);
  updateLights(t);
  fxUpdate(dt);
}

// ---------- detalles de la calle ----------
// Carros estacionados (una malla por tipo, pintados por instancia), buzones, arbustos, tachos,
// grifos contra incendios y postes de luz con cables.
function buildProps(G) {
  const r = rng(555);
  // carros estacionados junto a la vereda
  const spots = [];
  for (const n of CITY.nodes) for (const nb of n.nb) {
    const m = nodeAt(nb);
    if (m.id < n.id) continue;
    const ax = n.x === m.x ? 'z' : 'x', c = ax === 'z' ? n.x : n.z, a = ax === 'z' ? Math.min(n.z, m.z) : Math.min(n.x, m.x), b = a + 90;
    if (ax === 'z' && Math.min(n.z, m.z) === -45) continue;                     // puente
    if (ax === 'x' && c === 135 && a >= 45 && a < 135) continue;                // túnel
    for (let t = a + 20; t < b - 20; t += 7) for (const sd of [-1, 1]) {
      if (r() > 0.32) continue;
      const x = ax === 'z' ? c + sd * (ROAD_W / 2 - 1.02) : t, z = ax === 'z' ? t : c + sd * (ROAD_W / 2 - 1.02);
      if (Math.abs(x) > 228 || Math.abs(z) > 228) continue;
      if (CITY.ramps.some(q => Math.hypot(q.x - x, q.z - z) < 14)) continue;
      // estacionado en su sentido de circulación (a la derecha)
      const h = ax === 'z' ? (sd < 0 ? 0 : Math.PI) : (sd > 0 ? Math.PI / 2 : -Math.PI / 2);
      spots.push({ x, z, h, ax });
    }
  }
  const types = ['sedan', 'hatch', 'hatch', 'sedan', 'pickup', 'van', 'muscle'];
  const colors = [0xd8d8d8, 0x2a2a2e, 0xb83228, 0x2f5fb0, 0xe2c23a, 0x3c7a4a, 0x8a8f96, 0xf4f4f4, 0x6a3a8a, 0x8a2a20, 0x1f3f6a];
  const byType = {};
  for (const sp of spots) { const t = types[Math.floor(r() * types.length)]; (byType[t] = byType[t] || []).push(sp); }
  // cada tipo con dos niveles (liviano cerca, muy liviano lejos) y la sombra con el muy liviano
  const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), mat = carLodMat();
  for (const t in byType) {
    const B = BODY[t], xlo = carLodGeo(t, 2);
    const items = byType[t].map(sp => {
      e.set(0, sp.h, 0); q.setFromEuler(e);
      const it = { x: sp.x, y: 0, z: sp.z, m: M4().compose(new THREE.Vector3(sp.x, 0, sp.z), q, one), c: new THREE.Color(colors[Math.floor(r() * colors.length)]) };
      const hl = B.L / 2, hw = B.W / 2 - 0.15;
      if (sp.ax === 'z') addSolid(sp.x - hw, sp.z - hl, sp.x + hw, sp.z + hl, 1.6, 'estacionado'); else addSolid(sp.x - hl, sp.z - hw, sp.x + hl, sp.z + hw, 1.6, 'estacionado');
      return it;
    });
    lodSet(G, items, [{ geo: carLodGeo(t, 1), mat, far: 60 }, { geo: xlo, mat, far: 270 }], { shadow: xlo });
  }
  // buzones
  const mb = mergeGeos([{ ...boxAt(0.08, 1.1, 0.08, 0, 0.55, 0), c: 0x3a3f46 }, { geo: new THREE.CylinderGeometry(0.2, 0.2, 0.5, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 1.15, 0), c: 0x2f5fb0 }, { ...boxAt(0.4, 0.2, 0.5, 0, 1.05, 0), c: 0x2f5fb0 }]);
  lodSet(G, CITY.mailboxes.map(p => { e.set(0, p.r, 0); q.setFromEuler(e); return { x: p.x, y: 0, z: p.z, m: M4().compose(new THREE.Vector3(p.x, 0, p.z), q, one) }; }),
    [{ geo: mb, mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.4 }), far: 150 }]);
  // arbustos: bolas facetadas; de lejos y para la sombra, más simples
  const bush = d => mergeGeos([{ geo: new THREE.IcosahedronGeometry(0.7, d), c: 0x3f7a34 }, { geo: new THREE.IcosahedronGeometry(0.5, d).translate(0.45, 0.1, 0.2), c: 0x4c8a3c }, { geo: new THREE.IcosahedronGeometry(0.45, d).translate(-0.4, 0.05, -0.2), c: 0x568f3a }]);
  const bmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), b0 = bush(0);
  lodSet(G, CITY.bushes.map(b => ({ x: b.x, y: b.s * 0.45, z: b.z, s: b.s, m: M4().compose(new THREE.Vector3(b.x, b.s * 0.45, b.z), q.identity(), new THREE.Vector3(b.s, b.s * 0.8, b.s)) })),
    [{ geo: bush(1), mat: bmat, far: 55 }, { geo: b0, mat: bmat, far: 220 }], { shadow: b0 });
  // tachos de basura y grifos contra incendios en las esquinas
  const small = [];
  for (const n of CITY.nodes) {
    if (Math.abs(n.x) > 230 || Math.abs(n.z) > 230 || Math.abs(n.z) < 50) continue;
    const cx = n.x + (ROAD_W / 2 + 2.2), cz = n.z + (ROAD_W / 2 + 2.2);
    small.push({ geo: new THREE.CylinderGeometry(0.32, 0.28, 0.95, 12).translate(cx + 2.5, 0.48, cz), c: 0x2e6b3a }, { geo: new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12).translate(cx + 2.5, 0.98, cz), c: 0x1f4a28 });
    small.push({ geo: new THREE.CylinderGeometry(0.15, 0.18, 0.7, 10).translate(cx - 0.6, 0.35, cz + 2.5), c: 0xd8282c }, { geo: new THREE.SphereGeometry(0.16, 10, 6).translate(cx - 0.6, 0.72, cz + 2.5), c: 0xd8282c });
  }
  G.add(new THREE.Mesh(mergeGeos(small), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 })));
  // postes de luz eléctrica con cables a lo largo de las calles este-oeste
  const poles = [], wires = [];
  for (const gz of GRID) {
    if (Math.abs(gz) < 50) continue;
    const z = gz + ROAD_W / 2 + 4.2;
    let prev = null;
    for (let x = -228; x <= 228; x += 26) {
      if (GRID.some(g => Math.abs(x - g) < 9) || (gz === 135 && x > HILL.x0 - 4 && x < HILL.x1 + 4)) { prev = null; continue; }
      poles.push({ geo: new THREE.CylinderGeometry(0.13, 0.17, 9, 8).translate(x, 4.5, z), c: 0x6a4a32 }, { ...boxAt(0.12, 0.12, 2.2, x, 8.4, z), c: 0x5a3e2a });
      const tops = [-0.9, 0, 0.9].map(o => new THREE.Vector3(x, 8.5, z + o));
      if (prev) for (let k = 0; k < 3; k++) {
        const a = prev[k], b = tops[k];
        for (let i = 0; i < 8; i++) {
          const t0 = i / 8, t1 = (i + 1) / 8, sag = t => -Math.sin(t * Math.PI) * 0.7;
          wires.push(a.x + (b.x - a.x) * t0, a.y + sag(t0), a.z, a.x + (b.x - a.x) * t1, a.y + sag(t1), a.z);
        }
      }
      prev = tops;
    }
  }
  const pm = new THREE.Mesh(mergeGeos(poles), new THREE.MeshLambertMaterial({ vertexColors: true }));
  G.add(pm); shadowCast(pm.geometry);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
  G.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1a1a1a })));
}

// Nubes: manchas suaves en el cielo (de día y al atardecer).
function buildClouds(G) {
  const tex = canvasTex(256, 128, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * (w - 80), y = 50 + Math.random() * 40, r = 18 + Math.random() * 30;
      const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
  // todas en una sola malla (1 llamada de dibujo): cuadros que miran al centro del barrio; están
  // tan lejos que desde cualquier calle se ven casi de frente
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
  W.cloudMat = mat;
  const grp = new THREE.Group(), r = rng(31), parts = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 500 + r() * 1100, x = Math.cos(a) * d, z = Math.sin(a) * d, y = 160 + r() * 160;
    parts.push({ geo: new THREE.PlaneGeometry(380 + r() * 300, 140 + r() * 80), m: M4().makeRotationY(Math.atan2(-x, -z)).setPosition(x, y, z), c: 0xffffff });
  }
  grp.add(new THREE.Mesh(mergeGeos(parts), mat));
  W.clouds = grp; W.scene.add(grp);
  W.anim.push(t => { grp.rotation.y = t * 0.004; });
}
