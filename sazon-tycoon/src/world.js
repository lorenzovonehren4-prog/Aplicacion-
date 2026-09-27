/* ================== MUNDO 3D ================== */
let isTouch = false;
const INK = '#1B1523';
const FONT_D = 'Bungee, Impact, sans-serif';
const cv3 = document.getElementById('game');
const cv = document.getElementById('fx');
const ctx = cv.getContext('2d');
let DPR = 1, W = 1280, H = 800;
const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 10, 9000);
const hemi = new THREE.HemisphereLight(0xeaf0f6, 0x6b6258, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 1.9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 10, far: 4000 });
sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.2;
scene.add(sun); scene.add(sun.target);
const GB = new THREE.BoxGeometry(1, 1, 1), GC = new THREE.CylinderGeometry(1, 1, 1, 20), GC8 = new THREE.CylinderGeometry(1, 1, 1, 8), GS = new THREE.SphereGeometry(1, 14, 10), GI = new THREE.IcosahedronGeometry(1, 1), GPL = new THREE.PlaneGeometry(1, 1);
const MC = new Map(), TC = new Map(), GCache = new Map();
const MAT = {}, T = {}, VC = {};
// Las funciones auxiliares (texturas, materiales, personas) están en src/helpers.js
function initMats() {
  MAT.glass = M('#1C2836', { phong: true, shin: 120 }); MAT.tire = M('#151515'); MAT.rim = M('#B9BEC4', { phong: true });
  MAT.dark = M('#222226'); MAT.chrome = M('#C9CDD2', { phong: true, shin: 140 }); MAT.white = M('#F4F4F2');
  MAT.steel = M('#B8BEC6', { phong: true, shin: 160 }); MAT.wood = M('#FFFFFF', { map: T.wood }); MAT.woodD = M('#6B4428'); MAT.plate = M('#FAFAF7', { phong: true, shin: 90 });
}
function initTextures() {
  T.soft = canvasTex('soft', 64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  T.asphalt = canvasTex('asf', 256, 256, (x, w, h) => { x.fillStyle = '#4A4C51'; x.fillRect(0, 0, w, h); noise(x, w, h, 5000, 0.12, 0.22); }, true);
  T.walk = canvasTex('walk', 128, 128, (x, w, h) => { x.fillStyle = '#C3BDB1'; x.fillRect(0, 0, w, h); noise(x, w, h, 900, 0.12, 0.14); x.strokeStyle = 'rgba(90,82,72,0.45)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32); x.stroke(); x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, h); x.stroke(); } }, true);
  T.tile = canvasTex('tile', 128, 128, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#E9E3D6' : '#D8CFBE'; x.fillRect(i * 32, j * 32, 32, 32); } noise(x, w, h, 600, 0.08, 0.08); x.strokeStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * 32); x.lineTo(w, i * 32); x.moveTo(i * 32, 0); x.lineTo(i * 32, h); x.stroke(); } }, true);
  T.kitchen = canvasTex('ktile', 128, 128, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#F4F4F2' : '#2A2A2E'; x.fillRect(i * 16, j * 16, 16, 16); } }, true);
  T.wood = canvasTex('wood', 256, 256, (x, w, h) => { const cols = ['#9C6B3F', '#A87545', '#8E6038', '#B07C4A']; for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % 4]; x.fillRect(0, i * 32, w, 32); for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(60,35,15,' + (0.08 + Math.random() * 0.12).toFixed(2) + ')'; x.beginPath(); const yy = i * 32 + Math.random() * 32; x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy + 3, w * 0.6, yy - 3, w, yy); x.stroke(); } x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, i * 32, w, 2); x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32); } }, true);
  T.concrete = canvasTex('conc', 128, 128, (x, w, h) => { x.fillStyle = '#A49E94'; x.fillRect(0, 0, w, h); noise(x, w, h, 1600, 0.12, 0.18); }, true);
  T.brick = canvasTex('brick', 128, 64, (x, w, h) => { x.fillStyle = '#6E3322'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const bx = c * 32 + (r % 2) * 16, by = r * 8; x.fillStyle = ['#B5553A', '#A94E34', '#BE6044', '#9F4A31'][(r * 3 + c + 8) % 4]; x.fillRect(bx + 1, by + 1, 30, 6); } }, true);
  T.grass = canvasTex('grass', 128, 128, (x, w, h) => { x.fillStyle = '#5E8C4A'; x.fillRect(0, 0, w, h); noise(x, w, h, 1600, 0.12, 0.2); }, true);
}
function initEnv() {
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  const tex = canvasTex('envg', 64, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#F4F7FA'); gr.addColorStop(0.45, '#D8D2C8'); gr.addColorStop(0.5, '#8B7B66'); gr.addColorStop(1, '#3A3A3C'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide })));
  scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
}
function sky(top, bot) { scene.background = canvasTex('sky' + top + bot, 16, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.7, bot); gr.addColorStop(1, bot); x.fillStyle = gr; x.fillRect(0, 0, w, h); }); }

/* ---------- distribución del local ---------- */
const BW = 1000, BD = 800;
const STATION_X = [-420, -300, -180, -60, 60, 180];
const STATION_Z = -350, COOK_Z = -288, PASS_Z = -205, PICK_Z = -172;
const REG = { x: -385, z: 340 };
const DOOR = { x: 0, z: 395 };
const STAIR = { x: 410, z0: -140, z1: -385 };
const stairX = f => f === 0 ? 410 : -410;
const SLOTS = [
  [[-110, 240], [110, 240], [-330, 240], [300, 240], [-110, 80], [110, 80], [-330, 80], [300, 80], [-110, -80], [110, -80], [-330, -80], [300, -80]],
  [[-110, 250], [110, 250], [-330, 250], [300, 250], [-110, 80], [110, 80], [-330, 80], [300, 80], [-110, -90], [110, -90], [300, -90], [-110, -260]],
  [[-110, 250], [110, 250], [-330, 250], [300, 250], [-110, 60], [110, 60], [-330, 60], [300, 60], [-110, -140], [300, -140]],
];
const floorY = f => f * FLOOR_H;
const WLD = { root: null, floors: [], tables: [[], [], []], stations: [], pads: [], pops: [], deco: [[], [], []], steam: [], labels: [], money: null, cars: [], motos: [], lampMats: [] };

function popIn(obj, delay) { obj.scale.setScalar(0.001); WLD.pops.push({ obj, t: -(delay || 0), sx: 1 }); }
function dust(x, y, z) { for (let i = 0; i < 14; i++) SIM.fx.push({ type: 'dust', x: x + rand(-40, 40), y: y + rand(0, 20), z: z + rand(-40, 40), vx: rand(-60, 60), vy: rand(40, 120), vz: rand(-60, 60), t: 0, life: rand(0.5, 0.9) }); }

/* ---------- modelos ---------- */
function labelTex(text, sub, ok) {
  return canvasTex('lbl' + text + sub + ok, 256, 128, (x, w, h) => {
    x.fillStyle = ok ? '#19D46E' : '#6A6474'; x.strokeStyle = INK; x.lineWidth = 8;
    x.beginPath(); x.roundRect ? x.roundRect(6, 6, w - 12, h - 34, 22) : x.rect(6, 6, w - 12, h - 34); x.fill(); x.stroke();
    x.fillStyle = ok ? '#19D46E' : '#6A6474'; x.beginPath(); x.moveTo(w / 2 - 16, h - 30); x.lineTo(w / 2 + 16, h - 30); x.lineTo(w / 2, h - 6); x.closePath(); x.fill();
    x.fillStyle = '#FFFFFF'; x.textAlign = 'center'; x.textBaseline = 'middle';
    fitFont(x, text, w - 40, 30, 'Rubik, sans-serif'); x.font = '800 ' + x.font; x.fillText(text, w / 2, 38);
    fitFont(x, sub, w - 40, 34, FONT_D); x.fillText(sub, w / 2, 76);
  });
}
function makePad(kind, title, price) {
  const g = new THREE.Group();
  const ok = save.money >= price;
  const disk = mesh(g, GC, M(ok ? '#19D46E' : '#8C8696', { em: ok ? '#0E8F4A' : '#3A3444' }), 34, 3, 34, 0, 1.5, 0, false);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(38, 2.5, 8, 32), M(ok ? '#FFE14D' : '#C9C3D2', { em: ok ? '#A08A20' : '#555' })); ring.rotation.x = Math.PI / 2; ring.position.y = 3; g.add(ring);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: ok ? 0x19d46e : 0x8c8696, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 })); glow.scale.set(130, 40, 1); glow.position.y = 6; g.add(glow);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(title, price ? soles(price) : 'Gratis', ok), depthTest: false })); lab.scale.set(110, 55, 1); lab.position.y = 70; lab.renderOrder = 10; g.add(lab);
  g.userData = { disk, ring, lab, glow, ok };
  return g;
}
function makeTable(f, i) {
  const g = new THREE.Group();
  const cloth = f === 2 ? '#FFFFFF' : ['#E23B3B', '#FFFFFF', '#2E6BFF', '#19A35A'][(i + f) % 4];
  cyl(g, M(cloth, { phong: true }), 34, 2.5, 0, 30, 0, true);
  cyl(g, MAT.woodD, 35, 1.5, 0, 28.5, 0, false);
  cyl(g, MAT.dark, 3, 27, 0, 14, 0, true); cyl(g, MAT.dark, 14, 2, 0, 1, 0, false);
  for (const sz of [-1, 1]) {
    const ch = new THREE.Group(); ch.position.set(0, 0, sz * 50); g.add(ch);
    box(ch, MAT.wood, 26, 3, 24, 0, 18, 0, true); box(ch, MAT.wood, 26, 26, 3, 0, 32, sz * 12, true);
    for (const [lx, lz] of [[-11, -10], [11, -10], [-11, 10], [11, 10]]) box(ch, MAT.woodD, 2.5, 17, 2.5, lx, 8.5, lz, false);
  }
  if (f === 2) { cyl(g, MAT.chrome, 1.5, 70, 0, 65, 0, false); const u = mesh(g, new THREE.ConeGeometry(1, 1, 12, 1, true), M('#FFFFFF', { map: stripeTex('#FF2E88', '#FFFFFF', 12), ds: true }), 62, 20, 62, 0, 104, 0, true); void u; }
  const dirty = new THREE.Group(); g.add(dirty); dirty.visible = false;
  for (const [x, z] of [[-10, -12], [12, 10], [4, -2]]) { cyl(dirty, MAT.plate, 8, 1.5, x, 33, z, false); cyl(dirty, M('#B0874A'), 4, 1, x + 1, 34, z, false); }
  sph(dirty, M('#6E5A3A'), 2, 16, 34, -14, false); box(dirty, M('#E8E0CC'), 6, 0.5, 5, -16, 33, 12, false);
  const food = [];
  for (const sz of [-1, 1]) { const fg = new THREE.Group(); fg.position.set(0, 32.5, sz * 16); fg.visible = false; g.add(fg); food.push(fg); }
  g.userData = { dirty, food };
  return g;
}
function setFood(fg, dishId) {
  fg.clear();
  const d = DISH[dishId]; if (!d) return;
  if (d.drink) { const c = cyl(fg, M('#EAF4FA', { phong: true }), 4.5, 12, 0, 6, 0, false); void c; cyl(fg, M(d.col), 4, 9, 0, 5, 0, false); return; }
  cyl(fg, MAT.plate, 11, 1.4, 0, 0.7, 0, false);
  const fd = sph(fg, M(d.col), 7, 0, 3, 0, false); fd.scale.set(7.5, 3.2, 7.5);
  if (d.top) { sph(fg, M(d.top), 2.4, 3, 5.5, -2, false); sph(fg, M(d.top), 2, -3, 5, 2, false); }
}
function makeStation(i) {
  const g = new THREE.Group();
  box(g, MAT.steel, 96, 40, 60, 0, 20, 0, true);
  box(g, M('#2A2A2E'), 90, 2, 54, 0, 41, 0, false);
  const kind = i % 6;
  if (kind === 1) { box(g, M('#3A3A3E'), 80, 4, 44, 0, 43, 0, false); for (let k = 0; k < 7; k++) box(g, MAT.chrome, 76, 1, 1.5, 0, 46, -18 + k * 6, false); box(g, M('#FF6A1A', { em: '#FF4A0A' }), 72, 1, 38, 0, 43.5, 0, false); }
  else if (kind === 2) { box(g, M('#8B3A1F'), 80, 50, 50, 0, 66, -2, true); box(g, M('#FFB040', { em: '#FF8A20' }), 60, 34, 1, 0, 64, 23.5, false); for (let k = 0; k < 3; k++) { const ch = sph(g, M('#C8783A', { phong: true }), 7, -20 + k * 20, 64, 15, false); ch.scale.set(8, 6, 6); } }
  else { for (const [x, z] of [[-24, -10], [24, -10], [0, 12]]) { cyl(g, M('#2A2A2E'), 12, 2, x, 43, z, false); const pot = cyl(g, MAT.chrome, 10, 14, x, 51, z, true); void pot; } }
  box(g, MAT.steel, 100, 8, 70, 0, 140, -5, false);
  box(g, MAT.steel, 30, 50, 30, 0, 170, -20, false);
  const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.35 })); st.scale.set(40, 60, 1); st.position.set(0, 70, 0); g.add(st); WLD.steam.push(st);
  return g;
}
function makeRegister() {
  const g = new THREE.Group();
  box(g, MAT.wood, 110, 42, 50, 0, 21, 0, true); box(g, M('#F2EFE6', { phong: true }), 114, 3, 54, 0, 43, 0, false);
  box(g, M('#26262C', { phong: true }), 26, 14, 20, -20, 52, 0, true); box(g, M('#19D46E', { em: '#0E8F4A' }), 18, 5, 1, -20, 57, -10.5, false);
  const mp = new THREE.Group(); mp.position.set(20, 44, 0); g.add(mp); WLD.money = mp;
  const sign = canvasTex('caja', 256, 64, (x, w, h) => { x.fillStyle = '#FFE14D'; x.fillRect(0, 0, w, h); x.fillStyle = INK; x.font = '44px ' + FONT_D; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CAJA', w / 2, h / 2 + 3); });
  plane(g, M('#FFFFFF', { map: sign }), 60, 15, 0, 92, 0); cyl(g, MAT.dark, 1, 30, 0, 72, 0, false);
  return g;
}
function updateMoneyPile(amount) {
  const mp = WLD.money; if (!mp) return;
  const n = Math.min(24, Math.ceil(amount / 25));
  if (mp.userData.n === n) return; mp.userData.n = n; mp.clear();
  for (let i = 0; i < n; i++) { const b = box(mp, M(i % 3 ? '#4FA35A' : '#2E8B57'), 16, 1.5, 9, (i % 3) * 5 - 5, Math.floor(i / 3) * 2, (i % 2) * 3, false); b.rotation.y = (i * 0.7) % 0.6; }
}
function makeStairs(f) {
  const g = new THREE.Group();
  const n = 12, dz = (STAIR.z0 - STAIR.z1) / n, dy = FLOOR_H / n;
  for (let i = 0; i < n; i++) { box(g, MAT.wood, 72, dy, dz + 2, 0, dy * (i + 0.5), STAIR.z0 - dz * (i + 0.5), true); box(g, MAT.woodD, 72, dy * (i + 1), dz, 0, dy * (i + 1) / 2, STAIR.z0 - dz * (i + 0.5), false); }
  for (const sx of [-1, 1]) { const r = box(g, MAT.chrome, 2.5, 2.5, Math.hypot(FLOOR_H, STAIR.z0 - STAIR.z1), sx * 37, FLOOR_H / 2 + 40, (STAIR.z0 + STAIR.z1) / 2, false); r.rotation.x = Math.atan2(FLOOR_H, STAIR.z0 - STAIR.z1); }
  g.position.set(stairX(f), 0, 0);
  return g;
}
function wallMats(inner, outer, innerIdx) { const inM = M(inner), outM = M('#FFFFFF', { map: T.concrete }); const arr = [outM, outM, M('#E8E2D6'), outM, outM, outM]; arr[innerIdx] = inM; void outer; return arr; }
function makeFloorShell(f) {
  const g = new THREE.Group(); const y = floorY(f); g.position.y = y;
  const top = f === save.floors - 1;
  const deco = save.decor[f] || {};
  const floorMat = deco.piso ? M('#FFFFFF', { map: T.wood }) : M('#FFFFFF', { map: T.tile });
  if (floorMat.map) { }
  const slab = (x0, x1, z0, z1) => { const w = x1 - x0, d = z1 - z0; const geo = new THREE.BoxGeometry(w, 10, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 120, uv.getY(i) * d / 120); const m = new THREE.Mesh(geo, [M('#8C857A'), M('#8C857A'), f === 2 ? M('#FFFFFF', { map: T.concrete }) : floorMat, M('#8C857A'), M('#8C857A'), M('#8C857A')]); m.position.set((x0 + x1) / 2, -5, (z0 + z1) / 2); m.receiveShadow = true; m.castShadow = f > 0; g.add(m); };
  if (f === 0) slab(-500, 500, -400, 400);
  else { const hx = stairX(f - 1); if (hx > 0) { slab(-500, 370, -400, 400); slab(450, 500, -400, 400); slab(370, 450, -140, 400); } else { slab(-370, 500, -400, 400); slab(-500, -450, -400, 400); slab(-450, -370, -140, 400); } }
  if (f === 0) { const kf = new THREE.Mesh(new THREE.PlaneGeometry(1000, 200), M('#FFFFFF', { map: T.kitchen })); kf.material.map.repeat.set(8, 1.6); kf.rotation.x = -Math.PI / 2; kf.position.set(0, 0.4, -300); kf.receiveShadow = true; g.add(kf); }
  const wc = save.wall[f] || '#EDE6D6';
  const wh = f === 2 ? 0 : FLOOR_H;
  if (f < 2) {
    const back = new THREE.Mesh(GB, wallMats(wc, 0, 4)); back.scale.set(1000, wh, 10); back.position.set(0, wh / 2, -405); back.castShadow = true; back.receiveShadow = true; g.add(back);
    const left = new THREE.Mesh(GB, wallMats(wc, 0, 0)); left.scale.set(10, wh, 810); left.position.set(-505, wh / 2, 0); left.castShadow = true; left.receiveShadow = true; g.add(left);
    const right = new THREE.Mesh(GB, wallMats(wc, 0, 1)); right.scale.set(10, wh, 810); right.position.set(505, wh / 2, 0); right.castShadow = true; right.receiveShadow = true; g.add(right);
    // ventanas con marco en las paredes laterales
    const winM = M('#9FC3DA', { phong: true, shin: 120 }), frM = M('#F4F4F2');
    for (const z of [-60, 120, 280]) for (const sx of [-1, 1]) { box(g, frM, 3, 64, 90, sx * 499, 100, z, false); box(g, winM, 3.5, 56, 82, sx * 499, 100, z, false); }
    for (const sx of [-1, 1]) box(g, M(shade(wc, -0.3)), 12, wh + 4, 16, sx * 500, wh / 2, 400, true);
    const beam = box(g, M(shade(wc, -0.35)), 1012, 22, 14, 0, wh - 11, 400, true); void beam;
    if (f === 0) {
      const nt = canvasTex('name' + save.name, 1024, 96, (x, w, h) => { x.fillStyle = '#1B1523'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFE14D'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, save.name.toUpperCase(), w - 60, 64, FONT_D); x.fillText(save.name.toUpperCase(), w / 2, h / 2 + 3); });
      plane(g, M('#FFFFFF', { map: nt }), 500, 46, 0, wh + 28, 408);
      box(g, MAT.dark, 520, 56, 6, 0, wh + 28, 404, false);
      const aw = box(g, M('#FFFFFF', { map: stripeTex('#E23B3B', '#FFFFFF', 12) }), 180, 4, 60, 0, 130, 425, true); aw.rotation.x = 0.3;
    }
  } else {
    const rail = M('#F4F4F2', { phong: true });
    for (const [x, z, w, d] of [[0, -400, 1000, 4], [-500, 0, 4, 800], [500, 0, 4, 800], [-280, 400, 440, 4], [280, 400, 440, 4]]) { box(g, rail, w, 4, d, x, 50, z, false); for (let k = -0.5; k <= 0.5; k += 0.05) box(g, rail, 3, 50, 3, x + (w > d ? k * w : 0), 25, z + (d > w ? k * d : 0), false); }
  }
  if (top && f < 2) {
    const edge = M('#8C857A');
    for (const [x, z, w, d] of [[0, -400, 1010, 10], [-500, 0, 10, 810], [500, 0, 10, 810]]) box(g, edge, w, 14, d, x, wh + 7, z, false);
  }
  return g;
}
function makeDriveThru() {
  const g = new THREE.Group();
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(130, 1500), M('#FFFFFF', { map: T.asphalt })); lane.material.map.repeat.set(1, 10); lane.rotation.x = -Math.PI / 2; lane.position.set(-615, 0.6, -80); lane.receiveShadow = true; g.add(lane);
  for (let z = 350; z > -700; z -= 180) { const ar = box(g, M('#F4F2EA'), 6, 0.5, 40, -615, 1, z, false); void ar; box(g, M('#F4F2EA'), 22, 0.5, 6, -615, 1, z - 18, false); }
  box(g, M('#FFE14D', { phong: true }), 8, 70, 70, -505, 90, -300, true);
  box(g, MAT.glass, 9, 50, 56, -505, 90, -300, false);
  const aw = box(g, M('#FFFFFF', { map: stripeTex('#E23B3B', '#FFFFFF', 10) }), 60, 4, 90, -535, 130, -300, true); aw.rotation.z = -0.3;
  const mb = canvasTex('menuboard', 256, 320, (x, w, h) => { x.fillStyle = '#1B1523'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFE14D'; x.font = '34px ' + FONT_D; x.textAlign = 'center'; x.fillText('DRIVE', w / 2, 46); x.font = '800 20px Rubik, sans-serif'; x.fillStyle = '#FFFFFF'; save.menu.slice(0, 7).forEach((id, i) => { x.textAlign = 'left'; x.fillText(DISH[id].name, 18, 94 + i * 30); x.textAlign = 'right'; x.fillText(soles(dishPrice(id)), w - 18, 94 + i * 30); }); });
  cyl(g, MAT.dark, 3, 90, -700, 45, 60, true); const bp = plane(g, M('#FFFFFF', { map: mb }), 70, 88, -700, 110, 60); bp.rotation.y = Math.PI / 2;
  const sg = canvasTex('dtsign', 256, 64, (x, w, h) => { x.fillStyle = '#FF2E88'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFFFFF'; x.font = '38px ' + FONT_D; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DRIVE-THRU', w / 2, h / 2 + 3); });
  cyl(g, MAT.dark, 3, 120, -700, 60, 460, true); plane(g, M('#FFFFFF', { map: sg }), 110, 28, -700, 130, 462);
  return g;
}
function makeMoto() {
  const g = new THREE.Group();
  for (const z of [-22, 22]) { const w = mesh(g, GC, MAT.tire, 10, 5, 10, 0, 10, z, true); w.rotation.z = Math.PI / 2; }
  box(g, M('#19A35A', { phong: true }), 12, 12, 40, 0, 20, 0, true); box(g, MAT.dark, 14, 5, 22, 0, 29, 6, false);
  box(g, MAT.dark, 24, 2, 2, 0, 34, -20, false);
  const bx = new THREE.Group(); bx.position.set(0, 42, 18); g.add(bx);
  const bt = canvasTex('dbox', 128, 128, (x, w, h) => { x.fillStyle = '#FF2E88'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFFFFF'; x.font = '26px ' + FONT_D; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('DELIVERY', w / 2, h / 2); });
  const bm = M('#FFFFFF', { map: bt });
  const b = new THREE.Mesh(GB, [bm, bm, M('#FF2E88'), M('#FF2E88'), bm, bm]); b.scale.set(26, 26, 26); b.castShadow = true; bx.add(b);
  return g;
}
function makeCar(col) {
  const g = new THREE.Group(), paint = M(col, { phong: true, shin: 90 });
  box(g, paint, 40, 14, 80, 0, 15, 0, true); box(g, MAT.glass, 34, 12, 40, 0, 28, 4, true); box(g, paint, 36, 2, 36, 0, 35, 4, false);
  for (const [x, z] of [[-20, -26], [20, -26], [-20, 26], [20, 26]]) { const w = mesh(g, GC, MAT.tire, 8, 6, 8, x, 8, z, true); w.rotation.z = Math.PI / 2; }
  box(g, M('#FFF4C8', { em: '#FFE6A0' }), 30, 3, 1, 0, 16, -40.5, false); box(g, M('#8E1B1B', { em: '#400' }), 30, 3, 1, 0, 17, 40.5, false);
  return g;
}
function makeDecor(kind, f, i) {
  const g = new THREE.Group();
  if (kind === 'planta') {
    const pos = [[-470, 370], [470, 370], [-470, -170], [270, -170]][i]; g.position.set(pos[0], 0, pos[1]);
    cyl(g, M('#B5553A'), 14, 22, 0, 11, 0, true);
    for (let k = 0; k < 5; k++) { const l = mesh(g, GI, M(['#3E6A34', '#4B7B3E', '#56884A'][k % 3], { flat: true }), 1, 1, 1, rand(-10, 10), 34 + k * 7, rand(-10, 10), true); l.scale.setScalar(12 + rand(0, 6)); }
  } else if (kind === 'cuadro') {
    const pos = [[-250, -398, 0], [250, -398, 0], [-498, 20, Math.PI / 2], [498, 20, -Math.PI / 2]][i];
    g.position.set(pos[0], 95, pos[1]); g.rotation.y = pos[2];
    const art = canvasTex('art' + i, 256, 192, (x, w, h) => { const pals = [['#FF2E88', '#FFE14D', '#19A35A', '#2E6BFF'], ['#C0392B', '#F2C230', '#FFFFFF', '#1B1523'], ['#6FB3E0', '#F4EAD2', '#8B3A1F', '#19A35A'], ['#7B3FF2', '#FF7A1A', '#FFE14D', '#FFFFFF']][i]; x.fillStyle = pals[0]; x.fillRect(0, 0, w, h); for (let k = 0; k < 14; k++) { x.fillStyle = pals[k % 4]; x.beginPath(); if (k % 2) x.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 40, 0, 7); else { x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); } x.fill(); } });
    box(g, MAT.woodD, 84, 64, 3, 0, 0, 1.5, false); plane(g, M('#FFFFFF', { map: art }), 76, 56, 0, 0, 3.2);
  } else if (kind === 'lampara') {
    const pos = [[-110, 160], [110, 160], [-110, 0], [110, 0]][i]; g.position.set(pos[0], FLOOR_H - 2, pos[1]);
    cyl(g, MAT.dark, 0.6, 40, 0, -20, 0, false);
    const sh = mesh(g, new THREE.ConeGeometry(1, 1, 16, 1, true), M('#FF7A1A', { ds: true, phong: true }), 16, 16, 16, 0, -46, 0, false); void sh;
    const bulb = sph(g, M('#FFF1C4', { em: '#FFD27A' }), 5, 0, -52, 0, false); WLD.lampMats.push(bulb);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0xffc870, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.0 })); gl.scale.set(110, 110, 1); gl.position.y = -52; g.add(gl); WLD.lampMats.push(gl);
  } else if (kind === 'parlante') {
    g.position.set(-470, 0, -120);
    box(g, M('#26262C', { phong: true }), 30, 60, 30, 0, 30, 0, true); cyl(g, M('#555'), 9, 2, 0, 42, 15.5, false).rotation.x = Math.PI / 2; cyl(g, M('#555'), 6, 2, 0, 18, 15.5, false).rotation.x = Math.PI / 2;
  } else if (kind === 'acuario') {
    g.position.set(470, 0, 170);
    box(g, MAT.woodD, 40, 40, 140, 0, 20, 0, true);
    const tank = box(g, M('#6FC3E0', { op: 0.45, phong: true, shin: 160 }), 36, 50, 130, 0, 66, 0, false); void tank;
    for (let k = 0; k < 7; k++) { const fsh = sph(g, M(pick(['#FF7A1A', '#FFE14D', '#FF2E88', '#FFFFFF'])), 3, rand(-10, 10), rand(50, 82), rand(-55, 55), false); fsh.scale.set(2, 2.5, 4.5); g.userData.fish = (g.userData.fish || []).concat([fsh]); }
  } else if (kind === 'letrero') {
    g.position.set(0, FLOOR_H + 80, 410);
    const nt = canvasTex('neon' + save.name, 1024, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.shadowColor = '#FF2E88'; x.shadowBlur = 30; x.fillStyle = '#FFD1E6'; x.textAlign = 'center'; x.textBaseline = 'middle'; fitFont(x, save.name, w - 80, 86, FONT_D); x.fillText(save.name, w / 2, h / 2); x.fillText(save.name, w / 2, h / 2); });
    const p = plane(g, M('#FFFFFF', { map: nt, basic: true, op: 1 }), 560, 70, 0, 0, 0); p.material.alphaTest = 0.05; p.material.blending = THREE.AdditiveBlending;
    box(g, MAT.dark, 4, 90, 4, -240, -45, -4, false); box(g, MAT.dark, 4, 90, 4, 240, -45, -4, false);
  }
  return g;
}

/* ---------- construcción del escenario ---------- */
function buildStreet(root) {
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6000, 300), M('#FFFFFF', { map: T.asphalt })); road.material.map.repeat.set(30, 1.5); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.2, 670); road.receiveShadow = true; root.add(road);
  for (let x = -3000; x < 3000; x += 120) box(root, M('#ECEADF'), 60, 0.4, 5, x, 0.5, 670, false);
  const sw = new THREE.Mesh(new THREE.BoxGeometry(6000, 8, 110), M('#FFFFFF', { map: T.walk })); sw.material.map.repeat.set(40, 1); sw.position.set(0, 4, 465); sw.receiveShadow = true; root.add(sw);
  const sw2 = new THREE.Mesh(new THREE.BoxGeometry(6000, 8, 110), M('#FFFFFF', { map: T.walk })); sw2.position.set(0, 4, 875); sw2.receiveShadow = true; root.add(sw2);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1200), M('#FFFFFF', { map: T.concrete })); lot.material.map.repeat.set(12, 9); lot.rotation.x = -Math.PI / 2; lot.position.set(0, -0.4, -190); lot.receiveShadow = true; root.add(lot);
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), M('#6D665C')); grd.rotation.x = -Math.PI / 2; grd.position.y = -1; grd.receiveShadow = true; root.add(grd);
  const r = mulberry32(42), facs = ['#F2C230', '#2E6BFF', '#19A35A', '#E23B3B', '#FF7A1A', '#EDE6D6', '#7B3FF2', '#3C8D93', '#E8A0B8'];
  const nb = (x0, x1, z, face) => { const fl = 2 + Math.floor(r() * 3), Hb = fl * 110, col = pickR(r, facs), tex = facadeTex(col, fl, r() < 0.3, Math.floor(r() * 99)); const n = Math.max(1, Math.round((x1 - x0) / 200)); const key = tex.uuid + 'n' + n; let ft = TC.get(key); if (!ft) { ft = tex.clone(); ft.wrapS = THREE.RepeatWrapping; ft.repeat.set(n, 1); ft.needsUpdate = true; TC.set(key, ft); } const fm = M('#FFFFFF', { map: ft }), sd = M('#FFFFFF', { map: T.brick }); const mats = [sd, sd, M('#9A958D'), sd, sd, sd]; mats[face] = fm; const b = new THREE.Mesh(GB, mats); b.scale.set(x1 - x0, Hb, 300); b.position.set((x0 + x1) / 2, Hb / 2, z); b.castShadow = true; b.receiveShadow = true; root.add(b); };
  let x = -3000; while (x < -820) { const w = 220 + r() * 160; nb(x, Math.min(-820, x + w), 250, 4); x += w + 4; }
  x = 820; while (x < 3000) { const w = 220 + r() * 160; nb(x, x + w, 250, 4); x += w + 4; }
  x = -3000; while (x < 3000) { const w = 220 + r() * 160; nb(x, x + w, 1080, 5); x += w + 4; }
  x = -1600; while (x < 1600) { const w = 260 + r() * 200; nb(x, x + w, -950, 4); x += w + 4; }
  for (let k = -2800; k < 2800; k += 260) { if (Math.abs(k) < 560) continue; makeTree(root, k, 505, Math.floor(r() * 1e6), 1.3); }
  for (let k = -2600; k < 2600; k += 520) { cyl(root, M('#6E7277'), 2, 140, k, 70, 515, true); box(root, M('#6E7277'), 40, 3, 3, k, 138, 500, false); }
}
function rebuildWorld() {
  if (WLD.root) scene.remove(WLD.root);
  WLD.root = new THREE.Group(); scene.add(WLD.root);
  WLD.floors = []; WLD.tables = [[], [], []]; WLD.stations = []; WLD.deco = [[], [], []]; WLD.steam = []; WLD.lampMats = []; WLD.pops = []; WLD.money = null; WLD.cars = []; WLD.motoModels = [];
  buildStreet(WLD.root);
  for (let f = 0; f < save.floors; f++) {
    const fg = makeFloorShell(f); WLD.root.add(fg); WLD.floors.push(fg);
    for (let i = 0; i < save.tables[f]; i++) addTableModel(f, i, false);
    const d = save.decor[f] || {};
    for (const it of DECOR) for (let k = 0; k < (d[it.id] || 0); k++) if (!['piso', 'pintura'].includes(it.id)) addDecorModel(it.id, f, k, false);
    if (f < save.floors - 1) { const st = makeStairs(f); fg.add(st); }
  }
  const kitchen = WLD.floors[0];
  box(kitchen, MAT.steel, 740, 38, 26, -115, 19, PASS_Z, true); box(kitchen, M('#F2EFE6', { phong: true }), 744, 3, 30, -115, 39.5, PASS_Z, false);
  for (let x = -440; x < 220; x += 120) { cyl(kitchen, MAT.dark, 0.6, 50, x, 145, PASS_Z, false); const lp = sph(kitchen, M('#FF9A5A', { em: '#FF6A1A' }), 5, x, 118, PASS_Z, false); void lp; }
  for (let i = 0; i < save.stations; i++) addStationModel(i, false);
  const reg = makeRegister(); reg.position.set(REG.x, 0, REG.z); kitchen.add(reg);
  box(kitchen, M('#F4F2EA'), 80, 0.5, 30, 0, 0.6, 385, false);
  if (save.drive) WLD.root.add(makeDriveThru());
  for (let i = 0; i < save.motos; i++) addMotoModel(i, false);
}
function addTableModel(f, i, anim) { const [x, z] = SLOTS[f][i]; const t = makeTable(f, i); t.position.set(x, 0, z); WLD.floors[f].add(t); WLD.tables[f][i] = t; bake(t.userData.dirty.parent === t ? t : t); if (anim) { popIn(t); dust(x, floorY(f), z); } return t; }
function addStationModel(i, anim) { const s = makeStation(i); s.position.set(STATION_X[i], 0, STATION_Z); WLD.floors[0].add(s); WLD.stations[i] = s; if (anim) { popIn(s); dust(STATION_X[i], 0, STATION_Z); } }
function addDecorModel(kind, f, k, anim) { const d = makeDecor(kind, f, k); (kind === 'letrero' ? WLD.floors[0] : WLD.floors[f]).add(d); WLD.deco[f].push(d); if (anim) { popIn(d); dust(d.position.x, floorY(f), d.position.z); } }
function addMotoModel(i, anim) { const m = makeMoto(); m.position.set(620, 0, 180 + i * 80); m.rotation.y = Math.PI / 2; WLD.root.add(m); WLD.motoModels[i] = m; if (anim) popIn(m); }
