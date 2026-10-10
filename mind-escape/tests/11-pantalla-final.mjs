import { launch, BASE, shot } from './browser.mjs';
const res=[]; const errs=[];
const check=(n,ok,d='')=>{res.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`)};
const b=await launch();
const p=await b.newPage({viewport:{width:1180,height:900}});
p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/fonts\.|net::/.test(m.text()))errs.push(m.text())});

const seed = async (completed) => {
  await p.goto(BASE,{waitUntil:'networkidle'});
  await p.evaluate((n)=>{
    const ld={};
    for(let i=1;i<=n;i++) ld[i]={bestTime:40+i,stars:i%7===0?2:3,hintsUsed:0,attempts:1,completed:true,completedAt:'2026-09-03T12:00:00Z'};
    localStorage.setItem('mindEscape_progress',JSON.stringify({
      schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),
      completedLevels:Array.from({length:n},(_,i)=>i+1),
      levelData:ld,settings:{sound:false,music:false},totalPlayTime:2732,lastPlayedLevel:n}));
  }, completed);
  await p.reload({waitUntil:'networkidle'});
};

// ── Pantalla final ──────────────────────────────────────────────────────────
await seed(30);
await p.goto(BASE+'#/final',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
check('La pantalla final existe', (await p.locator('.ending').count())===1);
check('Dice ¡Escapaste!', /Escapaste/i.test(await p.locator('.ending__title').textContent()));
const stats = await p.evaluate(()=>[...document.querySelectorAll('.ending__stat-value')].map(n=>n.textContent));
check('Muestra niveles, estrellas y tiempo total', stats.length===3, stats.join(' · '));
check('Los totales son correctos', stats[0]==='30 / 30' && stats[1]==='86 / 90', stats.join(' | '));
await p.screenshot({ path: shot('pantalla-final.png') });

// Sin la partida terminada, la ruta redirige
await seed(29);
await p.goto(BASE+'#/final',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
check('Sin terminar, /final redirige al selector', (await p.locator('.level-card').count())===30);

// El menú ofrece volver a la salida
await seed(30);
await p.goto(BASE+'#/menu',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
check('El menú ofrece "Ver la salida"',
  (await p.getByRole('button',{name:/Ver la salida/i}).count())===1);
await p.getByRole('button',{name:/Ver la salida/i}).click(); await p.waitForTimeout(700);
check('…y lleva a la pantalla final', (await p.locator('.ending').count())===1);

// ── Auditoría de teclado: ¿es todo alcanzable con Tab? ──────────────────────
const focusables = async (hash) => {
  await p.goto(BASE+'#/levels',{waitUntil:'networkidle'}); await p.waitForTimeout(150);
  await p.goto(BASE+hash,{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  return p.evaluate(()=>{
    const sel='button:not(:disabled),[href],input:not(:disabled),select,textarea,[tabindex]:not([tabindex="-1"])';
    return [...document.querySelectorAll('#app '+sel)].filter(n=>n.getBoundingClientRect().width>0).length;
  });
};
let sinFoco=[];
for(let i=1;i<=30;i++){
  const n = await focusables(`#/level/${i}`);
  // Cada nivel debe ofrecer al menos: volver, pistas y algo con lo que jugar
  if (n < 4) sinFoco.push(`nivel ${i} (${n})`);
}
check('Todos los niveles ofrecen elementos enfocables con Tab', sinFoco.length===0, sinFoco.join(', '));

check('Sin errores en consola', errs.length===0, errs.slice(0,3).join(' | '));
await b.close();
const bad=res.filter(r=>!r).length;
console.log(`\n${res.length-bad}/${res.length} OK`);
process.exit(bad?1:0);
