/**
 * Auditoría de pulido: recorre las 30 pantallas de nivel en tres anchos y
 * reporta desbordamiento horizontal, objetivos táctiles pequeños y elementos
 * que se salen del área visible.
 */
import { launch, BASE } from './browser.mjs';
const WIDTHS=[320,375,768];
const b=await launch();
const problems=[];

for (const width of WIDTHS) {
  const p=await b.newPage({viewport:{width,height:720}});
  const errs=[];
  p.on('pageerror',e=>errs.push(`${e.message}`));
  p.on('console',m=>{if(m.type()==='error'&&!/fonts\.|net::/.test(m.text()))errs.push(m.text())});
  await p.goto(BASE,{waitUntil:'networkidle'});
  await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
    schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),
    completedLevels:Array.from({length:29},(_,i)=>i+1),
    levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:1})));
  await p.reload({waitUntil:'networkidle'});

  const screens=[['menu','#/menu'],['selector','#/levels'],['ajustes','#/settings'],
    ...Array.from({length:30},(_,i)=>[`nivel ${i+1}`,`#/level/${i+1}`])];

  for (const [name,hash] of screens) {
    await p.goto(BASE+'#/levels',{waitUntil:'networkidle'}); await p.waitForTimeout(120);
    await p.goto(BASE+hash,{waitUntil:'networkidle'}); await p.waitForTimeout(650);

    const r = await p.evaluate(() => {
      const doc=document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      // Elementos que sobresalen por los lados
      const wide=[];
      for (const n of document.querySelectorAll('#app *')) {
        const b=n.getBoundingClientRect();
        if (b.width===0) continue;
        if (b.left < -1 || b.right > doc.clientWidth+1) {
          wide.push(`${n.tagName.toLowerCase()}.${(n.className||'').toString().split(' ')[0]}`);
        }
      }
      // Objetivos táctiles por debajo de 40px
      const small=[];
      for (const n of document.querySelectorAll('#app button, #app [role="gridcell"], #app input')) {
        const b=n.getBoundingClientRect();
        if (b.width===0||b.height===0) continue;
        if (b.width<40||b.height<40) small.push(
          `${(n.className||'').toString().split(' ')[0]||n.tagName.toLowerCase()} ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
      return { overflow, wide:[...new Set(wide)].slice(0,4), small:[...new Set(small)].slice(0,4) };
    });

    if (r.overflow>0) problems.push({width,name,tipo:'desborde',detalle:`${r.overflow}px`});
    if (r.wide.length) problems.push({width,name,tipo:'se sale',detalle:r.wide.join(', ')});
    if (r.small.length) problems.push({width,name,tipo:'objetivo pequeño',detalle:r.small.join(' | ')});
  }
  if (errs.length) problems.push({width,name:'(consola)',tipo:'error',detalle:errs.slice(0,2).join(' | ')});
  await p.close();
}

if(!problems.length) console.log('Sin problemas.');
for (const w of WIDTHS) {
  const rows=problems.filter(x=>x.width===w);
  if(!rows.length) continue;
  console.log(`\n════ ${w}px ════`);
  for (const r of rows) console.log(`  ${r.tipo.padEnd(18)} ${r.name.padEnd(12)} ${r.detalle}`);
}
console.log(`\nTotal: ${problems.length} incidencias`);
await b.close();
