/* ================== ESCENAS 3D ================== */
let isTouch = false;
const INK = '#1B1523', FONT_D = 'Bungee, Impact, sans-serif';
const cv3 = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 5, 6000);
const hemi = new THREE.HemisphereLight(0xeaf0f6, 0x6b6258, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 1.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 10, far: 3000 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1;
sun.position.set(-500, 900, 400); scene.add(sun); scene.add(sun.target);
const GB = new THREE.BoxGeometry(1, 1, 1), GC = new THREE.CylinderGeometry(1, 1, 1, 20), GC8 = new THREE.CylinderGeometry(1, 1, 1, 8), GS = new THREE.SphereGeometry(1, 14, 10), GI = new THREE.IcosahedronGeometry(1, 1), GPL = new THREE.PlaneGeometry(1, 1);
const MC = new Map(), TC = new Map(), GCache = new Map();
const MAT = {}, T = {}, VC = {};
const S3 = { mode: 'home', root: null, t: 0, anim: null, yaw: 0.6, avatar: null, crowd: [] };

function init3d() {
  T.soft = canvasTex('soft', 64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  T.wood = canvasTex('wood', 256, 256, (x, w, h) => { const cols = ['#9C6B3F', '#A87545', '#8E6038', '#B07C4A']; for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % 4]; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, i * 32, w, 2); } }, true);
  T.grass = canvasTex('grass', 256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#3E8E3A' : '#47A043'; x.fillRect(0, i * 32, w, 32); } noise(x, w, h, 3000, 0.06, 0.12); }, true);
  T.lawn = canvasTex('lawn', 128, 128, (x, w, h) => { x.fillStyle = '#5E9C4A'; x.fillRect(0, 0, w, h); noise(x, w, h, 1500, 0.1, 0.18); }, true);
  T.concrete = canvasTex('conc', 128, 128, (x, w, h) => { x.fillStyle = '#A49E94'; x.fillRect(0, 0, w, h); noise(x, w, h, 1600, 0.12, 0.18); }, true);
  T.tile = canvasTex('tile', 128, 128, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#E9E3D6' : '#DCD3C2'; x.fillRect(i * 32, j * 32, 32, 32); } }, true);
  T.water = canvasTex('water', 128, 128, (x, w, h) => { x.fillStyle = '#3FA7D6'; x.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); const px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); x.quadraticCurveTo(px + 8, py - 3, px + 16, py); x.stroke(); } }, true);
  MAT.glass = M('#1C2836', { phong: true, shin: 120 }); MAT.tire = M('#151515'); MAT.rim = M('#C9CDD2', { phong: true }); MAT.dark = M('#222226'); MAT.chrome = M('#C9CDD2', { phong: true, shin: 140 }); MAT.white = M('#F4F4F2');
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  const et = canvasTex('env', 64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F4F7FA'); g.addColorStop(0.5, '#C8C0B4'); g.addColorStop(1, '#3A3A3C'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: et, side: THREE.BackSide })));
  scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
}
function sky(top, bot) { scene.background = canvasTex('sky' + top + bot, 16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }
function clear3d() { if (S3.root) scene.remove(S3.root); S3.root = new THREE.Group(); scene.add(S3.root); S3.crowd = []; S3.anim = null; }
function playerLook(c) { const cl = C ? C.clubs[C.clubId] : null; return { kind: 'normal', skin: C ? C.skin : '#A56B45', hair: '#1A1110', shirt: c || (cl ? cl.c1 : '#E23B3B'), pants: '#1B1523', scale: 1.1 }; }

/* ---------- carros ---------- */
function makeCarModel(car) {
  const g = new THREE.Group(), paint = M(car.col, { phong: true, shin: 110 });
  if (car.id === 'moto') { for (const z of [-20, 20]) { const w = mesh(g, GC, MAT.tire, 9, 5, 9, 0, 9, z, true); w.rotation.z = Math.PI / 2; } box(g, paint, 10, 12, 36, 0, 18, 0, true); box(g, MAT.dark, 12, 4, 18, 0, 26, 6, false); box(g, MAT.chrome, 22, 2, 2, 0, 32, -17, false); return g; }
  const low = car.id === 'deportivo' || car.id === 'hiper', big = car.id === 'suv';
  const L = big ? 96 : 90, Wd = big ? 46 : 44, h = low ? 12 : big ? 22 : 16;
  box(g, paint, Wd, h, L, 0, 8 + h / 2, 0, true);
  box(g, MAT.glass, Wd - 6, low ? 9 : 14, L * (low ? 0.36 : 0.5), 0, 8 + h + (low ? 4 : 7), low ? 6 : 2, true);
  box(g, paint, Wd - 8, 2, L * (low ? 0.3 : 0.44), 0, 8 + h + (low ? 9 : 14), low ? 6 : 2, false);
  if (car.id === 'hiper') { box(g, MAT.dark, Wd, 2, 12, 0, 8 + h + 10, L / 2 - 6, false); box(g, MAT.dark, 2, 10, 2, -14, 8 + h + 4, L / 2 - 6, false); box(g, MAT.dark, 2, 10, 2, 14, 8 + h + 4, L / 2 - 6, false); }
  for (const [x, z] of [[-Wd / 2 + 2, -L / 2 + 16], [Wd / 2 - 2, -L / 2 + 16], [-Wd / 2 + 2, L / 2 - 16], [Wd / 2 - 2, L / 2 - 16]]) { const w = mesh(g, GC, MAT.tire, big ? 10 : 8.5, 7, big ? 10 : 8.5, x, big ? 10 : 8.5, z, true); w.rotation.z = Math.PI / 2; const r = mesh(g, GC, MAT.rim, 5, 7.4, 5, x, big ? 10 : 8.5, z, false); r.rotation.z = Math.PI / 2; }
  box(g, M('#FFF4C8', { em: '#FFE6A0' }), Wd - 10, 3, 1, 0, 12 + h / 2, -L / 2 - 0.5, false);
  box(g, M('#C0392B', { em: '#600' }), Wd - 10, 3, 1, 0, 13 + h / 2, L / 2 + 0.5, false);
  return g;
}

/* ---------- casa ---------- */
function buildHome() {
  clear3d();
  const tier = C.house, R = S3.root;
  sky(tier === 0 ? '#AFC0CF' : '#8FB6DA', '#E4E0D8');
  scene.fog = new THREE.Fog(0xe4e0d8, 1400, 3200);
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), M('#FFFFFF', { map: tier >= 2 ? T.lawn : T.concrete })); grd.material.map.repeat.set(30, 30); grd.rotation.x = -Math.PI / 2; grd.receiveShadow = true; R.add(grd);
  const W = [320, 460, 560, 700][tier], D = [260, 320, 380, 440][tier];
  const wallC = ['#D8C9A8', '#EDE6D6', '#F4EFE6', '#FAFAF7'][tier];
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 8, D), M('#FFFFFF', { map: tier === 0 ? T.tile : T.wood })); floor.position.y = 4; floor.receiveShadow = true; R.add(floor);
  const wm = M(wallC); box(R, wm, W, 150, 8, 0, 79, -D / 2, true); box(R, wm, 8, 150, D, -W / 2, 79, 0, true);
  box(R, M('#9FC3DA', { phong: true, shin: 120 }), 120, 60, 2, W / 4, 95, -D / 2 + 5, false);
  if (tier >= 1) { for (let i = 0; i < 6; i++) { const b = box(R, M(pick(['#9AA3AE', '#B8BEC6', '#7E8792'])), 60, 150 + i * 40, 60, -900 + i * 320, 75 + i * 20, -900, false); void b; } }
  // muebles
  const bedC = ['#6B7FA8', '#E8E2D6', '#F4F4F2', '#1B1523'][tier];
  box(R, M('#8B5E3C'), 80, 18, 110, -W / 2 + 60, 17, -D / 2 + 70, true); box(R, M(bedC), 76, 10, 100, -W / 2 + 60, 30, -D / 2 + 72, true); box(R, MAT.white, 60, 8, 22, -W / 2 + 60, 38, -D / 2 + 30, false);
  const tvW = [40, 70, 100, 140][tier];
  box(R, MAT.dark, tvW, tvW * 0.56, 3, W / 4, 70, -D / 2 + 8, false); box(R, M('#2E6BFF', { em: '#1840A0' }), tvW - 4, tvW * 0.5, 1, W / 4, 70, -D / 2 + 10, false);
  if (tier >= 1) { box(R, M(['#7B3FF2', '#8B5E3C', '#C9C3B6'][tier - 1]), 120, 22, 44, W / 4, 15, 20, true); box(R, M(['#7B3FF2', '#8B5E3C', '#C9C3B6'][tier - 1]), 120, 30, 12, W / 4, 30, 38, true); }
  if (tier === 0) { const p = canvasTex('poster', 128, 180, (x, w, h) => { x.fillStyle = '#E23B3B'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFF'; x.font = '22px ' + FONT_D; x.textAlign = 'center'; x.fillText('CRACK', w / 2, 40); x.beginPath(); x.arc(w / 2, 110, 36, 0, 7); x.fill(); }); plane(R, M('#FFFFFF', { map: p }), 40, 56, -W / 2 + 5, 100, 20).rotation.y = Math.PI / 2; }
  // vitrina de trofeos
  const cab = new THREE.Group(); cab.position.set(W / 2 - 60, 0, -D / 2 + 30); R.add(cab);
  box(cab, M('#6B4428'), 100, 130, 30, 0, 69, 0, true); box(cab, M('#BFE3F2', { op: 0.35, phong: true }), 96, 110, 1, 0, 76, 15.5, false);
  const tr = C.trophies.slice(-15);
  tr.forEach((t, i) => { const tx = -36 + (i % 5) * 18, ty = 30 + Math.floor(i / 5) * 38; const gold = M(t.kind === 'ind' ? '#E0B040' : '#D5D9DE', { phong: true, shin: 160 }); cyl(cab, gold, 5, 3, tx, ty, 2, false); cyl(cab, gold, 1.5, 8, tx, ty + 6, 2, false); const cup = mesh(cab, new THREE.CylinderGeometry(1, 0.5, 1, 12), gold, 6, 10, 6, tx, ty + 15, 2, false); void cup; });
  for (let k = 0; k < 3; k++) box(cab, M('#8B5E3C'), 96, 2, 28, 0, 26 + k * 38, 0, false);
  // exterior según nivel
  if (tier === 2) { for (let i = 0; i < 5; i++) makeTree(R, -W / 2 - 150 + i * 180, D / 2 + 200, i * 77 + 5, 1.4); }
  if (tier === 3) { const pool = new THREE.Mesh(new THREE.BoxGeometry(300, 4, 160), M('#FFFFFF', { map: T.water, phong: true, shin: 150 })); pool.position.set(-W / 2 - 220, 3, 60); R.add(pool); box(R, MAT.white, 320, 6, 180, -W / 2 - 220, 1, 60, false); for (let i = 0; i < 3; i++) { box(R, MAT.white, 30, 8, 70, -W / 2 - 330 + i * 60, 10, 190, true); } for (let i = 0; i < 4; i++) { const pl = mesh(R, GC, M('#8A6B4A'), 4, 120, 4, -W / 2 - 380 + i * 110, 60, -80, true); void pl; mesh(R, GI, M('#3F7F3A', { flat: true }), 30, 16, 30, -W / 2 - 380 + i * 110, 122, -80, true); } }
  // cochera con tus carros
  const cars = C.cars.map(id => CARS.find(c => c.id === id)).filter(Boolean);
  cars.forEach((car, i) => { const m = makeCarModel(car); m.position.set(W / 2 + 90 + (i % 3) * 70, 0, D / 2 - 60 - Math.floor(i / 3) * 130); R.add(m); });
  if (cars.length) { const pad = new THREE.Mesh(new THREE.PlaneGeometry(230, 300), M('#FFFFFF', { map: T.concrete })); pad.rotation.x = -Math.PI / 2; pad.position.set(W / 2 + 160, 0.6, D / 2 - 120); R.add(pad); }
  // tu jugador
  const av = makePerson(playerLook()); av.position.set(0, 8, 40); av.rotation.y = 0.3; R.add(av); S3.avatar = av;
  if (C.rel !== 'soltero') { const pl = makePerson({ kind: 'normal', skin: pick(['#C68A5E', '#A56B45', '#8D5A3B']), hair: '#2B1B14', shirt: '#E8A0B8', pants: '#23324A', scale: 1.02, braids: true }); pl.position.set(40, 8, 55); pl.rotation.y = -0.4; R.add(pl); S3.partner = pl; } else S3.partner = null;
  S3.kids = []; for (let k = 0; k < C.kids; k++) { const kd = makePerson({ kind: 'normal', skin: C.skin, hair: '#1A1110', shirt: pick(['#FFE14D', '#19A35A', '#2E6BFF']), pants: '#23324A', scale: 0.6 }); kd.position.set(-40 + k * 25, 8, 80); R.add(kd); S3.kids.push(kd); }
  S3.mode = 'home'; S3.focus = new THREE.Vector3(W * 0.28, 40, 30); S3.dist = [700, 860, 1000, 1180][tier];
}

/* ---------- estadio ---------- */
function buildStadium(c1, c2, crowdLevel) {
  clear3d(); const R = S3.root;
  sky('#1A2244', '#4A5078'); scene.fog = new THREE.Fog(0x2a2f50, 2000, 5000);
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(1400, 900), M('#FFFFFF', { map: T.grass })); pitch.material.map.repeat.set(1, 4); pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; R.add(pitch);
  const line = M('#F4F4F2', { basic: true });
  const L = (x, z, w, d) => { const m = box(R, line, w, 0.6, d, x, 0.5, z, false); return m; };
  L(0, -420, 1300, 4); L(0, 420, 1300, 4); L(-650, 0, 4, 840); L(650, 0, 4, 840); L(0, 0, 4, 840);
  const cc = new THREE.Mesh(new THREE.RingGeometry(88, 92, 48), line); cc.rotation.x = -Math.PI / 2; cc.position.y = 0.6; R.add(cc);
  L(-560, 0, 4, 360); L(-605, -180, 90, 4); L(-605, 180, 90, 4);
  // arco
  const goal = new THREE.Group(); goal.position.set(-650, 0, 0); R.add(goal);
  for (const z of [-60, 60]) cyl(goal, MAT.white, 2.5, 48, 0, 24, z, true);
  const bar = cyl(goal, MAT.white, 2.5, 120, 0, 48, 0, true); bar.rotation.x = Math.PI / 2;
  const net = box(goal, M('#FFFFFF', { op: 0.28, ds: true }), 40, 48, 120, -20, 24, 0, false); S3.net = net;
  // tribunas con hinchas
  const n = Math.round(80 + crowdLevel * 320);
  const colors = [c1, c2, '#FFFFFF', c1];
  for (const side of [-1, 1]) {
    const st = box(R, M('#3A3A44'), 1500, 120, 200, 0, 60, side * 620, true); st.rotation.x = side * -0.45;
    for (let i = 0; i < n / 2; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(pick(colors)) })); const x = rand(-700, 700), row = Math.random(); s.position.set(x, 30 + row * 110, side * (540 + row * 150)); s.scale.set(12, 18, 1); R.add(s); S3.crowd.push({ s, y0: s.position.y, ph: Math.random() * 6 }); }
  }
  for (const [x, z] of [[-700, -700], [700, -700], [-700, 700], [700, 700]]) { cyl(R, MAT.dark, 6, 500, x, 250, z, false); const lt = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false })); lt.scale.set(260, 260, 1); lt.position.set(x, 500, z); R.add(lt); }
  const ball = sph(R, M('#FFFFFF', { phong: true }), 5, 0, 5, 0, true); S3.ball = ball;
  const pl = makePerson(playerLook(c1)); pl.position.set(-300, 0, 40); R.add(pl); S3.avatar = pl;
  const gk = makePerson({ kind: 'normal', skin: '#A56B45', hair: '#1A1110', shirt: '#FFE14D', pants: '#1B1523', scale: 1.1 }); gk.position.set(-630, 0, 0); gk.rotation.y = -Math.PI / 2; R.add(gk); S3.gk = gk;
  S3.mode = 'stadium'; S3.focus = new THREE.Vector3(-420, 40, 0); S3.dist = 620;
}
function playGoalAnim() { S3.anim = { t: 0 }; if (S3.avatar) { S3.avatar.position.set(-300, 0, 40); } }

/* ---------- bucle 3D ---------- */
const _cam = new THREE.Vector3();
function render3d(dt) {
  S3.t += dt;
  const t = S3.t;
  if (S3.mode === 'home') {
    S3.yaw += dt * 0.07;
    if (S3.avatar) posePerson(S3.avatar, 0, false, false, t, false, {});
    if (S3.partner) posePerson(S3.partner, 0, false, false, t + 3, false, {});
    for (const k of S3.kids || []) { posePerson(k, t * 8, true, false, t, false, {}); }
  } else if (S3.mode === 'stadium') {
    S3.yaw = 0.9 + Math.sin(t * 0.15) * 0.25;
    for (const c of S3.crowd) c.s.position.y = c.y0 + Math.max(0, Math.sin(t * (S3.anim && S3.anim.t > 1.2 ? 10 : 2) + c.ph)) * (S3.anim && S3.anim.t > 1.2 ? 12 : 2);
    const a = S3.anim, pl = S3.avatar;
    if (a && pl) {
      a.t += dt;
      if (a.t < 1.1) { const k = a.t / 1.1; pl.position.x = lerp(-300, -470, k); pl.rotation.y = Math.PI / 2 + 0.2; S3.ball.position.set(pl.position.x - 12, 5, pl.position.z - 4); posePerson(pl, t * 16, true, false, t, false, { run: true }); }
      else if (a.t < 1.6) { const k = (a.t - 1.1) / 0.5; S3.ball.position.set(lerp(-482, -660, k), 5 + Math.sin(k * Math.PI) * 30 + k * 20, lerp(36, -40, k)); posePerson(pl, 0, false, false, t, false, {}); S3.gk.position.z = lerp(0, 30, k); }
      else if (a.t < 4.5) { S3.net.scale.x = 1 + Math.sin(a.t * 20) * 0.05 * Math.max(0, 2.2 - a.t); pl.position.x = lerp(pl.position.x, -380, dt * 1.5); pl.rotation.y = -Math.PI / 2 - 0.4; posePerson(pl, t * 12, a.t < 2.4, false, t, false, { cheer: a.t >= 2.4, run: a.t < 2.4 }); }
      else S3.anim = null;
    } else if (pl) posePerson(pl, 0, false, false, t, false, {});
  }
  const f = S3.focus || new THREE.Vector3();
  _cam.set(f.x + Math.sin(S3.yaw) * S3.dist, f.y + S3.dist * 0.55, f.z + Math.cos(S3.yaw) * S3.dist);
  camera.position.lerp(_cam, 1 - Math.exp(-dt * 3)); camera.lookAt(f);
  sun.target.position.copy(f); sun.position.set(f.x - 500, 900, f.z + 400);
  renderer.render(scene, camera);
}
