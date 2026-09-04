import { launch, BASE } from './browser.mjs';
const b=await launch();
const p=await b.newPage({viewport:{width:1180,height:900}});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),
  completedLevels:Array.from({length:29},(_,i)=>i+1),
  levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:1})));
await p.reload({waitUntil:'networkidle'});

const atSelector = async () => {
  await p.goto(BASE+'#/levels',{waitUntil:'networkidle'}); await p.waitForTimeout(600);
  return p.evaluate(()=>({
    nodes: document.querySelectorAll('*').length,
    styles: document.querySelectorAll('style').length,
    overlays: document.querySelectorAll('#overlay-root > *').length,
  }));
};
const before = await atSelector();
for (let id=1; id<=30; id++) {
  await p.goto(BASE+`#/level/${id}`,{waitUntil:'networkidle'}); await p.waitForTimeout(420);
}
const after = await atSelector();
console.log('selector antes :', JSON.stringify(before));
console.log('selector después:', JSON.stringify(after));
const ok = after.nodes===before.nodes && after.styles===before.styles && after.overlays===0;
console.log(ok ? '\nPASS  el DOM vuelve exactamente a su estado anterior tras recorrer los 30 niveles'
               : '\nFAIL  el DOM crece tras el recorrido');
await b.close();
process.exit(ok?0:1);
