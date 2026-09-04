/** Con el sonido ENCENDIDO: comprueba que la ruta de Web Audio no revienta
 *  y que cada efecto suena en el momento que le toca. */
import { launch, BASE } from './browser.mjs';
const res=[]; const errs=[];
const check=(n,ok,d='')=>{res.push(ok);console.log(`${ok?'PASS':'FAIL'}  ${n}${d?' — '+d:''}`)};
const b=await launch({ args:['--autoplay-policy=no-user-gesture-required'],
});
const p=await b.newPage({viewport:{width:1180,height:900}});
p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/fonts\.|net::/.test(m.text()))errs.push(m.text())});

await p.addInitScript(()=>{
  window.__osc = 0;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  const original = Ctor.prototype.createOscillator;
  Ctor.prototype.createOscillator = function patched(...args) {
    window.__osc = (window.__osc || 0) + 1;
    return original.apply(this, args);
  };
});
await p.goto(BASE,{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.setItem('mindEscape_progress',JSON.stringify({
  schemaVersion:1,unlockedLevels:[1,2],completedLevels:[],
  levelData:{},settings:{sound:true,music:true},totalPlayTime:0,lastPlayedLevel:1})));
await p.reload({waitUntil:'networkidle'});
await p.waitForTimeout(400);

// Los módulos ES importan `audio.play` como binding de solo lectura, así que
// no se puede sustituir desde fuera. Se cuenta un nivel más abajo: cada efecto
// crea osciladores de Web Audio, así que contarlos prueba que suena de verdad.
const played = () => p.evaluate(()=>window.__osc ?? 0);
const clearSounds = () => p.evaluate(()=>{window.__osc=0});

// Gesto del usuario: desbloquea el AudioContext
await p.getByRole('button',{name:/Niveles/i}).click(); await p.waitForTimeout(500);
const ctxState = await p.evaluate(()=>{
  // El contexto se crea perezosamente; forzamos su creación con un efecto
  window.MindEscape.audio.unlock();
  return 'ok';
});
check('El AudioContext se desbloquea sin errores', ctxState==='ok');
check('Navegar produce sonido', (await played()) > 0, `osciladores=${await played()}`);

// Nivel 1 con sonido: fallo y acierto
await p.goto(BASE+'#/level/1',{waitUntil:'networkidle'}); await p.waitForTimeout(700);
await clearSounds();
await p.locator('.lv01__number:not(.lv01__number--target)').first().click();
await p.waitForTimeout(300);
check('Fallar produce sonido', (await played()) >= 2, `osciladores=${await played()}`);

await clearSounds();
await p.locator('.hints__header').click(); await p.waitForTimeout(400);
await p.locator('.hint__reveal').first().click(); await p.waitForTimeout(300);
check('Revelar una pista produce sonido', (await played()) >= 2, `osciladores=${await played()}`);

await clearSounds();
await p.locator('.lv01__number--target').click();
await p.waitForTimeout(1400);
// correct (2 tonos) + unlock (3) + complete (4) = 9 osciladores como mínimo
const osc = await played();
check('Acertar, desbloquear y completar suenan los tres', osc >= 9, `osciladores=${osc}`);

// El ambiente arranca y se puede apagar desde ajustes
const ambientOn = await p.evaluate(()=>{
  window.MindEscape.audio.startAmbient();
  return true;
});
check('El drone ambiental arranca sin errores', ambientOn);
await p.goto(BASE+'#/settings',{waitUntil:'networkidle'}); await p.waitForTimeout(500);
await p.getByRole('switch',{name:/Música/i}).click(); await p.waitForTimeout(600);
check('Apagar la música no rompe nada', errs.length===0, errs.slice(0,2).join(' | '));
const musicOff = await p.evaluate(()=>JSON.parse(localStorage.getItem('mindEscape_progress')).settings.music);
check('El ajuste de música se guarda', musicOff===false);

check('Sin errores en consola con el sonido activo', errs.length===0, errs.slice(0,3).join(' | '));
await b.close();
const bad=res.filter(r=>!r).length;
console.log(`\n${res.length-bad}/${res.length} OK`);
process.exit(bad?1:0);
