/* ================== VIDA EN 3D: casa, cochera, mascotas, oficina, discoteca, llegada al estadio y retiro ================== */

/* ---------- entrada: arrastrar para girar, rueda para zoom, clic para caminar ---------- */
const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
function setupInput() {
  let down = null;
  cv3.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw: S3.yaw, moved: false }; });
  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 6) down.moved = true;
    if (down.moved && (S3.mode === 'home' || S3.mode === 'ceremony' || S3.mode === 'disco')) { S3.yaw = down.yaw - dx * 0.006; S3.manual = S3.t + 8; }
  });
  window.addEventListener('pointerup', e => { const d = down; down = null; if (d && !d.moved && e.target === cv3) worldClick(e.clientX, e.clientY); });
  cv3.addEventListener('wheel', e => { if (S3.mode !== 'home') return; e.preventDefault(); S3.zoom = clamp((S3.zoom || 1) * (e.deltaY > 0 ? 1.1 : 0.9), 0.55, 1.5); }, { passive: false });
}
function worldClick(cx, cy) {
  if (S3.mode !== 'home' || !S3.avatar) return;
  _ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(_ndc, camera);
  const hits = ray.intersectObjects(S3.inter.map(i => i.obj), true);
  if (hits.length) { let o = hits[0].object; while (o && !o.userData.inter) o = o.parent; if (o) { homeGo(o.userData.inter); return; } }
  const fh = ray.intersectObjects(S3.floorMeshes, false);
  if (fh.length) { const p = fh[0].point; S3.walk = { to: new THREE.Vector3(clamp(p.x, S3.bounds.x0, S3.bounds.x1), 8, clamp(p.z, S3.bounds.z0, S3.bounds.z1)), act: null }; }
}
function homeGo(id) {
  const it = S3.inter.find(i => i.id === id); if (!it || !S3.avatar) return;
  S3.walk = { to: it.stand.clone(), act: id, face: it.pos };
}

/* ---------- carros con más detalle ---------- */
function makeCarModel(car) {
  const g = new THREE.Group(), paint = M(car.col, { phong: true, shin: 130 }), trim = M('#16161A', { phong: true });
  const lightF = M('#FFF4C8', { em: '#FFE6A0' }), lightB = M('#C0392B', { em: '#7A0000' });
  if (car.id === 'moto') {
    for (const z of [-20, 20]) { const w = mesh(g, GC, MAT.tire, 9, 5, 9, 0, 9, z, true); w.rotation.z = Math.PI / 2; const r = mesh(g, GC8, MAT.rim, 5, 5.4, 5, 0, 9, z, false); r.rotation.z = Math.PI / 2; }
    box(g, paint, 10, 10, 28, 0, 19, 0, true); box(g, paint, 12, 8, 12, 0, 22, -10, true); box(g, MAT.dark, 11, 4, 16, 0, 27, 6, false);
    box(g, MAT.chrome, 24, 2, 2, 0, 33, -16, false); box(g, lightF, 5, 5, 2, 0, 26, -18, false); box(g, MAT.chrome, 3, 3, 14, 4, 12, 12, false);
    return g;
  }
  const low = car.id === 'deportivo' || car.id === 'hiper', big = car.id === 'suv', lux = car.id === 'lujo';
  const L = big ? 100 : lux ? 104 : 94, Wd = big ? 48 : 46, h = low ? 11 : big ? 22 : 15, y0 = big ? 12 : 9;
  box(g, paint, Wd, h, L, 0, y0 + h / 2, 0, true);
  box(g, paint, Wd - 2, 4, L * 0.24, 0, y0 + h + 1, -L * 0.34, true);
  const cabL = L * (low ? 0.38 : big ? 0.56 : 0.48), cabH = low ? 10 : big ? 18 : 14, cabZ = low ? 8 : 4;
  box(g, MAT.glass, Wd - 5, cabH, cabL, 0, y0 + h + cabH / 2, cabZ, true);
  box(g, paint, Wd - 7, 2.4, cabL - 8, 0, y0 + h + cabH + 1, cabZ, false);
  for (const s of [-1, 1]) { box(g, paint, 1.6, cabH, 4, s * (Wd / 2 - 2.6), y0 + h + cabH / 2, cabZ, false); box(g, paint, 4, 3, 5, s * (Wd / 2 + 1.5), y0 + h + 4, cabZ - cabL / 2 + 4, false); }
  box(g, trim, Wd + 1, 4, 5, 0, y0 + 2, -L / 2 - 1, false); box(g, trim, Wd + 1, 4, 5, 0, y0 + 2, L / 2 + 1, false);
  box(g, trim, Wd - 18, 5, 1, 0, y0 + h / 2, -L / 2 - 0.6, false);
  for (const s of [-1, 1]) { box(g, lightF, 9, 3.4, 1, s * (Wd / 2 - 7), y0 + h / 2 + 2, -L / 2 - 0.6, false); box(g, lightB, 10, 3, 1, s * (Wd / 2 - 7), y0 + h / 2 + 2, L / 2 + 0.6, false); }
  if (car.id === 'hiper' || car.id === 'deportivo') { box(g, trim, Wd, 2, 10, 0, y0 + h + (car.id === 'hiper' ? 12 : 4), L / 2 - 6, false); for (const s of [-1, 1]) box(g, trim, 2, car.id === 'hiper' ? 12 : 4, 3, s * 14, y0 + h + (car.id === 'hiper' ? 6 : 2), L / 2 - 6, false); box(g, trim, 2, 6, 20, -Wd / 2 - 0.5, y0 + h / 2, 8, false); box(g, trim, 2, 6, 20, Wd / 2 + 0.5, y0 + h / 2, 8, false); }
  if (big) { box(g, MAT.chrome, Wd - 6, 2, 60, 0, y0 + h + cabH + 3, 4, false); box(g, MAT.dark, Wd - 4, 14, 10, 0, y0 + h / 2 + 4, L / 2 + 5, false); }
  if (lux) { box(g, MAT.chrome, 12, 8, 1, 0, y0 + h / 2 + 1, -L / 2 - 1, false); }
  const wr = big ? 11 : 9, wz = L / 2 - 17;
  for (const [x, z] of [[-Wd / 2 + 1, -wz], [Wd / 2 - 1, -wz], [-Wd / 2 + 1, wz], [Wd / 2 - 1, wz]]) {
    const w = mesh(g, GC, MAT.tire, wr, 7, wr, x, wr, z, true); w.rotation.z = Math.PI / 2;
    const r = mesh(g, GC8, MAT.rim, wr * 0.6, 7.6, wr * 0.6, x, wr, z, false); r.rotation.z = Math.PI / 2;
    box(g, trim, 3, wr * 0.9, wr * 2.3, x + Math.sign(x) * 1, y0 + h - 2, z, false);
  }
  return g;
}

/* ---------- trofeos ---------- */
const GOLD = () => M('#E8B83A', { phong: true, shin: 160 }), SILVER = () => M('#D5D9DE', { phong: true, shin: 160 });
function makeTrophy(t) {
  const g = new THREE.Group(), n = t.name || '';
  const gold = t.kind === 'ind' || /Mundial|Campeones|Américas|Balón|Copa América/.test(n) ? GOLD() : SILVER();
  cyl(g, M('#2A1F18'), 5, 4, 0, 2, 0, false);
  if (/Balón/.test(n)) { cyl(g, gold, 2, 6, 0, 7, 0, false); sph(g, gold, 6, 0, 16, 0, true); }
  else if (/Mundial/.test(n)) { const s = mesh(g, new THREE.CylinderGeometry(1, 0.4, 1, 10), gold, 4, 14, 4, 0, 11, 0, true); void s; sph(g, M('#E8B83A', { phong: true, shin: 200 }), 5.5, 0, 22, 0, true); }
  else if (/Campeones|Américas/.test(n)) { cyl(g, gold, 1.8, 6, 0, 7, 0, false); mesh(g, new THREE.CylinderGeometry(1, 0.55, 1, 14), gold, 6, 12, 6, 0, 16, 0, true); for (const s of [-1, 1]) { const ear = mesh(g, new THREE.TorusGeometry(1, 0.22, 6, 14), gold, 4.5, 6, 4, s * 7, 17, 0, false); ear.rotation.y = Math.PI / 2; } }
  else if (t.kind === 'ind') { cyl(g, gold, 1.5, 8, 0, 8, 0, false); const st = mesh(g, GI, gold, 5, 5, 2, 0, 16, 0, true); void st; }
  else { cyl(g, gold, 1.6, 6, 0, 7, 0, false); mesh(g, new THREE.CylinderGeometry(1, 0.5, 1, 12), gold, 5, 10, 5, 0, 15, 0, true); for (const s of [-1, 1]) { const ear = mesh(g, new THREE.TorusGeometry(1, 0.25, 6, 12), gold, 2.4, 3.4, 2, s * 5.5, 15, 0, false); ear.rotation.y = Math.PI / 2; } }
  return g;
}

/* ---------- mascotas ---------- */
function makePet(id) {
  const pt = PETS.find(p => p.id === id) || PETS[0], cat = id.startsWith('gato');
  const g = new THREE.Group(), fur = M(pt.col), dark = M(shade(pt.col, -0.4));
  const s = cat ? 0.75 : id === 'labrador' ? 1.25 : 1;
  const body = box(g, fur, 7 * s, 7 * s, 15 * s, 0, 9 * s, 0, true);
  const head = new THREE.Group(); head.position.set(0, 14 * s, -8.5 * s); g.add(head);
  box(head, fur, 7 * s, 6.5 * s, 6.5 * s, 0, 0, 0, true); box(head, dark, 3.4 * s, 2.6 * s, 3 * s, 0, -1.2 * s, -4 * s, false); box(head, MAT.dark, 1.2, 1.2, 0.6, -1.7 * s, 1 * s, -3.4 * s, false); box(head, MAT.dark, 1.2, 1.2, 0.6, 1.7 * s, 1 * s, -3.4 * s, false);
  for (const sx of [-1, 1]) { if (cat) { const e = mesh(head, new THREE.ConeGeometry(1, 1, 4), dark, 1.6 * s, 3 * s, 1.6 * s, sx * 2.2 * s, 4.2 * s, 0, false); void e; } else box(head, dark, 1.8 * s, 4 * s, 2.6 * s, sx * 3.8 * s, 0.6 * s, 0, false); }
  const legs = [];
  for (const [x, z] of [[-2.4, -5], [2.4, -5], [-2.4, 5], [2.4, 5]]) { const lg = new THREE.Group(); lg.position.set(x * s, 6 * s, z * s); box(lg, fur, 2.2 * s, 6 * s, 2.2 * s, 0, -3 * s, 0, true); g.add(lg); legs.push(lg); }
  const tail = new THREE.Group(); tail.position.set(0, 12 * s, 7.5 * s); box(tail, fur, 1.6 * s, 1.6 * s, (cat ? 10 : 7) * s, 0, cat ? 3 * s : 0, 3.5 * s, false); tail.rotation.x = cat ? -0.9 : -0.5; g.add(tail);
  g.userData = { legs, tail, head, body, s, cat };
  return g;
}
function posePet(p, moving, t) {
  const u = p.userData, k = moving ? 1 : 0;
  u.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 12 + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.6 * k; });
  u.tail.rotation.y = Math.sin(t * (u.cat ? 3 : 14)) * (u.cat ? 0.3 : 0.6);
  u.head.rotation.y = moving ? 0 : Math.sin(t * 0.7) * 0.4;
}

/* ---------- casa (4 niveles, recorrible) ---------- */
const HOUSE_DIM = [[380, 300], [500, 340], [620, 400], [780, 460]];
function buildHome() {
  clear3d();
  const tier = C.house, R = S3.root, [W, D] = HOUSE_DIM[tier];
  sky(['#AFC0CF', '#8FB6DA', '#7FB2E5', '#FFB88A'][tier], ['#E4E0D8', '#EAF1F7', '#EAF4E6', '#FCE6C8'][tier]);
  scene.fog = new THREE.Fog(0xe4e0d8, 1600, 4200);
  if (tier === 3) { sun.color.set(0xffd9b0); sun.intensity = 2; }
  const grdMat = M('#FFFFFF', { map: tier >= 2 ? T.lawn : T.concrete });
  const grd = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), grdMat); grdMat.map.repeat.set(40, 40); grd.rotation.x = -Math.PI / 2; grd.receiveShadow = true; R.add(grd);
  const H = 115, wallC = ['#D8C9A8', '#EDE6D6', '#F4EFE6', '#FAFAF7'][tier];
  const fl = [T.tile, T.wood, T.wood, T.marble][tier]; fl.repeat.set(W / 100, D / 100);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 8, D), M('#FFFFFF', { map: fl, phong: tier === 3, shin: 60 })); floor.position.y = 4; floor.receiveShadow = true; R.add(floor); S3.floorMeshes.push(floor);
  const st = new THREE.Group(); R.add(st);
  const wm = M(wallC);
  box(st, wm, W, H, 8, 0, 8 + H / 2, -D / 2, true); box(st, wm, 8, H, D, -W / 2, 8 + H / 2, 0, true);
  box(st, M(shade(wallC, -0.2)), W, 6, 10, 0, 8 + H + 3, -D / 2, false); box(st, M(shade(wallC, -0.2)), 10, 6, D, -W / 2, 8 + H + 3, 0, false);
  box(st, M(shade(wallC, -0.35)), W, 8, 9, 0, 12, -D / 2 + 1, false);
  // ventanas con luz
  const winM = M('#BFE3F7', { em: '#6E9CC0' });
  for (let i = 0; i < 2 + tier; i++) { const x = -W / 2 + (i + 1) * W / (3 + tier); box(st, winM, 60, 48, 2, x, 8 + 66, -D / 2 + 5, false); box(st, M('#FFFFFF'), 64, 4, 4, x, 8 + 42, -D / 2 + 6, false); }
  if (tier >= 1) box(st, winM, 2, 48, 80, -W / 2 + 5, 8 + 66, D / 2 - 90, false);
  // alfombra
  const rug = plane(st, M('#FFFFFF', { map: T.rug }), W * 0.34, D * 0.34, W * 0.12, 8.6, -D * 0.08); rug.rotation.x = -Math.PI / 2;
  // lámpara de techo (luz cálida)
  if (tier >= 1) { const pl = new THREE.PointLight(0xffd8a0, 0.5, 600); pl.position.set(0, 100, 0); st.add(pl); }
  // cocina
  if (tier >= 1) { box(st, M(['#C9B8A0', '#EDEDED', '#2A2A30'][tier - 1]), 30, 40, 150, -W / 2 + 20, 28, D * 0.02, true); box(st, M('#DADDE2', { phong: true }), 34, 3, 154, -W / 2 + 20, 49, D * 0.02, false); box(st, MAT.chrome, 22, 60, 30, -W / 2 + 20, 38, D * 0.02 + 95, true); for (let i = 0; i < 3; i++) box(st, M('#B03030'), 8, 6, 8, -W / 2 + 20, 54, D * 0.02 - 50 + i * 16, false); }
  else { box(st, M('#B58A5A'), 40, 36, 60, -W / 2 + 25, 26, D * 0.1, true); box(st, M('#E6E6E6'), 30, 4, 22, -W / 2 + 25, 46, D * 0.1, false); }
  // plantas y cuadros
  for (let i = 0; i < 1 + tier; i++) { const px = W / 2 - 30 - i * 60, pz = D / 2 - 30; cyl(st, M('#8B5E3C'), 8, 14, px, 15, pz, true); mesh(st, GI, M('#3F7F3A', { flat: true }), 14, 18, 14, px, 34, pz, true); }
  const pic = canvasTex('pic' + C.clubId, 96, 72, (x, w, h) => { x.fillStyle = '#FFF'; x.fillRect(0, 0, w, h); drawCrest(x, 72, 72, club()); });
  plane(st, M('#FFFFFF', { map: pic }), 40, 30, -W / 2 + 5, 8 + 75, -D * 0.2).rotation.y = Math.PI / 2;
  if (tier === 0) { const p = canvasTex('poster', 128, 180, (x, w, h) => { x.fillStyle = '#E23B3B'; x.fillRect(0, 0, w, h); x.fillStyle = '#FFF'; x.font = '22px ' + FONT_D; x.textAlign = 'center'; x.fillText('CRACK', w / 2, 40); x.beginPath(); x.arc(w / 2, 110, 36, 0, 7); x.fill(); }); plane(st, M('#FFFFFF', { map: p }), 40, 56, -W / 2 + 5, 8 + 70, D * 0.28).rotation.y = Math.PI / 2; }
  // mezzanine para niveles altos
  if (tier >= 2) { const mz = M(tier === 3 ? '#F4F4F2' : '#D6C6AE'); box(st, mz, W * 0.4, 6, D * 0.35, -W * 0.3, 8 + H, -D * 0.33, true); box(st, M('#BFE3F2', { op: 0.4, phong: true }), W * 0.4, 18, 2, -W * 0.3, 8 + H + 12, -D * 0.33 + D * 0.175, false); for (let i = 0; i < 8; i++) box(st, M(shade(wallC, -0.2)), 24, 6, 14, -W * 0.1 - 5, 12 + i * H / 8, -D * 0.33 + 60 - i * 12, true); }
  bake(st);

  const interact = (id, label, grp, pos, stand) => { grp.userData.inter = id; S3.inter.push({ id, label, obj: grp, pos, stand }); S3.labels.push({ id, text: label, pos: pos.clone().add(new THREE.Vector3(0, 30, 0)) }); };
  // cama
  const bed = new THREE.Group(); R.add(bed); const bx = -W / 2 + 70, bz = -D / 2 + 75;
  const bedC = ['#6B7FA8', '#E8E2D6', '#F4F4F2', '#1B1523'][tier];
  box(bed, M('#8B5E3C'), 86, 18, 116, bx, 17, bz, true); box(bed, M(bedC), 82, 10, 106, bx, 30, bz + 2, true); box(bed, MAT.white, 64, 8, 22, bx, 38, bz - 40, false); box(bed, M(shade(bedC, -0.2)), 84, 6, 50, bx, 36, bz + 26, false); box(bed, M('#8B5E3C'), 90, 40, 6, bx, 28, bz - 58, true);
  interact('cama', 'Cama: descansar', bed, new THREE.Vector3(bx, 40, bz), new THREE.Vector3(bx + 60, 8, bz + 40));
  // clóset
  const clo = new THREE.Group(); R.add(clo); const cx = -W / 2 + 175, cz = -D / 2 + 22;
  box(clo, M('#FFFFFF', { map: T.darkwood }), 80, 100, 28, cx, 58, cz, true); box(clo, MAT.chrome, 2, 14, 2, cx - 4, 60, cz + 15, false); box(clo, MAT.chrome, 2, 14, 2, cx + 4, 60, cz + 15, false); box(clo, M('#000', { op: 0.2 }), 1, 96, 1, cx, 58, cz + 14.6, false);
  interact('closet', 'Clóset: tu ropa', clo, new THREE.Vector3(cx, 70, cz), new THREE.Vector3(cx, 8, cz + 50));
  // televisor + sofá + mesa con celular
  const tv = new THREE.Group(); R.add(tv); const tx = W * 0.12, tz = -D / 2 + 10, tvW = [46, 76, 110, 150][tier];
  box(tv, M('#3A2A20'), tvW + 30, 26, 24, tx, 21, tz + 10, true); box(tv, MAT.dark, tvW, tvW * 0.56, 3, tx, 44 + tvW * 0.28, tz + 4, false);
  const scr = new THREE.Mesh(GPL, M('#FFFFFF', { basic: true, map: tvTex() })); scr.scale.set(tvW - 4, tvW * 0.5, 1); scr.position.set(tx, 44 + tvW * 0.28, tz + 5.8); tv.add(scr); S3.tvScreen = scr;
  interact('tv', 'Tele: resumen de la jornada', tv, new THREE.Vector3(tx, 60, tz), new THREE.Vector3(tx, 8, tz + 110));
  const sofaC = ['#6B5A8A', '#7B3FF2', '#8B5E3C', '#C9C3B6'][tier];
  box(R, M(sofaC), 130, 22, 46, tx, 19, tz + 150, true); box(R, M(sofaC), 130, 34, 12, tx, 32, tz + 170, true); box(R, M(shade(sofaC, -0.15)), 12, 28, 46, tx - 65, 26, tz + 150, true); box(R, M(shade(sofaC, -0.15)), 12, 28, 46, tx + 65, 26, tz + 150, true);
  const ph = new THREE.Group(); R.add(ph);
  box(ph, M('#FFFFFF', { map: T.darkwood }), 60, 14, 34, tx, 15, tz + 95, true); box(ph, MAT.dark, 5, 1, 9, tx + 8, 23, tz + 95, false); box(ph, M('#19D46E', { em: '#0C6A36' }), 4, 0.6, 7.6, tx + 8, 23.6, tz + 95, false);
  interact('celular', 'Celular: mensajes y redes', ph, new THREE.Vector3(tx + 8, 24, tz + 95), new THREE.Vector3(tx + 40, 8, tz + 120));
  // gimnasio
  const gym = new THREE.Group(); R.add(gym); const gx = -W / 2 + 75, gz = D / 2 - 70;
  plane(gym, M('#2E2E36'), 110, 90, gx, 8.5, gz).rotation.x = -Math.PI / 2;
  if (tier === 0) { for (const s of [-1, 1]) { cyl(gym, M('#3FA7D6', { op: 0.8 }), 4, 14, gx + s * 14, 15, gz, true); } box(gym, M('#E23B3B'), 50, 3, 70, gx - 20, 10, gz, false); }
  else { const bar = cyl(gym, MAT.chrome, 1.2, 80, gx, 48, gz - 20, false); bar.rotation.z = Math.PI / 2; for (const s of [-1, 1]) { const pl = cyl(gym, MAT.dark, 10, 4, gx + s * 34, 48, gz - 20, false); pl.rotation.z = Math.PI / 2; box(gym, MAT.dark, 4, 50, 4, gx + s * 30, 33, gz - 28, true); } box(gym, M('#2E6BFF'), 30, 10, 60, gx, 13, gz + 15, true); if (tier >= 2) { box(gym, MAT.dark, 30, 26, 70, gx + 60, 21, gz, true); box(gym, M('#19D46E', { em: '#0A5A2E' }), 20, 12, 2, gx + 60, 46, gz - 30, false); } }
  interact('gym', 'Gimnasio: entrenar extra', gym, new THREE.Vector3(gx, 40, gz), new THREE.Vector3(gx + 50, 8, gz - 60));
  // vitrina con tus trofeos reales
  const cab = new THREE.Group(); cab.position.set(W / 2 - 70, 8, -D / 2 + 30); R.add(cab);
  box(cab, M('#6B4428'), 110, 130, 30, 0, 65, 0, true); box(cab, M('#BFE3F2', { op: 0.3, phong: true }), 106, 112, 1, 0, 70, 15.5, false);
  for (let k = 0; k < 3; k++) box(cab, M('#8B5E3C'), 104, 2, 28, 0, 18 + k * 40, 0, false);
  C.trophies.slice(-15).forEach((t, i) => { const tr = makeTrophy(t); tr.position.set(-40 + (i % 5) * 20, 19 + Math.floor(i / 5) * 40, 2); tr.scale.setScalar(0.9); cab.add(tr); });
  const cl = new THREE.PointLight(0xfff0c0, 0.6, 120); cl.position.set(0, 110, 20); cab.add(cl);
  interact('vitrina', 'Vitrina: ' + C.trophies.length + (C.trophies.length === 1 ? ' trofeo' : ' trofeos'), cab, new THREE.Vector3(W / 2 - 70, 90, -D / 2 + 30), new THREE.Vector3(W / 2 - 70, 8, -D / 2 + 90));
  // exterior según nivel
  const ext = new THREE.Group(); R.add(ext);
  if (tier === 0) { for (let i = 0; i < 5; i++) { const hx = -W / 2 - 300 + i * 260, hh = 120 + (i * 37) % 80; const f = box(ext, M('#FFFFFF', { map: facadeTex(pick(['#D98C5F', '#C9B28E', '#A8C6D9', '#E2D3A8']), 2, i % 2, i) }), 200, hh, 150, hx, hh / 2, -D / 2 - 220, true); void f; } box(ext, M('#FFFFFF', { map: T.asphalt }), 3000, 1, 160, 0, 0.6, D / 2 + 140, false); }
  if (tier === 1) { for (let i = 0; i < 7; i++) { const hh = 300 + (i * 131) % 400; box(ext, M('#FFFFFF', { map: facadeTex(pick(['#9AA3AE', '#B8BEC6', '#7E8792', '#CFD6DE']), 8, 0, i) }), 150, hh, 150, -1100 + i * 330, hh / 2, -D / 2 - 500, false); } const bal = M('#BFE3F2', { op: 0.35, phong: true }); box(ext, bal, W, 30, 3, 0, 23, D / 2 + 30, false); box(ext, M('#E9E3D6'), W, 6, 60, 0, 5, D / 2 + 30, false); }
  if (tier === 2) { for (let i = 0; i < 7; i++) makeTree(ext, -W / 2 - 220 + i * 190, D / 2 + 240 + (i % 2) * 60, i * 77 + 5, 1.5); for (let i = -6; i <= 6; i++) box(ext, M('#F4F4F2'), 6, 30, 6, i * 110, 15, D / 2 + 330, false); box(ext, M('#F4F4F2'), 1320, 4, 3, 0, 26, D / 2 + 330, false); }
  if (tier === 3) {
    const pool = new THREE.Mesh(new THREE.BoxGeometry(340, 4, 180), M('#FFFFFF', { map: T.water, phong: true, shin: 150 })); pool.position.set(-W / 2 - 260, 3, 60); ext.add(pool); S3.pool = pool;
    box(ext, M('#FFFFFF', { map: T.marble }), 380, 5, 220, -W / 2 - 260, 1, 60, false);
    for (let i = 0; i < 3; i++) { box(ext, MAT.white, 30, 8, 70, -W / 2 - 380 + i * 70, 10, 200, true); box(ext, M('#FF7A1A'), 30, 3, 50, -W / 2 - 380 + i * 70, 16, 192, false); }
    for (let i = 0; i < 5; i++) { const px = -W / 2 - 440 + i * 100; const trunk = cyl(ext, M('#8A6B4A'), 4, 150, px, 75, -120, true); trunk.rotation.z = 0.08; for (let k = 0; k < 6; k++) { const lf = box(ext, M('#3F8F3A'), 70, 2, 12, px + Math.cos(k) * 30, 150, -120 + Math.sin(k) * 30, true); lf.rotation.y = k; lf.rotation.z = -0.35; } }
    for (let i = -7; i <= 7; i++) box(ext, M('#2F6B2A'), 70, 40, 40, i * 90, 20, D / 2 + 360, true);
    for (let i = 0; i < 6; i++) { const lt = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft, color: 0xffd08a, blending: THREE.AdditiveBlending, depthWrite: false })); lt.scale.set(40, 40, 1); lt.position.set(-W / 2 - 420 + i * 60, 30, -20); ext.add(lt); }
  }
  bake(ext);
  // cochera
  const cars = C.cars.map(id => CARS.find(c => c.id === id)).filter(Boolean);
  const gx0 = W / 2 + 60;
  if (cars.length) {
    const gar = new THREE.Group(); R.add(gar);
    const gw = Math.min(3, cars.length) * 90 + 40, gd = Math.ceil(cars.length / 3) * 140 + 40;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(gw, 3, gd), M('#FFFFFF', { map: T.concrete })); pad.position.set(gx0 + gw / 2, 1.5, D / 2 - gd / 2); pad.receiveShadow = true; gar.add(pad);
    for (const [x, z] of [[gx0 + 6, D / 2 - 6], [gx0 + gw - 6, D / 2 - 6], [gx0 + 6, D / 2 - gd + 6], [gx0 + gw - 6, D / 2 - gd + 6]]) box(gar, M('#E4E0D8'), 8, 100, 8, x, 50, z, true);
    box(gar, M(tier >= 2 ? '#2A2A30' : '#B7B2A8'), gw + 10, 6, gd + 10, gx0 + gw / 2, 103, D / 2 - gd / 2, true);
    const gl = new THREE.PointLight(0xffffff, 0.5, 400); gl.position.set(gx0 + gw / 2, 90, D / 2 - gd / 2); gar.add(gl);
    cars.forEach((car, i) => { const m = makeCarModel(car); m.position.set(gx0 + 65 + (i % 3) * 90, 3, D / 2 - 80 - Math.floor(i / 3) * 140); gar.add(m); });
    interact('cochera', 'Cochera: ' + cars.length + (cars.length === 1 ? ' carro' : ' carros'), gar, new THREE.Vector3(gx0 + gw / 2, 60, D / 2 - gd / 2), new THREE.Vector3(gx0 - 20, 8, D / 2 - 40));
  }
  // tu jugador
  const look = playerLook(); look.shirtMat = null; look.shirt = C.outfit || '#F4F4F2'; look.num = null; look.pants = '#23324A';
  const av = makePerson(look); av.position.set(tx - 30, 8, tz + 120); av.rotation.y = 0.3; R.add(av); S3.avatar = av;
  const wanderers = [];
  if (C.rel !== 'soltero') { const pl = makePerson({ kind: 'normal', skin: ['#C68A5E', '#A56B45', '#8D5A3B'][C.partner ? C.partner.length % 3 : 0], hair: '#2B1B14', shirt: '#E8A0B8', pants: '#23324A', scale: 1.02, braids: true }); pl.position.set(tx + 40, 8, tz + 150); R.add(pl); S3.partner = pl; wanderers.push({ p: pl, sp: 40 }); }
  if (C.age < 22 || tier === 0) { const mom = makePerson({ kind: 'senora', skin: shade(C.skin, 0.05), hair: '#3A2A20', shirt: '#7FA36B', bundle: ['#C0392B', '#E23B3B', '#FFE14D'], pants: '#3A3040', scale: 0.98 }); mom.position.set(-W / 2 + 60, 8, D * 0.05); R.add(mom); S3.mom = mom; wanderers.push({ p: mom, sp: 28 }); }
  S3.kids = []; for (let k = 0; k < C.kids; k++) { const kd = makePerson({ kind: 'normal', skin: C.skin, hair: '#1A1110', shirt: ['#FFE14D', '#19A35A', '#2E6BFF'][k % 3], pants: '#23324A', scale: 0.6 }); kd.position.set(-40 + k * 25, 8, 60); R.add(kd); S3.kids.push(kd); wanderers.push({ p: kd, sp: 70, kid: true }); }
  S3.pets = C.pets.map((id, i) => { const p = makePet(id); p.position.set(20 + i * 30, 8, 40); R.add(p); return { p, sp: id.startsWith('gato') ? 30 : 60, pet: true }; });
  S3.wander = wanderers.concat(S3.pets).map(w => Object.assign(w, { target: w.p.position.clone(), next: 0 }));
  S3.bounds = { x0: -W / 2 + 20, x1: W / 2 + (cars.length ? 200 : -20), z0: -D / 2 + 30, z1: D / 2 - 20 };
  if (cars.length) { const fp = new THREE.Mesh(new THREE.PlaneGeometry(400, D + 100), new THREE.MeshBasicMaterial({ visible: false })); fp.rotation.x = -Math.PI / 2; fp.position.set(W / 2 + 180, 8, 0); R.add(fp); S3.floorMeshes.push(fp); }
  S3.mode = 'home'; S3.focus = new THREE.Vector3(W * 0.12 + (cars.length ? 60 : 0), 40, 0); S3.baseDist = [760, 900, 1050, 1250][tier]; S3.dist = S3.baseDist; S3.pitch = 0.62; S3.zoom = S3.zoom || 1;
}
function tvTex() {
  return canvasTex(null, 256, 144, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0E3A1E'); g.addColorStop(1, '#1D7A3A'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#FFFFFF'; x.font = '18px ' + FONT_D; x.textAlign = 'center';
    const lm = C.lastMatch;
    if (lm) { x.fillText(lm.A.slice(0, 14) + ' ' + lm.hg + '-' + lm.ag + ' ' + lm.B.slice(0, 14), w / 2, 60); x.font = '14px Rubik, sans-serif'; x.fillText(lm.role === 'titular' || lm.role === 'suplente' ? 'Tu nota: ' + lm.rating.toFixed(1) : 'No jugaste', w / 2, 90); }
    else { x.fillText('FÚTBOL EN VIVO', w / 2, 76); }
    x.fillStyle = '#E23B3B'; x.fillRect(10, 10, 46, 18); x.fillStyle = '#FFF'; x.font = '12px Rubik, sans-serif'; x.fillText('EN VIVO', 33, 23);
  });
}

/* ---------- oficina del club (negociación) ---------- */
function buildOffice(cl, agent) {
  clear3d(); const R = S3.root, k = kitOf(cl);
  sky('#2A3140', '#4A5468'); scene.fog = null;
  hemi.intensity = 1.1; sun.intensity = 1.2;
  const st = new THREE.Group(); R.add(st);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(520, 6, 420), M('#FFFFFF', { map: T.wood })); T.wood.repeat.set(4, 3); floor.position.y = -3; floor.receiveShadow = true; R.add(floor);
  box(st, M('#E8E4DC'), 520, 220, 8, 0, 110, -210, true); box(st, M('#E8E4DC'), 8, 220, 420, -260, 110, 0, true);
  box(st, M(shade(k.c1, -0.35)), 520, 30, 9, 0, 15, -209, false);
  // ventana con el estadio de fondo
  const view = canvasTex('view' + cl.id, 512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6FA8DC'); g.addColorStop(1, '#F7D6A8'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#5A6070'; x.beginPath(); x.ellipse(w / 2, h * 0.85, w * 0.45, h * 0.35, 0, Math.PI, 0); x.fill();
    x.fillStyle = k.c1; x.beginPath(); x.ellipse(w / 2, h * 0.86, w * 0.4, h * 0.26, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#3FA044'; x.fillRect(w * 0.25, h * 0.8, w * 0.5, h * 0.2);
    for (const s of [-1, 1]) { x.fillStyle = '#444'; x.fillRect(w / 2 + s * w * 0.42, h * 0.2, 4, h * 0.6); x.fillStyle = '#FFF'; x.fillRect(w / 2 + s * w * 0.42 - 12, h * 0.16, 28, 12); }
  });
  const wv = plane(st, M('#FFFFFF', { map: view, basic: true }), 260, 130, 60, 130, -205); void wv;
  for (const [x, w, h, y] of [[60, 270, 8, 64], [60, 270, 8, 196], [-72, 8, 140, 130], [192, 8, 140, 130], [60, 6, 140, 130]]) box(st, M('#2A2A30'), w, h, 6, x, y, -203, false);
  // escudo y trofeos del club
  const crest = plane(st, M('#FFFFFF', { map: crestTex(cl), op: 1 }), 70, 70, -255, 140, -60); crest.rotation.y = Math.PI / 2; crest.material.transparent = true;
  box(st, M('#6B4428'), 20, 8, 180, -250, 80, 60, false);
  for (let i = 0; i < 4; i++) { const tr = makeTrophy({ name: i === 0 ? 'Copa' : 'Liga', kind: 'col' }); tr.position.set(-248, 84, 0 + i * 40); tr.scale.setScalar(1.3); st.add(tr); }
  // escritorio
  box(st, M('#FFFFFF', { map: T.darkwood }), 200, 8, 90, 0, 70, -40, true); box(st, M('#3A2418'), 190, 62, 8, 0, 35, -80, true); for (const s of [-1, 1]) box(st, M('#3A2418'), 8, 66, 84, s * 94, 33, -40, true);
  box(st, M('#F4F4F2'), 40, 1, 28, 20, 74.5, -30, false); box(st, MAT.dark, 4, 1, 20, -30, 75, -30, false); cyl(st, M('#FFFFFF'), 5, 8, -60, 78, -50, false);
  const lamp = new THREE.PointLight(0xffe0b0, 0.8, 500); lamp.position.set(60, 170, 20); st.add(lamp);
  cyl(st, M('#8B5E3C'), 12, 18, 230, 9, -170, true); mesh(st, GI, M('#3F7F3A', { flat: true }), 26, 34, 26, 230, 44, -170, true);
  bake(st);
  // sillas
  const chair = (x, z, ry, big) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g); const c = M(big ? '#1B1523' : '#5A3A2A'); box(g, c, 36, 6, 34, 0, 30, 0, true); box(g, c, 36, big ? 56 : 40, 6, 0, big ? 58 : 50, 16, true); cyl(g, MAT.chrome, 2, 28, 0, 14, 0, false); return g; };
  chair(0, -95, Math.PI, true); chair(0, 20, 0, false);
  // director deportivo, tú y tu representante
  const dir = makePerson({ kind: 'normal', skin: '#D9A37A', hair: '#8A8A8A', shirt: '#23242C', pants: '#23242C', scale: 1.1, long: true, tie: k.c1 });
  dir.position.set(0, 12, -95); dir.rotation.y = Math.PI; R.add(dir);
  const you = makePerson(Object.assign(playerLook(), { shirtMat: null, shirt: C.outfit || '#F4F4F2', num: null, pants: '#23324A' })); you.position.set(0, 12, 20); R.add(you);
  let ag = null;
  if (agent) { ag = makePerson({ kind: 'normal', skin: '#C68A5E', hair: '#1A1110', shirt: agent === 'turbio' ? '#7B3FF2' : '#2B3A55', pants: '#1B1523', scale: 1.1, long: true, glasses: agent === 'turbio', tie: agent === 'serio' ? '#8B1E3F' : null }); ag.position.set(70, 0, 40); ag.rotation.y = 0.6; R.add(ag); }
  S3.office = { dir, you, ag, react: null, t: 0 };
  S3.mode = 'office'; S3.focus = new THREE.Vector3(40, 60, -20); S3.dist = 460; S3.yaw = 0.95; S3.pitch = 0.42;
}
function officeReact(kind) { if (S3.office) S3.office.react = { kind, t: 0 }; if (kind === 'accept') { confetti(new THREE.Vector3(0, 250, -30), [kitOf(club()).c1, '#FFE14D', '#FFFFFF'], 60); } }

/* ---------- discoteca ---------- */
function buildDisco() {
  clear3d(); const R = S3.root;
  sky('#07060C', '#140A22'); scene.fog = new THREE.Fog(0x0a0614, 500, 1600);
  hemi.intensity = 0.35; hemi.color.set(0x8866ff); sun.intensity = 0.25;
  const st = new THREE.Group(); R.add(st);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(900, 6, 700), M('#141018')); fl.position.y = -3; fl.receiveShadow = true; R.add(fl);
  box(st, M('#1A1422'), 900, 260, 8, 0, 130, -350, false); box(st, M('#1A1422'), 8, 260, 700, -450, 130, 0, false);
  // barra
  box(st, M('#2A1F30'), 40, 50, 260, -400, 25, 40, true); box(st, M('#E8B83A', { em: '#6A4A10' }), 44, 3, 264, -400, 51, 40, false);
  for (let i = 0; i < 12; i++) box(st, M(pick(['#19D46E', '#FF2E88', '#2E6BFF', '#FFE14D']), { em: '#333' }), 5, 16, 5, -435, 70 + (i % 3) * 22, -60 + Math.floor(i / 3) * 40, false);
  // cabina del DJ
  box(st, M('#26202E'), 160, 50, 50, 0, 25, -290, true); box(st, M('#FF2E88', { em: '#FF2E88' }), 164, 4, 54, 0, 48, -290, false);
  for (const s of [-1, 1]) { box(st, MAT.dark, 50, 100, 40, s * 140, 50, -300, true); cyl(st, M('#444'), 16, 4, s * 140, 70, -279, false); cyl(st, M('#444'), 10, 4, s * 140, 35, -279, false); }
  bake(st);
  // pista con baldosas de luz
  const tiles = [], n = 8, sz = 50;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const m = new THREE.Mesh(GB, new THREE.MeshBasicMaterial({ color: 0x222222 })); m.scale.set(sz - 3, 2, sz - 3); m.position.set((i - n / 2 + 0.5) * sz, 1, (j - n / 2 + 0.5) * sz - 20); R.add(m); tiles.push({ m, i, j }); }
  // bola de espejos y láseres
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(22, 1), new THREE.MeshPhongMaterial({ color: 0xdddddd, shininess: 200, flatShading: true, emissive: 0x333333 })); ball.position.set(0, 230, -20); R.add(ball);
  const lasers = [];
  for (let i = 0; i < 6; i++) { const lz = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 900, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(pick(['#19D46E', '#FF2E88', '#2E6BFF', '#FFE14D'])), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); const piv = new THREE.Group(); piv.position.set(i % 2 ? 380 : -380, 240, -300); piv.add(lz); lz.position.y = -450; R.add(piv); lasers.push(piv); }
  const spots = [];
  for (let i = 0; i < 4; i++) { const sp = new THREE.PointLight(new THREE.Color(pick(['#FF2E88', '#2E6BFF', '#19D46E', '#7B3FF2'])), 1.4, 700); sp.position.set(-200 + i * 130, 160, 0); R.add(sp); spots.push(sp); }
  // gente bailando
  const dancers = [];
  const skins = ['#6B4428', '#8D5A3B', '#A56B45', '#C68A5E', '#D9A37A'];
  for (let i = 0; i < 16; i++) { const p = makePerson({ kind: 'normal', skin: pick(skins), hair: pick(['#1A1110', '#3A2A20', '#D9B26A']), shirt: pick(['#FF2E88', '#2E6BFF', '#FFFFFF', '#1B1523', '#FFE14D', '#19D46E']), pants: pick(['#1B1523', '#23324A']), scale: rand(0.98, 1.08), braids: chance(0.4) }); const a = i / 16 * Math.PI * 2, r = rand(90, 180); p.position.set(Math.cos(a) * r, 2, Math.sin(a) * r - 20); p.rotation.y = Math.atan2(p.position.x, p.position.z + 20); R.add(p); dancers.push({ p, ph: Math.random() * 6 }); }
  const dj = makePerson({ kind: 'normal', skin: '#8D5A3B', hair: '#1A1110', shirt: '#1B1523', pants: '#1B1523', scale: 1.1, hat: 'gorra', hatColor: '#FF2E88' }); dj.position.set(0, 0, -320); R.add(dj);
  const look = playerLook(); look.shirtMat = null; look.shirt = C.outfit || '#F4F4F2'; look.num = null; look.pants = '#1B1523';
  const you = makePerson(look); you.position.set(0, 2, -10); R.add(you); S3.avatar = you;
  S3.disco = { tiles, ball, lasers, spots, dancers, dj, you, beat: 0 };
  S3.mode = 'disco'; S3.focus = new THREE.Vector3(0, 40, -40); S3.dist = 620; S3.pitch = 0.38; S3.yaw = 0.3;
}

/* ---------- llegada al estadio en tu carro ---------- */
function buildArrival(carId, cl) {
  clear3d(); const R = S3.root, k = kitOf(cl);
  sky('#1A2244', '#F2A65A'); scene.fog = new THREE.Fog(0x9a7a6a, 1400, 3500);
  sun.color.set(0xffc890); sun.intensity = 1.6;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4000, 3000), M('#FFFFFF', { map: T.asphalt })); T.asphalt.repeat.set(30, 24); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; R.add(road);
  const st = new THREE.Group(); R.add(st);
  for (let i = -12; i <= 12; i++) box(st, M('#F4F4F2', { basic: true }), 40, 0.5, 4, i * 90, 0.6, 60, false);
  // fachada del estadio
  const fac = M(shade(k.c1, -0.25)); box(st, fac, 1600, 260, 80, 0, 130, -320, true);
  for (let i = -7; i <= 7; i++) box(st, M(shade(k.c1, -0.45)), 30, 260, 90, i * 105, 130, -318, true);
  box(st, M('#2A2A30'), 200, 120, 20, 0, 60, -275, false);
  const sign = plane(st, M('#FFFFFF', { map: signTex(cl.name.toUpperCase(), k.c1, lum(k.c1) > 0.6 ? INK : '#FFFFFF', 1024, 128), basic: true }), 700, 88, 0, 210, -278); void sign;
  const cr = plane(st, M('#FFFFFF', { map: crestTex(cl) }), 110, 110, 0, 140, -276); cr.material.transparent = true;
  bake(st);
  // hinchas con banderas
  const fans = [];
  const km = kitMat(k);
  for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, x = -500 + i * 40; const p = makePerson({ kind: 'normal', skin: pick(['#8D5A3B', '#A56B45', '#C68A5E', '#6B4428']), hair: '#1A1110', shirt: k.c1, shirtMat: km, pants: '#23324A', scale: rand(0.95, 1.08) }); p.position.set(x, 0, side > 0 ? -170 : -140 - rand(0, 60)); p.rotation.y = Math.PI * 0.05; R.add(p); fans.push({ p, ph: Math.random() * 6 }); if (i % 4 === 0) { const fl = new THREE.Group(); fl.position.set(x + 10, 0, p.position.z); R.add(fl); cyl(fl, MAT.dark, 0.8, 70, 0, 35, 0, false); const fg = plane(fl, M('#FFFFFF', { map: canvasTex('flag' + k.c1 + k.c2, 64, 40, (x2, w, h) => drawKit(x2, w, h, k)), ds: true }), 36, 22, 18, 58, 0); fans.push({ flag: fg, ph: Math.random() * 6 }); } }
  const car = CARS.find(c => c.id === carId) || CARS[0];
  const cm = makeCarModel(car); cm.rotation.y = -Math.PI / 2; cm.position.set(-1100, 0, 20); R.add(cm);
  const look = playerLook(); look.shirtMat = null; look.shirt = C.outfit || '#F4F4F2'; look.num = null; look.pants = '#23324A';
  const you = makePerson(look); you.visible = false; you.position.set(0, 0, -10); R.add(you); S3.avatar = you;
  S3.arrival = { car: cm, you, fans, t: 0 };
  S3.mode = 'arrival'; S3.focus = new THREE.Vector3(-300, 30, 0); S3.dist = 520; S3.pitch = 0.3; S3.yaw = 0.25;
  return 3.4;
}

/* ---------- ceremonia de retiro ---------- */
function buildCeremony(s) {
  const cl = { id: s.bestClub.id, name: s.bestClub.name, c1: s.bestClub.c1, c2: s.bestClub.c2 }, k = kitOf(cl);
  buildStadium(k, k, 1, { you: true });
  const R = S3.root;
  for (const m of S3.team) if (!m.you) m.p.visible = false;
  // alfombra, podio y trofeos
  const carpet = plane(R, M('#B8202E'), 60, 460, 0, 0.8, 250); carpet.rotation.x = -Math.PI / 2;
  cyl(R, M('#F4F4F2', { phong: true }), 90, 16, 0, 8, 0, true); cyl(R, M(k.c1), 94, 3, 0, 1.5, 0, false);
  const tr = s.trophies.slice(0, 40);
  tr.forEach((t, i) => { const m = makeTrophy(t), a = i / Math.max(1, tr.length) * Math.PI * 2, r = 55 + (i % 2) * 20; m.position.set(Math.cos(a) * r, 16, Math.sin(a) * r); m.scale.setScalar(1.8); R.add(m); });
  const plaque = plane(R, M('#FFFFFF', { map: signTex('GRACIAS ' + s.name.toUpperCase().slice(0, 18), '#11131A', '#FFE14D', 1024, 128), basic: true }), 560, 70, 0, 310, -520); void plaque;
  S3.avatar.position.set(0, 0, 480); S3.avatar.rotation.set(0, 0, 0);
  S3.ceremony = { t: 0, nextFw: 1.5, colors: [k.c1, k.c2, '#FFE14D', '#FFFFFF'] };
  S3.mode = 'ceremony'; S3.focus = new THREE.Vector3(0, 40, 60); S3.dist = 900; S3.pitch = 0.32; S3.yaw = 0.2;
}

/* ---------- actualización de las escenas de vida ---------- */
function updateLife(dt, t) {
  if (S3.mode === 'home') {
    if (!(S3.manual > t)) S3.yaw += dt * 0.05;
    S3.dist = lerp(S3.dist, S3.baseDist * (S3.zoom || 1), 0.1);
    const av = S3.avatar;
    if (S3.walk && av) {
      _v.subVectors(S3.walk.to, av.position); _v.y = 0; const d = _v.length();
      if (d > 3) { _v.normalize(); av.position.addScaledVector(_v, Math.min(d, 120 * dt)); av.rotation.y = Math.atan2(-_v.x, -_v.z); posePerson(av, t * 9, true, false, t, false, {}); }
      else { const w = S3.walk; S3.walk = null; if (w.face) { const dx = w.face.x - av.position.x, dz = w.face.z - av.position.z; av.rotation.y = Math.atan2(-dx, -dz); } if (w.act && typeof onHomeAction === 'function') onHomeAction(w.act); }
    } else if (av) posePerson(av, 0, false, false, t, false, {});
    for (const w of S3.wander || []) {
      if (t > w.next) { w.next = t + rand(3, 8); const b = S3.bounds; w.target.set(rand(b.x0 + 20, Math.min(b.x1, HOUSE_DIM[C.house][0] / 2) - 20), w.p.position.y, rand(b.z0 + 40, b.z1 - 20)); }
      _v.subVectors(w.target, w.p.position); _v.y = 0; const d = _v.length();
      if (d > 3) { _v.normalize(); w.p.position.addScaledVector(_v, Math.min(d, w.sp * dt)); w.p.rotation.y = Math.atan2(-_v.x, -_v.z); if (w.pet) posePet(w.p, true, t); else posePerson(w.p, t * (w.kid ? 12 : 8), true, false, t, false, {}); }
      else if (w.pet) posePet(w.p, false, t); else posePerson(w.p, 0, false, false, t + 2, false, {});
    }
    if (S3.pool) S3.pool.material.map.offset.x = (t * 0.02) % 1;
  } else if (S3.mode === 'office' && S3.office) {
    const o = S3.office, r = o.react; S3.yaw = 0.95 + Math.sin(t * 0.15) * 0.12;
    posePerson(o.you, 0, false, false, t, true, {}); posePerson(o.dir, 0, false, false, t + 2, true, {});
    if (o.ag) posePerson(o.ag, 0, false, false, t + 4, false, { hail: Math.sin(t * 0.8) > 0.6 });
    if (r) {
      r.t += dt;
      if (r.kind === 'accept') { o.dir.position.y = lerp(o.dir.position.y, 0, 0.1); o.you.position.y = lerp(o.you.position.y, 0, 0.1); o.dir.position.z = lerp(o.dir.position.z, -75, 0.05); o.you.position.z = lerp(o.you.position.z, 0, 0.05); posePerson(o.dir, 0, false, false, t, false, {}); posePerson(o.you, 0, false, false, t, false, {}); o.dir.userData.arms[1].rotation.x = -1.3 + Math.sin(t * 10) * 0.15; o.you.userData.arms[1].rotation.x = -1.3 + Math.sin(t * 10) * 0.15; if (o.ag) posePerson(o.ag, 0, false, false, t, false, { cheer: true }); }
      else if (r.kind === 'walk') { o.dir.position.y = lerp(o.dir.position.y, 0, 0.1); o.dir.rotation.y = lerpAng(o.dir.rotation.y, 0, 0.05); posePerson(o.dir, t * 6, r.t < 2, false, t, false, {}); if (r.t < 2) o.dir.position.x -= dt * 40; }
      else if (r.kind === 'counter') { o.dir.userData.arms[1].rotation.x = -0.9 + Math.sin(t * 6) * 0.3; o.dir.userData.body.rotation.x = 0.15; if (r.t > 2) o.react = null; }
    }
  } else if (S3.mode === 'disco' && S3.disco) {
    const d = S3.disco, beat = t * 2.1;
    if (!(S3.manual > t)) S3.yaw += dt * 0.08;
    const b = Math.floor(beat);
    if (b !== d.beat) { d.beat = b; const cols = [0xFF2E88, 0x2E6BFF, 0x19D46E, 0xFFE14D, 0x7B3FF2, 0x111111]; for (const tl of d.tiles) tl.m.material.color.setHex(cols[(tl.i * 3 + tl.j * 5 + b) % cols.length]); for (const sp of d.spots) sp.color.setHex(cols[Math.floor(Math.random() * 5)]); }
    d.ball.rotation.y += dt * 0.8;
    d.lasers.forEach((l, i) => { l.rotation.z = Math.sin(t * 0.9 + i) * 0.7; l.rotation.x = Math.cos(t * 0.7 + i * 2) * 0.5; });
    for (const x of d.dancers) { posePerson(x.p, 0, false, false, t + x.ph, false, { cheer: Math.sin(t * 1.3 + x.ph) > 0 }); x.p.position.y = 2 + Math.abs(Math.sin(beat * Math.PI + x.ph)) * 5; x.p.rotation.y += Math.sin(t + x.ph) * dt; }
    posePerson(d.you, 0, false, false, t, false, { cheer: true }); d.you.position.y = 2 + Math.abs(Math.sin(beat * Math.PI)) * 6; d.you.rotation.y = Math.sin(t * 1.2) * 0.8;
    posePerson(d.dj, 0, false, false, t, false, { hail: true });
  } else if (S3.mode === 'arrival' && S3.arrival) {
    const a = S3.arrival; a.t += dt;
    const u = clamp(a.t / 2, 0, 1), e = 1 - Math.pow(1 - u, 3);
    a.car.position.x = lerp(-1100, -60, e);
    for (const w of a.car.children) if (w.geometry === GC) w.rotation.x -= dt * (1 - u) * 20;
    if (a.t > 2.1) { a.you.visible = true; const v = clamp((a.t - 2.1) / 1.3, 0, 1); a.you.position.set(lerp(-40, 0, v), 0, lerp(-10, -230, v)); a.you.rotation.y = 0; posePerson(a.you, t * 9, v < 1, false, t, false, {}); }
    for (const f of a.fans) { if (f.flag) f.flag.rotation.y = Math.sin(t * 3 + f.ph) * 0.4; else { posePerson(f.p, 0, false, false, t + f.ph, false, a.t > 1.5 ? { cheer: true } : {}); f.p.rotation.y = lerpAng(f.p.rotation.y, Math.atan2(-(a.car.position.x - f.p.position.x), -(a.car.position.z - f.p.position.z)), 0.05); } }
    S3.focus.set(lerp(-600, -40, e), 30, -40); S3.yaw = lerp(0.25, 0.7, u);
  } else if (S3.mode === 'ceremony' && S3.ceremony) {
    const c = S3.ceremony; c.t += dt;
    if (S3.led) S3.led.offset.x = (t * 0.03) % 1;
    updateCrowd(t, 0.9);
    const av = S3.avatar;
    if (c.t < 6) { const u = clamp(c.t / 6, 0, 1); av.position.set(0, 0, lerp(480, 110, u)); av.rotation.y = 0; posePerson(av, t * 8, true, true, t, false, {}); }
    else posePerson(av, 0, false, c.t % 4 < 2, t, false, { cheer: c.t % 4 >= 2 });
    if (!(S3.manual > t)) S3.yaw += dt * 0.06;
    S3.focus.set(0, 40, lerp(S3.focus.z, av.position.z - 40, 0.05)); S3.dist = lerp(S3.dist, c.t < 6 ? 700 : 520, 0.02);
    if (c.t > c.nextFw) { c.nextFw = c.t + rand(0.4, 1.1); fireworks(new THREE.Vector3(0, 0, 0), c.colors); if (typeof sfxFirework === 'function') sfxFirework(); }
    if (c.t > 6 && !c.conf) { c.conf = true; confetti(new THREE.Vector3(0, 300, 100), c.colors, 200); }
  }
}
