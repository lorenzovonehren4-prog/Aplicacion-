// Valida que las pistas no se crucen: node tools/validar-pistas.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('../', import.meta.url);
const ctx = { console, localStorage: { getItem: () => null, setItem() {} } };
vm.createContext(ctx);
for (const f of ['vendor/three.min.js', 'src/data.js', 'src/track.js']) vm.runInContext(fs.readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
const res = vm.runInContext(`TRACKS.map(d => { const T = buildTrackData(d); const v = validateTrack(T);
  let lap = 0; for (let i = 0; i < T.N; i++) lap += 1 / T.vprof[i];
  return { id: d.id, ...v, botLap: lap, where: v.where && v.where.map(i => [Math.round(T.px[i]), Math.round(T.pz[i])]) }; })`, ctx);
let bad = 0;
for (const r of res) {
  console.log(`${r.id}: largo ${r.length.toFixed(0)} m, separación mínima ${r.minSep.toFixed(1)} (necesita ${r.need}) en ${JSON.stringify(r.where)}, radio mínimo ${r.minRadius.toFixed(1)} m en ${JSON.stringify(r.rAt)}, vuelta ideal ${r.botLap.toFixed(2)} s ${r.ok ? 'OK' : 'MAL'}`);
  if (!r.ok) bad++;
}
process.exit(bad ? 1 : 0);
