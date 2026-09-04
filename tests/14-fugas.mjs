/**
 * Auditoría de fugas: recorre los 30 niveles y comprueba que al salir cada uno
 * devuelve lo que pidió — listeners globales, intervalos y nodos del DOM.
 */
import { launch, BASE } from './browser.mjs';
const b=await launch();
const p=await b.newPage({viewport:{width:1180,height:900}});

await p.addInitScript(()=>{
  window.__probe = { doc:0, win:0, intervals:0, timeouts:0 };
  for (const [target,key] of [[Document.prototype,'doc'],[Window.prototype,'win']]) {
    const add = target.addEventListener, remove = target.removeEventListener;
    target.addEventListener = function(...a){ window.__probe[key]++; return add.apply(this,a); };
    target.removeEventListener = function(...a){ window.__probe[key]--; return remove.apply(this,a); };
  }
  const si=window.setInterval, ci=window.clearInterval;
  window.setInterval=(...a)=>{window.__probe.intervals++; return si(...a);};
  window.clearInterval=(...a)=>{window.__probe.intervals--; return ci(...a);};
});

await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),
  completedLevels:Array.from({length:29},(_,i)=>i+1),
  levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:1})));
await p.reload({waitUntil:'networkidle'});
await p.waitForTimeout(600);

const probe = () => p.evaluate(()=>({...window.__probe, nodes:document.querySelectorAll('*').length}));
const base = await probe();
console.log(`base: doc=${base.doc} win=${base.win} intervalos=${base.intervals} nodos=${base.nodes}\n`);

const leaks=[];
for (let id=1; id<=30; id++) {
  const before = await probe();
  await p.goto(BASE+`#/level/${id}`,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  await p.goto(BASE+'#/levels',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  const after = await probe();
  const d = {
    doc: after.doc-before.doc, win: after.win-before.win,
    intervals: after.intervals-before.intervals, nodes: after.nodes-before.nodes,
  };
  if (d.doc||d.win||d.intervals) leaks.push(`nivel ${id}: doc+${d.doc} win+${d.win} intervalos+${d.intervals}`);
}

console.log(leaks.length ? 'FUGAS:\n  '+leaks.join('\n  ') : 'Ningún listener global ni intervalo queda colgando tras salir de un nivel.');

// Crecimiento del DOM tras un recorrido completo
const end = await probe();
console.log(`\ntras recorrer los 30: doc=${end.doc} (base ${base.doc}) · win=${end.win} (base ${base.win}) · intervalos=${end.intervals} · nodos=${end.nodes} (base ${base.nodes})`);
await b.close();
process.exit(leaks.length?1:0);
