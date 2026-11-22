// Prueba del modo en línea con dos pestañas y una sala falsa (sin servidor: el navegador sirve el archivo)
const { chromium } = require('playwright');
const fs=require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport:{width:866,height:400} });
  await ctx.addInitScript({content:fs.readFileSync(__dirname+'/fakeroom.js','utf8')});
  await ctx.route('http://tg.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8')}));
  const errs=[];
  const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    await p.goto('http://tg.test/turbogol/index.html');await p.waitForTimeout(700);await p.mouse.click(400,200);await p.waitForTimeout(300);return p;};
  const H=await open(),G=await open();
  await H.click('[data-go=online]');await H.waitForTimeout(400);await H.click('#onCreate');await H.waitForTimeout(500);
  const status=await H.textContent('#onStatus');const code=(status.match(/Sala ([A-Z0-9]{4})/)||[])[1];console.log('estado anfitrión:',status.trim(),'| código',code);
  await G.click('[data-go=online]');await G.waitForTimeout(400);await G.fill('#onCode',code||'');await G.click('#onJoin');
  await G.waitForTimeout(2500);
  const st=async p=>p.evaluate(()=>({tipo:Game.cfg&&Game.cfg.type,rol:Online.role,estado:Game.state,activo:Online.active,W,autos:Game.cars.map(c=>[c.team,c.name,Math.round(c.x),c.isPlayer?'yo':''])}));
  console.log('anfitrión',JSON.stringify(await st(H)));console.log('invitado',JSON.stringify(await st(G)));
  // el invitado acelera a la izquierda (ataca a la izquierda): su auto debe moverse en el anfitrión
  await G.waitForTimeout(3000);const x0=await H.evaluate(()=>Game.cars[1].x);
  await G.keyboard.down('ArrowLeft');await G.waitForTimeout(1500);await G.keyboard.up('ArrowLeft');
  const x1=await H.evaluate(()=>Game.cars[1].x),gx=await G.evaluate(()=>Game.cars[1].x);
  console.log('auto del invitado en el anfitrión: de',Math.round(x0),'a',Math.round(x1),'· en la pantalla del invitado:',Math.round(gx));
  // gol forzado en el anfitrión: el invitado debe ver el marcador
  await H.evaluate(()=>{Game.touchLog.push({car:Game.player,t:Game.time});Game.ball.reset(W-60,GY-200,900,-100);});
  await G.waitForTimeout(1500);console.log('marcador invitado',await G.evaluate(()=>Game.score),'anfitrión',await H.evaluate(()=>Game.score));
  await G.screenshot({path:require('os').tmpdir()+'/tg-on-guest.png'});await H.screenshot({path:require('os').tmpdir()+'/tg-on-host.png'});
  // fin del partido
  await H.evaluate(()=>{Game.skipReplay();});await H.waitForFunction(()=>Game.state==='play',null,{timeout:20000});await H.evaluate(()=>{Game.timeLeft=0.3;});
  await H.waitForFunction(()=>Game.state==='end',null,{timeout:20000});await G.waitForTimeout(2500);await G.screenshot({path:require('os').tmpdir()+'/tg-on-guest-end.png'});
  console.log('fin: invitado',await G.evaluate(()=>[Game.state,UI.cur]),'anfitrión',await H.evaluate(()=>[Game.state,UI.cur]));
  // revancha del anfitrión: el invitado vuelve al partido
  await H.waitForTimeout(3500);await H.evaluate(()=>{const b=document.querySelector('#rAgain');if(b)b.click();else UI.resultStep(3);});await H.waitForTimeout(300);
  await H.evaluate(()=>{const b=document.querySelector('#rAgain');if(b)b.click();});await G.waitForTimeout(2000);
  console.log('revancha: invitado',await G.evaluate(()=>[Game.state,UI.cur,Game.score]),'anfitrión',await H.evaluate(()=>[Game.state,UI.cur]));
  // el anfitrión se va: el invitado vuelve al menú
  await H.evaluate(()=>UI.toMenu());await G.waitForTimeout(1500);console.log('después de irse el anfitrión, invitado en:',await G.evaluate(()=>[UI.cur,Online.role]));
  console.log('errores',errs.slice(0,5));
  await b.close();
})();
