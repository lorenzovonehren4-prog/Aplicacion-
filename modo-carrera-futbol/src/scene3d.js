/* ================== ESCENAS 3D: motor, escudos, uniformes, estadio y jugadas ================== */
let isTouch = false;
const INK = '#1B1523', FONT_D = 'Bungee, Impact, sans-serif';
const cv3 = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 5, 9000);
const hemi = new THREE.HemisphereLight(0xeaf0f6, 0x6b6258, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0dc, 1.8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 10, far: 3500 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1;
sun.position.set(-500, 900, 400); scene.add(sun); scene.add(sun.target);
const GB = new THREE.BoxGeometry(1, 1, 1), GC = new THREE.CylinderGeometry(1, 1, 1, 20), GC8 = new THREE.CylinderGeometry(1, 1, 1, 8), GS = new THREE.SphereGeometry(1, 14, 10), GI = new THREE.IcosahedronGeometry(1, 1), GPL = new THREE.PlaneGeometry(1, 1);
const MC = new Map(), TC = new Map(), GCache = new Map();
const MAT = {}, T = {}, VC = {};
const S3 = { mode: 'home', root: null, t: 0, anim: null, yaw: 0.6, avatar: null, crowd: null, cam: null, tv: '', fx: [], actors: [], labels: [], walk: null, drag: false };
const QUAL = { level: 'alta', pr: 2, crowd: 1, players: 1 };
function setQuality(l) {
  QUAL.level = l;
  QUAL.pr = l === 'alta' ? 2 : l === 'media' ? 1.5 : 1;
  QUAL.crowd = l === 'alta' ? 1 : l === 'media' ? 0.6 : 0.3;
  QUAL.players = l === 'baja' ? 0.5 : 1;
  renderer.shadowMap.enabled = l !== 'baja';
  sun.shadow.mapSize.set(l === 'alta' ? 2048 : 1024, l === 'alta' ? 2048 : 1024);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  MC.forEach(m => { m.needsUpdate = true; });
}

function init3d() {
  T.soft = canvasTex('soft', 64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  T.wood = canvasTex('wood', 256, 256, (x, w, h) => { const cols = ['#9C6B3F', '#A87545', '#8E6038', '#B07C4A']; for (let i = 0; i < 8; i++) { x.fillStyle = cols[i % 4]; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, i * 32, w, 2); for (let j = 0; j < 3; j++) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(((i * 97 + j * 71) % 8) * 32, i * 32, 2, 32); } } noise(x, w, h, 900, 0.05, 0.08); }, true);
  T.darkwood = canvasTex('dwood', 128, 128, (x, w, h) => { x.fillStyle = '#4A2E1C'; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.moveTo(0, i * 3.2); x.bezierCurveTo(40, i * 3.2 + 3, 80, i * 3.2 - 3, 128, i * 3.2); x.stroke(); } }, true);
  T.grass = canvasTex('grass', 256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#3E8E3A' : '#47A043'; x.fillRect(0, i * 32, w, 32); } noise(x, w, h, 3000, 0.06, 0.12); }, true);
  T.lawn = canvasTex('lawn', 128, 128, (x, w, h) => { x.fillStyle = '#5E9C4A'; x.fillRect(0, 0, w, h); noise(x, w, h, 1500, 0.1, 0.18); }, true);
  T.concrete = canvasTex('conc', 128, 128, (x, w, h) => { x.fillStyle = '#A49E94'; x.fillRect(0, 0, w, h); noise(x, w, h, 1600, 0.12, 0.18); }, true);
  T.asphalt = canvasTex('asph', 128, 128, (x, w, h) => { x.fillStyle = '#3C3D42'; x.fillRect(0, 0, w, h); noise(x, w, h, 2400, 0.08, 0.2); }, true);
  T.tile = canvasTex('tile', 128, 128, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#E9E3D6' : '#DCD3C2'; x.fillRect(i * 32, j * 32, 32, 32); } x.strokeStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i <= 4; i++) { x.strokeRect(i * 32, 0, 0.5, h); x.strokeRect(0, i * 32, w, 0.5); } }, true);
  T.marble = canvasTex('marble', 256, 256, (x, w, h) => { x.fillStyle = '#F2EFEA'; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(120,110,100,' + (0.08 + Math.random() * 0.12) + ')'; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); let px = Math.random() * w, py = 0; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (Math.random() - 0.5) * 60; py += h / 8; x.lineTo(px, py); } x.stroke(); } x.strokeStyle = 'rgba(0,0,0,.08)'; x.strokeRect(0, 0, w, h); }, true);
  T.rug = canvasTex('rug', 128, 128, (x, w, h) => { x.fillStyle = '#B5473A'; x.fillRect(0, 0, w, h); x.strokeStyle = '#F2D39A'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20); x.lineWidth = 2; x.strokeRect(22, 22, w - 44, h - 44); for (let i = 0; i < 4; i++) { x.fillStyle = '#F2D39A'; x.beginPath(); x.moveTo(w / 2, 30 + i * 18); x.lineTo(w / 2 + 12, 40 + i * 18); x.lineTo(w / 2, 50 + i * 18); x.lineTo(w / 2 - 12, 40 + i * 18); x.fill(); } });
  T.water = canvasTex('water', 128, 128, (x, w, h) => { x.fillStyle = '#3FA7D6'; x.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); const px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); x.quadraticCurveTo(px + 8, py - 3, px + 16, py); x.stroke(); } }, true);
  T.net = canvasTex('net', 64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 8, 0); x.lineTo(i * 8, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 8); x.lineTo(w, i * 8); x.stroke(); } }, true);
  T.seats = canvasTex('seats', 64, 64, (x, w, h) => { x.fillStyle = '#2A2C36'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, i * 8, w, 3); } }, true);
  T.ball = canvasTex('ball', 128, 64, (x, w, h) => { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); x.fillStyle = '#1B1523'; for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { const cx = i * 22 + (j % 2) * 11 + 6, cy = j * 22 + 10; x.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); } x.fill(); } });
  MAT.glass = M('#1C2836', { phong: true, shin: 120 }); MAT.tire = M('#151515'); MAT.rim = M('#C9CDD2', { phong: true }); MAT.dark = M('#222226'); MAT.chrome = M('#C9CDD2', { phong: true, shin: 140 }); MAT.white = M('#F4F4F2');
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  const et = canvasTex('env', 64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#F4F7FA'); g.addColorStop(0.5, '#C8C0B4'); g.addColorStop(1, '#3A3A3C'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: et, side: THREE.BackSide })));
  scene.environment = pm.fromScene(es, 0.02).texture; pm.dispose();
  setupInput();
}
function sky(top, bot, stars) {
  scene.background = canvasTex('sky' + top + bot + (stars ? 's' : ''), 64, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); if (stars) for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.8 + ')'; x.fillRect(Math.random() * w, Math.random() * h * 0.5, 1, 1); } });
}
function clear3d() {
  if (S3.root) scene.remove(S3.root);
  S3.root = new THREE.Group(); scene.add(S3.root);
  S3.crowd = null; S3.anim = null; S3.cam = null; S3.tv = ''; S3.fx = []; S3.actors = []; S3.labels = []; S3.walk = null; S3.inter = []; S3.floorMeshes = []; S3.pets = []; S3.extra = null; S3.ambient = null; S3.partner = null; S3.kids = []; S3.mom = null;
  hemi.intensity = 1.25; sun.intensity = 1.8; hemi.color.set(0xeaf0f6); hemi.groundColor.set(0x6b6258); sun.color.set(0xfff0dc);
}
function playerLook(shirtMat, num) { const cl = C ? C.clubs[C.clubId] : null; return { kind: 'normal', skin: C ? C.skin : '#A56B45', hair: '#1A1110', shirt: cl ? cl.c1 : '#E23B3B', shirtMat: shirtMat || (cl ? kitMat(kitOf(cl)) : null), pants: cl ? shade(cl.c2 === cl.c1 ? INK : cl.c2, -0.1) : '#1B1523', scale: 1.1, num: num || 10, numCol: '#FFFFFF' }; }

/* ================== ESCUDOS Y UNIFORMES ================== */
const KIT_STYLES = ['rayas', 'liso', 'banda', 'mitades', 'aros', 'liso', 'franja', 'rayas'];
function kitOf(c) {
  if (!c) return { c1: '#E23B3B', c2: '#FFFFFF', style: 'liso', id: 'x' };
  let c2 = c.c2; if (c2 === c.c1) c2 = lum(c.c1) > 0.6 ? INK : '#FFFFFF';
  return { c1: c.c1, c2, style: KIT_STYLES[(c.id * 7 + 3) % KIT_STYLES.length], id: c.id, name: c.name };
}
const PERU_KIT = { c1: '#FFFFFF', c2: '#D91023', style: 'banda', id: 'peru', name: 'Perú' };
function drawKit(x, w, h, k) {
  x.fillStyle = k.c1; x.fillRect(0, 0, w, h);
  x.fillStyle = k.c2;
  if (k.style === 'rayas') for (let i = 0; i < 5; i++) x.fillRect(i * w / 5 + w / 20, 0, w / 10, h);
  else if (k.style === 'aros') for (let i = 0; i < 4; i++) x.fillRect(0, i * h / 4 + h / 16, w, h / 8);
  else if (k.style === 'banda') { x.beginPath(); x.moveTo(0, h * 0.05); x.lineTo(w * 0.25, 0); x.lineTo(w, h * 0.75); x.lineTo(w, h); x.lineTo(w * 0.75, h); x.lineTo(0, h * 0.3); x.fill(); }
  else if (k.style === 'mitades') x.fillRect(w / 2, 0, w / 2, h);
  else if (k.style === 'franja') x.fillRect(0, h * 0.38, w, h * 0.24);
  else { x.fillRect(0, 0, w, h * 0.08); x.fillRect(0, h * 0.92, w, h * 0.08); }
}
function kitMat(k) { const t = canvasTex('kit' + k.c1 + k.c2 + k.style, 64, 64, (x, w, h) => drawKit(x, w, h, k)); return M('#FFFFFF', { map: t }); }
function initials(name) { const w = name.split(/\s+/).filter(p => !/^(de|del|la|el|los|las|y)$/i.test(p)); return (w[0] ? w[0][0] : '') + (w[1] ? w[1][0] : (w[0] && w[0][1] ? w[0][1] : '')); }
function drawCrest(x, w, h, c) {
  const k = kitOf(c), r = mulberry32(typeof c.id === 'number' ? c.id * 131 + 7 : 99);
  const shape = Math.floor(r() * 3);
  x.save();
  x.beginPath();
  if (shape === 0) { x.moveTo(w * 0.08, h * 0.08); x.lineTo(w * 0.92, h * 0.08); x.lineTo(w * 0.92, h * 0.5); x.quadraticCurveTo(w * 0.92, h * 0.82, w * 0.5, h * 0.96); x.quadraticCurveTo(w * 0.08, h * 0.82, w * 0.08, h * 0.5); }
  else if (shape === 1) { x.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2); }
  else { x.moveTo(w * 0.5, h * 0.04); x.lineTo(w * 0.94, h * 0.2); x.lineTo(w * 0.86, h * 0.7); x.lineTo(w * 0.5, h * 0.96); x.lineTo(w * 0.14, h * 0.7); x.lineTo(w * 0.06, h * 0.2); }
  x.closePath();
  x.fillStyle = k.c1; x.fill(); x.clip();
  x.fillStyle = k.c2;
  const st = k.style;
  if (st === 'rayas') for (let i = 0; i < 5; i++) x.fillRect(i * w / 5 + w / 20, 0, w / 10, h);
  else if (st === 'banda') { x.beginPath(); x.moveTo(0, h * 0.1); x.lineTo(w * 0.22, 0); x.lineTo(w, h * 0.8); x.lineTo(w, h); x.lineTo(w * 0.78, h); x.lineTo(0, h * 0.34); x.fill(); }
  else if (st === 'mitades') x.fillRect(w / 2, 0, w / 2, h);
  else if (st === 'aros') for (let i = 0; i < 4; i++) x.fillRect(0, i * h / 4 + h / 16, w, h / 8);
  else if (st === 'franja') x.fillRect(0, h * 0.4, w, h * 0.2);
  else { x.fillRect(0, 0, w, h * 0.3); }
  x.restore();
  x.lineWidth = w * 0.06; x.strokeStyle = '#F4D35E'; x.stroke(); x.lineWidth = w * 0.025; x.strokeStyle = INK; x.stroke();
  const ini = initials(c.name || 'FC').toUpperCase();
  x.font = Math.round(w * 0.3) + 'px ' + FONT_D; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = w * 0.06; x.strokeStyle = INK; x.strokeText(ini, w / 2, h * 0.52); x.fillStyle = '#FFFFFF'; x.fillText(ini, w / 2, h * 0.52);
  const stars = Math.floor(r() * 3); x.fillStyle = '#F4D35E';
  for (let i = 0; i < stars; i++) star(x, w / 2 + (i - (stars - 1) / 2) * w * 0.14, h * 0.2, w * 0.05);
}
function star(x, cx, cy, r) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); }
const CREST_URLS = new Map();
function crestURL(c) {
  const key = c.id + '|' + c.c1 + c.c2;
  if (CREST_URLS.has(key)) return CREST_URLS.get(key);
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; const x = cv.getContext('2d');
  if (x) drawCrest(x, 96, 96, c);
  const u = cv.toDataURL(); CREST_URLS.set(key, u); return u;
}
function crestTex(c) { return canvasTex('crest' + c.id + c.c1 + c.c2, 128, 128, (x, w, h) => drawCrest(x, w, h, c)); }

/* ================== PARTÍCULAS (confeti, fuegos artificiales, chispas) ================== */
function burst(pos, colors, n, speed, life, size, grav) {
  if (!S3.root) return;
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: new THREE.Color(pick(colors)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); const s = size * rand(0.6, 1.2); sp.scale.set(s, s, 1);
    const th = Math.random() * Math.PI * 2, ph = Math.acos(rand(-1, 1)), v = speed * rand(0.5, 1);
    S3.root.add(sp);
    S3.fx.push({ sp, v: new THREE.Vector3(Math.sin(ph) * Math.cos(th) * v, Math.cos(ph) * v, Math.sin(ph) * Math.sin(th) * v), life, t: 0, grav: grav === undefined ? 60 : grav, s });
  }
}
function confetti(pos, colors, n) {
  if (!S3.root) return;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(GPL, new THREE.MeshBasicMaterial({ color: new THREE.Color(pick(colors)), side: THREE.DoubleSide }));
    m.scale.set(5, 3, 1); m.position.set(pos.x + rand(-300, 300), pos.y + rand(0, 200), pos.z + rand(-300, 300));
    S3.root.add(m);
    S3.fx.push({ sp: m, v: new THREE.Vector3(rand(-20, 20), rand(-40, -15), rand(-20, 20)), life: 6, t: 0, grav: 4, spin: rand(2, 7), conf: true });
  }
}
function updateFx(dt) {
  for (let i = S3.fx.length - 1; i >= 0; i--) {
    const f = S3.fx[i]; f.t += dt;
    f.v.y -= f.grav * dt; f.sp.position.addScaledVector(f.v, dt);
    if (f.conf) { f.sp.rotation.x += f.spin * dt; f.sp.rotation.y += f.spin * 0.7 * dt; f.v.x *= 0.99; }
    else { const k = 1 - f.t / f.life; f.sp.material.opacity = Math.max(0, k); f.v.multiplyScalar(0.985); }
    if (f.t > f.life) { f.sp.parent && f.sp.parent.remove(f.sp); f.sp.material.dispose(); S3.fx.splice(i, 1); }
  }
}
function fireworks(center, colors) { burst(new THREE.Vector3(center.x + rand(-500, 500), rand(420, 700), center.z + rand(-400, 400)), colors, 60, 220, 1.8, 16, 50); }

/* ================== ESTADIO ================== */
const PITCH = { w: 1400, h: 900 };
function pitchTex() {
  return canvasTex('pitch2', 1400, 900, (x, w, h) => {
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? '#3F9A3C' : '#4AAB45'; x.fillRect(i * w / 14, 0, w / 14 + 1, h); }
    noise(x, w, h, 16000, 0.05, 0.08);
    const g = x.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, w * 0.7); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = 5; x.fillStyle = 'rgba(255,255,255,.92)';
    const L = 50, R = w - 50, Tp = 30, B = h - 30, cy = h / 2;
    x.strokeRect(L, Tp, R - L, B - Tp);
    x.beginPath(); x.moveTo(w / 2, Tp); x.lineTo(w / 2, B); x.stroke();
    x.beginPath(); x.arc(w / 2, cy, 90, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(w / 2, cy, 5, 0, Math.PI * 2); x.fill();
    for (const s of [1, -1]) {
      const gx = s > 0 ? L : R, d = s;
      x.strokeRect(s > 0 ? gx : gx - 165, cy - 200, 165, 400);
      x.strokeRect(s > 0 ? gx : gx - 55, cy - 90, 55, 180);
      x.beginPath(); x.arc(gx + d * 110, cy, 5, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(gx + d * 110, cy, 90, s > 0 ? -0.93 : Math.PI - 0.93 + 0, s > 0 ? 0.93 : Math.PI + 0.93); x.stroke();
      for (const cyy of [Tp, B]) { x.beginPath(); x.arc(gx, cyy, 12, 0, Math.PI * 2); x.stroke(); }
    }
  });
}
const SPONSORS = ['INKA COLAPSO', 'CEVICHE PRO', 'BANCO CHALACO', 'MOVISTRELLA', 'PAPA RELLENA', 'AEROPERÚ AIR', 'CHIFA WONG', 'TURBO MOTO', 'GAMARRA FIT', 'PISCO REAL', 'LUCUMA ENERGY', 'CUY BURGER'];
function ledTex() {
  return canvasTex('led', 2048, 64, (x, w, h) => {
    const cols = [['#E23B3B', '#FFFFFF'], ['#19D46E', '#0B2A17'], ['#FFE14D', '#1B1523'], ['#2E6BFF', '#FFFFFF'], ['#1B1523', '#FFE14D'], ['#FF7A1A', '#FFFFFF']];
    const n = 8;
    for (let i = 0; i < n; i++) { const [bg, fg] = cols[i % cols.length]; x.fillStyle = bg; x.fillRect(i * w / n, 0, w / n, h); x.fillStyle = fg; x.font = '30px ' + FONT_D; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(SPONSORS[i % SPONSORS.length], i * w / n + w / n / 2, h / 2 + 2); }
  }, true);
}
function makeGoal(R, x, dir) {
  const g = new THREE.Group(); g.position.set(x, 0, 0); R.add(g);
  const post = M('#FFFFFF', { phong: true, shin: 90 });
  for (const z of [-60, 60]) cyl(g, post, 2.2, 48, 0, 24, z, true);
  const bar = cyl(g, post, 2.2, 124, 0, 48, 0, true); bar.rotation.x = Math.PI / 2;
  const netM = new THREE.MeshBasicMaterial({ map: T.net, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 });
  T.net.repeat.set(4, 3);
  const back = new THREE.Mesh(GPL, netM); back.scale.set(120, 48, 1); back.rotation.y = Math.PI / 2; back.position.set(dir * 36, 24, 0); g.add(back);
  const top = new THREE.Mesh(GPL, netM); top.scale.set(36, 120, 1); top.rotation.x = Math.PI / 2; top.position.set(dir * 18, 48, 0); g.add(top);
  for (const z of [-60, 60]) { const sd = new THREE.Mesh(GPL, netM); sd.scale.set(36, 48, 1); sd.position.set(dir * 18, 24, z); g.add(sd); }
  g.userData.net = back;
  return g;
}
function buildStands(R, kh, ka, crowdLevel) {
  const seat = M('#FFFFFF', { map: T.seats }); T.seats.repeat.set(30, 6);
  const concrete = M('#6C6E78'), roofM = M('#D9DDE3', { phong: true }), trussM = M('#8A8F99');
  const places = [];
  // tribunas largas (norte/sur) y cabeceras (este/oeste)
  const defs = [
    { axis: 'z', s: -1, len: 1640, from: 520, depth: 360, h: 230 },
    { axis: 'z', s: 1, len: 1640, from: 520, depth: 360, h: 230 },
    { axis: 'x', s: -1, len: 1060, from: 760, depth: 280, h: 170 },
    { axis: 'x', s: 1, len: 1060, from: 760, depth: 280, h: 170 },
  ];
  for (const d of defs) {
    const g = new THREE.Group(); R.add(g);
    if (d.axis === 'z') { g.position.z = d.s * d.from; if (d.s < 0) g.rotation.y = Math.PI; }
    else { g.position.x = d.s * d.from; g.rotation.y = d.s > 0 ? Math.PI / 2 : -Math.PI / 2; }
    // escalones: el grupo mira hacia -z local = hacia la cancha
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const z = 10 + i * (d.depth / steps), y = 12 + i * (d.h / steps);
      const st = box(g, i % 4 === 3 ? concrete : seat, d.len, y, d.depth / steps + 1, 0, y / 2, z, false); st.receiveShadow = true;
      for (let k = 0; k < Math.round(d.len / 16 * crowdLevel * QUAL.crowd); k++) places.push({ g, x: rand(-d.len / 2 + 10, d.len / 2 - 10), y: y + 7, z: z - 2, row: i });
    }
    box(g, concrete, d.len, d.h + 40, 14, 0, (d.h + 40) / 2, d.depth + 16, true);
    // techo
    if (d.axis === 'z') {
      const roof = box(g, roofM, d.len + 40, 6, d.depth * 0.75, 0, d.h + 110, d.depth * 0.55, true); roof.rotation.x = -0.08;
      for (let i = -3; i <= 3; i++) { cyl(g, trussM, 3, d.h + 110, i * d.len / 7, (d.h + 110) / 2, d.depth + 10, false); }
      const lb = box(g, M('#FFFFFF', { em: '#FFFFFF' }), d.len * 0.9, 3, 6, 0, d.h + 104, d.depth * 0.22, false); void lb;
      // pantalla gigante en una tribuna
      if (d.s < 0) { const sc = new THREE.Mesh(GPL, M('#FFFFFF', { map: signTex('TU CARRERA', '#11131A', '#19D46E', 512, 160), basic: true })); sc.scale.set(260, 80, 1); sc.position.set(0, d.h + 60, d.depth + 4); sc.rotation.y = Math.PI; g.add(sc); }
    }
    bake(g);
  }
  // hinchas: InstancedMesh con colores del club
  const n = places.length;
  if (n) {
    const geo = new THREE.BoxGeometry(7, 13, 5);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), n);
    const col = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const data = new Float32Array(n * 4);
    const palH = [kh.c1, kh.c2, kh.c1, '#FFFFFF', kh.c1], palA = [ka.c1, ka.c2, ka.c1];
    for (let i = 0; i < n; i++) {
      const pl = places[i]; pl.g.updateMatrixWorld(true);
      p.set(pl.x, pl.y, pl.z).applyMatrix4(pl.g.matrixWorld);
      data[i * 4] = p.x; data[i * 4 + 1] = p.y; data[i * 4 + 2] = p.z; data[i * 4 + 3] = Math.random() * 6.28;
      m4.compose(p, q, sc); im.setMatrixAt(i, m4);
      const away = p.x > 600 && p.z > -200 && p.z < 200;
      col.set(pick(away ? palA : palH)).multiplyScalar(rand(0.75, 1.1)); im.setColorAt(i, col);
    }
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    R.add(im);
    S3.crowd = { im, data, n, m4, q, sc, p, hype: 0 };
  }
}
function updateCrowd(t, hype) {
  const c = S3.crowd; if (!c) return;
  c.hype = lerp(c.hype, hype, 0.05);
  const amp = 1.5 + c.hype * 9, sp = 3 + c.hype * 7, stride = QUAL.level === 'baja' ? 2 : 1;
  for (let i = (Math.floor(t * 60) % stride); i < c.n; i += stride) {
    const d = c.data;
    c.p.set(d[i * 4], d[i * 4 + 1] + Math.max(0, Math.sin(t * sp + d[i * 4 + 3])) * amp, d[i * 4 + 2]);
    c.m4.compose(c.p, c.q, c.sc); c.im.setMatrixAt(i, c.m4);
  }
  c.im.instanceMatrix.needsUpdate = true;
}
function buildStadium(kh, ka, crowdLevel, opts) {
  opts = opts || {};
  if (typeof kh === 'string') kh = { c1: kh, c2: ka || '#FFFFFF', style: 'liso', id: 's' + kh };
  if (!ka || typeof ka === 'string') ka = { c1: '#FFFFFF', c2: INK, style: 'liso', id: 'aw' };
  clear3d(); const R = S3.root;
  const night = opts.night !== false;
  sky(night ? '#0B1030' : '#6FA8DC', night ? '#3A4070' : '#DDE8F0', night);
  scene.fog = new THREE.Fog(night ? 0x1a2040 : 0xdde8f0, 2600, 7000);
  if (night) { hemi.intensity = 0.9; hemi.color.set(0xc8d4ff); sun.intensity = 2.1; sun.color.set(0xf2f6ff); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), M('#2B3A2A')); ground.rotation.x = -Math.PI / 2; ground.position.y = -1; ground.receiveShadow = true; R.add(ground);
  const surround = new THREE.Mesh(new THREE.PlaneGeometry(1640, 1060), M('#FFFFFF', { map: T.grass })); T.grass.repeat.set(8, 6); surround.rotation.x = -Math.PI / 2; surround.position.y = -0.3; surround.receiveShadow = true; R.add(surround);
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.w, PITCH.h), M('#FFFFFF', { map: pitchTex() })); pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true; R.add(pitch);
  S3.goalL = makeGoal(R, -650, -1); S3.goalR = makeGoal(R, 650, 1); S3.net = S3.goalL.userData.net;
  // carteles LED
  const lt = ledTex(); S3.led = lt;
  const ledM = M('#FFFFFF', { map: lt, basic: true });
  for (const [x, z, ry, len] of [[0, -470, 0, 1400], [0, 470, Math.PI, 1400], [-712, 0, Math.PI / 2, 900], [712, 0, -Math.PI / 2, 900]]) { const b = new THREE.Mesh(GPL, ledM); b.scale.set(len, 18, 1); b.position.set(x, 9, z); b.rotation.y = ry; R.add(b); box(R, MAT.dark, ry === 0 || ry === Math.PI ? len : 4, 20, ry === 0 || ry === Math.PI ? 4 : len, x + (ry === Math.PI / 2 ? -3 : ry === -Math.PI / 2 ? 3 : 0), 10, z + (ry === 0 ? -3 : ry === Math.PI ? 3 : 0), false); }
  // bancas
  for (const x of [-180, 180]) { box(R, M('#C9D3DE', { op: 0.5, phong: true }), 160, 30, 2, x, 22, 500, false); box(R, M('#2E6BFF'), 150, 10, 20, x, 5, 510, false); }
  buildStands(R, kh, ka, crowdLevel);
  // torres de luz
  for (const [x, z] of [[-900, -700], [900, -700], [-900, 700], [900, 700]]) {
    const tw = new THREE.Group(); tw.position.set(x, 0, z); R.add(tw);
    cyl(tw, M('#5A5F6A'), 7, 620, 0, 310, 0, false);
    const panel = box(tw, M('#FFFFFF', { em: '#F6F8FF' }), 90, 60, 8, 0, 640, 0, false); panel.rotation.set(-0.5, Math.atan2(x, z), 0);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false })); gl.scale.set(420, 420, 1); gl.position.set(0, 640, 0); tw.add(gl);
  }
  // pelota y jugadores
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M('#FFFFFF', { map: T.ball, phong: true, shin: 80 })); ball.scale.setScalar(4.2); ball.castShadow = true; R.add(ball); S3.ball = ball; ball.position.set(0, 4.2, 0);
  S3.kits = { mine: kh, foe: ka };
  buildPlayers(R, kh, ka, opts);
  S3.mode = 'stadium'; S3.focus = new THREE.Vector3(-150, 30, 0); S3.dist = 1200; S3.yaw = 0.9;
  S3.ambient = { t: 0, next: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), holder: null, ballT: 1 };
}
const FORM = [[-600, 0], [-430, -230], [-450, -80], [-450, 80], [-430, 230], [-220, -150], [-240, 30], [-200, 190], [-60, -260], [-30, 0], [-60, 260]];
function buildPlayers(R, kh, ka, opts) {
  const mineMat = kitMat(kh), foeMat = kitMat(ka);
  const skins = ['#6B4428', '#8D5A3B', '#A56B45', '#C68A5E', '#D9A37A', '#F0C9A0'];
  const count = Math.round(8 * QUAL.players);
  const pick11 = n => { const idx = [0, 9, 6, 2, 3, 5, 7, 8, 10, 1, 4]; return idx.slice(0, n); };
  S3.team = [];
  for (const side of ['mine', 'foe']) {
    for (const i of pick11(count)) {
      const gk = i === 0, [fx, fz] = FORM[i];
      const pos = side === 'mine' ? new THREE.Vector3(fx * 0.9 + 80, 0, fz) : new THREE.Vector3(-fx * 0.9 - 80, 0, -fz);
      if (side === 'mine' && gk) pos.x = 600; if (side === 'foe' && gk) pos.x = -620;
      const k = side === 'mine' ? kh : ka;
      const look = { kind: 'normal', skin: pick(skins), hair: pick(['#1A1110', '#2B1B14', '#4A3222', '#D9B26A']), shirt: gk ? '#FFE14D' : k.c1, shirtMat: gk ? M(side === 'mine' ? '#FFB800' : '#19D46E') : side === 'mine' ? mineMat : foeMat, pants: gk ? INK : shade(k.c2, -0.15), scale: 1.08, num: gk ? 1 : 2 + i, numCol: lum(k.c1) > 0.6 ? INK : '#FFFFFF' };
      const p = makePerson(look); p.position.copy(pos); R.add(p);
      S3.team.push({ p, home: pos.clone(), side, gk, ph: Math.random() * 6, target: pos.clone() });
    }
  }
  // tú: con tu número en la espalda
  if (opts.you !== false) {
    const you = makePerson(playerLook(kitMat(kh), C && C.pos === 'DEL' ? 9 : C && C.pos === 'EXT' ? 7 : C && C.pos === 'MED' ? 8 : 4));
    you.position.set(-250, 0, 60); R.add(you); S3.avatar = you;
    S3.team.push({ p: you, home: you.position.clone(), side: 'mine', you: true, ph: 0, target: you.position.clone() });
  }
  const ref = makePerson({ kind: 'normal', skin: '#A56B45', hair: '#111', shirt: '#111114', pants: '#111114', scale: 1.05 }); ref.position.set(-100, 0, -120); R.add(ref);
  S3.team.push({ p: ref, home: ref.position.clone(), side: 'ref', ph: 1, target: ref.position.clone() });
  S3.gk = S3.team.find(t => t.side === 'foe' && t.gk);
  S3.mate = S3.team.find(t => t.side === 'mine' && !t.gk && !t.you);
  S3.foe = S3.team.find(t => t.side === 'foe' && !t.gk);
}
function updateAmbient(dt, t) {
  const A = S3.ambient; if (!A || !S3.team) return;
  A.t += dt;
  if (A.t > A.next) {
    A.next = A.t + rand(0.9, 1.8);
    const cands = S3.team.filter(m => m.side !== 'ref' && m !== A.holder && !m.gk);
    const h = pick(cands);
    A.from.copy(S3.ball.position); A.to.copy(h.p.position); A.to.y = 4.2; A.holder = h; A.ballT = 0;
    // todos se desplazan un poco hacia la pelota
    for (const m of S3.team) { const k = m.side === 'ref' ? 0.5 : m.gk ? 0.05 : 0.25; m.target.set(lerp(m.home.x, A.to.x, k) + rand(-40, 40), 0, lerp(m.home.z, A.to.z, k) + rand(-40, 40)); }
  }
  if (A.ballT < 1) { A.ballT = Math.min(1, A.ballT + dt / 0.8); const k = A.ballT; S3.ball.position.lerpVectors(A.from, A.to, k); S3.ball.position.y = 4.2 + Math.sin(k * Math.PI) * (A.from.distanceTo(A.to) > 300 ? 60 : 8); S3.ball.rotation.x += dt * 12; }
  for (const m of S3.team) movePlayer(m, dt, t, 70, A.holder === m && A.ballT >= 1 ? m.p.position : S3.ball.position);
}
const _v = new THREE.Vector3();
function movePlayer(m, dt, t, speed, lookAt) {
  _v.subVectors(m.target, m.p.position); _v.y = 0;
  const d = _v.length(), run = d > 60;
  if (d > 4) { _v.normalize(); m.p.position.addScaledVector(_v, Math.min(d, (run ? speed * 1.8 : speed) * dt)); m.p.rotation.y = Math.atan2(-_v.x, -_v.z); posePerson(m.p, t * (run ? 13 : 8) + m.ph, true, false, t, false, { run }); }
  else { if (lookAt) { const dx = lookAt.x - m.p.position.x, dz = lookAt.z - m.p.position.z; m.p.rotation.y = lerpAng(m.p.rotation.y, Math.atan2(-dx, -dz), Math.min(1, dt * 4)); } posePerson(m.p, 0, false, false, t + m.ph, false, {}); }
}
function lerpAng(a, b, k) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; }
function faceDir(p, dx, dz) { p.rotation.y = Math.atan2(-dx, -dz); }

/* ================== JUGADAS CON CÁMARAS DE TV ================== */
// Cada jugada es una función pura del tiempo: la misma función sirve para el en vivo y la repetición en cámara lenta.
function playMoment(kind, speed) {
  if (S3.mode !== 'stadium' || !S3.avatar) return 0;
  const pl = S3.avatar, mate = S3.mate ? S3.mate.p : null, foe = S3.foe ? S3.foe.p : null, gk = S3.gk ? S3.gk.p : null;
  const zs = rand(-1, 1) > 0 ? 1 : -1, zc = rand(10, 40) * zs;
  const LIVE = kind === 'defense' ? 2.6 : 3.0, CELE = kind === 'defense' ? 1.8 : 2.6, REP = LIVE * 1.7;
  const mk = new THREE.Vector3();
  // quién celebra con el jugador
  const hug = S3.team.filter(m => m.side === 'mine' && !m.gk && !m.you).slice(0, 3);
  function act(tt, live) {
    const k = clamp(tt / LIVE, 0, 1);
    if (kind === 'goal') {
      const sx = -240, ex = -520;
      if (tt < 1.9) { const u = tt / 1.9; pl.position.set(lerp(sx, ex, u), 0, lerp(zs * 160, zc, u)); faceDir(pl, -1, (zc - zs * 160) / 280); S3.ball.position.set(pl.position.x - 9, 4.2 + Math.abs(Math.sin(u * 20)) * 2, pl.position.z - 2); posePerson(pl, tt * 15, true, false, tt, false, { run: true }); if (foe) { foe.position.set(pl.position.x + 30 - u * 10, 0, pl.position.z + zs * 25); faceDir(foe, -1, 0); posePerson(foe, tt * 14, true, false, tt, false, { run: true }); } }
      else { const u = clamp((tt - 1.9) / 0.45, 0, 1); pl.position.set(ex, 0, zc); posePerson(pl, 0, false, false, tt, false, {}); pl.userData.arms[1].rotation.x = -0.6; S3.ball.position.set(lerp(ex - 9, -672, u), 4.2 + Math.sin(u * Math.PI) * 18 + u * 14, lerp(zc, -zs * 44, u)); if (u >= 1) S3.ball.position.set(-676, 8, -zs * 44); }
      if (gk) { const u = clamp((tt - 1.95) / 0.4, 0, 1); gk.position.set(-630, u > 0 ? Math.sin(u * Math.PI) * 10 : 0, lerp(zc * 0.3, -zs * 30, u)); gk.rotation.set(0, -Math.PI / 2, u * zs * 1.2); posePerson(gk, 0, false, false, tt, false, u > 0 ? { panic: true } : {}); }
    } else if (kind === 'assist') {
      if (tt < 1.7) { const u = tt / 1.7; pl.position.set(lerp(-250, -560, u), 0, zs * lerp(300, 330, u)); faceDir(pl, -1, 0); S3.ball.position.set(pl.position.x - 9, 4.2, pl.position.z); posePerson(pl, tt * 15, true, false, tt, false, { run: true }); }
      else if (tt < 2.3) { const u = (tt - 1.7) / 0.6; pl.position.set(-560, 0, zs * 330); faceDir(pl, 0, -zs); posePerson(pl, 0, false, false, tt, false, {}); S3.ball.position.set(-569, 4.2 + Math.sin(u * Math.PI) * 60, lerp(zs * 330, zs * 20, u)); }
      else { const u = clamp((tt - 2.3) / 0.35, 0, 1); S3.ball.position.set(lerp(-569, -676, u), lerp(40, 20, u), lerp(zs * 20, -zs * 40, u)); }
      if (mate) { const u = clamp(tt / 2.3, 0, 1); mate.position.set(lerp(-330, -560, u), tt > 2.2 && tt < 2.5 ? Math.sin((tt - 2.2) / 0.3 * Math.PI) * 14 : 0, lerp(-zs * 120, zs * 20, u)); faceDir(mate, -1, zs * 0.3); posePerson(mate, tt * 14, tt < 2.2, false, tt, false, { run: tt < 2.2 }); }
      if (gk) { const u = clamp((tt - 2.3) / 0.35, 0, 1); gk.position.set(-630, 0, lerp(0, -zs * 25, u)); posePerson(gk, 0, false, false, tt, false, u > 0 ? { panic: true } : {}); }
    } else {
      // defensa: el delantero rival ataca tu arco (x positivo) y tú lo barres
      const u = clamp(tt / 2.0, 0, 1);
      if (foe) { foe.position.set(lerp(260, 520, u), 0, lerp(zs * 140, zs * 40, u)); faceDir(foe, 1, -zs * 0.3); posePerson(foe, tt * 15, tt < 2.0, false, tt, false, { run: tt < 2.0 }); if (tt > 2.0) { foe.rotation.z = zs * 0.6; foe.position.y = 0; } }
      if (tt < 1.7) { S3.ball.position.set((foe ? foe.position.x : 400) + 9, 4.2, foe ? foe.position.z : 0); }
      else { const w = clamp((tt - 1.7) / 0.9, 0, 1); S3.ball.position.set(lerp(505, 560, w), 4.2 + Math.sin(w * Math.PI) * 50, lerp(zs * 44, zs * 470, w)); }
      const v = clamp((tt - 1.2) / 0.5, 0, 1);
      pl.position.set(lerp(560, 505, v), 0, lerp(zs * -60, zs * 40, v)); faceDir(pl, -0.3, zs);
      if (v > 0 && v < 1) { posePerson(pl, tt * 12, true, false, tt, false, { run: true }); pl.rotation.z = -zs * v * 1.2; pl.position.y = -v * 6; }
      else if (v >= 1) { pl.rotation.z = -zs * 1.2; pl.position.y = -6; posePerson(pl, 0, false, false, tt, false, {}); }
      else { pl.rotation.z = 0; posePerson(pl, tt * 14, true, false, tt, false, { run: true }); }
    }
    void k; void live;
  }
  function celebrate(ct, t) {
    if (kind === 'defense') { pl.rotation.z = lerp(pl.rotation.z, 0, 0.1); pl.position.y = 0; posePerson(pl, 0, false, false, t, false, { cheer: ct > 0.4 }); return; }
    const hero = kind === 'assist' && mate ? mate : pl;
    const corner = mk.set(-600, 0, zs * 400);
    _v.subVectors(corner, hero.position); _v.y = 0; const d = _v.length();
    if (d > 10) { _v.normalize(); hero.position.addScaledVector(_v, Math.min(d, 230 * (1 / 60))); faceDir(hero, _v.x, _v.z); posePerson(hero, t * 16, true, false, t, false, { run: true }); }
    else posePerson(hero, 0, false, false, t, false, { cheer: true });
    if (kind === 'assist' && hero !== pl) { _v.subVectors(hero.position, pl.position); _v.y = 0; if (_v.length() > 25) { _v.normalize(); pl.position.addScaledVector(_v, 3.4); faceDir(pl, _v.x, _v.z); posePerson(pl, t * 16, true, false, t, false, { run: true }); } else posePerson(pl, 0, false, false, t, false, { cheer: true }); }
    for (const m of hug) { _v.subVectors(hero.position, m.p.position); _v.y = 0; if (_v.length() > 30) { _v.normalize(); m.p.position.addScaledVector(_v, 3.2); faceDir(m.p, _v.x, _v.z); posePerson(m.p, t * 15 + m.ph, true, false, t, false, { run: true }); } else posePerson(m.p, 0, false, false, t + m.ph, false, { cheer: true }); }
  }
  const sp = speed || 1;
  S3.anim = { t: 0, kind, LIVE, CELE, REP, act, celebrate, zs, sp, fired: false, dur: (LIVE + CELE + REP) / sp };
  for (const m of S3.team) { m.frozen = true; }
  return S3.anim.dur;
}
const _cp = new THREE.Vector3(), _cl = new THREE.Vector3();
function updateMoment(dt, t) {
  const a = S3.anim; if (!a) return false;
  a.t += dt * a.sp;
  const tt = a.t, B = S3.ball.position;
  if (tt < a.LIVE) {
    a.act(tt, true);
    S3.tv = 'EN VIVO';
    // cámara de transmisión: alta, en la tribuna, sigue la pelota
    if (tt < a.LIVE * 0.62) { _cp.set(B.x + 60, 330, 900); _cl.set(B.x - 40, 0, B.z * 0.6); }
    else { const side = a.kind === 'defense' ? 1 : -1; _cp.set(B.x + side * -180, 70, B.z + (a.zs * 160)); _cl.copy(B); }
    if (!a.fired && ((a.kind === 'goal' && tt > 2.3) || (a.kind === 'assist' && tt > 2.6) || (a.kind === 'defense' && tt > 1.75))) {
      a.fired = true;
      if (a.kind !== 'defense') { S3.net.scale.x = 1; confetti(new THREE.Vector3(-500, 250, 0), [S3.kits.mine.c1, S3.kits.mine.c2, '#FFE14D', '#FFFFFF'], QUAL.level === 'baja' ? 40 : 120); burst(new THREE.Vector3(-660, 30, -a.zs * 40), ['#FFFFFF', '#FFE14D'], 30, 90, 0.8, 10, 40); if (typeof sfxGoal === 'function') sfxGoal(); }
      else { burst(B.clone(), ['#FFFFFF', '#9FD3F2'], 18, 60, 0.6, 8, 30); if (typeof sfxKick === 'function') sfxKick(); }
    }
    if (a.fired && a.kind !== 'defense') S3.net.position.x = -36 - Math.max(0, Math.sin((tt - 2.3) * 18)) * 6 * Math.max(0, 1 - (tt - 2.3));
  } else if (tt < a.LIVE + a.CELE) {
    const ct = tt - a.LIVE;
    a.celebrate(ct, t);
    S3.tv = a.kind === 'defense' ? '¡QUÉ CIERRE!' : '¡GOOOL!';
    const hero = a.kind === 'assist' && S3.mate ? S3.mate.p : S3.avatar;
    _cl.copy(hero.position); _cl.y = 26;
    _cp.set(hero.position.x + Math.sin(ct * 0.6 + 1) * 110, 48, hero.position.z + Math.cos(ct * 0.6 + 1) * 110 * -a.zs);
  } else if (tt < a.LIVE + a.CELE + a.REP) {
    const rt = (tt - a.LIVE - a.CELE) / a.REP * a.LIVE;
    if (!a.saved) { a.saved = true; }
    a.act(rt, false);
    S3.tv = 'REPETICIÓN';
    // cámara detrás del arco / a ras del piso
    if (a.kind === 'defense') { _cp.set(760, 40, B.z * 0.4); _cl.copy(B); }
    else { _cp.set(-770, 42, -a.zs * 30); _cl.set(B.x, 20, B.z); }
  } else {
    S3.anim = null; S3.tv = ''; S3.net.position.x = -36;
    if (S3.avatar) { S3.avatar.rotation.z = 0; S3.avatar.position.y = 0; }
    for (const m of S3.team) { m.frozen = false; m.p.rotation.z = 0; m.p.position.y = 0; if (m.gk) m.p.rotation.set(0, m.side === 'foe' ? -Math.PI / 2 : Math.PI / 2, 0); }
    return false;
  }
  S3.cam = { pos: _cp, look: _cl };
  return true;
}
function playGoalAnim() { return playMoment('goal', 1); }

/* ================== BUCLE 3D ================== */
const _cam = new THREE.Vector3(), _look = new THREE.Vector3();
let camLook = new THREE.Vector3();
function render3d(dt) {
  S3.t += dt;
  const t = S3.t;
  S3.cam = null;
  if (S3.mode === 'home' || S3.mode === 'office' || S3.mode === 'disco' || S3.mode === 'arrival' || S3.mode === 'ceremony') { if (typeof updateLife === 'function') updateLife(dt, t); }
  else if (S3.mode === 'stadium') {
    if (S3.led) S3.led.offset.x = (t * 0.03) % 1;
    const moment = updateMoment(dt, t);
    if (!moment) { updateAmbient(dt, t); S3.yaw = 0.95 + Math.sin(t * 0.12) * 0.3; }
    updateCrowd(t, moment && S3.anim && S3.anim.fired ? 1 : S3.hype || 0.15);
    if (S3.extraStadium) S3.extraStadium(dt, t);
  }
  updateFx(dt);
  const f = S3.focus || new THREE.Vector3();
  if (S3.cam) { camera.position.lerp(S3.cam.pos, 1 - Math.exp(-dt * 7)); _look.copy(S3.cam.look); }
  else {
    _cam.set(f.x + Math.sin(S3.yaw) * S3.dist, f.y + S3.dist * (S3.pitch || 0.55), f.z + Math.cos(S3.yaw) * S3.dist);
    camera.position.lerp(_cam, 1 - Math.exp(-dt * 3)); _look.copy(f);
  }
  camLook.lerp(_look, 1 - Math.exp(-dt * 8));
  camera.lookAt(camLook);
  sun.target.position.copy(f); sun.position.set(f.x - 500, 900, f.z + 400);
  renderer.render(scene, camera);
}
