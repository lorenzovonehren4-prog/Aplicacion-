import { launch, BASE, shot } from './browser.mjs';
const b=await launch();
for (const w of [320, 1180]) {
  const p=await b.newPage({viewport:{width:w,height:820},deviceScaleFactor:2});
  await p.goto(BASE+'#/level/1',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  const overlaps = await p.evaluate(()=>{
    const r=[...document.querySelectorAll('.lv01__number')].map(n=>n.getBoundingClientRect());
    let hits=0;
    for(let i=0;i<r.length;i++) for(let j=i+1;j<r.length;j++){
      const a=r[i],c=r[j];
      if(a.left<c.right && c.left<a.right && a.top<c.bottom && c.top<a.bottom) hits++;
    }
    return hits;
  });
  console.log(`${w}px → solapamientos entre números: ${overlaps}`);
  await p.screenshot({ path: shot(`nivel-01-${w}.png`) });
  await p.close();
}
await b.close();
