import { launch, BASE } from './browser.mjs';
const res=[]; const errs=[];
const check=(n,ok,d='')=>{res.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`)};
const b = await launch();
const p = await b.newPage({ viewport:{width:1180,height:900} });
p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/fonts\.|net::/.test(m.text()))errs.push(m.text())});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:[1,2,3,4,5,6,7,8,9,10,11,12],completedLevels:[1,2,3,4,5,6,7,8,9,10],
  levelData:{},settings:{sound:false,music:false},totalPlayTime:0,lastPlayedLevel:11})));
await p.reload({waitUntil:'networkidle'});
const open=async id=>{await p.goto(BASE+'#/levels',{waitUntil:'networkidle'});await p.waitForTimeout(250);
  await p.goto(BASE+`#/level/${id}`,{waitUntil:'networkidle'});await p.waitForTimeout(700);};
const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mindEscape_progress')));

// ── Nivel 11 ────────────────────────────────────────────────
await open(11);
check('L11 pinta 5 grupos de 5 bits',
  (await p.locator('.lv11__group').count())===5 && (await p.locator('.lv11__bit').count())===25);
const bits = await p.evaluate(()=>[...document.querySelectorAll('.lv11__group')]
  .map(g=>[...g.children].map(c=>c.textContent).join('')));
const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const decoded = bits.map(b=>ALPHA[parseInt(b,2)-1]).join('');
check('L11: los bits decodifican a MENTE', decoded==='MENTE', `bits=${bits.join(' ')} → ${decoded}`);
await p.locator('.answer-bar input').fill('mente');
await p.getByRole('button',{name:/^Enviar$/i}).click();
await p.waitForTimeout(1200);
check('L11 se completa', (await read()).completedLevels.includes(11));
await p.getByRole('button',{name:/Selector de niveles/i}).click(); await p.waitForTimeout(600);

// ── Nivel 12 ────────────────────────────────────────────────
await open(12);
check('L12 pinta 8 pelotas en la reserva',
  (await p.locator('.lv12__zone[data-zone="pool"] .lv12__ball').count())===8);
check('L12 arranca con 0/2 pesadas',
  (await p.locator('.lv12__counter b').textContent()).trim()==='0 / 2');

// Mover pelotas pulsándolas (reserva → izquierda) : 1,2,3
const cycle = async (id,times)=>{ for(let i=0;i<times;i++){
  await p.locator(`.lv12__ball[data-id="${id}"]`).click(); await p.waitForTimeout(80);} };
for (const id of [1,2,3]) await cycle(id,1);            // → left
for (const id of [4,5,6]) await cycle(id,2);            // → right
check('L12: pulsar rota de zona',
  (await p.locator('.lv12__zone[data-zone="left"] .lv12__ball').count())===3
  && (await p.locator('.lv12__zone[data-zone="right"] .lv12__ball').count())===3);

// Pesada 1: 3 vs 3
await p.getByRole('button',{name:/^Pesar$/i}).click(); await p.waitForTimeout(900);
const r1 = (await p.locator('.level-feedback').textContent()).trim();
check('L12: la primera pesada da un resultado legible', /pesa|mismo/i.test(r1), `"${r1}"`);
check('L12: el contador sube a 1/2',
  (await p.locator('.lv12__counter b').textContent()).trim()==='1 / 2');
const tilt1 = await p.evaluate(()=>document.querySelector('.lv12__beam').style.transform);
check('L12: la balanza refleja el resultado',
  (/mismo/i.test(r1) && tilt1==='rotate(0deg)') || (!/mismo/i.test(r1) && tilt1!=='rotate(0deg)'),
  `tilt=${tilt1}`);

// Deducir el grupo candidato y hacer la 2ª pesada
let candidates;
if (/mismo/i.test(r1)) candidates=[7,8];
else if (/izquierdo/i.test(r1)) candidates=[1,2,3];
else candidates=[4,5,6];

// Todo a la reserva y luego candidato[0] vs candidato[1]
for (let id=1; id<=8; id++){
  const zone = await p.evaluate(i=>document.querySelector(`.lv12__ball[data-id="${i}"]`)
    .closest('.lv12__zone').dataset.zone, id);
  const steps = zone==='left'?2: zone==='right'?1: 0;
  if (steps) await cycle(id, steps);
}
check('L12: todas vuelven a la reserva',
  (await p.locator('.lv12__zone[data-zone="pool"] .lv12__ball').count())===8);
await cycle(candidates[0],1); await cycle(candidates[1],2);
await p.getByRole('button',{name:/^Pesar$/i}).click(); await p.waitForTimeout(900);
const r2=(await p.locator('.level-feedback').textContent()).trim();
check('L12: el contador llega a 2/2',
  (await p.locator('.lv12__counter b').textContent()).trim()==='2 / 2');
check('L12: PESAR se desactiva al gastar las dos',
  await p.getByRole('button',{name:/^Pesar$/i}).isDisabled());

let heavy;
if (/izquierdo/i.test(r2)) heavy=candidates[0];
else if (/derecho/i.test(r2)) heavy=candidates[1];
else heavy=candidates[2];
check('L12: el método deduce una pelota', heavy!==undefined, `candidatos=${candidates} → ${heavy}`);

await p.getByRole('button',{name:`Acusar a la pelota ${heavy}`}).click();
await p.waitForTimeout(1300);
const s=await read();
check('L12 se resuelve con el método de las dos pesadas', s.completedLevels.includes(12),
  `pesada=${heavy}`);
check('Sin errores en consola', errs.length===0, errs.slice(0,2).join(' | '));
await b.close();
const bad=res.filter(r=>!r).length;
console.log(`\n${res.length-bad}/${res.length} OK`);
process.exit(bad?1:0);
