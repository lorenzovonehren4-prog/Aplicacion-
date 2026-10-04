// Valida las pistas (cruces, radios, pendientes, curvas de freno): node tools/validar-pistas.mjs
// Con --mapa dibuja tests/capturas/mapa-pistas.png (necesita playwright y CHROMIUM_PATH).
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../', import.meta.url);
const ctx = { console: { log() {}, warn() {} }, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(ctx);
for (const f of ['vendor/three.min.js', 'src/data.js', 'src/track.js']) vm.runInContext(fs.readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
const res = vm.runInContext(`TRACKS.map(d => { const T = buildTrackData(d); const v = validateTrack(T);
  let lap = 0; for (let i = 0; i < T.N; i++) lap += 1 / T.vprof[i];
  return { id: d.id, ...v, botLap: lap, where: v.where && v.where.map(i => [Math.round(T.px[i]), Math.round(T.pz[i])]),
    corners: v.corners.map(c => ({ at: [Math.round(T.px[c.i]), Math.round(T.pz[c.i])], vin: +(c.vin * 3.6).toFixed(0), vmin: +(c.vmin * 3.6).toFixed(0), coast: Math.round(c.coast), brake: c.brake })) }; })`, ctx);
let bad = 0;
for (const r of res) {
  console.log(`${r.id}: largo ${r.length.toFixed(0)} m, separación mínima ${r.minSep.toFixed(1)} (necesita ${r.need}) en ${JSON.stringify(r.where)}, radio mínimo ${r.minRadius.toFixed(1)} m en ${JSON.stringify(r.rAt)}, pendiente máx ${(r.maxGrade * 100).toFixed(0)}%, vuelta ideal ${r.botLap.toFixed(1)} s, curvas de freno ${r.brakes} ${r.ok ? 'OK' : 'MAL'}`);
  for (const c of r.corners) console.log(`   curva en ${JSON.stringify(c.at)}: ${c.vin} → ${c.vmin} km/h, soltar ${c.coast} m${c.brake ? '  << FRENO' : ''}`);
  if (!r.ok) bad++;
}
if (process.argv.includes('--mapa')) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await b.newPage({ viewport: { width: 1600, height: 1600 } });
  const src = ['vendor/three.min.js', 'src/data.js', 'src/track.js'].map(f => fs.readFileSync(new URL(f, dir), 'utf8')).join('\n;\n');
  await page.setContent('<body style="margin:0;background:#111"><div id=g style="display:grid;grid-template-columns:1fr 1fr"></div></body>');
  await page.addScriptTag({ content: src });
  await page.evaluate(() => {
    for (const d of TRACKS) {
      const T = buildTrackData(d), cv = document.createElement('canvas'); cv.width = cv.height = 800; document.getElementById('g').appendChild(cv);
      const g = cv.getContext('2d');
      let a = 1e9, b = -1e9, c = 1e9, e = -1e9; for (let i = 0; i < T.N; i++) { a = Math.min(a, T.px[i]); b = Math.max(b, T.px[i]); c = Math.min(c, T.pz[i]); e = Math.max(e, T.pz[i]); }
      const s = 700 / Math.max(b - a, e - c), f = (x, z) => [50 + (b - x) * s, 50 + (e - z) * s];
      const order = [...Array(T.N).keys()].sort((i, j) => T.py[i] - T.py[j]);
      for (const i of order) { const j = (i + 1) % T.N; const [x0, y0] = f(T.px[i], T.pz[i]), [x1, y1] = f(T.px[j], T.pz[j]);
        g.strokeStyle = T.tunnel[i] ? '#555' : `hsl(${200 - T.py[i] * 25}, 70%, ${45 + T.py[i] * 4}%)`; g.lineWidth = T.def.width * s; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < T.N; i++) { const [x, y] = f(T.lx[i], T.lz[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
      g.font = 'bold 14px sans-serif';
      d.pts.forEach((p, k) => { const [x, y] = f(p[0], p[1]); g.fillStyle = '#ff0'; g.fillText(k, x + 6, y - 6); });
      for (const cn of cornerReport(T)) { const [x, y] = f(T.px[cn.i], T.pz[cn.i]); g.fillStyle = cn.brake ? '#f33' : '#3f6'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillText(Math.round(cn.coast) + 'm', x + 8, y + 16); }
      const [sx, sy] = f(T.px[0], T.pz[0]); g.fillStyle = '#fff'; g.fillRect(sx - 6, sy - 6, 12, 12);
      g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText(d.id + ' ' + d.title + ' ' + Math.round(T.L) + ' m', 10, 26);
    }
  });
  fs.mkdirSync(new URL('tests/capturas/', dir), { recursive: true });
  await page.screenshot({ path: new URL('tests/capturas/mapa-pistas.png', dir).pathname });
  await b.close();
}
process.exit(bad ? 1 : 0);
