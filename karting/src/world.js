'use strict';
// Escena 3D: renderizador, luces, la pista con sus barreras, el galpón o el parque,
// y la sala del garaje que se ve detrás de los menús.

const W = {
  renderer: null, scene: null, camera: null, sun: null, hemi: null,
  trackGroup: null, garage: null, T: null,
};

function initRenderer(canvas) {
  const hi = save.opt.quality === 'alta';
  const r = new THREE.WebGLRenderer({ canvas, antialias: hi, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? 2 : 1));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.shadowMap.enabled = hi;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.renderer = r;
  W.scene = new THREE.Scene();
  W.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  W.hemi = new THREE.HemisphereLight('#bcc8ff', '#2a2230', 0.9);
  W.scene.add(W.hemi);
  W.sun = new THREE.DirectionalLight('#ffffff', 1.6);
  W.sun.castShadow = hi;
  W.sun.shadow.mapSize.set(2048, 2048);
  const sc = W.sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160;
  W.sun.shadow.bias = -0.0006;
  W.scene.add(W.sun, W.sun.target);
}

function resizeRenderer() {
  const w = window.innerWidth, h = window.innerHeight;
  W.renderer.setSize(w, h, false);
  W.camera.aspect = w / h; W.camera.updateProjectionMatrix();
}

// ---------- texturas generadas ----------
function noiseTex(base, spots, size, rep) {
  const t = canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < size * 12; i++) {
      g.fillStyle = spots[i % spots.length];
      g.globalAlpha = Math.random() * 0.35;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}

function brickTex() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#4A3346'; g.fillRect(0, 0, w, h);
    const bh = 16, bw = 48;
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const l = 34 + Math.random() * 12;
        g.fillStyle = `hsl(${345 + Math.random() * 12}, 32%, ${l}%)`;
        g.fillRect(x + off + 1.5, row * bh + 1.5, bw - 3, bh - 3);
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function checkerTex() {
  const t = canvasTexture(256, 64, (g, w, h) => {
    const n = 16, m = 4;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { g.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; g.fillRect(i * w / n, j * h / m, w / n, h / m); }
  });
  return t;
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

// ---------- pista ----------
function clearTrack() {
  if (!W.trackGroup) return;
  W.scene.remove(W.trackGroup);
  W.trackGroup.traverse(o => {
    if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
  });
  W.trackGroup = null;
}

function ribbon(T, a, b, y, mat, uScale, every) {
  // tira entre los desplazamientos laterales a y b (pueden ser funciones de i)
  const N = T.N, pos = [], uv = [], idx = [];
  const fa = typeof a === 'function' ? a : () => a, fb = typeof b === 'function' ? b : () => b;
  for (let k = 0; k <= N; k++) {
    const i = k % N, s = k === N ? T.L : T.s[i];
    const oa = fa(i), ob = fb(i);
    pos.push(T.px[i] + T.nx[i] * oa, y, T.pz[i] + T.nz[i] * oa, T.px[i] + T.nx[i] * ob, y, T.pz[i] + T.nz[i] * ob);
    uv.push(0, s * uScale, 1, s * uScale);
    if (k < N && (!every || every(i))) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // la normal tiene que apuntar hacia arriba
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}

function buildTrackScene(def) {
  clearTrack();
  const T = buildTrackData(def);
  W.T = T;
  const G = new THREE.Group(); W.trackGroup = G; W.scene.add(G);
  const hi = save.opt.quality === 'alta';

  // límites
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < T.N; i++) { minX = Math.min(minX, T.px[i]); maxX = Math.max(maxX, T.px[i]); minZ = Math.min(minZ, T.pz[i]); maxZ = Math.max(maxZ, T.pz[i]); }
  const pad = def.indoor ? 14 : 60;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, sx = maxX - minX, sz = maxZ - minZ;
  T.bounds = { minX, maxX, minZ, maxZ };

  // suelo
  const floorTex = def.indoor
    ? noiseTex(def.floor, ['#3a3644', '#1d1b22', '#454050'], 256, Math.max(sx, sz) / 10)
    : noiseTex('#4E9A3F', ['#3F8A33', '#63B04F', '#5AA145'], 256, Math.max(sx, sz) / 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(sx + (def.indoor ? 0 : 400), sz + (def.indoor ? 0 : 400)),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); floor.receiveShadow = true; G.add(floor);

  // asfalto
  const asphalt = noiseTex(def.indoor ? '#3A3744' : '#45444C', ['#2b2933', '#55525f', '#1f1e25'], 256, 1);
  asphalt.repeat.set(1, 1);
  const road = ribbon(T, -T.hw, T.hw, 0.02, new THREE.MeshStandardMaterial({ map: asphalt, roughness: def.indoor ? 0.55 : 0.85, metalness: def.indoor ? 0.15 : 0 }), 1 / 8);
  G.add(road);
  // goma oscura en la línea de carrera
  const rubber = ribbon(T, i => T.lineOff[i] - 0.9, i => T.lineOff[i] + 0.9, 0.025,
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.16, depthWrite: false }), 0.1);
  G.add(rubber);
  // líneas blancas a los bordes
  const white = new THREE.MeshStandardMaterial({ color: '#E8E8EE', roughness: 0.7 });
  G.add(ribbon(T, -T.hw + 0.1, -T.hw + 0.28, 0.03, white, 1), ribbon(T, T.hw - 0.28, T.hw - 0.1, 0.03, white, 1));

  // pianos (rojo y blanco) en las curvas de la pista al aire libre
  if (def.kerbs) {
    const kt = canvasTexture(32, 64, (g, w, h) => { g.fillStyle = '#E23B2E'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#F4F4F4'; g.fillRect(0, h / 2, w, h / 2); });
    kt.wrapS = kt.wrapT = THREE.RepeatWrapping;
    const km = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.7 });
    const curvy = i => Math.abs(T.curv[i]) > 1 / 32;
    G.add(ribbon(T, -T.hw - 0.9, -T.hw, 0.035, km, 1 / 2, curvy), ribbon(T, T.hw, T.hw + 0.9, 0.035, km, 1 / 2, curvy));
  }

  // línea de meta y casillas de largada
  const start = new THREE.Mesh(new THREE.PlaneGeometry(def.width, 1.4), new THREE.MeshStandardMaterial({ map: checkerTex(), roughness: 0.6 }));
  start.rotation.x = -Math.PI / 2; start.rotation.z = Math.atan2(T.tx[0], T.tz[0]) + Math.PI;
  start.position.set(T.px[0], 0.04, T.pz[0]); G.add(start);
  const slotM = new THREE.MeshBasicMaterial({ color: '#F4F4F4' });
  for (let k = 0; k < 6; k++) {
    const g = gridSlot(T, k);
    const sl = new THREE.Mesh(geo('slot', () => new THREE.PlaneGeometry(1.5, 0.12)), slotM);
    sl.rotation.x = -Math.PI / 2; sl.rotation.z = g.h; sl.position.set(g.x + Math.sin(g.h) * 1.15, 0.035, g.z + Math.cos(g.h) * 1.15); G.add(sl);
  }

  // barreras de bloques alternados
  buildBarriers(T, G, def);

  if (def.indoor) buildHall(T, G, def, { minX, maxX, minZ, maxZ, cx, cz, sx, sz });
  else buildPark(T, G, def, { minX, maxX, minZ, maxZ, cx, cz, sx, sz });

  // luces
  if (def.indoor) {
    W.scene.background = new THREE.Color(def.fog);
    W.scene.fog = new THREE.Fog(def.fog, 50, 190);
    W.hemi.color.set('#C9B8FF'); W.hemi.groundColor.set('#3A2A40'); W.hemi.intensity = 1.1;
    W.sun.color.set('#FFF1E0'); W.sun.intensity = 1.35;
    W.sunDir = new THREE.Vector3(0.25, 1, 0.35).normalize();
  } else {
    W.scene.background = new THREE.Color('#8EC7F0');
    W.scene.fog = new THREE.Fog(def.fog, 120, 520);
    W.hemi.color.set('#CFE8FF'); W.hemi.groundColor.set('#4A6B34'); W.hemi.intensity = 1.0;
    W.sun.color.set('#FFF4DC'); W.sun.intensity = 2.1;
    W.sunDir = new THREE.Vector3(-0.45, 1, 0.3).normalize();
  }
  if (!hi) W.sun.castShadow = false;
  return T;
}

// Posición de largada k (0 = adelante). Dos filas escalonadas detrás de la meta.
function gridSlot(T, k) {
  const back = 4 + k * 3.2;
  const i = (T.N - Math.round(back)) % T.N;
  const side = (k % 2 ? 1 : -1) * T.hw * 0.42;
  return { x: T.px[i] + T.nx[i] * side, z: T.pz[i] + T.nz[i] * side, h: Math.atan2(T.tx[i], T.tz[i]), i, back };
}

function buildBarriers(T, G, def) {
  const blockLen = 1.6, step = 1.62;
  const count = Math.ceil(T.L / step) * 2;
  const geoB = new THREE.BoxGeometry(0.55, 0.62, blockLen);
  const geoTop = new THREE.BoxGeometry(0.55, 0.2, blockLen * 0.5);
  const mA = new THREE.MeshStandardMaterial({ color: def.barrier[0], roughness: 0.45 });
  const mB = new THREE.MeshStandardMaterial({ color: def.barrier[1], roughness: 0.45 });
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
      // en curvas cerradas el lado de adentro se acorta para que los bloques no se encimen
      const inner = Math.sign(T.curv[i]) === side && Math.abs(T.curv[i]) > 1 / 14;
      sc.set(1, 1, inner ? 0.75 : 1);
      v.set(T.px[i] + T.nx[i] * off, 0.31, T.pz[i] + T.nz[i] * off);
      m.compose(v, q, sc);
      const useA = k % 2 === 0;
      (useA ? iA : iB).setMatrixAt(useA ? na : nb, m);
      // escalón encima, en el color contrario (como las barreras de kartódromo)
      v.y = 0.72;
      m.compose(v, q, sc);
      (useA ? tB : tA).setMatrixAt(useA ? na : nb, m);
      if (useA) na++; else nb++;
    }
  }
  iA.count = tB.count = na; iB.count = tA.count = nb;
  for (const im of [iA, iB, tA, tB]) { im.castShadow = true; im.receiveShadow = true; G.add(im); }

  // llantas apiladas por fuera de las curvas
  if (def.tires || def.indoor) {
    const spots = [];
    for (let i = 0; i < T.N; i += 3) {
      const c = T.curv[i];
      if (Math.abs(c) < 1 / 16) continue;
      const side = -Math.sign(c); // por fuera de la curva
      const off = side * (T.hw + 1.45);
      spots.push([T.px[i] + T.nx[i] * off, T.pz[i] + T.nz[i] * off]);
    }
    const per = def.tires ? 3 : 2;
    const tg = new THREE.TorusGeometry(0.36, 0.2, 8, 16);
    const tm = new THREE.MeshStandardMaterial({ color: '#1A1A1E', roughness: 0.92 });
    const im = new THREE.InstancedMesh(tg, tm, spots.length * per);
    let n = 0;
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    for (const [x, z] of spots) {
      if (distToTrack(T, x, z) < T.hw + 1.0) continue;
      for (let j = 0; j < per; j++) { v.set(x, 0.2 + j * 0.38, z); sc.set(1, 1, 1); m.compose(v, q, sc); im.setMatrixAt(n++, m); }
    }
    im.count = n; im.castShadow = true; im.receiveShadow = true; G.add(im);
  }
}

function distToTrack(T, x, z) {
  let bd = Infinity;
  for (let i = 0; i < T.N; i += 2) bd = Math.min(bd, (T.px[i] - x) ** 2 + (T.pz[i] - z) ** 2);
  return Math.sqrt(bd);
}

function buildHall(T, G, def, B) {
  const H = 9;
  const bt = brickTex(); bt.repeat.set(B.sx / 8, H / 8);
  const bt2 = bt.clone(); bt2.needsUpdate = true; bt2.repeat.set(B.sz / 8, H / 8);
  const wallM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 });
  const wallM2 = new THREE.MeshStandardMaterial({ map: bt2, roughness: 0.9 });
  const mkWall = (w, x, z, ry, m) => {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, H), m);
    me.position.set(x, H / 2, z); me.rotation.y = ry; me.receiveShadow = true; G.add(me);
  };
  mkWall(B.sx, B.cx, B.minZ, 0, wallM); mkWall(B.sx, B.cx, B.maxZ, Math.PI, wallM);
  mkWall(B.sz, B.minX, B.cz, Math.PI / 2, wallM2); mkWall(B.sz, B.maxX, B.cz, -Math.PI / 2, wallM2);
  // zócalo oscuro
  const base = new THREE.MeshStandardMaterial({ color: '#1E1A24', roughness: 0.8 });
  for (const [w, x, z, ry] of [[B.sx, B.cx, B.minZ + 0.05, 0], [B.sx, B.cx, B.maxZ - 0.05, Math.PI], [B.sz, B.minX + 0.05, B.cz, Math.PI / 2], [B.sz, B.maxX - 0.05, B.cz, -Math.PI / 2]]) {
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), base); me.position.set(x, 0.55, z); me.rotation.y = ry; G.add(me);
  }
  // techo con tragaluces
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(B.sx, B.sz), new THREE.MeshStandardMaterial({ color: '#15121C', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(B.cx, H, B.cz); G.add(ceil);
  const sky = new THREE.MeshBasicMaterial({ color: '#4C8DFF' });
  const tube = new THREE.MeshBasicMaterial({ color: '#F4F8FF' });
  const beamM = new THREE.MeshStandardMaterial({ color: '#1A1820', roughness: 0.7 });
  for (let x = B.minX + 12; x < B.maxX - 6; x += 18) {
    for (let z = B.minZ + 10; z < B.maxZ - 6; z += 22) {
      const s = new THREE.Mesh(geo('sky', () => new THREE.PlaneGeometry(8, 4)), sky);
      s.rotation.x = Math.PI / 2; s.position.set(x, H - 0.02, z); G.add(s);
      const l = new THREE.Mesh(geo('tube', () => new THREE.BoxGeometry(3, 0.12, 0.3)), tube);
      l.position.set(x + 4, H - 1.2, z + 9); G.add(l);
    }
  }
  for (let z = B.minZ + 20; z < B.maxZ; z += 22) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(B.sx, 0.6, 0.4), beamM); b.position.set(B.cx, H - 0.6, z); G.add(b);
  }
  // columnas donde no estorban
  const colM = new THREE.MeshStandardMaterial({ color: '#1C1A22', roughness: 0.6 });
  const colG = new THREE.BoxGeometry(1.4, H, 1.4);
  for (let x = B.minX + 16; x < B.maxX - 8; x += 22) for (let z = B.minZ + 14; z < B.maxZ - 8; z += 20) {
    if (distToTrack(T, x, z) < T.hw + 3.2) continue;
    const c = new THREE.Mesh(colG, colM); c.position.set(x, H / 2, z); c.castShadow = true; c.receiveShadow = true; G.add(c);
  }
  // carteles en las paredes
  const posters = [['KARTÓDROMO', 'Pista ' + def.id.slice(1), '#6A3BFF', '#FF2E88'], ['TURBO CUY', 'Bebida energética', '#FF7A1A', '#FFD21F'],
    ['¡A FONDO!', 'Frena tarde, sal rápido', '#1A9BFF', '#7C4DFF'], ['LLANTAS EL TÍO', 'Agarre garantizado', '#22B14C', '#0E6B3A']];
  posters.forEach((p, k) => {
    const me = new THREE.Mesh(geo('poster', () => new THREE.PlaneGeometry(8, 4)), new THREE.MeshBasicMaterial({ map: posterTex(p[0], p[1], p[2], p[3]) }));
    const t = (k + 0.5) / posters.length;
    if (k % 2 === 0) { me.position.set(B.minX + B.sx * t, 4.6, B.minZ + 0.06); }
    else { me.position.set(B.minX + B.sx * t, 4.6, B.maxZ - 0.06); me.rotation.y = Math.PI; }
    G.add(me);
  });
}

function buildPark(T, G, def, B) {
  // árboles alrededor (instanciados)
  const trunks = [], crowns = [];
  for (let n = 0; n < 900 && crowns.length < 260; n++) {
    const x = rand(B.minX - 40, B.maxX + 40), z = rand(B.minZ - 40, B.maxZ + 40);
    if (distToTrack(T, x, z) < T.hw + 7) continue;
    crowns.push([x, z, rand(0.8, 1.4)]);
  }
  const tg = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6);
  const cg = new THREE.IcosahedronGeometry(1.9, 0);
  const tI = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: '#6B4A2E', roughness: 0.9 }), crowns.length);
  const cI = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: '#3E8E3A', roughness: 0.85, flatShading: true }), crowns.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  crowns.forEach(([x, z, k], i) => {
    s.set(k, k, k); v.set(x, 1.2 * k, z); q.identity(); m.compose(v, q, s); tI.setMatrixAt(i, m);
    v.set(x, 3.4 * k, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 3); s.set(k, k * rand(1, 1.3), k); m.compose(v, q, s); cI.setMatrixAt(i, m);
    cI.setColorAt(i, col.setHSL(0.28 + Math.random() * 0.06, 0.5, 0.32 + Math.random() * 0.1));
  });
  tI.castShadow = cI.castShadow = true; G.add(tI, cI);
  // tribuna junto a la recta principal
  const i0 = Math.round(T.N * 0.04);
  const h = Math.atan2(T.tx[i0], T.tz[i0]);
  const side = -1, off = side * (T.hw + 9);
  const stand = new THREE.Group();
  stand.position.set(T.px[i0] + T.nx[i0] * off, 0, T.pz[i0] + T.nz[i0] * off); stand.rotation.y = h;
  const seatCols = ['#E23B2E', '#2F6BE8', '#FFD21F', '#F4F4F4'];
  for (let r = 0; r < 5; r++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(3 + r * 1.6, 0.8, 30), new THREE.MeshStandardMaterial({ color: '#B9BCC6', roughness: 0.8 }));
    step.position.set(-side * 0 - r * 0.8 * -side, 0.4 + r * 0.8, 0); step.position.x = side * (r * 0.8 + 1.5); step.castShadow = true; step.receiveShadow = true; stand.add(step);
    const seats = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 30), new THREE.MeshStandardMaterial({ color: seatCols[r % 4], roughness: 0.6 }));
    seats.position.set(side * (r * 0.8 + 0.6), 0.95 + r * 0.8, 0); stand.add(seats);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.25, 31), new THREE.MeshStandardMaterial({ color: '#2F6BE8', roughness: 0.5 }));
  roof.position.set(side * 3.5, 6.2, 0); roof.castShadow = true; stand.add(roof);
  G.add(stand);
  // cerros a lo lejos
  const hillM = new THREE.MeshStandardMaterial({ color: '#7FA86A', roughness: 1, flatShading: true });
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2, r = Math.max(B.sx, B.sz) * 0.5 + 150 + Math.random() * 60;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rand(40, 80), rand(25, 60), 7), hillM);
    hill.position.set(B.cx + Math.cos(a) * r, 0, B.cz + Math.sin(a) * r); G.add(hill);
  }
  // mar al fondo (es el litoral)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 400), new THREE.MeshStandardMaterial({ color: '#3D86C6', roughness: 0.3, metalness: 0.2 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(B.cx, -0.05, B.minZ - 230); G.add(sea);
  // arco de meta
  const arch = new THREE.Group();
  const p0 = 0, ah = Math.atan2(T.tx[p0], T.tz[p0]);
  arch.position.set(T.px[p0], 0, T.pz[p0]); arch.rotation.y = ah;
  const am = new THREE.MeshStandardMaterial({ color: '#1E1C24', roughness: 0.6 });
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.5), am); post.position.set(sx * (T.hw + 1.2), 2.5, 0); post.castShadow = true; arch.add(post); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(T.def.width + 3, 1, 0.4), new THREE.MeshStandardMaterial({ map: checkerTex() }));
  top.position.y = 5.2; arch.add(top);
  G.add(arch);
}

// ---------- sala del garaje (fondo de menús) ----------
function buildGarage() {
  const G = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ map: noiseTex('#2A2733', ['#34303e', '#1f1d25'], 256, 6), roughness: 0.5, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#33303D', roughness: 0.35, metalness: 0.4 }));
  plat.position.y = 0.06; plat.receiveShadow = true; G.add(plat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.04, 8, 64), new THREE.MeshBasicMaterial({ color: '#7C4DFF' }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.12; G.add(ring);
  const bt = brickTex(); bt.repeat.set(5, 1.5);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 10, 40, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ map: bt, side: THREE.BackSide, roughness: 0.9 }));
  wall.position.y = 5; G.add(wall);
  // barrera decorativa
  for (let k = 0; k < 16; k++) {
    const a = Math.PI * 0.65 + k / 15 * Math.PI * 0.7;
    const b = new THREE.Mesh(geo('gb', () => new THREE.BoxGeometry(1.4, 0.6, 0.5)), mat(k % 2 ? '#2F6BE8' : '#EEF2FA', { roughness: 0.45 }));
    b.position.set(Math.sin(a) * 9, 0.3, Math.cos(a) * 9); b.rotation.y = a; b.castShadow = true; G.add(b);
  }
  const stack = (x, z, n) => { for (let j = 0; j < n; j++) { const t = new THREE.Mesh(geo('gt', () => new THREE.TorusGeometry(0.36, 0.2, 8, 16)), mat('#1A1A1E', { roughness: 0.9 })); t.rotation.x = Math.PI / 2; t.position.set(x, 0.2 + j * 0.38, z); t.castShadow = true; G.add(t); } };
  stack(-4.6, -3.2, 3); stack(-5.4, -2.2, 2); stack(4.8, -3.6, 4); stack(5.8, -2.4, 2);
  const glow = new THREE.PointLight('#8E6BFF', 18, 14); glow.position.set(-3, 3, 2); G.add(glow);
  const warm = new THREE.PointLight('#FFB070', 14, 14); warm.position.set(3.5, 2.5, 3); G.add(warm);
  G.visible = false;
  W.scene.add(G);
  W.garage = G;
  return G;
}
