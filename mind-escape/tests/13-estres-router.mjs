/** Estrés del router: navegación rápida, atrás/adelante del navegador y
 *  recargas a mitad de partida. */
import { launch, BASE } from './browser.mjs';
const res=[]; const errs=[];
const check=(n,ok,d='')=>{res.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`)};
const b=await launch();
const p=await b.newPage({viewport:{width:1180,height:900}});
p.on('pageerror',e=>errs.push('pageerror: '+e.message));
p.on('console',m=>{if(m.type()==='error'&&!/fonts\.|net::/.test(m.text()))errs.push(m.text())});

await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),
  completedLevels:Array.from({length:29},(_,i)=>i+1),
  levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:1})));
await p.reload({waitUntil:'networkidle'});
const wait=ms=>p.waitForTimeout(ms);

// ── 1. Navegación más rápida que la transición (180 ms) ────────────────────
for (let i=0;i<24;i++){
  await p.evaluate((h)=>{location.hash=h;}, `#/level/${(i%30)+1}`);
  await wait(45);   // por debajo del tiempo de transición, a propósito
}
await wait(1200);
const afterRapid = await p.evaluate(()=>({
  screens: document.querySelectorAll('#app > section').length,
  styles: document.querySelectorAll('#app style').length,
  hash: location.hash,
}));
check('Navegación rápida deja una sola pantalla montada',
  afterRapid.screens===1, JSON.stringify(afterRapid));
check('…y un solo bloque de estilos de nivel', afterRapid.styles<=1, `styles=${afterRapid.styles}`);

// ── 2. Atrás y adelante del navegador ──────────────────────────────────────
await p.goto(BASE+'#/menu',{waitUntil:'networkidle'}); await wait(400);
await p.evaluate(()=>{location.hash='#/levels';}); await wait(500);
await p.evaluate(()=>{location.hash='#/level/5';}); await wait(700);
await p.goBack(); await wait(600);
check('Atrás vuelve al selector', (await p.locator('.level-card').count())===30);
await p.goForward(); await wait(700);
check('Adelante vuelve al nivel', (await p.locator('.lv05__option').count())===3);
await p.goBack(); await p.goBack(); await wait(700);
check('Dos veces atrás llega al menú', (await p.locator('#menu-title').count())===1);

// ── 3. Recargar a mitad de nivel ───────────────────────────────────────────
await p.goto(BASE+'#/level/12',{waitUntil:'networkidle'}); await wait(700);
await p.locator('.lv12__ball[data-id="1"]').click(); await wait(150);
await p.reload({waitUntil:'networkidle'}); await wait(800);
check('Recargar dentro de un nivel lo remonta limpio',
  (await p.locator('.lv12__zone[data-zone="pool"] .lv12__ball').count())===8);
check('…y el contador de pesadas vuelve a cero',
  (await p.locator('.lv12__counter b').textContent()).trim()==='0 / 2');

// ── 4. Completar y luego pulsar atrás ──────────────────────────────────────
await p.goto(BASE+'#/level/20',{waitUntil:'networkidle'}); await wait(700);
await p.locator('.lv20__door').nth(3).click(); await wait(1300);
check('El modal aparece al completar', (await p.locator('.modal').count())===1);
await p.goBack(); await wait(800);
check('Atrás con el modal abierto lo cierra',
  (await p.locator('.modal-backdrop').count())===0);
check('…y deja una pantalla válida montada',
  (await p.locator('#app > section').count())===1);

// ── 5. Hash basura y rutas inválidas ───────────────────────────────────────
for (const h of ['#/', '#/nope', '#/level/abc', '#/level/-3', '#/level/999', '#///', '#/final']) {
  await p.evaluate((x)=>{location.hash=x;}, h); await wait(450);
}
await wait(600);
check('Ninguna ruta basura rompe la aplicación',
  (await p.locator('#app > section').count())===1);

check('Sin errores en consola durante todo el estrés', errs.length===0, errs.slice(0,3).join(' | '));
await b.close();
const bad=res.filter(r=>!r).length;
console.log(`\n${res.length-bad}/${res.length} OK`);
process.exit(bad?1:0);
