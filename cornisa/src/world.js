'use strict';
// Drive In The Serrín: escena 3D. Renderizador, cielo, luces, la montaña (carretera, cerro, valle,
// montañas lejanas, árboles, barandas, letreros, monedas, rocas, arcos) y el clima.

const W = { anim: [], level: null, T: null, theme: null, coinMesh: null, rockMeshes: [], weather: null, flash: 0 };

function initWorld(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  W.renderer = r;
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 5000);
  W.scene.add(W.camera);
  // cielo: esfera con degradado (no le afecta la niebla)
  W.skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() }, flash: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; uniform float flash; varying vec3 vP;' +
      'void main(){ float h = clamp(vP.y * 1.6 + 0.08, 0.0, 1.0); vec3 c = mix(bot, top, pow(h, 0.7));' +
      'float sd = max(dot(normalize(vP), sunDir), 0.0); c += sunCol * (pow(sd, 400.0) * 1.6 + pow(sd, 12.0) * 0.18);' +
      'c += vec3(flash); gl_FragColor = vec4(c, 1.0); }',
  });
  W.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), W.skyMat);
  W.sky.frustumCulled = false;
  W.sky.renderOrder = -1;
  W.scene.add(W.sky);
  W.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  W.scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight(0xffffff, 2);
  W.sun.shadow.mapSize.set(2048, 2048);
  const sc = W.sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 260;
  W.sun.shadow.bias = -0.0006; W.sun.shadow.normalBias = 0.04;
  W.scene.add(W.sun, W.sun.target);
  W.sunDir = new THREE.Vector3(0.45, 0.62, 0.35).normalize();
  W.scene.fog = new THREE.Fog(0xffffff, 100, 1000);
  W.asphalt = asphaltTexture();
  fxInit();
  applyQuality();
}

function applyQuality() {
  const hi = save.opt.quality !== 'baja';
  W.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 1.6 : 1));
  W.renderer.shadowMap.enabled = hi;
  W.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  W.sun.castShadow = hi;
  W.scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
}

function resizeWorld() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h;
  // en vertical (celular) se abre más el ángulo para ver la carretera
  W.camera.fov = w < h ? 92 : 68;
  W.camera.updateProjectionMatrix();
}

// ---------- texturas hechas en canvas ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function asphaltTexture() {
  return canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#5b5b5d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // bermas de tierra
    g.fillStyle = '#8b7d66'; g.fillRect(0, 0, 20, h); g.fillRect(w - 20, 0, 20, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = Math.random() < 0.5 ? '#76695a' : '#9c8d74'; const x = Math.random() < 0.5 ? Math.random() * 20 : w - Math.random() * 20; g.fillRect(x, Math.random() * h, 3, 3); }
    // líneas de borde blancas y eje amarillo discontinuo
    g.fillStyle = '#e8e6df'; g.fillRect(26, 0, 6, h); g.fillRect(w - 32, 0, 6, h);
    g.fillStyle = '#e9b52c'; g.fillRect(w / 2 - 4, 0, 8, h * 0.45);
    // manchas
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(30,30,30,0.12)'; g.beginPath(); g.ellipse(40 + Math.random() * (w - 80), Math.random() * h, 10 + Math.random() * 30, 20 + Math.random() * 60, 0, 0, 7); g.fill(); }
  }, true);
}
function chevronTexture() {
  return canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#f4c21a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#121212';
    g.lineWidth = 0;
    for (const ox of [18, 58]) {
      g.beginPath(); g.moveTo(ox + 30, 12); g.lineTo(ox + 50, 12); g.lineTo(ox + 22, 48); g.lineTo(ox + 50, 84); g.lineTo(ox + 30, 84); g.lineTo(ox + 2, 48); g.closePath(); g.fill();
    }
    g.strokeStyle = '#121212'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
}
function bannerTexture(text, a, b) {
  return canvasTex(512, 96, (g, w, h) => {
    for (let x = 0; x < w; x += 24) for (let y = 0; y < h; y += 24) { g.fillStyle = ((x + y) / 24) % 2 ? a : b; g.fillRect(x, y, 24, 24); }
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(90, 14, w - 180, h - 28);
    g.fillStyle = '#fff'; g.font = '900 52px Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

// Junta varias geometrías (con color por vértice) en una sola para dibujarlas de una vez.
function mergeGeos(parts) {
  let count = 0;
  const flat = parts.map(p => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; count += g.attributes.position.count; return { g, m: p.m, c: p.c, cf: p.cf }; });
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const v = new THREE.Vector3(), cc = new THREE.Color();
  let o = 0;
  for (const p of flat) {
    const a = p.g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      v.fromBufferAttribute(a, i);
      if (p.m) v.applyMatrix4(p.m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      if (p.cf) p.cf(v, cc); else cc.set(p.c);
      col[o * 3] = cc.r; col[o * 3 + 1] = cc.g; col[o * 3 + 2] = cc.b;
      o++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function disposeLevel() {
  fxClear();
  W.rails = null;
  if (!W.level) return;
  W.scene.remove(W.level);
  W.level.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach(m => { if (m.map && m.map !== W.asphalt) m.map.dispose(); m.dispose(); });
  });
  W.level = null; W.anim = []; W.rockMeshes = []; W.weather = null;
}

// Arma la montaña entera para el nivel L. Devuelve los datos de la ruta.
function buildLevel(L) {
  disposeLevel();
  const T = buildRoad(L), th = THEMES[L.theme];
  W.T = T; W.theme = th;
  const G = new THREE.Group();
  W.level = G;
  W.scene.add(G);
  // cielo, niebla y luces del ambiente
  W.skyMat.uniforms.top.value.set(th.skyTop);
  W.skyMat.uniforms.bot.value.set(th.skyBot);
  W.skyMat.uniforms.sunCol.value.set(th.night ? 0x000000 : th.sun).multiplyScalar(th.rain ? 0.15 : 1);
  W.sunDir.set(th.night ? -0.3 : 0.45, 0.6, 0.35).normalize();
  if (L.theme === 'cima') W.sunDir.set(-0.2, 0.12, 0.9).normalize();
  W.skyMat.uniforms.sunDir.value.copy(W.sunDir);
  W.scene.fog.color.set(th.fog); W.scene.fog.near = th.fogNear; W.scene.fog.far = th.fogFar;
  W.hemi.color.set(th.hemiSky); W.hemi.groundColor.set(th.hemiGround); W.hemi.intensity = th.hemiI;
  W.sun.color.set(th.sun); W.sun.intensity = th.sunI;
  W.renderer.toneMappingExposure = th.night ? 1.25 : 1.0;

  G.add(roadMesh(T));
  G.add(lineMesh(T));
  G.add(terrainMesh(T, 0, th), terrainMesh(T, 1, th));
  G.add(valleyMesh(T, th));
  G.add(farMountains(T, th));
  const props = propsMesh(T, th);
  if (props) G.add(props);
  G.add(guardRails(T, th));
  G.add(signsMesh(T));
  G.add(coinsMesh(T));
  for (const rk of T.rocks) G.add(rockMesh(T, rk, th));
  G.add(arch(T, 14, 'SALIDA', '#111', '#eee'));
  G.add(arch(T, T.n - 45, L.id === 8 ? 'CIMA' : 'META', '#111', '#fff'));
  if (th.night) G.add(stars());
  W.weather = weather(th);
  if (W.weather) G.add(W.weather.obj);
  return T;
}

function roadMesh(T) {
  const step = 2, m = Math.floor((T.n - 1) / step) + 1;
  const offs = [-(T.hw + SHOULDER), -T.hw, T.hw, T.hw + SHOULDER], us = [0, 0.08, 0.92, 1];
  const pos = new Float32Array(m * 4 * 3), uv = new Float32Array(m * 4 * 2), idx = [];
  for (let j = 0; j < m; j++) {
    const s = Math.min(T.n - 1, j * step);
    for (let q = 0; q < 4; q++) {
      const o = (j * 4 + q);
      pos[o * 3] = T.x[s] + T.nx[s] * offs[q];
      pos[o * 3 + 1] = T.y[s] + (q === 0 || q === 3 ? -0.02 : 0.02);
      pos[o * 3 + 2] = T.z[s] + T.nz[s] * offs[q];
      uv[o * 2] = us[q]; uv[o * 2 + 1] = s / 16;
    }
    if (j < m - 1) for (let q = 0; q < 3; q++) {
      const a = j * 4 + q, b = a + 1, c = a + 4, d = a + 5;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: W.asphalt, side: THREE.DoubleSide });
  if (W.theme.snow) mat.color.set(0xe4e8ee);
  if (W.theme.rain) mat.color.set(0x8a8e96);
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function terrainMesh(T, side, th) {
  const m = T.pm, N = PROF_N, sgn = side === 0 ? -1 : 1;
  const pos = new Float32Array(m * N * 3), col = new Float32Array(m * N * 3), idx = [];
  const rock = th.rock.map(c => new THREE.Color(c)), top = new THREE.Color(th.top), gr = new THREE.Color(th.ground), sh = new THREE.Color(th.shoulder);
  const c = new THREE.Color();
  for (let j = 0; j < m; j++) {
    const s = Math.min(T.n - 1, j * PROF_STEP);
    const w = side === 0 ? T.wL[s] : T.wR[s];
    for (let q = 0; q < N; q++) {
      const o = j * N + q, off = T.po[side][o], y = T.ph[side][o];
      const x = T.x[s] + T.nx[s] * off * sgn, z = T.z[s] + T.nz[s] * off * sgn;
      pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
      const nn = fbm(x * 0.08, z * 0.08);
      if (q === 0) c.copy(sh);
      else if (q === N - 1 && w > 0.5) c.copy(gr);
      else {
        const band = Math.floor(y / 3.2 + nn * 2.2);
        c.copy(rock[((band % rock.length) + rock.length) % rock.length]);
        const rel = y - T.y[s];
        if (q >= 5 && rel > 25) c.lerp(top, Math.min(1, (rel - 25) / 20) * (th.snow ? 0.95 : 0.8));
        if (th.snow && q >= 2 && rel > -30 && nn > 0.55) c.lerp(top, 0.7);
        if (q === 1 && w < 0.5) c.lerp(sh, 0.5);
      }
      const t = 0.9 + hash2(j * 7 + q, side) * 0.2;
      col[o * 3] = c.r * t; col[o * 3 + 1] = c.g * t; col[o * 3 + 2] = c.b * t;
    }
    if (j < m - 1) for (let q = 0; q < N - 1; q++) {
      const a = j * N + q, b = a + 1, cc = a + N, d = cc + 1;
      idx.push(a, cc, b, b, cc, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  return mesh;
}

function valleyMesh(T, th) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let s = 0; s < T.n; s += 10) { x0 = Math.min(x0, T.x[s]); x1 = Math.max(x1, T.x[s]); z0 = Math.min(z0, T.z[s]); z1 = Math.max(z1, T.z[s]); }
  const size = Math.max(x1 - x0, z1 - z0) + 4000;
  const g = new THREE.PlaneGeometry(size, size, 40, 40);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), base = new THREE.Color(th.ground), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const nn = fbm(p.getX(i) * 0.004 + 3, p.getZ(i) * 0.004);
    p.setY(i, (nn - 0.5) * 8);
    c.copy(base).multiplyScalar(0.8 + nn * 0.4);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mat = th.lava
    ? new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff })
    : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set((x0 + x1) / 2, T.valleyY - 1, (z0 + z1) / 2);
  if (th.lava) {
    mat.color.setRGB(1.6, 1.0, 0.7);
    W.anim.push(t => { mat.color.setRGB(1.5 + Math.sin(t * 1.7) * 0.25, 0.85 + Math.sin(t * 2.3) * 0.12, 0.6); });
  }
  return mesh;
}

function farMountains(T, th) {
  const r = rng(T.L.seed * 7 + 3), parts = [];
  const base = new THREE.Color(th.far), snowC = new THREE.Color(th.snow ? 0xf4f7fb : 0xe9e4de);
  const near = (x, z, lim) => { for (let s = 0; s < T.n; s += 25) { const dx = x - T.x[s], dz = z - T.z[s]; if (dx * dx + dz * dz < lim * lim) return true; } return false; };
  let tries = 0;
  while (parts.length < 46 && tries++ < 400) {
    const s = Math.floor(r() * T.n), side = r() < 0.5 ? -1 : 1, dist = 260 + r() * 900;
    const rad = 140 + r() * 260, hgt = 160 + r() * 420 + (T.ymax - T.valleyY) * 0.6;
    const x = T.x[s] + T.nx[s] * dist * side, z = T.z[s] + T.nz[s] * dist * side;
    if (near(x, z, rad * 0.9 + 70)) continue;
    const geo = new THREE.ConeGeometry(rad, hgt, 7, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const yy = p.getY(i);
      if (yy < hgt / 2 - 1) { p.setX(i, p.getX(i) * (0.8 + r() * 0.4)); p.setZ(i, p.getZ(i) * (0.8 + r() * 0.4)); p.setY(i, yy + (r() - 0.5) * hgt * 0.08); }
    }
    const mtx = new THREE.Matrix4().makeRotationY(r() * 6).setPosition(x, T.valleyY + hgt / 2 - 5, z);
    const snowLine = T.valleyY + hgt * (th.snow ? 0.45 : 0.78);
    const tall = hgt > 420 || th.snow;
    parts.push({ geo, m: mtx, cf: (v, cc) => { cc.copy(base).multiplyScalar(0.85 + hash2(v.x | 0, v.z | 0) * 0.3); if (tall && v.y > snowLine) cc.lerp(snowC, 0.85); } });
  }
  const g = mergeGeos(parts);
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

function treeGeo(snow) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5); trunk.translate(0, 0.7, 0);
  parts.push({ geo: trunk, c: 0x5a3c26 });
  for (let q = 0; q < 3; q++) {
    const cone = new THREE.ConeGeometry(1.6 - q * 0.38, 2.2, 6); cone.translate(0, 1.9 + q * 1.15, 0);
    parts.push({ geo: cone, c: snow ? (q === 2 ? 0xf2f6fa : 0x3e5e46) : (q % 2 ? 0x2f5a2c : 0x386a32) });
  }
  if (snow) { const cap = new THREE.ConeGeometry(0.9, 0.9, 6); cap.translate(0, 3.6, 0); parts.push({ geo: cap, c: 0xf6f9fc }); }
  return mergeGeos(parts);
}
function propsMesh(T, th) {
  let geo, count, sc0 = 1;
  if (th.props === 'pino' || th.props === 'pinoNieve') { geo = treeGeo(th.props === 'pinoNieve'); count = 900; sc0 = 1.6; }
  else if (th.props === 'arbusto') {
    geo = mergeGeos([{ geo: new THREE.IcosahedronGeometry(0.55, 0), c: 0x7d7a3e }, { geo: new THREE.IcosahedronGeometry(0.4, 0).translate(0.4, 0.15, 0.1), c: 0x6b6a36 }]);
    count = 380;
  } else {
    geo = mergeGeos([{ geo: new THREE.DodecahedronGeometry(1, 0), c: th.rock[0] }]);
    count = 320;
  }
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), count);
  const r = rng(T.L.seed + 99), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), scl = new THREE.Vector3();
  let k = 0;
  for (let tries = 0; k < count && tries < count * 6; tries++) {
    let x, y, z;
    if (r() < 0.35) {
      // en el valle, cerca de la ruta (se ven desde arriba)
      const s = Math.floor(r() * T.n), side = r() < 0.5 ? -1 : 1, dist = 60 + r() * 260;
      x = T.x[s] + T.nx[s] * dist * side; z = T.z[s] + T.nz[s] * dist * side; y = T.valleyY + (fbm(x * 0.004 + 3, z * 0.004) - 0.5) * 8 - 1;
      const sd = side < 0 ? 0 : 1;
      const lim = T.po[sd][Math.min(T.pm - 1, Math.round(s / PROF_STEP)) * PROF_N + PROF_N - 1];
      if (dist < lim) continue;
    } else {
      const j = Math.floor(r() * T.pm), side = r() < 0.5 ? 0 : 1, qq = 2 + Math.floor(r() * 5);
      const s = Math.min(T.n - 1, j * PROF_STEP), w = side === 0 ? T.wL[s] : T.wR[s];
      if (w > 0.5 && qq < 5) continue;   // no en la cara del barranco
      const off = T.po[side][j * PROF_N + qq] + r() * 3, sg = side === 0 ? -1 : 1;
      x = T.x[s] + T.nx[s] * off * sg; z = T.z[s] + T.nz[s] * off * sg; y = profileHeight(T, s, side, off) - 0.2;
    }
    const sc = sc0 * (0.7 + r() * 0.7);
    e.set(0, r() * 6.3, 0); q.setFromEuler(e); v.set(x, y, z); scl.set(sc, sc * (0.85 + r() * 0.4), sc);
    mtx.compose(v, q, scl);
    mesh.setMatrixAt(k++, mtx);
  }
  mesh.count = k;
  mesh.castShadow = false;
  return mesh;
}

function guardRails(T, th) {
  const posts = [], rails = [];
  for (const [arr, sgn] of [[T.gL, -1], [T.gR, 1]]) {
    let prev = null;
    for (let s = 0; s < T.n; s += 3) {
      if (!arr[s]) { prev = null; continue; }
      const off = (T.hw + SHOULDER - 0.18) * sgn;
      const p = new THREE.Vector3(T.x[s] + T.nx[s] * off, T.y[s], T.z[s] + T.nz[s] * off);
      p.s = s; p.side = sgn < 0 ? 0 : 1;
      posts.push(p);
      if (prev) rails.push([prev, p]);
      prev = p;
    }
  }
  const G = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: th.night ? 0xe8eef6 : 0xb9bec4 });
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), new THREE.MeshLambertMaterial({ color: 0x8d9298 }), Math.max(1, posts.length));
  const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.32, 1), mat, Math.max(1, rails.length));
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  posts.forEach((p, i) => { mtx.makeTranslation(p.x, p.y + 0.45, p.z); pm.setMatrixAt(i, mtx); });
  rails.forEach(([a, b], i) => {
    v.subVectors(b, a); const len = v.length();
    q.setFromAxisAngle(up, Math.atan2(v.x, v.z));
    sc.set(1, 1, len + 0.05);
    mtx.compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.65, (a.z + b.z) / 2), q, sc);
    rm.setMatrixAt(i, mtx);
  });
  pm.count = posts.length; rm.count = rails.length;
  W.rails = { pm, rm, posts: posts.map(p => ({ p, s: p.s, side: p.side })), rails: rails.map(([a, b]) => ({ s: a.s, side: a.side })) };
  rm.castShadow = true;
  G.add(pm, rm);
  return G;
}

function signsMesh(T) {
  const G = new THREE.Group();
  const n = Math.max(1, T.signs.length);
  const board = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshLambertMaterial({ map: chevronTexture(), side: THREE.DoubleSide, emissive: 0x332600 }), n);
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), new THREE.MeshLambertMaterial({ color: 0x333333 }), n);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  T.signs.forEach((sg, i) => {
    const off = (T.hw + SHOULDER + 0.35) * sg.side;
    const x = T.x[sg.s] + T.nx[sg.s] * off, z = T.z[sg.s] + T.nz[sg.s] * off, y = T.y[sg.s];
    q.setFromAxisAngle(up, T.h[sg.s] + Math.PI);
    mtx.compose(new THREE.Vector3(x, y + 1.55, z), q, new THREE.Vector3(sg.dir < 0 ? 1 : -1, 1, 1));
    board.setMatrixAt(i, mtx);
    mtx.makeTranslation(x, y + 0.6, z);
    post.setMatrixAt(i, mtx);
  });
  board.count = post.count = T.signs.length;
  G.add(board, post);
  return G;
}

function coinsMesh(T) {
  const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 18);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc83a, metalness: 0.6, roughness: 0.3, emissive: 0x8a5a00, emissiveIntensity: 0.6 });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, T.coins.length));
  mesh.count = T.coins.length;
  for (const c of T.coins) { const p = roadPoint(T, c.s, c.d); c.x = p.x; c.y = p.y + 0.9; c.z = p.z; }
  W.coinMesh = mesh;
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  W.anim.push(t => {
    T.coins.forEach((c, i) => {
      if (c.got && c.pop > 1) { sc.set(0, 0, 0); }
      else if (c.got) { c.pop += 0.06; sc.setScalar(1 + c.pop * 0.6); }
      else sc.setScalar(1);
      e.set(0, t * 3 + i * 0.4, 0); q.setFromEuler(e);
      v.set(c.x, c.y + Math.sin(t * 3 + i) * 0.12 + (c.got ? c.pop * 1.5 : 0), c.z);
      mtx.compose(v, q, sc);
      mesh.setMatrixAt(i, mtx);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh;
}

function rockMesh(T, rk, th) {
  const g = new THREE.DodecahedronGeometry(rk.rad, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.75);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: th.rock[2], flatShading: true }));
  const pt = roadPoint(T, rk.s, rk.d);
  m.position.set(pt.x, pt.y + rk.rad * 0.55, pt.z);
  m.rotation.set(rk.s, rk.d, rk.rad * 9);
  m.castShadow = true;
  rk.x = pt.x; rk.z = pt.z;
  W.rockMeshes.push(m);
  return m;
}

function arch(T, s, text, a, b) {
  const G = new THREE.Group();
  const i = Math.max(0, Math.min(T.n - 1, s));
  const hw = T.hw + SHOULDER + 0.3;
  const pmat = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  for (const sg of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5.2, 0.35), pmat);
    p.position.set(T.x[i] + T.nx[i] * hw * sg, T.y[i] + 2.6, T.z[i] + T.nz[i] * hw * sg);
    G.add(p);
  }
  const tex = bannerTexture(text, a, b);
  const ban = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.4, 1.1, 0.2), [pmat, pmat, pmat, pmat, new THREE.MeshBasicMaterial({ map: tex }), new THREE.MeshBasicMaterial({ map: tex })]);
  ban.position.set(T.x[i], T.y[i] + 4.9, T.z[i]);
  ban.rotation.y = T.h[i];
  G.add(ban);
  // línea a cuadros en el piso
  const line = new THREE.Mesh(new THREE.PlaneGeometry(T.hw * 2, 1.2), new THREE.MeshLambertMaterial({ map: canvasTex(128, 16, (g, w, h) => { for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) { g.fillStyle = ((x + y) / 8) % 2 ? '#111' : '#f4f4f4'; g.fillRect(x, y, 8, 8); } }) }));
  line.rotation.set(-Math.PI / 2, T.h[i], 0, 'YXZ');
  line.position.set(T.x[i], T.y[i] + 0.04, T.z[i]);
  G.add(line);
  return G;
}

function stars() {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * 6.283, rr = Math.sqrt(1 - u * u);
    const y = Math.abs(u) * 0.9 + 0.08;
    pos[i * 3] = Math.cos(a) * rr * 2600; pos[i * 3 + 1] = y * 2600; pos[i * 3 + 2] = Math.sin(a) * rr * 2600;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false }));
  p.frustumCulled = false;
  W.anim.push(() => { p.position.copy(W.camera.getWorldPosition(new THREE.Vector3())); });
  return p;
}

// Lluvia, nieve o ceniza alrededor de la cámara.
function weather(th) {
  let kind = th.rain ? 'lluvia' : th.snow ? 'nieve' : th.lava ? 'ceniza' : null;
  if (!kind) return null;
  const n = kind === 'lluvia' ? 1800 : 1200, B = kind === 'lluvia' ? 40 : 50;
  const pos = new Float32Array(n * (kind === 'lluvia' ? 6 : 3));
  const seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { seed[i * 3] = (Math.random() - 0.5) * B; seed[i * 3 + 1] = Math.random() * B; seed[i * 3 + 2] = (Math.random() - 0.5) * B; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  let obj;
  if (kind === 'lluvia') obj = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab4c4, transparent: true, opacity: 0.55 }));
  else obj = new THREE.Points(g, new THREE.PointsMaterial({ color: kind === 'nieve' ? 0xffffff : 0x8a6a60, size: kind === 'nieve' ? 0.12 : 0.09, transparent: true, opacity: 0.9 }));
  obj.frustumCulled = false;
  const speed = kind === 'lluvia' ? 28 : kind === 'nieve' ? 2.2 : 1.2;
  let fall = 0;
  const cam = new THREE.Vector3();
  const update = (t, dt) => {
    fall += dt * speed;
    W.camera.getWorldPosition(cam);
    for (let i = 0; i < n; i++) {
      let x = seed[i * 3], y = seed[i * 3 + 1] - fall, z = seed[i * 3 + 2];
      if (kind !== 'lluvia') { x += Math.sin(t * 0.7 + i) * 0.8; z += Math.cos(t * 0.5 + i * 1.3) * 0.8; }
      // envuelve dentro de una caja centrada en la cámara
      x = ((x - cam.x) % B + B * 1.5) % B - B / 2 + cam.x;
      z = ((z - cam.z) % B + B * 1.5) % B - B / 2 + cam.z;
      y = ((y - cam.y) % B + B * 1.5) % B - B / 2 + cam.y;
      if (kind === 'lluvia') { pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z; pos[i * 6 + 3] = x; pos[i * 6 + 4] = y + 0.7; pos[i * 6 + 5] = z; }
      else { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
    }
    g.attributes.position.needsUpdate = true;
  };
  return { obj, update, kind };
}

function updateWorld(t, dt) {
  fxUpdate(dt);
  for (const f of W.anim) f(t, dt);
  if (W.weather) W.weather.update(t, dt);
  // rayos en la tormenta
  if (W.theme && W.theme.rain) {
    if (W.flash > 0) W.flash = Math.max(0, W.flash - dt * 2.5);
    else if (Math.random() < dt / 9) { W.flash = 1; if (typeof SFX !== 'undefined') setTimeout(() => SFX.thunder(), 500 + Math.random() * 1500); }
    const f = W.flash > 0.6 || (W.flash > 0.25 && W.flash < 0.4) ? W.flash : 0;
    W.skyMat.uniforms.flash.value = f * 0.6;
    W.hemi.intensity = W.theme.hemiI + f * 3;
  }
}

// ---------- efectos: chispas, humo, polvo y piezas que salen volando ----------
const FX = { sparks: null, smoke: [], debris: [], emit: [] };
function fxInit() {
  const n = 500, pos = new Float32Array(n * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setDrawRange(0, 0);
  FX.sparks = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffc860, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  FX.sparks.frustumCulled = false;
  FX.sp = [];
  W.scene.add(FX.sparks);
  FX.smokeTex = canvasTex(64, 64, (g, w) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
}
function fxClear() {
  for (const p of FX.smoke) W.scene.remove(p.m);
  for (const d of FX.debris) W.scene.remove(d.m);
  FX.smoke = []; FX.debris = []; FX.sp = []; FX.emit = [];
}
function fxSparks(x, y, z, n, spd = 6) {
  for (let i = 0; i < n && FX.sp.length < 500; i++) FX.sp.push({ x, y, z, vx: (Math.random() - 0.5) * spd, vy: Math.random() * spd * 0.7, vz: (Math.random() - 0.5) * spd, life: 0.3 + Math.random() * 0.5 });
}
function fxSmoke(x, y, z, n, col = 0x555555, size = 1.6, life = 2.5) {
  for (let i = 0; i < n; i++) {
    if (FX.smoke.length > 90) { const o = FX.smoke.shift(); W.scene.remove(o.m); o.m.material.dispose(); }
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: FX.smokeTex, color: col, transparent: true, opacity: 0.7, depthWrite: false }));
    m.position.set(x + (Math.random() - 0.5), y + Math.random() * 0.5, z + (Math.random() - 0.5));
    m.scale.setScalar(size * (0.6 + Math.random() * 0.6));
    W.scene.add(m);
    FX.smoke.push({ m, life, t: 0, vy: 0.6 + Math.random() * 1.2, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, grow: size * 0.9 });
  }
}
// Pieza suelta con física simple. mesh puede ser una caja nueva o una pieza clonada del carro.
function fxDebris(mesh, x, y, z, vx, vy, vz) {
  mesh.position.set(x, y, z);
  W.scene.add(mesh);
  FX.debris.push({ m: mesh, vx, vy, vz, ax: (Math.random() - 0.5) * 14, ay: (Math.random() - 0.5) * 14, az: (Math.random() - 0.5) * 14, t: 0, hint: G.C ? G.C.i : 0 });
}
function fxBits(x, y, z, n, mats, spd) {
  for (let i = 0; i < n; i++) {
    const s = 0.12 + Math.random() * 0.35;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.3, s * (0.6 + Math.random())), mats[i % mats.length]);
    m.castShadow = true;
    fxDebris(m, x + (Math.random() - 0.5), y + Math.random(), z + (Math.random() - 0.5), (Math.random() - 0.5) * spd, 2 + Math.random() * spd * 0.6, (Math.random() - 0.5) * spd);
  }
}
// Altura del piso en (x, z): la pista o el cerro.
function groundAt(x, z, hint) {
  const T = W.T;
  if (!T) return -1e9;
  const l = locate(T, x, z, hint);
  const ad = Math.abs(l.d);
  return { y: ad <= T.hw + SHOULDER ? roadY(T, l.s) : profileHeight(T, l.s, l.d < 0 ? 0 : 1, ad), i: l.i };
}
function fxUpdate(dt) {
  if (!FX.sparks) return;
  const pos = FX.sparks.geometry.attributes.position.array;
  FX.sp = FX.sp.filter(p => (p.life -= dt) > 0);
  FX.sp.forEach((p, i) => { p.vy -= 9.8 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; });
  FX.sparks.geometry.setDrawRange(0, FX.sp.length);
  FX.sparks.geometry.attributes.position.needsUpdate = true;
  for (const p of FX.smoke) {
    p.t += dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.scale.addScalar(p.grow * dt);
    p.m.material.opacity = Math.max(0, 0.7 * (1 - p.t / p.life));
  }
  FX.smoke = FX.smoke.filter(p => { if (p.t < p.life) return true; W.scene.remove(p.m); p.m.material.dispose(); return false; });
  for (const d of FX.debris) {
    d.t += dt;
    if (d.rest) continue;
    d.vy -= 9.8 * dt;
    d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
    d.m.rotation.x += d.ax * dt; d.m.rotation.y += d.ay * dt; d.m.rotation.z += d.az * dt;
    const g = groundAt(d.m.position.x, d.m.position.z, d.hint);
    d.hint = g.i;
    if (d.m.position.y < g.y + 0.1) {
      d.m.position.y = g.y + 0.1;
      d.vy = Math.abs(d.vy) * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.ax *= 0.6; d.ay *= 0.6; d.az *= 0.6;
      if (Math.abs(d.vy) < 0.6 && Math.hypot(d.vx, d.vz) < 0.5) d.rest = true;
    }
  }
  // humo que sigue saliendo de algo (el carro destrozado)
  for (const e of FX.emit) { e.acc = (e.acc || 0) + dt; if (e.acc > e.every) { e.acc = 0; const p = e.at(); fxSmoke(p.x, p.y, p.z, 1, e.col, e.size, 3); } }
}

// La baranda se rompe donde pasó el carro: se esconde ese tramo y salen pedazos volando.
function breakGuard(T, s, side, vx, vz) {
  const R = W.rails;
  if (!R) return;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const mat = R.rm.material;
  R.rails.forEach((r, i) => {
    if (r.side !== side || Math.abs(r.s - s) > 6) return;
    R.rm.setMatrixAt(i, zero);
    const q = Math.min(T.n - 1, r.s + 1), sg = side ? 1 : -1, off = (T.hw + SHOULDER - 0.18) * sg;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.32, 3), mat);
    m.rotation.y = T.h[q];
    fxDebris(m, T.x[q] + T.nx[q] * off, T.y[q] + 0.65, T.z[q] + T.nz[q] * off, vx * 0.6 + (Math.random() - 0.5) * 3, 3 + Math.random() * 3, vz * 0.6 + (Math.random() - 0.5) * 3);
  });
  R.posts.forEach((p, i) => { if (p.side === side && Math.abs(p.s - s) < 5) R.pm.setMatrixAt(i, zero); });
  R.rm.instanceMatrix.needsUpdate = true; R.pm.instanceMatrix.needsUpdate = true;
  for (let q = Math.max(0, Math.floor(s - 6)); q < Math.min(T.n, s + 6); q++) (side ? T.gR : T.gL)[q] = 0;
}

// Línea de guía sobre la pista (como en los juegos de rally): flechas que se pintan de verde
// (a fondo), amarillo (suelta) o rojo (frena) según tu velocidad y la recomendada.
function lineMesh(T) {
  const step = 1, m = Math.floor((T.n - 1) / step), half = 0.32;
  const pos = new Float32Array(m * 2 * 3), uv = new Float32Array(m * 2 * 2), ss = new Float32Array(m * 2), vs = new Float32Array(m * 2), idx = [];
  for (let j = 0; j < m; j++) {
    const s = j * step;
    for (let q = 0; q < 2; q++) {
      const o = j * 2 + q, sg = q ? 1 : -1;
      pos[o * 3] = T.lx[s] + T.nx[s] * half * sg; pos[o * 3 + 1] = T.y[s] + 0.045; pos[o * 3 + 2] = T.lz[s] + T.nz[s] * half * sg;
      uv[o * 2] = q; uv[o * 2 + 1] = s;
      ss[o] = s;
    }
    if (j < m - 1) { const a = j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('ss', new THREE.BufferAttribute(ss, 1));
  g.setAttribute('vs', new THREE.BufferAttribute(vs, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { uS: { value: 0 }, uV: { value: 0 }, uOn: { value: 1 } },
    vertexShader: 'attribute float ss; attribute float vs; varying float vS; varying float vV; varying vec2 vUv;' +
      'void main(){ vS = ss; vV = vs; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uS; uniform float uV; uniform float uOn; varying float vS; varying float vV; varying vec2 vUv;' +
      'void main(){ float ahead = vS - uS;' +
      'float a = smoothstep(4.0, 9.0, ahead) * (1.0 - smoothstep(120.0, 170.0, ahead)) * uOn;' +
      'float t = fract(vS / 2.2 - abs(vUv.x - 0.5) * 1.1);' +
      'a *= smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.42, 0.5, t));' +
      'float over = uV - vV;' +
      'vec3 c = mix(vec3(0.15, 0.95, 0.35), vec3(1.0, 0.85, 0.1), smoothstep(-2.0, 1.0, over));' +
      'c = mix(c, vec3(1.0, 0.15, 0.1), smoothstep(1.5, 5.0, over));' +
      'if (a < 0.01) discard; gl_FragColor = vec4(c, a * 0.85); }',
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  W.line = mesh;
  return mesh;
}
// Pone en la línea la velocidad recomendada (depende de las mejoras del carro).
function setLineSpeeds(v) {
  if (!W.line) return;
  const a = W.line.geometry.attributes.vs, ss = W.line.geometry.attributes.ss;
  for (let i = 0; i < a.count; i++) a.array[i] = v[Math.min(v.length - 1, ss.array[i])];
  a.needsUpdate = true;
}
