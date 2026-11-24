// Prueba del modo con amigos con varias pestañas y una sala falsa (sin servidor: el navegador sirve el archivo).
// 1) 1 vs 1: el anfitrión crea la sala, el invitado la ve en "Salas abiertas" y entra; control, gol, fin, revancha y salida.
// 2) 2 vs 2: un anfitrión y tres invitados (uno entra con "Buscar 2 vs 2"); empieza sola al llenarse y cada uno maneja su auto.
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:866,height:400} });
  await ctx.addInitScript({content:fs.readFileSync(__dirname+'/fakeroom.js','utf8')});
  await ctx.route('http://tg.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8')}));
  const errs=[];
  const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    await p.goto('http://tg.test/turbogol/index.html');await p.waitForTimeout(700);await p.mouse.click(400,200);await p.waitForTimeout(300);
    await p.click('[data-go=online]');await p.waitForTimeout(500);return p;};
  const st=async p=>p.evaluate(()=>({tipo:Game.cfg&&Game.cfg.type,rol:Online.role,estado:Game.state,estadio:Render.themeId,W,autos:Game.cars.map(c=>[c.team,c.name,Math.round(c.x),c.isPlayer?'yo':''])}));

  // ---- 1 vs 1 ----
  const H=await open();await H.evaluate(()=>{Store.data.settings.arena='marino';Store.data.name='Ana';});
  const G=await open();await G.evaluate(()=>{Store.data.settings.arena='neon';Store.data.name='Beto';});
  await H.click('#onModeSeg [data-m="1v1"]');await H.click('#onNew');await H.click('#cfb [data-v="0"]');await H.click('#cfGo');await H.waitForTimeout(600);
  console.log('anfitrión espera:',(await H.textContent('#onStatus')).trim().slice(0,70));
  const fila=(await G.textContent('#onList')).trim();console.log('el invitado ve en salas abiertas:',fila.slice(0,60));
  await G.click('[data-join]');await G.waitForTimeout(2500);
  console.log('anfitrión',JSON.stringify(await st(H)));console.log('invitado ',JSON.stringify(await st(G)));
  await G.waitForTimeout(3000);const x0=await H.evaluate(()=>Game.cars[1].x);
  await G.keyboard.down('ArrowLeft');await G.waitForTimeout(1500);await G.keyboard.up('ArrowLeft');
  console.log('auto del invitado en el anfitrión: de',Math.round(x0),'a',Math.round(await H.evaluate(()=>Game.cars[1].x)));
  await H.evaluate(()=>{Game.touchLog.push({car:Game.player,t:Game.time});Game.ball.reset(W-30,GY-160,900,-100);});
  await G.waitForTimeout(1500);console.log('marcador invitado',await G.evaluate(()=>Game.score),'anfitrión',await H.evaluate(()=>Game.score));
  await H.evaluate(()=>{Game.skipReplay();});await H.waitForFunction(()=>Game.state==='play',null,{timeout:20000});await H.evaluate(()=>{Game.timeLeft=0.3;});
  await H.waitForFunction(()=>Game.state==='end',null,{timeout:20000});await G.waitForTimeout(2500);
  console.log('fin: invitado',await G.evaluate(()=>[Game.state,UI.cur]),'anfitrión',await H.evaluate(()=>[Game.state,UI.cur]));
  await H.waitForTimeout(3500);await H.evaluate(()=>{const b=document.querySelector('#rAgain');if(b)b.click();else UI.resultStep(3);});await H.waitForTimeout(300);
  await H.evaluate(()=>{const b=document.querySelector('#rAgain');if(b)b.click();});await G.waitForTimeout(2000);
  console.log('revancha: invitado',await G.evaluate(()=>[Game.state,UI.cur,Game.score]),'anfitrión',await H.evaluate(()=>[Game.state,UI.cur]));
  await H.evaluate(()=>UI.toMenu());await G.waitForTimeout(1500);console.log('se va el anfitrión → invitado en:',await G.evaluate(()=>[UI.cur,Online.role]));
  await G.evaluate(()=>UI.toMenu());

  // ---- 2 vs 2 ----
  const A=await open(),B=await open(),C=await open(),D=await open();
  await A.evaluate(()=>{Store.data.name='Ana';});await B.evaluate(()=>{Store.data.name='Beto';});await C.evaluate(()=>{Store.data.name='Caro';});await D.evaluate(()=>{Store.data.name='Dani';});
  await A.click('#onNew');await A.click('#cfm [data-v="2v2"]');await A.click('#cfb [data-v="0"]');await A.click('#cfGo');await A.waitForTimeout(700);
  await B.click('[data-join]');await B.waitForTimeout(600);
  console.log('sala 2v2 con 2 de 4:',(await A.textContent('#onPlayers')).replace(/\s+/g,' ').trim(),'· botón empezar visible:',await A.isVisible('#onStart'));
  await C.click('#onModeSeg [data-m="2v2"]');await C.click('#onQuick');await C.waitForTimeout(600);
  await D.click('[data-join]');await D.waitForTimeout(3000);
  for(const [n,p] of [['A',A],['B',B],['C',C],['D',D]])console.log(n,JSON.stringify(await st(p)));
  // cada invitado acelera hacia la izquierda: su propio auto debe moverse en el anfitrión
  await A.waitForTimeout(3500);
  for(const [n,p] of [['B',B],['C',C],['D',D]]){const idx=await A.evaluate(nm=>Game.cars.findIndex(c=>c.name===nm),{B:'Beto',C:'Caro',D:'Dani'}[n]);
    const x0=await A.evaluate(i=>Game.cars[i].x,idx);const k=(await A.evaluate(i=>Game.cars[i].team,idx))===1?'ArrowLeft':'ArrowRight';
    await p.keyboard.down(k);await p.waitForTimeout(900);await p.keyboard.up(k);console.log(`auto de ${n} (equipo ${await A.evaluate(i=>Game.cars[i].team,idx)}) en el anfitrión: de ${Math.round(x0)} a ${Math.round(await A.evaluate(i=>Game.cars[i].x,idx))}`);}
  // se va un invitado: el partido sigue
  await D.evaluate(()=>UI.toMenu());await A.waitForTimeout(1500);console.log('se fue D → anfitrión sigue en:',await A.evaluate(()=>[Game.state,Online.active]));
  // ---- sala configurada: 2 vs 2 con bots, rápida y turbo infinito; empieza con un amigo y bots ----
  await A.evaluate(()=>UI.toMenu());await B.evaluate(()=>UI.toMenu());await C.evaluate(()=>UI.toMenu());
  for(const p of [A,B])await p.click('[data-go=online]');await A.waitForTimeout(400);
  await A.click('#onNew');await A.click('#cfm [data-v="2v2"]');await A.click('#cfb [data-v="1"]');await A.click('#cfv [data-v="1.2"]');await A.click('#cft [data-v="i"]');await A.click('#cfd [data-v="180"]');await A.click('#cfGo');await A.waitForTimeout(700);
  console.log('B ve:',(await B.textContent('#onList')).replace(/\s+/g,' ').trim().slice(0,90));
  await B.click('[data-join]');await B.waitForTimeout(700);await A.click('#onStart');await B.waitForTimeout(2500);
  console.log('con bots:',JSON.stringify(await A.evaluate(()=>({autos:Game.cars.map(c=>[c.team,c.name,c.ai?'IA':c.remote?'amigo':'yo']),vel:Game.speed,turbo:Game.cars.every(c=>c.infinite),tiempo:Math.round(Game.timeLeft)}))));
  console.log('invitado:',JSON.stringify(await B.evaluate(()=>({autos:Game.cars.length,vel:Game.speed,yo:Game.player&&Game.player.name}))));
  console.log('errores',errs.slice(0,6));
  await b.close();
})();
