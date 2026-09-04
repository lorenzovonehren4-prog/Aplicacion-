/** Regresión: un camino ya cerrado no se borra por tocar su punto. */
import { launch, BASE } from './browser.mjs';
const res=[]; const check=(n,ok,d='')=>{res.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`)};
const b=await launch();
const p=await b.newPage({viewport:{width:1180,height:900}});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:Array.from({length:30},(_,i)=>i+1),completedLevels:[],
  levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:13})));
await p.reload({waitUntil:'networkidle'});
await p.goto(BASE+'#/level/13',{waitUntil:'networkidle'}); await p.waitForTimeout(700);

const cell=(r,c)=>p.locator(`.lv13__cell[data-r="${r}"][data-c="${c}"]`);
const covered=async()=>Number((await p.locator('.lv13__status b').textContent()).split('/')[0].trim());

// Traza el camino rojo entero (10 celdas)
for (const [r,c] of [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[3,1],[2,1],[1,1],[0,1]]) {
  await cell(r,c).click(); await p.waitForTimeout(40);
}
check('El camino rojo se cierra', (await covered())===10, `cubiertas=${await covered()}`);

// Tocar su punto NO debe borrarlo
await cell(0,0).click(); await p.waitForTimeout(200);
check('Tocar el punto de un camino cerrado no lo borra', (await covered())===10, `cubiertas=${await covered()}`);
await cell(0,1).click(); await p.waitForTimeout(200);
check('Tampoco el otro punto', (await covered())===10, `cubiertas=${await covered()}`);

// Pero una celda intermedia sí lo recorta: es la vía para deshacer
await cell(2,0).click(); await p.waitForTimeout(200);
check('Una celda intermedia sí recorta el camino', (await covered())===3, `cubiertas=${await covered()}`);

// Y "Borrar todo" sigue funcionando
await p.getByRole('button',{name:/Borrar todo/i}).click(); await p.waitForTimeout(200);
check('"Borrar todo" limpia la cuadrícula', (await covered())===0);

await b.close();
const bad=res.filter(r=>!r).length;
console.log(`\n${res.length-bad}/${res.length} OK`);
process.exit(bad?1:0);
