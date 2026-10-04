'use strict';
// Escena 3D: renderizador, reflejos (mapa de entorno), luces, la pista con rampas, puentes,
// túneles y barreras, la decoración de cada tema y la sala del garaje de los menús.

const W = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null, pmrem: null,
  trackGroup: null, garage: null, T: null, startLights: [], anim: [], envs: {},
};

function initRenderer(canvas) {
  const hi = save.opt.quality === 'alta';
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = hi;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.renderer = r;
  W.pmrem = new THREE.PMREMGenerator(r);
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1400);
  W.hemi = new THREE.HemisphereLight('#bcc8ff', '#2a2230', 0.6);
  W.scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight('#ffffff', 1.6);
  W.sun.castShadow = hi;
  W.sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  const sc = W.sun.shadow.camera; sc.left = -38; sc.right = 38; sc.top = 38; sc.bottom = -38; sc.near = 1; sc.far = 200;
  W.sun.shadow.bias = -0.0005; W.sun.shadow.normalBias = 0.02;
  W.scene.add(W.sun, W.sun.target);
}

function resizeRenderer() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h; W.camera.updateProjectionMatrix();
}

// ---------- mapas de entorno (reflejos en pintura, cromo y oro) ----------
// Se arma una escena chica con un cielo degradado y paneles de luz, y se convierte
// en un mapa de entorno filtrado (PMREM).
function gradientSky(top, mid, bottom, radius) {
  const g = new THREE.SphereGeometry(radius, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.4)); gl_FragColor = vec4(c, 1.0); }',
  });
  return new THREE.Mesh(g, m);
}

function makeEnv(theme) {
  if (W.envs[theme]) return W.envs[theme];
  const s = new THREE.Scene();
  const lamp = (c, w, h, x, y, z, ry, rx) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); s.add(m);
  };
  if (theme === 'parque') {
    s.add(gradientSky('#4F95E0', '#CFE6F7', '#8E98A4', 50));
    lamp(new THREE.Color(24, 22, 18), 8, 8, -20, 30, 12, 0, Math.PI / 2);
  } else if (theme === 'noche') {
    s.add(gradientSky('#05060F', '#1A1640', '#0A0A10', 50));
    const cols = ['#FF2E88', '#2AD4FF', '#FFC933', '#8E44EC', '#39FF6A'];
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; lamp(new THREE.Color(cols[k % 5]).multiplyScalar(4), 6, 2, Math.cos(a) * 30, 4 + (k % 3) * 4, Math.sin(a) * 30, -a + Math.PI / 2); }
    lamp(new THREE.Color(3, 2.6, 2), 30, 2, 0, 20, 0, 0, Math.PI / 2);
  } else if (theme === 'garaje') {
    s.add(gradientSky('#120F1A', '#2A2238', '#0E0C14', 50));
    lamp(new THREE.Color(12, 11.5, 11), 24, 4, 0, 18, 0, 0, Math.PI / 2);
    lamp(new THREE.Color(8, 4, 12), 14, 8, -25, 6, 0, Math.PI / 2);
    lamp(new THREE.Color(12, 7, 3), 14, 8, 25, 6, 0, -Math.PI / 2);
    lamp(new THREE.Color(7, 7, 8), 22, 6, 0, 7, -25, 0);
    lamp(new THREE.Color(6, 6, 7), 22, 6, 0, 7, 25, Math.PI);
  } else {
    // galpones: techo oscuro con tragaluces y tubos fluorescentes
    s.add(gradientSky(theme === 'fabrica' ? '#1A1418' : '#18142A', '#3A2E40', '#141118', 50));
    for (let x = -30; x <= 30; x += 15) for (let z = -30; z <= 30; z += 20) lamp(new THREE.Color(theme === 'fabrica' ? '#FFD9A0' : '#9CC2FF').multiplyScalar(5), 6, 2.5, x, 22, z, 0, Math.PI / 2);
    lamp(new THREE.Color(theme === 'fabrica' ? '#E23B2E' : '#2F6BE8').multiplyScalar(2), 40, 4, 0, 5, -40, 0);
    lamp(new THREE.Color('#FF2E88').multiplyScalar(2), 20, 3, 40, 6, 0, -Math.PI / 2);
  }
  const env = W.pmrem.fromScene(s, 0.035).texture;
  W.envs[theme] = env;
  return env;
}

// ---------- texturas generadas ----------
function noiseTex(base, spots, size, rep, density) {
  const t = canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < size * (density || 14); i++) {
      g.fillStyle = spots[i % spots.length];
      g.globalAlpha = Math.random() * 0.35;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}

function asphaltTex(base) {
  const t = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const l = Math.random();
      g.fillStyle = l < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.10)';
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.6, 1 + Math.random() * 1.6);
    }
    // parches y grietas suaves
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 30 + Math.random() * 60, 12 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function brickTex() {
  const t = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#3C2A3A'; g.fillRect(0, 0, w, h);
    const bh = 24, bw = 72;
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const l = 30 + Math.random() * 12;
        g.fillStyle = `hsl(${345 + Math.random() * 14}, 30%, ${l}%)`;
        g.fillRect(x + off + 2, row * bh + 2, bw - 4, bh - 4);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x + off + 2, row * bh + 2, bw - 4, 3);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function corrugatedTex(c1, c2) {
  const t = canvasTexture(256, 256, (g, w, h) => {
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(60,30,10,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 6); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function checkerTex() {
  return canvasTexture(256, 64, (g, w, h) => {
    const n = 16, m = 4;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; g.fillRect(i * w / n, j * h / m, w / n, h / m); }
  });
}

function posterTex(title, sub, c1, c2) {
  return canvasTexture(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 70px Fredoka, Rubik, sans-serif';
    g.fillText(title, w / 2, h / 2 + 8);
    g.font = '600 30px Rubik, sans-serif'; g.fillText(sub, w / 2, h / 2 + 56);
  });
}

function bannerTex(text, bg, fg) {
  return canvasTexture(1024, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = '800 58px Fredoka, Rubik, sans-serif'; g.textBaseline = 'middle';
    const tw = g.measureText(text + '   ').width;
    for (let x = 10; x < w; x += tw) g.fillText(text, x, h / 2 + 3);
  });
}

function neonTex(text, color) {
  return canvasTexture(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '700 150px Fredoka, Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 40; g.fillStyle = color;
    g.fillText(text, w / 2, h / 2); g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.85; g.font = '700 146px Fredoka, Rubik, sans-serif'; g.fillText(text, w / 2, h / 2);
  });
}

function windowsTex(seed) {
  const t = canvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = '#14131C'; g.fillRect(0, 0, w, h);
    const lit = ['#FFD98A', '#FFE9B8', '#9CD7FF', '#FFB36B'];
    for (let y = 8; y < h; y += 26) for (let x = 8; x < w; x += 24) {
      const on = Math.random() < 0.42;
      g.fillStyle = on ? lit[(x + y + seed) % 4] : '#22212C';
      g.fillRect(x, y, 14, 16);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function fenceTex() {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(200,205,215,.9)'; g.lineWidth = 3;
    for (let k = -w; k < w * 2; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + h, h); g.stroke(); g.beginPath(); g.moveTo(k + h, 0); g.lineTo(k, h); g.stroke(); }
    g.lineWidth = 8; g.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------- utilidades de geometría ----------
function clearTrack() {
  if (!W.trackGroup) return;
  W.scene.remove(W.trackGroup);
  W.trackGroup.traverse(o => {
    if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
  });
  W.trackGroup = null; W.startLights = []; W.anim = [];
}

// Tira horizontal entre los desplazamientos laterales a y b (pueden ser funciones de i)
function ribbon(T, a, b, y, mat, uScale, every, down) {
  const N = T.N, pos = [], uv = [], idx = [];
  const fa = typeof a === 'function' ? a : () => a, fb = typeof b === 'function' ? b : () => b;
  const fy = typeof y === 'function' ? y : i => T.py[i] + y;
  for (let k = 0; k <= N; k++) {
    const i = k % N, s = k === N ? T.L : T.s[i];
    const oa = fa(i), ob = fb(i), yy = fy(i);
    pos.push(T.px[i] + T.nx[i] * oa, yy, T.pz[i] + T.nz[i] * oa, T.px[i] + T.nx[i] * ob, yy, T.pz[i] + T.nz[i] * ob);
    uv.push(0, s * uScale, 1, s * uScale);
    if (k < N && (!every || every(i))) {
      if (down) idx.push(k * 2, k * 2 + 2, k * 2 + 1, k * 2 + 1, k * 2 + 2, k * 2 + 3);
      else idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, down ? -1 : 1, 0);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}

// Pared vertical a un costado (desplazamiento off), entre ybot(i) y ytop(i)
function wallStrip(T, off, ytop, ybot, mat, every, uScale, vScale) {
  const N = T.N, pos = [], uv = [], idx = [];
  for (let k = 0; k <= N; k++) {
    const i = k % N, s = k === N ? T.L : T.s[i];
    const x = T.px[i] + T.nx[i] * off, z = T.pz[i] + T.nz[i] * off;
    const yt = ytop(i), yb = ybot(i);
    pos.push(x, yt, z, x, yb, z);
    uv.push(s * (uScale || 0.25), yt * (vScale || 0.25), s * (uScale || 0.25), yb * (vScale || 0.25));
    if (k < N && (!every || every(i))) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; return m;
}

// Tubo con un perfil [lat, y] repetido a lo largo de la pista (túneles, cerros)
function profileStrip(T, prof, mat, every, vScale, uRep) {
  const N = T.N, P = prof.length, pos = [], uv = [], idx = [];
  for (let k = 0; k <= N; k++) {
    const i = k % N, s = k === N ? T.L : T.s[i];
    prof.forEach(([lat, y], j) => { pos.push(T.px[i] + T.nx[i] * lat, T.py[i] + y, T.pz[i] + T.nz[i] * lat); uv.push(j / (P - 1) * (uRep || 4), s * (vScale || 0.2)); });
    if (k < N && every(i) && every((i + 1) % N)) for (let j = 0; j < P - 1; j++) {
      const a = k * P + j, b = a + P;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; return m;
}

function distToTrack(T, x, z, maxY) {
  let bd = Infinity;
  for (let i = 0; i < T.N; i += 2) { if (maxY != null && T.py[i] > maxY) continue; bd = Math.min(bd, (T.px[i] - x) ** 2 + (T.pz[i] - z) ** 2); }
  return Math.sqrt(bd);
}

function glowSprite(color, size, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: opacity || 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1); return s;
}

// Público: cuerpos y cabezas instanciados con colores al azar
function crowd(G, spots) {
  if (!spots.length) return;
  const body = new THREE.InstancedMesh(geo('crowdB', () => new THREE.CapsuleGeometry(0.22, 0.5, 3, 8)), new THREE.MeshStandardMaterial({ roughness: 0.8 }), spots.length);
  const head = new THREE.InstancedMesh(geo('crowdH', () => new THREE.SphereGeometry(0.16, 10, 8)), new THREE.MeshStandardMaterial({ roughness: 0.7 }), spots.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const shirts = ['#E8322F', '#2F6BE8', '#FFD21F', '#F4F4F4', '#36C24A', '#FF7A1A', '#8E44EC', '#1E1E26', '#FF2E88'];
  const skins = ['#F1C9A5', '#D9A47C', '#B37A52', '#8A5A3B', '#5E3B26'];
  spots.forEach(([x, y, z], i) => {
    m.makeTranslation(x, y + 0.48, z); body.setMatrixAt(i, m); body.setColorAt(i, c.set(shirts[i % shirts.length]));
    m.makeTranslation(x, y + 1.06, z); head.setMatrixAt(i, m); head.setColorAt(i, c.set(skins[(i * 7) % skins.length]));
  });
  body.castShadow = true;
  G.add(body, head);
  W.anim.push(t => { head.position.y = Math.max(0, Math.sin(t * 7) * 0.04); body.position.y = head.position.y; });
}

// Tribuna con público a un costado de la pista, alrededor de la muestra i
function grandstand(T, G, i, side, len, color) {
  const h = Math.atan2(T.tx[i], T.tz[i]);
  const off = side * (T.hw + 4.5);
  // no la ponemos encima de otra parte de la pista
  for (const t of [-0.5, 0, 0.5]) for (const d of [4.5, 8, 12]) {
    const x = T.px[i] + T.tx[i] * t * len + T.nx[i] * side * (T.hw + d), z = T.pz[i] + T.tz[i] * t * len + T.nz[i] * side * (T.hw + d);
    if (distToTrack(T, x, z) < T.hw + 1.5) return null;
    if (T.bounds && (x < T.bounds.minX + 1 || x > T.bounds.maxX - 1 || z < T.bounds.minZ + 1 || z > T.bounds.maxZ - 1)) return null;
  }
  // en el grupo, +x local apunta a la izquierda de la pista: ls hace que las gradas se alejen
  const ls = -side;
  const g = new THREE.Group();
  g.position.set(T.px[i] + T.nx[i] * off, T.py[i], T.pz[i] + T.nz[i] * off); g.rotation.y = h;
  const conc = new THREE.MeshStandardMaterial({ color: '#B9BCC6', roughness: 0.85 });
  const seat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const spots = [];
  for (let r = 0; r < 6; r++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7 + r * 0.7, len), conc);
    step.position.set(ls * (r * 1.1 + 0.5), (0.7 + r * 0.7) / 2, 0); step.castShadow = true; step.receiveShadow = true; g.add(step);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, len), seat);
    st.position.set(ls * (r * 1.1 + 0.6), 0.8 + r * 0.7, 0); g.add(st);
    for (let z = -len / 2 + 0.6; z < len / 2; z += 0.75) if (Math.random() < 0.72) spots.push([ls * (r * 1.1 + 0.45) + rand(-0.08, 0.08), 0.7 + r * 0.7, z]);
  }
  crowd(g, spots);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, len + 1), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2 }));
  roof.position.set(ls * 3.6, 7.6, 0); roof.castShadow = true; g.add(roof);
  for (const z of [-len / 2, 0, len / 2]) { const p = new THREE.Mesh(geo('stpost', () => new THREE.CylinderGeometry(0.12, 0.12, 7.6, 8)), conc); p.position.set(ls * 7.2, 3.8, z); g.add(p); }
  G.add(g);
  return g;
}

// ---------- pista ----------
function buildTrackScene(def) {
  clearTrack();
  const T = buildTrackData(def);
  W.T = T;
  const G = new THREE.Group(); W.trackGroup = G; W.scene.add(G);
  const theme = def.theme;
  const elev = i => T.py[i] > 0.02;

  // límites
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < T.N; i++) { minX = Math.min(minX, T.px[i]); maxX = Math.max(maxX, T.px[i]); minZ = Math.min(minZ, T.pz[i]); maxZ = Math.max(maxZ, T.pz[i]); }
  const pad = def.indoor ? 18 : 70;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const B = { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, sx: maxX - minX, sz: maxZ - minZ };
  T.bounds = B;

  // suelo
  let floorMat;
  if (theme === 'parque') floorMat = new THREE.MeshStandardMaterial({ map: noiseTex('#4E9A3F', ['#3F8A33', '#63B04F', '#5AA145', '#7AC060'], 256, B.sx / 10), roughness: 0.95 });
  else if (theme === 'noche') floorMat = new THREE.MeshStandardMaterial({ map: noiseTex('#22212A', ['#2c2b36', '#1a1920', '#33323e'], 256, B.sx / 12), roughness: 0.6, metalness: 0.2 });
  else floorMat = new THREE.MeshPhysicalMaterial({ map: noiseTex(theme === 'fabrica' ? '#2B2729' : '#2A2733', ['#3a3644', '#1d1b22', '#454050'], 256, B.sx / 10), roughness: 0.42, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const extra = def.indoor ? 0 : 900;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(B.sx + extra, B.sz + extra), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(B.cx, 0, B.cz); floor.receiveShadow = true; G.add(floor);

  // asfalto (en interiores, liso y con reflejo)
  const at = asphaltTex(theme === 'noche' ? '#2B2A33' : def.indoor ? '#34313D' : '#46454E');
  const roadMat = new THREE.MeshPhysicalMaterial({ map: at, roughness: def.indoor ? 0.38 : theme === 'noche' ? 0.3 : 0.82, metalness: def.indoor ? 0.15 : 0.05, clearcoat: def.indoor || theme === 'noche' ? 0.6 : 0, clearcoatRoughness: 0.35 });
  G.add(ribbon(T, -T.hw, T.hw, 0.02, roadMat, 1 / 9));
  // borde de concreto bajo las barreras (en los puentes es el ancho del tablero)
  const conc = new THREE.MeshStandardMaterial({ color: theme === 'noche' ? '#4A4858' : '#8C8A96', roughness: 0.8 });
  G.add(ribbon(T, -T.hw - 0.95, -T.hw, 0.015, conc, 0.5), ribbon(T, T.hw, T.hw + 0.95, 0.015, conc, 0.5));
  // goma oscura en la línea de carrera
  G.add(ribbon(T, i => T.lineOff[i] - 1.0, i => T.lineOff[i] + 1.0, 0.026,
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18, depthWrite: false }), 0.1));
  // líneas blancas a los bordes
  const white = new THREE.MeshStandardMaterial({ color: '#E8E8EE', roughness: 0.6 });
  G.add(ribbon(T, -T.hw + 0.12, -T.hw + 0.32, 0.03, white, 1), ribbon(T, T.hw - 0.32, T.hw - 0.12, 0.03, white, 1));

  // pianos rojo y blanco en las curvas
  if (def.kerbs || def.indoor) {
    const kt = canvasTexture(32, 64, (g, w, h) => { g.fillStyle = def.barrier[0]; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#F4F4F4'; g.fillRect(0, h / 2, w, h / 2); });
    kt.wrapS = kt.wrapT = THREE.RepeatWrapping;
    const km = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.6 });
    const curvyIn = side => i => Math.abs(T.curv[i]) > 1 / 30 && Math.sign(T.curv[i]) === side;
    G.add(ribbon(T, -T.hw + 0.05, -T.hw + 1.0, 0.034, km, 1 / 2, curvyIn(-1)), ribbon(T, T.hw - 1.0, T.hw - 0.05, 0.034, km, 1 / 2, curvyIn(1)));
  }

  // rampas y puentes (segundos pisos)
  buildElevated(T, G, def, conc);

  // línea de meta, casillas y pórtico de largada
  const start = new THREE.Mesh(new THREE.PlaneGeometry(def.width, 1.4), new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.5 }));
  start.rotation.x = -Math.PI / 2; start.rotation.z = Math.atan2(T.tx[0], T.tz[0]) + Math.PI;
  start.position.set(T.px[0], T.py[0] + 0.04, T.pz[0]); G.add(start);
  const slotM = new THREE.MeshBasicMaterial({ color: '#F4F4F4' });
  for (let k = 0; k < 6; k++) {
    const g = gridSlot(T, k);
    const sl = new THREE.Mesh(geo('slot', () => new THREE.PlaneGeometry(1.6, 0.14)), slotM);
    sl.rotation.x = -Math.PI / 2; sl.rotation.z = g.h; sl.position.set(g.x + Math.sin(g.h) * 1.15, 0.035, g.z + Math.cos(g.h) * 1.15); G.add(sl);
  }
  buildGantry(T, G, def);

  // barreras de bloques alternados, publicidad y llantas
  buildBarriers(T, G, def);
  buildTunnels(T, G, def);

  if (theme === 'azul' || theme === 'fabrica') buildHall(T, G, def, B);
  else if (theme === 'parque') buildPark(T, G, def, B);
  else buildCity(T, G, def, B);

  // tribunas a lo largo de la recta principal
  const iS = Math.round(T.N * 0.03);
  if (T.py[iS] < 0.1) grandstand(T, G, iS, -1, 26, def.barrier[0]);
  const iS2 = Math.round(T.N * 0.97);
  if (def.indoor && T.py[iS2] < 0.1 && distToTrack(T, T.px[iS2] + T.nx[iS2] * (T.hw + 9), T.pz[iS2] + T.nz[iS2] * (T.hw + 9)) > T.hw + 6) grandstand(T, G, iS2, 1, 18, def.barrier[1] === '#EEF2FA' ? '#2F6BE8' : def.barrier[1]);

  // luces y ambiente
  const env = makeEnv(theme);
  W.scene.environment = env;
  const lt = {
    azul: { bg: '#120F1E', fog: ['#120F1E', 60, 240], hemi: ['#B9AEFF', '#2A1F33', 0.35], sun: ['#F2F0FF', 2.4], dir: [0.2, 1, 0.3], exp: 1.05 },
    fabrica: { bg: '#100C10', fog: ['#100C10', 55, 230], hemi: ['#FFD6B0', '#2A1A14', 0.3], sun: ['#FFE3C0', 2.3], dir: [-0.3, 1, 0.25], exp: 1.05 },
    parque: { bg: '#8EC7F0', fog: ['#CFE3F2', 160, 900], hemi: ['#CFE8FF', '#4A6B34', 0.45], sun: ['#FFF1D6', 3.0], dir: [-0.5, 0.9, 0.35], exp: 0.95 },
    noche: { bg: '#07081A', fog: ['#0E0B24', 90, 520], hemi: ['#5160C8', '#120E1E', 0.35], sun: ['#9FB4FF', 0.9], dir: [0.4, 1, -0.3], exp: 1.15 },
  }[theme];
  W.scene.background = new THREE.Color(lt.bg);
  W.scene.fog = new THREE.Fog(lt.fog[0], lt.fog[1], lt.fog[2]);
  W.hemi.color.set(lt.hemi[0]); W.hemi.groundColor.set(lt.hemi[1]); W.hemi.intensity = lt.hemi[2];
  W.sun.color.set(lt.sun[0]); W.sun.intensity = lt.sun[1];
  W.sunDir = new THREE.Vector3(...lt.dir).normalize();
  W.renderer.toneMappingExposure = lt.exp;
  W.scene.environmentIntensity = theme === 'noche' ? 0.8 : 1;
  if (save.opt.quality !== 'alta') W.sun.castShadow = false;
  return T;
}

// Posición de largada k (0 = adelante). Dos filas escalonadas detrás de la meta.
function gridSlot(T, k) {
  const back = 4 + k * 3.2;
  const i = (T.N - Math.round(back)) % T.N;
  const side = (k % 2 ? 1 : -1) * T.hw * 0.42;
  return { x: T.px[i] + T.nx[i] * side, z: T.pz[i] + T.nz[i] * side, h: Math.atan2(T.tx[i], T.tz[i]), i, back };
}

// Rampas: paredes laterales hasta el piso. Puentes: tablero con canto, pilares y reja.
function buildElevated(T, G, def, conc) {
  const N = T.N;
  if (!T.py.some(y => y > 0.02)) return;
  const ramp = i => T.py[i] > 0.02 && T.py[i] < 2.8;
  const bridge = i => T.py[i] >= 2.8;
  const ew = T.hw + 0.95;
  const sideM = new THREE.MeshStandardMaterial({ color: def.theme === 'noche' ? '#3C3A4A' : '#9A98A4', roughness: 0.75 });
  const stripeM = new THREE.MeshStandardMaterial({ color: def.barrier[0], roughness: 0.5 });
  for (const s of [-1, 1]) {
    G.add(wallStrip(T, s * ew, i => T.py[i] + 0.01, () => 0, sideM, ramp));
    G.add(wallStrip(T, s * ew, i => T.py[i] + 0.01, i => T.py[i] - 0.75, sideM, bridge));
    G.add(wallStrip(T, s * (ew + 0.01), i => T.py[i] - 0.12, i => T.py[i] - 0.32, stripeM, bridge));
  }
  // parte de abajo del tablero
  G.add(ribbon(T, -ew, ew, i => T.py[i] - 0.75, sideM, 0.2, bridge, true));
  // reja sobre las barreras en el segundo piso
  const fm = new THREE.MeshStandardMaterial({ map: fenceTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 });
  fm.map.repeat.set(1, 1);
  for (const s of [-1, 1]) {
    const f = wallStrip(T, s * (T.hw + 0.7), i => T.py[i] + 1.9, i => T.py[i] + 0.82, fm, i => T.py[i] > 1.2, 0.8, 0.9);
    f.castShadow = false; G.add(f);
  }
  // pilares donde no estorban a la pista de abajo
  const pm = new THREE.MeshStandardMaterial({ color: '#7E7C88', roughness: 0.7 });
  const pg = new THREE.BoxGeometry(1, 1, 1);
  const spots = [];
  for (let i = 0; i < N; i += 8) {
    if (!bridge(i)) continue;
    for (const s of [-1, 1]) {
      const x = T.px[i] + T.nx[i] * s * (T.hw - 0.6), z = T.pz[i] + T.nz[i] * s * (T.hw - 0.6);
      if (distToTrack(T, x, z, 1.5) < T.hw + 1.4) continue;
      spots.push([x, z, T.py[i] - 0.75, Math.atan2(T.tx[i], T.tz[i])]);
    }
  }
  const im = new THREE.InstancedMesh(pg, pm, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, h, a], k) => { q.setFromAxisAngle(up, a); v.set(x, h / 2, z); sc.set(1.1, h, 1.1); m.compose(v, q, sc); im.setMatrixAt(k, m); });
  im.castShadow = im.receiveShadow = true; G.add(im);
}

function buildGantry(T, G, def) {
  const i = 0, h = Math.atan2(T.tx[i], T.tz[i]);
  const g = new THREE.Group(); g.position.set(T.px[i], T.py[i], T.pz[i]); g.rotation.y = h;
  const truss = new THREE.MeshStandardMaterial({ color: '#2A2A33', roughness: 0.4, metalness: 0.7 });
  const span = T.hw + 1.6;
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.4, 0.4), truss); p.position.set(sx * span, 3.2, 0); p.castShadow = true; g.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 0.4, 0.5, 0.6), truss); beam.position.y = 6.2; beam.castShadow = true; g.add(beam);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.4, 1.1), new THREE.MeshBasicMaterial({ map: bannerTex('KARTÓDROMO', '#16141C', '#ffffff') }));
  board.position.set(0, 7.0, -0.31); board.rotation.y = Math.PI; g.add(board);
  const board2 = board.clone(); board2.position.z = 0.31; board2.rotation.y = 0; g.add(board2);
  W.startLights = [];
  for (let k = 0; k < 5; k++) {
    const lm = new THREE.MeshStandardMaterial({ color: '#330808', emissive: '#000', roughness: 0.3 });
    const l = new THREE.Mesh(geo('slamp', () => new THREE.SphereGeometry(0.22, 14, 10)), lm);
    l.position.set((k - 2) * 0.6, 5.7, -0.35); g.add(l);
    const gs = glowSprite('#ff2a2a', 1.6, 0); gs.position.copy(l.position); gs.position.z -= 0.1; g.add(gs);
    W.startLights.push({ m: lm, s: gs });
  }
  G.add(g);
}

// Enciende las luces del pórtico: n rojas, o todas verdes si green
function setStartLights(n, green) {
  W.startLights.forEach((L, k) => {
    const on = green || k < n;
    const c = green ? '#2BE07F' : '#FF2A2A';
    L.m.emissive.set(on ? c : '#000'); L.m.emissiveIntensity = on ? 3 : 0; L.m.color.set(on ? c : '#330808');
    L.s.material.color.set(c); L.s.material.opacity = on ? 0.9 : 0;
  });
}

function buildBarriers(T, G, def) {
  const blockLen = 1.6, step = 1.62;
  const count = Math.ceil(T.L / step) * 2;
  const geoB = new THREE.BoxGeometry(0.55, 0.62, blockLen);
  const geoTop = new THREE.BoxGeometry(0.55, 0.2, blockLen * 0.5);
  const mA = new THREE.MeshPhysicalMaterial({ color: def.barrier[0], roughness: 0.4, clearcoat: 0.6 });
  const mB = new THREE.MeshPhysicalMaterial({ color: def.barrier[1], roughness: 0.4, clearcoat: 0.6 });
  if (def.theme === 'noche') { mA.emissive.set(def.barrier[0]); mA.emissiveIntensity = 0.35; mB.emissive.set(def.barrier[1]); mB.emissiveIntensity = 0.35; }
  const iA = new THREE.InstancedMesh(geoB, mA, count), iB = new THREE.InstancedMesh(geoB, mB, count);
  const tA = new THREE.InstancedMesh(geoTop, mA, count), tB = new THREE.InstancedMesh(geoTop, mB, count);
  let na = 0, nb = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (let s = 0; s < T.L - step * 0.5; s += step, k++) {
    const i = Math.min(T.N - 1, Math.round(s / T.L * T.N));
    const h = Math.atan2(T.tx[i], T.tz[i]);
    q.setFromAxisAngle(up, h);
    for (const side of [-1, 1]) {
      const off = side * (T.hw + 0.55);
      const inner = Math.sign(T.curv[i]) === side && Math.abs(T.curv[i]) > 1 / 14;
      sc.set(1, 1, inner ? 0.75 : 1);
      v.set(T.px[i] + T.nx[i] * off, T.py[i] + 0.31, T.pz[i] + T.nz[i] * off);
      m.compose(v, q, sc);
      const useA = k % 2 === 0;
      (useA ? iA : iB).setMatrixAt(useA ? na : nb, m);
      v.y = T.py[i] + 0.72;
      m.compose(v, q, sc);
      (useA ? tB : tA).setMatrixAt(useA ? na : nb, m);
      if (useA) na++; else nb++;
    }
  }
  iA.count = tB.count = na; iB.count = tA.count = nb;
  for (const im of [iA, iB, tA, tB]) { im.castShadow = true; im.receiveShadow = true; G.add(im); }

  // publicidad sobre las barreras en las rectas
  const ads = [['KARTÓDROMO', '#7C4DFF', '#fff'], ['TURBO CUY', '#FFD21F', '#16141C'], ['LLANTAS EL TÍO', '#16141C', '#FFD21F'], ['CHICHA ENERGY', '#8E44EC', '#fff'], ['¡A FONDO!', '#E8322F', '#fff']];
  const adMats = ads.map(a => new THREE.MeshStandardMaterial({ map: bannerTex(a[0], a[1], a[2]), roughness: 0.5, emissive: def.theme === 'noche' ? '#ffffff' : '#000', emissiveMap: def.theme === 'noche' ? bannerTex(a[0], a[1], a[2]) : null, emissiveIntensity: 0.6 }));
  let adk = 0;
  for (let i = 30; i < T.N - 30; i += 46) {
    let straight = true;
    for (let o = -6; o <= 6; o++) if (Math.abs(T.curv[(i + o) % T.N]) > 1 / 60) straight = false;
    if (!straight || T.tunnel[i]) continue;
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(geo('ad', () => new THREE.PlaneGeometry(9.6, 0.5)), adMats[adk++ % adMats.length]);
      const off = side * (T.hw + 0.26);
      p.position.set(T.px[i] + T.nx[i] * off, T.py[i] + 0.34, T.pz[i] + T.nz[i] * off);
      p.rotation.y = Math.atan2(-T.nx[i] * side, -T.nz[i] * side);
      G.add(p);
    }
  }

  // llantas apiladas por fuera de las curvas
  const spots = [];
  for (let i = 0; i < T.N; i += 3) {
    const c = T.curv[i];
    if (Math.abs(c) < 1 / 22 || T.py[i] > 0.05 || T.tunnel[i]) continue;
    const side = -Math.sign(c);
    const off = side * (T.hw + 1.6);
    spots.push([T.px[i] + T.nx[i] * off, T.pz[i] + T.nz[i] * off]);
  }
  const per = def.theme === 'fabrica' ? 3 : 2;
  const tg = new THREE.TorusGeometry(0.36, 0.2, 10, 18);
  const tm = new THREE.MeshStandardMaterial({ color: '#1A1A1E', roughness: 0.92 });
  const im = new THREE.InstancedMesh(tg, tm, spots.length * per);
  let n = 0;
  q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  for (const [x, z] of spots) {
    if (distToTrack(T, x, z) < T.hw + 1.2) continue;
    for (let j = 0; j < per; j++) { v.set(x, 0.2 + j * 0.38, z); sc.set(1, 1, 1); m.compose(v, q, sc); im.setMatrixAt(n++, m); }
  }
  im.count = n; im.castShadow = true; im.receiveShadow = true; G.add(im);
}

// Túneles: techo en arco (o caja de contenedores en la fábrica), luces adentro y portales
function buildTunnels(T, G, def) {
  if (!T.tunnel.some(Boolean)) return;
  const inT = i => T.tunnel[i] === 1;
  const W2 = T.hw + 1.4, H = 5.6;
  let inner, outerMat, outerProf;
  if (def.theme === 'fabrica') {
    inner = [[-W2, 0], [-W2, H], [W2, H], [W2, 0]];
    const ct = corrugatedTex('#A63A24', '#D45A3A'); ct.repeat.set(1, 1);
    outerMat = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide });
    outerProf = [[-W2 - 0.3, 0], [-W2 - 0.3, H + 0.3], [W2 + 0.3, H + 0.3], [W2 + 0.3, 0]];
  } else {
    inner = []; for (let k = 0; k <= 14; k++) { const a = Math.PI - k / 14 * Math.PI; inner.push([Math.cos(a) * W2, Math.min(H, Math.sin(a) * H * 1.15)]); }
    if (def.theme === 'parque') {
      outerMat = new THREE.MeshStandardMaterial({ map: noiseTex('#4E9A3F', ['#3F8A33', '#63B04F', '#6B5A3A'], 128, 6), roughness: 0.95, side: THREE.DoubleSide });
      outerProf = []; for (let k = 0; k <= 16; k++) { const t = k / 16, x = (t * 2 - 1) * (W2 + 7); outerProf.push([x, Math.max(0, (H + 2.6) * Math.sin(t * Math.PI) ** 0.7)]); }
    } else {
      outerMat = new THREE.MeshStandardMaterial({ color: '#2E2C3A', roughness: 0.8, side: THREE.DoubleSide });
      outerProf = [[-W2 - 1, 0], [-W2 - 1, H + 1.2], [W2 + 1, H + 1.2], [W2 + 1, 0]];
    }
  }
  const tileT = canvasTexture(128, 128, (g, w, h) => { g.fillStyle = '#C9C6CF'; g.fillRect(0, 0, w, h); g.strokeStyle = '#9C98A4'; g.lineWidth = 3; for (let k = 0; k <= w; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); } });
  tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping;
  const innerMat = def.theme === 'fabrica'
    ? new THREE.MeshStandardMaterial({ map: corrugatedTex('#3A3A44', '#5A5A66'), roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ map: tileT, color: '#A9A4B4', roughness: 0.35, side: THREE.DoubleSide });
  G.add(profileStrip(T, inner, innerMat, inT, 0.7, 12));
  const outer = profileStrip(T, outerProf, outerMat, inT, 0.1);
  if (def.theme === 'parque') outer.castShadow = false; // el cerro no proyecta sombra (manchaba el asfalto)
  G.add(outer);
  // franja de luz en el techo y lámparas cada 10 m
  const lightM = new THREE.MeshBasicMaterial({ color: def.theme === 'noche' ? '#FFB36B' : '#EAF2FF', side: THREE.DoubleSide });
  G.add(ribbon(T, -0.35, 0.35, i => T.py[i] + H - 0.06, lightM, 1, inT, true));
  for (let i = 0; i < T.N; i += 10) {
    if (!inT(i)) continue;
    for (const s of [-1, 1]) {
      const gs = glowSprite(def.theme === 'noche' ? '#FFB36B' : '#BFD8FF', 2.2, 0.55);
      gs.position.set(T.px[i] + T.nx[i] * s * (W2 - 0.4), T.py[i] + 3.2, T.pz[i] + T.nz[i] * s * (W2 - 0.4)); G.add(gs);
      const lamp = new THREE.Mesh(geo('tlamp', () => new THREE.BoxGeometry(0.15, 0.25, 0.8)), lightM);
      lamp.position.copy(gs.position); lamp.rotation.y = Math.atan2(T.tx[i], T.tz[i]); G.add(lamp);
    }
  }
  // portales en cada boca
  const portalM = new THREE.MeshStandardMaterial({ color: def.theme === 'fabrica' ? '#FFD21F' : '#3A3844', roughness: 0.6 });
  const hz = canvasTexture(256, 32, (g, w, h) => { for (let x = -32; x < w + 32; x += 32) { g.fillStyle = '#FFD21F'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 32, h); g.lineTo(x + 16, h); g.fill(); g.fillStyle = '#16141C'; g.beginPath(); g.moveTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 48, h); g.lineTo(x + 32, h); g.fill(); } });
  const hzM = new THREE.MeshStandardMaterial({ map: hz, roughness: 0.5 });
  for (let i = 0; i < T.N; i++) {
    const prev = T.tunnel[(i - 1 + T.N) % T.N];
    if (T.tunnel[i] === prev) continue;
    const h = Math.atan2(T.tx[i], T.tz[i]);
    const g = new THREE.Group(); g.position.set(T.px[i], T.py[i], T.pz[i]); g.rotation.y = h;
    const top = new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 + 2.4, 1.4, 0.8), hzM); top.position.y = H + 0.6; top.castShadow = true; g.add(top);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, H + 1.3, 0.8), portalM); p.position.set(sx * (W2 + 0.6), (H + 1.3) / 2, 0); p.castShadow = true; g.add(p); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(W2 * 1.4, 0.9), new THREE.MeshBasicMaterial({ map: bannerTex(def.theme === 'noche' ? 'PASO A DESNIVEL' : 'TÚNEL', '#16141C', '#FFD21F') }));
    sign.position.set(0, H + 0.6, prev ? 0.41 : -0.41); if (!prev) sign.rotation.y = Math.PI; g.add(sign);
    G.add(g);
  }
}

// ---------- temas ----------
function buildHall(T, G, def, B) {
  const fab = def.theme === 'fabrica';
  const H = 13;
  const wallTex = fab ? corrugatedTex('#4A4650', '#6A6672') : brickTex();
  const mk = (w, x, z, ry) => {
    const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(w / (fab ? 6 : 10), H / (fab ? 6 : 10));
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, H), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, metalness: fab ? 0.3 : 0 }));
    me.position.set(x, H / 2, z); me.rotation.y = ry; me.receiveShadow = true; G.add(me);
  };
  mk(B.sx, B.cx, B.minZ, 0); mk(B.sx, B.cx, B.maxZ, Math.PI);
  mk(B.sz, B.minX, B.cz, Math.PI / 2); mk(B.sz, B.maxX, B.cz, -Math.PI / 2);
  // zócalo con franja de color
  const base = new THREE.MeshStandardMaterial({ color: '#1E1A24', roughness: 0.8 });
  const band = new THREE.MeshStandardMaterial({ color: def.barrier[0], emissive: def.barrier[0], emissiveIntensity: 0.6 });
  for (const [w, x, z, ry] of [[B.sx, B.cx, B.minZ + 0.05, 0], [B.sx, B.cx, B.maxZ - 0.05, Math.PI], [B.sz, B.minX + 0.05, B.cz, Math.PI / 2], [B.sz, B.maxX - 0.05, B.cz, -Math.PI / 2]]) {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.4), base); me.position.set(x, 0.7, z); me.rotation.y = ry; G.add(me);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.18), band); st.position.set(x, 1.5, z); st.rotation.y = ry; st.position.add(new THREE.Vector3(Math.sin(ry) * 0.02, 0, Math.cos(ry) * 0.02)); G.add(st);
  }
  // techo, cerchas y luces
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(B.sx, B.sz), new THREE.MeshStandardMaterial({ color: '#15121C', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(B.cx, H, B.cz); G.add(ceil);
  const beamM = new THREE.MeshStandardMaterial({ color: fab ? '#5A2A22' : '#1A1820', roughness: 0.5, metalness: 0.6 });
  for (let z = B.minZ + 18; z < B.maxZ; z += 20) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(B.sx, 0.7, 0.45), beamM); b.position.set(B.cx, H - 0.6, z); G.add(b);
    if (fab) for (let x = B.minX + 6; x < B.maxX; x += 6) { const d = new THREE.Mesh(geo('diag', () => new THREE.BoxGeometry(0.15, 2.6, 0.15)), beamM); d.position.set(x, H - 1.9, z); d.rotation.z = (x / 6) % 2 ? 0.6 : -0.6; G.add(d); }
  }
  const skyM = new THREE.MeshBasicMaterial({ color: fab ? '#FFE2B0' : '#6FA6FF' });
  const tubeM = new THREE.MeshBasicMaterial({ color: fab ? '#FFE9C8' : '#F4F8FF' });
  for (let x = B.minX + 12; x < B.maxX - 6; x += 18) {
    for (let z = B.minZ + 10; z < B.maxZ - 6; z += 22) {
      if (fab) {
        // lámparas industriales colgantes
        const shade = new THREE.Mesh(geo('shade', () => new THREE.ConeGeometry(1.1, 0.9, 16, 1, true)), new THREE.MeshStandardMaterial({ color: '#2B2B33', metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
        shade.position.set(x, H - 3.2, z); G.add(shade);
        const bulb = new THREE.Mesh(geo('bulb', () => new THREE.CircleGeometry(0.9, 16)), tubeM); bulb.rotation.x = Math.PI / 2; bulb.position.set(x, H - 3.62, z); G.add(bulb);
        const cable = new THREE.Mesh(geo('cable', () => new THREE.CylinderGeometry(0.02, 0.02, 2.8, 4)), beamM); cable.position.set(x, H - 1.6, z); G.add(cable);
        const gs = glowSprite('#FFD9A0', 5, 0.55); gs.position.set(x, H - 3.8, z); G.add(gs);
      } else {
        const s = new THREE.Mesh(geo('sky', () => new THREE.PlaneGeometry(8, 4)), skyM);
        s.rotation.x = Math.PI / 2; s.position.set(x, H - 0.02, z); G.add(s);
        const l = new THREE.Mesh(geo('tube', () => new THREE.BoxGeometry(3.2, 0.12, 0.3)), tubeM);
        l.position.set(x + 4, H - 1.4, z + 10); G.add(l);
        const gs = glowSprite('#BFD8FF', 4.5, 0.45); gs.position.set(x + 4, H - 1.5, z + 10); G.add(gs);
      }
    }
  }
  // columnas donde no estorban
  const colM = new THREE.MeshStandardMaterial({ color: fab ? '#3A2420' : '#1C1A22', roughness: 0.5, metalness: 0.3 });
  const colG = new THREE.BoxGeometry(1.4, H, 1.4);
  const stripe = new THREE.MeshBasicMaterial({ color: def.barrier[0] });
  for (let x = B.minX + 16; x < B.maxX - 8; x += 24) for (let z = B.minZ + 14; z < B.maxZ - 8; z += 22) {
    if (distToTrack(T, x, z) < T.hw + 3.4) continue;
    const c = new THREE.Mesh(colG, colM); c.position.set(x, H / 2, z); c.castShadow = true; c.receiveShadow = true; G.add(c);
    const r = new THREE.Mesh(geo('colring', () => new THREE.BoxGeometry(1.46, 0.25, 1.46)), stripe); r.position.set(x, 2.2, z); G.add(r);
  }
  // carteles y letreros de neón en las paredes
  const posters = [['KARTÓDROMO', def.title, '#6A3BFF', '#FF2E88'], ['TURBO CUY', 'Bebida energética', '#FF7A1A', '#FFD21F'],
    ['¡A FONDO!', 'Suelta en la curva, acelera a la salida', '#1A9BFF', '#7C4DFF'], ['LLANTAS EL TÍO', 'Agarre garantizado', '#22B14C', '#0E6B3A']];
  posters.forEach((p, k) => {
    const me = new THREE.Mesh(geo('poster', () => new THREE.PlaneGeometry(10, 5)), new THREE.MeshBasicMaterial({ map: posterTex(p[0], p[1], p[2], p[3]) }));
    const t = (k + 0.5) / posters.length;
    if (k % 2 === 0) me.position.set(B.minX + B.sx * t, 6.4, B.minZ + 0.08);
    else { me.position.set(B.minX + B.sx * t, 6.4, B.maxZ - 0.08); me.rotation.y = Math.PI; }
    G.add(me);
  });
  const neons = fab ? [['FÁBRICA', '#FF4D3A'], ['ZONA DE PITS', '#FFD21F']] : [['KARTÓDROMO', '#3DA0FF'], ['SEGUNDO PISO ↑', '#FF3DCB']];
  neons.forEach(([txt, c], k) => {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: neonTex(txt, c), transparent: true, depthWrite: false }));
    if (k === 0) { me.position.set(B.minX + 0.1, 8.5, B.cz); me.rotation.y = Math.PI / 2; }
    else { me.position.set(B.maxX - 0.1, 8.5, B.cz); me.rotation.y = -Math.PI / 2; }
    G.add(me);
  });
  // utilería: contenedores y barriles en la fábrica, karts de alquiler estacionados en el galpón
  if (fab) {
    const cols = ['#C4371F', '#1F6FC4', '#2E8B57', '#D99A1E', '#6B3FA0'];
    let placed = 0;
    for (let n = 0; n < 300 && placed < 26; n++) {
      const x = rand(B.minX + 6, B.maxX - 6), z = rand(B.minZ + 6, B.maxZ - 6);
      if (distToTrack(T, x, z) < T.hw + 8) continue;
      const ct = corrugatedTex(cols[placed % 5], '#ffffff'); ct.repeat.set(3, 1);
      const cm = new THREE.MeshStandardMaterial({ color: cols[placed % 5], map: corrugatedTex('#888', '#bbb'), roughness: 0.55, metalness: 0.4 });
      const stack = 1 + (placed % 3 === 0 ? 1 : 0);
      for (let s = 0; s < stack; s++) {
        const c = new THREE.Mesh(geo('cont', () => new THREE.BoxGeometry(2.5, 2.6, 6.1)), cm);
        c.position.set(x, 1.3 + s * 2.6, z); c.rotation.y = (placed % 2) * Math.PI / 2 + rand(-0.1, 0.1); c.castShadow = c.receiveShadow = true; G.add(c);
      }
      placed++;
    }
    const barrelM = new THREE.MeshStandardMaterial({ color: '#2F6BE8', roughness: 0.5, metalness: 0.3 });
    for (let n = 0, p = 0; n < 200 && p < 30; n++) {
      const x = rand(B.minX + 4, B.maxX - 4), z = rand(B.minZ + 4, B.maxZ - 4);
      if (distToTrack(T, x, z) < T.hw + 3.5) continue;
      const b = new THREE.Mesh(geo('barrel', () => new THREE.CylinderGeometry(0.4, 0.4, 1.1, 14)), p % 3 ? barrelM : mat('#E23B2E', { roughness: 0.5 }));
      b.position.set(x, 0.55, z); b.castShadow = true; G.add(b); p++;
    }
  }
  pitKarts(T, G, B);
}

// Fila de karts de alquiler estacionados (zona de pits)
function pitKarts(T, G, B) {
  for (let n = 0, p = 0; n < 200 && p < 5; n++) {
    const i = Math.round(T.N * 0.08) + n;
    const side = 1, off = side * (T.hw + 6);
    const x = T.px[i % T.N] + T.nx[i % T.N] * off, z = T.pz[i % T.N] + T.nz[i % T.N] * off;
    if (T.py[i % T.N] > 0.05 || distToTrack(T, x, z) < T.hw + 4) continue;
    if (x < B.minX + 3 || x > B.maxX - 3 || z < B.minZ + 3 || z > B.maxZ - 3) continue;
    const k = makeKart({ body: BODIES[(p * 3) % 6], helmet: HELMETS[p % 4], rims: RIMS[0], num: 10 + p });
    k.position.set(x, 0, z); k.rotation.y = Math.atan2(-T.nx[i % T.N], -T.nz[i % T.N]);
    k.userData.head.visible = false; k.userData.chassis.children.forEach(c => { if (c.geometry && c.geometry.type === 'CapsuleGeometry') c.visible = false; });
    G.add(k); p++; n += 3;
  }
}

function buildPark(T, G, def, B) {
  G.add(gradientSky('#3E86D6', '#CFE6F7', '#9DB98A', 800));
  // nubes
  const cloudT = canvasTexture(256, 128, (g, w, h) => { for (let k = 0; k < 9; k++) { const gr = g.createRadialGradient(40 + k * 22, 70 + Math.sin(k) * 14, 2, 40 + k * 22, 70 + Math.sin(k) * 14, 44); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  for (let k = 0; k < 16; k++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
    const a = Math.random() * Math.PI * 2, r = rand(250, 600);
    c.position.set(B.cx + Math.cos(a) * r, rand(70, 140), B.cz + Math.sin(a) * r); c.scale.set(rand(90, 160), rand(40, 60), 1); G.add(c);
  }
  // árboles y palmeras
  const trees = [], palms = [];
  for (let n = 0; n < 2000 && trees.length + palms.length < 420; n++) {
    const x = rand(B.minX - 60, B.maxX + 60), z = rand(B.minZ - 40, B.maxZ + 60);
    if (distToTrack(T, x, z) < T.hw + 8) continue;
    (z < B.minZ + 40 ? palms : trees).push([x, z, rand(0.8, 1.45)]);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const tI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.38, 2.6, 7), new THREE.MeshStandardMaterial({ color: '#6B4A2E', roughness: 0.9 }), trees.length);
  const cI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true }), trees.length);
  trees.forEach(([x, z, k], i) => {
    s.set(k, k, k); v.set(x, 1.3 * k, z); q.identity(); m.compose(v, q, s); tI.setMatrixAt(i, m);
    v.set(x, 3.7 * k, z); q.setFromAxisAngle(up, Math.random() * 3); s.set(k * 1.1, k * rand(1, 1.35), k * 1.1); m.compose(v, q, s); cI.setMatrixAt(i, m);
    cI.setColorAt(i, col.setHSL(0.26 + Math.random() * 0.08, 0.55, 0.3 + Math.random() * 0.12));
  });
  tI.castShadow = cI.castShadow = true; G.add(tI, cI);
  const pT = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.3, 7, 7), new THREE.MeshStandardMaterial({ color: '#8A6A44', roughness: 0.9 }), palms.length);
  const leafG = new THREE.ConeGeometry(0.6, 4.2, 4); leafG.translate(0, 2.1, 0); leafG.rotateX(Math.PI / 2 - 0.35);
  const pL = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: '#3F9A3A', roughness: 0.8, flatShading: true }), palms.length * 6);
  let li = 0;
  palms.forEach(([x, z, k], i) => {
    v.set(x, 3.5 * k, z); q.setFromAxisAngle(new THREE.Vector3(1, 0, 0.3).normalize(), rand(-0.12, 0.12)); s.set(k, k, k); m.compose(v, q, s); pT.setMatrixAt(i, m);
    for (let f = 0; f < 6; f++) { v.set(x, 7 * k, z); q.setFromAxisAngle(up, f / 6 * Math.PI * 2 + i); s.set(k, k, k); m.compose(v, q, s); pL.setMatrixAt(li++, m); }
  });
  pT.castShadow = pL.castShadow = true; G.add(pT, pL);
  // arena y mar (es el litoral)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(2000, 70), new THREE.MeshStandardMaterial({ map: noiseTex('#E6D3A3', ['#D9C28A', '#F1E2BC'], 128, 30), roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(B.cx, 0.02, B.minZ - 30); sand.receiveShadow = true; G.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 900), new THREE.MeshPhysicalMaterial({ color: '#2F7FC0', roughness: 0.12, metalness: 0.1, clearcoat: 1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(B.cx, 0.05, B.minZ - 515); G.add(sea);
  W.anim.push(t => { sea.position.y = 0.05 + Math.sin(t * 0.8) * 0.05; });
  // cerros y edificios lejanos
  const hillM = new THREE.MeshStandardMaterial({ color: '#7FA86A', roughness: 1, flatShading: true });
  for (let k = 0; k < 16; k++) {
    const a = Math.PI * 0.05 + k / 15 * Math.PI * 0.9, r = Math.max(B.sx, B.sz) * 0.5 + 220 + Math.random() * 80;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rand(60, 120), rand(30, 80), 8), hillM);
    hill.position.set(B.cx + Math.cos(a) * r, 0, B.cz + Math.sin(a) * r); G.add(hill);
  }
  const bcols = ['#E9E4DA', '#F2D7B6', '#C9D6E3', '#E3C1C1', '#D7E3C9'];
  for (let k = 0; k < 18; k++) {
    const h = rand(14, 45), b = new THREE.Mesh(new THREE.BoxGeometry(rand(10, 18), h, rand(10, 18)), new THREE.MeshStandardMaterial({ color: bcols[k % 5], roughness: 0.8 }));
    b.position.set(rand(B.minX, B.maxX), h / 2, B.maxZ + rand(40, 110)); b.castShadow = true; G.add(b);
  }
  // postes de luz y banderas a lo largo de la pista
  decoPoles(T, G, def, false);
}

function buildCity(T, G, def, B) {
  G.add(gradientSky('#04050E', '#1C1745', '#0A0912', 800));
  // estrellas y luna
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let k = 0; k < 900; k++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.3 + 0.12; sp.push(Math.cos(a) * Math.cos(e) * 700, Math.sin(e) * 700, Math.sin(a) * Math.cos(e) * 700); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })); stars.position.set(B.cx, 0, B.cz); G.add(stars);
  const moon = glowSprite('#DCE6FF', 90, 1); moon.position.set(B.cx + 300, 260, B.cz - 400); G.add(moon);
  // edificios con ventanas encendidas y letreros de neón
  const winTex = [0, 1, 2].map(windowsTex);
  const neonSigns = [['CHIFA DRAGÓN', '#FF3B3B'], ['POLLERÍA EL TÍO', '#FFC933'], ['CEVICHERÍA', '#2AD4FF'], ['KARTÓDROMO', '#B36BFF'], ['TURBO CUY', '#39FF6A'], ['ANTICUCHOS', '#FF7A1A'], ['KARAOKE', '#FF3DCB']];
  let placed = 0;
  for (let n = 0; n < 1600 && placed < 95; n++) {
    const x = rand(B.minX - 30, B.maxX + 30), z = rand(B.minZ - 30, B.maxZ + 30);
    const w = rand(10, 20), d = rand(10, 20);
    if (distToTrack(T, x, z) < T.hw + Math.max(w, d) * 0.75 + 6) continue;
    const h = rand(10, 60);
    const t = winTex[placed % 3].clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 6), Math.round(h / 8));
    const bm = new THREE.MeshStandardMaterial({ color: '#ffffff', map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.6 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bm); b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; G.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), new THREE.MeshStandardMaterial({ color: '#1A1922' })); roof.position.set(x, h + 0.25, z); G.add(roof);
    if (placed % 3 === 0) {
      const [txt, c] = neonSigns[placed / 3 % neonSigns.length | 0];
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.95, w * 0.24), new THREE.MeshBasicMaterial({ map: neonTex(txt, c), transparent: true, depthWrite: false }));
      // el letrero mira hacia la pista
      let bi = 0, bd = Infinity; for (let i = 0; i < T.N; i += 3) { const dd = (T.px[i] - x) ** 2 + (T.pz[i] - z) ** 2; if (dd < bd) { bd = dd; bi = i; } }
      const ang = Math.atan2(T.px[bi] - x, T.pz[bi] - z);
      const face = Math.round(ang / (Math.PI / 2)) * (Math.PI / 2);
      sign.rotation.y = face;
      sign.position.set(x + Math.sin(face) * (Math.abs(Math.sin(face)) > 0.5 ? w / 2 + 0.2 : d / 2 + 0.2), Math.min(h - 3, 8 + Math.random() * 6), z + Math.cos(face) * (Math.abs(Math.cos(face)) > 0.5 ? d / 2 + 0.2 : w / 2 + 0.2));
      G.add(sign);
      const gs = glowSprite(c, w * 0.9, 0.35); gs.position.copy(sign.position); G.add(gs);
    }
    placed++;
  }
  // veredas
  const walkM = new THREE.MeshStandardMaterial({ color: '#3A3946', roughness: 0.8 });
  G.add(ribbon(T, -T.hw - 4.5, -T.hw - 0.95, 0.012, walkM, 0.3, i => T.py[i] < 0.05), ribbon(T, T.hw + 0.95, T.hw + 4.5, 0.012, walkM, 0.3, i => T.py[i] < 0.05));
  decoPoles(T, G, def, true);
}

// Postes de luz (con resplandor de noche) y banderas
function decoPoles(T, G, def, night) {
  const poleM = new THREE.MeshStandardMaterial({ color: '#3A3A44', metalness: 0.7, roughness: 0.35 });
  const lampM = new THREE.MeshBasicMaterial({ color: night ? '#FFD9A0' : '#F4F4F4' });
  const flagCols = ['#E8322F', '#2F6BE8', '#FFD21F', '#36C24A', '#F4F4F4'];
  let k = 0;
  for (let i = 10; i < T.N; i += 28, k++) {
    if (T.tunnel[i]) continue;
    const side = k % 2 ? 1 : -1, off = side * (T.hw + 2.6);
    const x = T.px[i] + T.nx[i] * off, z = T.pz[i] + T.nz[i] * off, y = T.py[i];
    if (y < 0.05 && distToTrack(T, x, z, 1.5) < T.hw + 1.8) continue;
    if (y > 0.05) continue;
    const pole = new THREE.Mesh(geo('pole', () => new THREE.CylinderGeometry(0.09, 0.12, 7, 8)), poleM); pole.position.set(x, 3.5, z); pole.castShadow = true; G.add(pole);
    if (night || k % 3 === 0) {
      const arm = new THREE.Mesh(geo('parm', () => new THREE.BoxGeometry(0.1, 0.1, 2)), poleM);
      arm.position.set(x - T.nx[i] * side * 0.9, 7, z - T.nz[i] * side * 0.9); arm.rotation.y = Math.atan2(T.nx[i], T.nz[i]); G.add(arm);
      const lamp = new THREE.Mesh(geo('plamp', () => new THREE.BoxGeometry(0.5, 0.15, 0.9)), lampM); lamp.position.set(x - T.nx[i] * side * 1.8, 6.9, z - T.nz[i] * side * 1.8); lamp.rotation.y = arm.rotation.y; G.add(lamp);
      if (night) { const gs = glowSprite('#FFC98A', 6, 0.6); gs.position.copy(lamp.position); gs.position.y -= 0.3; G.add(gs);
        const pool = new THREE.Mesh(geo('lpool', () => new THREE.PlaneGeometry(9, 9)), new THREE.MeshBasicMaterial({ color: '#FFB866', map: glowTexture(), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(lamp.position.x, 0.05, lamp.position.z); G.add(pool); }
    } else {
      const fm = new THREE.MeshStandardMaterial({ color: flagCols[k % 5], side: THREE.DoubleSide, roughness: 0.7 });
      const flag = new THREE.Mesh(geo('flag', () => { const g = new THREE.PlaneGeometry(1.8, 1.1, 8, 1); g.translate(0.9, 0, 0); return g; }), fm);
      flag.position.set(x, 6.3, z); G.add(flag);
      const ph = Math.random() * 6;
      W.anim.push(t => { flag.rotation.y = Math.sin(t * 2 + ph) * 0.5 + 0.8; });
    }
  }
}

// ---------- sala del garaje (fondo de menús) ----------
function buildGarage() {
  const G = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshPhysicalMaterial({ map: noiseTex('#1E1B26', ['#2a2733', '#17151d'], 256, 6), roughness: 0.55, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.35, envMapIntensity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: '#25222E', roughness: 0.4, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.3 }));
  plat.position.y = 0.06; plat.receiveShadow = true; G.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.045, 8, 96), new THREE.MeshBasicMaterial({ color: '#9A6BFF' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; G.add(ring);
  const ringGlow = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.4, 64), new THREE.MeshBasicMaterial({ color: '#7C4DFF', map: glowTexture(), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  ringGlow.rotation.x = -Math.PI / 2; ringGlow.position.y = 0.02; G.add(ringGlow);
  const bt = brickTex(); bt.repeat.set(6, 1.6);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 48, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ map: bt, side: THREE.BackSide, roughness: 0.9 }));
  wall.position.y = 5; G.add(wall);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: neonTex('GARAJE', '#B36BFF'), transparent: true, depthWrite: false }));
  sign.position.set(0, 5.6, -13.4); G.add(sign);
  const sg = glowSprite('#9A6BFF', 12, 0.25); sg.position.set(0, 5.6, -13); G.add(sg);
  for (let k = 0; k < 16; k++) {
    const a = Math.PI * 0.65 + k / 15 * Math.PI * 0.7;
    const b = new THREE.Mesh(geo('gb', () => new THREE.BoxGeometry(1.4, 0.6, 0.5)), mat(k % 2 ? '#2F6BE8' : '#EEF2FA', { roughness: 0.45 }));
    b.position.set(Math.sin(a) * 9, 0.3, Math.cos(a) * 9); b.rotation.y = a; b.castShadow = true; G.add(b);
  }
  const stack = (x, z, n) => { for (let j = 0; j < n; j++) { const t = new THREE.Mesh(geo('gt', () => new THREE.TorusGeometry(0.36, 0.2, 10, 18)), mat('#1A1A1E', { roughness: 0.9 })); t.rotation.x = Math.PI / 2; t.position.set(x, 0.2 + j * 0.38, z); t.castShadow = true; G.add(t); } };
  stack(-4.6, -3.2, 3); stack(-5.4, -2.2, 2); stack(4.8, -3.6, 4); stack(5.8, -2.4, 2);
  const glow = new THREE.PointLight('#8E6BFF', 30, 16); glow.position.set(-3, 3, 2); G.add(glow);
  const warm = new THREE.PointLight('#FFB070', 24, 16); warm.position.set(3.5, 2.5, 3); G.add(warm);
  const spot = new THREE.SpotLight('#ffffff', 22, 20, 0.55, 0.7); spot.position.set(0, 8, 2); spot.target.position.set(0, 0, 0); G.add(spot, spot.target);
  G.visible = false;
  W.scene.add(G);
  W.garage = G;
  return G;
}
