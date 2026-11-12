// ¿Por qué EE. UU. no quiere que Irán enriquezca uranio? Explicador: medidor de enriquecimiento, centrifugadoras, mapa de instalaciones.
const Tm=(id,f)=>T(id)+D(id)*f;
const DIPLO=i=>({...SOLDADO.civil(i),tunic:['#2a2e3a','#3a3a44','#1d2a4a','#4a3a2a'][i%4],sleeves:['#2a2e3a','#3a3a44','#1d2a4a','#4a3a2a'][i%4],legs:'#2a2e3a',tie:['#7a1f2a','#2a5a8a','#5a6a3a'][i%3]});
const TECNICO=i=>({...SOLDADO.civil(i),tunic:'#e8eef2',sleeves:'#e8eef2',legs:'#5a6a7a',helmet:'cap',hatCol:'#f4f1ea'});
function roca(t,glowA){ const x=540,y=900; glow(x,y,500,'rgba(120,255,140,A)',glowA); c.fillStyle='#5a5e5a'; c.strokeStyle='#0b0806'; c.lineWidth=8; c.beginPath(); for(let i=0;i<14;i++){ const a=i/14*6.283, r=230*(.8+.25*rnd(i*3)); c[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r*.8); } c.closePath(); c.fill(); c.stroke();
  for(let i=0;i<10;i++){ c.fillStyle=`rgba(140,255,150,${.4+.4*Math.sin(t*3+i)})`; c.beginPath(); c.arc(x-150+rnd(i)*300,y-100+rnd(i*3)*200,8+rnd(i*5)*10,0,7); c.fill(); } }
function medidor(t,lvl,o={}){ const x=300, y0=1500, h=1100, w=170; c.fillStyle='#1a1e24'; c.strokeStyle='#e8eef2'; c.lineWidth=8; c.beginPath(); c.roundRect(x-w/2,y0-h,w,h,30); c.fill(); c.stroke();
  const fh=h*lvl/100; const g=c.createLinearGradient(0,y0,0,y0-h); g.addColorStop(0,'#3ad06a'); g.addColorStop(.5,'#e8c03a'); g.addColorStop(1,'#e83a3a'); c.save(); c.beginPath(); c.roundRect(x-w/2+10,y0-h+10,w-20,h-20,22); c.clip(); c.fillStyle=g; c.fillRect(x-w/2,y0-fh,w,fh); c.restore();
  c.font='900 40px Inter'; c.textAlign='left'; c.lineWidth=10; c.strokeStyle='#0b0806';
  const mark=(p,txt,col,on=true)=>{ if(!on) return; const yy=y0-h*p/100; c.strokeStyle=col; c.lineWidth=6; c.beginPath(); c.moveTo(x-w/2-30,yy); c.lineTo(x+w/2+30,yy); c.stroke(); c.lineWidth=10; c.strokeStyle='#0b0806'; c.strokeText(txt,x+w/2+46,yy+15); c.fillStyle=col; c.fillText(txt,x+w/2+46,yy+15); };
  mark(.7,'0,7 % natural','#9ad0ff',o.nat); mark(4,'3–5 % · central eléctrica','#3ad06a',o.cen); mark(3.67,'',o.capCol||'#ffcf3a',o.cap); mark(20,'20 %','#e8c03a',o.m20); mark(60,'60 %','#ff8a3a',o.m60); mark(90,'90 % · arma','#ff3b30',o.m90);
  c.textAlign='center'; c.font='900 120px Inter'; c.lineWidth=18; c.strokeStyle='#0b0806'; const txt=(lvl<10?lvl.toFixed(lvl<1?1:2).replace('.',','):Math.round(lvl))+' %'; c.strokeText(txt,540,1680); c.fillStyle='#fff'; c.fillText(txt,540,1680); }
function sala(t,keys){ setCam(keys,t); grad('#1c2a3c','#26384c','#141e2a'); layer(.5); c.fillStyle='#2a3a4e'; c.fillRect(-500,300,2100,1300); glow(300,900,700,'rgba(120,200,255,A)',.25); glow(800,500,500,'rgba(255,220,160,A)',.12); }
function centrifugas(t){ setCam([[T('c2'),540,1000,1.25,0],[E('c2'),540,980,.95,0]],t); grad('#1a2836','#22323e','#141c26');
  layer(.4); for(let r=0;r<3;r++) for(let i=0;i<12;i++){ const x=-300+i*150+(r%2)*75, base=1000+r*180, s=.6+r*.2; c.fillStyle='#8a96a4'; c.strokeStyle='#0b0806'; c.lineWidth=4; c.beginPath(); c.roundRect(x-22*s,base-300*s,44*s,300*s,12*s); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.35)'; for(let k=0;k<4;k++){ const yy=base-300*s+mod(t*600+k*75*s+i*30,300*s); c.fillRect(x-20*s,yy,40*s,6*s); } }
  layer(1); c.fillStyle='#22303c'; c.fillRect(-500,1500,2100,900); for(let i=0;i<3;i++) person(TECNICO(i),{x:200+i*330,y:1580,s:.9,t,look:i%2?-1:1,seed:i,face:{brow:.2},paper:i==1}); }
function mapaIran(keys,ev){ return t=>{ setMap(53,32.5,85); mapCam(keys,t); mapDraw({colors:{Iran:['#3a8a5a',null],Israel:['#4a7ac8',null]}},t); layer(1); ev(t); }; }
const SITIOS=[['NATANZ',51.73,33.72],['FORDO',50.99,34.88],['ISFAHÁN',51.67,32.65]];
function tuneles(t){ setCam([[T('r3'),540,1100,1.0,0],[E('r3'),540,1180,1.2,0]],t); grad('#3a4a6a','#9aa0a8','#c8b898'); layer(.3); c.fillStyle='#8a7a5a'; c.beginPath(); c.moveTo(-500,900); c.lineTo(300,500); c.lineTo(800,620); c.lineTo(1600,900); c.lineTo(1600,2400); c.lineTo(-500,2400); c.fill();
  layer(1); c.fillStyle='#5a4a32'; c.fillRect(-500,1000,2100,1400); c.fillStyle='#2a2218'; c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillRect(-100,1250,1300,140); c.fillRect(300,1390,140,300); c.fillRect(300,1690,700,130); c.strokeRect(-100,1250,1300,140);
  for(let i=0;i<6;i++){ const x=100+i*150; c.fillStyle='#c8c0a0'; c.beginPath(); c.roundRect(x-30,1300,60,80,10); c.fill(); c.stroke(); c.fillStyle='#14110e'; c.font='900 30px Inter'; c.textAlign='center'; c.fillText('?',x,1355); }
  for(let i=0;i<4;i++){ c.fillStyle='#c8c0a0'; c.beginPath(); c.roundRect(380+i*150,1730,60,80,10); c.fill(); c.stroke(); }
  person({...DIPLO(1),tunic:'#2a5a8a',sleeves:'#2a5a8a',helmet:'cap',hatCol:'#2a5a8a'},{x:880,y:1000,s:.75,t,look:-1,seed:4,face:{brow:-.6,mouth:'f'},paper:true});
  const k=eout(k01(t,Tm('r3',.55),Tm('r3',.7))); if(k>0){ c.save(); c.translate(700,880); c.scale(k,k); c.strokeStyle='#ff3b30'; c.lineWidth=26; c.lineCap='round'; c.beginPath(); c.moveTo(-70,-70); c.lineTo(70,70); c.moveTo(70,-70); c.lineTo(-70,70); c.stroke(); c.restore(); } }
MOTOR.run(()=>({
  hot:/^(roca|ciudad|destruirla|uranio|235|centrifugadoras|3|5|central|90|bomba|2015|3,67|2018|60|corto|pacífico|natanz|fordo|isfahán|2026|200|comprobarlo|derecho|número)$/i,
  hits:[Tm('h1',.55),T('r2')+.8,Tm('r2',.55)],
  flashes:[[Tm('h1',.55),.8,.2]],
  titles:[[0,Tm('h1',.5),'60 % → 90 %<small>EL NÚMERO QUE LO CAMBIA TODO</small>'],[T('c1')-.4,T('c1')+.6,'URANIO<small>¿POR QUÉ IMPORTA TANTO?</small>'],[E('f2')-.3,TL.total,'¿60… O 90?<small>EL NÚMERO QUE DECIDE</small>']],
  dates:[[T('d1'),T('d2'),'2015'],[T('d2'),T('d3'),'2018'],[T('r2'),Tm('r2',.55),'JUNIO 2025'],[Tm('r2',.55),T('r3'),'FEB. 2026']],
  counts:[[T('c1')+.6,T('c2'),()=>['0,7 %','URANIO 235 EN EL URANIO NATURAL'],220],[Tm('r3',.2),T('f1'),()=>['+200 kg al 60 %','ESTIMACIÓN DEL OIEA · NO VERIFICADO'],180]],
  scenes:[
   [0,t=>{ setCam([[0,540,900,1.6,0],[Tm('h1',.5),540,900,1.1,0]],t); grad('#0c1420','#16222e','#0a1018'); layer(1); roca(t,.25+.25*Math.sin(t*2));
      if(t>Tm('h1',.55)){ screen(); const k=k01(t,Tm('h1',.55),E('h1')); c.save(); c.beginPath(); c.rect(0,0,W/2,H); c.clip(); c.fillStyle='#0a0e1a'; c.fillRect(0,0,W/2,H); for(let i=0;i<6;i++){ const x=i*90, h=300+rnd(i)*400; c.fillStyle='#1a2030'; c.fillRect(x,1300-h,80,h); c.fillStyle='rgba(255,220,140,.8)'; for(let r=0;r<h/40;r++) if(rnd(i*7+r)>.4) c.fillRect(x+12,1300-h+12+r*40,20,18); } c.restore();
        c.save(); c.beginPath(); c.rect(W/2,0,W/2,H); c.clip(); c.fillStyle='#2a0a06'; c.fillRect(W/2,0,W/2,H); glow(810,1000,500*k+100,'rgba(255,220,150,A)',1); shockRing(810,1000,600*k,1-k,40); c.restore(); c.fillStyle='#fff'; c.fillRect(W/2-4,0,8,H); } },''],
   [T('c1'),t=>{ setCam([[T('c1'),540,960,1.0,0]],t); grad('#18263a','#20304a'); layer(1); for(let r=0;r<20;r++) for(let q=0;q<14;q++){ const i=r*14+q, hot=(i===137||i===58); c.fillStyle=hot?'#3ad06a':'#5a6470'; c.beginPath(); c.arc(150+q*60,500+r*50,hot?18:12,0,7); c.fill(); if(hot) glow(150+q*60,500+r*50,60,'rgba(80,255,120,A)',.6); } },''],
   [T('c2'),centrifugas,'rgba(120,200,255,.05)'],
   [T('c3'),t=>{ sala(t,[[T('c3'),540,1000,1.0,0]]); layer(1); medidor(t,lerp(.7,4,eio(k01(t,T('c3'),Tm('c3',.6)))),{nat:true,cen:true}); },''],
   [T('c4'),t=>{ sala(t,[[T('c4'),540,1000,1.0,0]]); layer(1); medidor(t,lerp(4,90,eio(k01(t,T('c4'),Tm('c4',.7)))),{nat:true,cen:true,m90:true}); },'rgba(255,60,40,.05)'],
   [T('d1'),talk({bg:'oficina',flags:['iran','usa'],keys:[[T('d1'),540,1120,1.15,0],[E('d1'),540,1100,1.25,0]],chars:[{P:DIPLO(0),x:280,look:1,s:1.0,paper:true,face:()=>({mouth:'s'})},{P:DIPLO(1),x:540,look:1,s:1.0,face:()=>({mouth:'s'})},{P:DIPLO(2),x:800,look:-1,s:1.0,paper:true,face:()=>({mouth:'s'})}]}),'rgba(255,220,160,.05)'],
   [T('d2'),t=>{ sala(t,[[T('d2'),540,1000,1.0,0]]); layer(1); medidor(t,lerp(3.67,20,eio(k01(t,Tm('d2',.4),E('d2')))),{cen:true,cap:true,capCol:'#ff3b30',m20:true}); screen(); const k=k01(t,T('d2'),Tm('d2',.4)); c.globalAlpha=1-k; flag(60,200,200,130,'usa',t,false); c.globalAlpha=1; },''],
   [T('d3'),t=>{ sala(t,[[T('d3'),540,1000,1.0,0]],t); layer(1); medidor(t,lerp(20,60,eio(k01(t,T('d3'),Tm('d3',.4)))),{m20:true,m60:true,m90:true});
      if(t>Tm('d3',.55)){ const k=eout(k01(t,Tm('d3',.55),Tm('d3',.8))); c.strokeStyle='#ffcf3a'; c.lineWidth=12; c.beginPath(); c.moveTo(160,1500-1100*.6); c.lineTo(160,1500-1100*(.6+.3*k)); c.stroke(); c.fillStyle='#ffcf3a'; c.beginPath(); c.moveTo(130,1500-1100*(.6+.3*k)+30); c.lineTo(160,1500-1100*(.6+.3*k)-10); c.lineTo(190,1500-1100*(.6+.3*k)+30); c.fill(); } },'rgba(255,120,60,.05)'],
   [T('r1'),t=>{ setCam([[T('r1'),540,1000,1.0,0],[E('r1'),540,980,1.1,0]],t); grad('#1a1420','#2a2030','#141018'); layer(1); flag(90,620,330,220,'iran',t); flag(650,560,330,220,'usa',t); flag(650,900,330,220,'israel',t); c.fillStyle='#fff'; c.font='900 120px Inter'; c.textAlign='center'; c.lineWidth=16; c.strokeStyle='#0b0806'; c.strokeText('VS',540,1000); c.fillText('VS',540,1000); },''],
   [T('r2'),mapaIran([[T('r2'),53,32.5,.9],[Tm('r2',.5),51.5,33.8,2.2],[E('r2'),52,33,1.4]],t=>{ SITIOS.forEach((s,i)=>{ mapLabel(s[0],s[1],s[2],'#ffcf3a',T('r2')+.2+i*.2,t,{size:36}); mapPulse(s[1],s[2],T('r2')+.8+i*.3,t); });
      const k=k01(t,T('r2'),Tm('r2',.5)); const [x,y]=PX(lerp(45,51.5,k),lerp(37,34.6,k)); c.save(); c.translate(x,y); c.scale(.25/CAM.z,.25/CAM.z); plane(0,0,1,'b2',1,'#2a2e34'); c.restore(); mapLabel('IRÁN',55,31,'#3a8a5a',T('r2'),t,{size:56,dot:false}); }),'rgba(255,220,160,.04)'],
   [T('r3'),tuneles,''],
   [T('f1'),t=>{ setCam([[T('f1'),540,1000,1.0,0]],t); grad('#2a2238','#3a2e48'); layer(1); flag(90,520,330,220,'usa',t); flag(650,520,330,220,'iran',t);
      const card=(x,y,txt,col,t0)=>{ const k=eout(k01(t,t0,t0+.3)); if(k<=0) return; c.save(); c.translate(x,y); c.scale(k,k); c.fillStyle='#14100c'; c.fillRect(-255,-60,510,120); c.strokeStyle=col; c.lineWidth=6; c.strokeRect(-255,-60,510,120); c.fillStyle='#fff'; c.font='900 34px Inter'; c.textAlign='center'; c.fillText(txt,0,16); c.restore(); };
      card(270,980,'0 % DE ENRIQUECIMIENTO','#4a7ac8',T('f1')+.3); card(810,980,'DERECHO A ENRIQUECER','#3a8a5a',Tm('f1',.5)); },''],
   [T('f2'),t=>{ sala(t,[[T('f2'),540,1000,1.15,0],[TL.total,540,1000,1.0,0]],t); layer(1); medidor(t,60+Math.sin(t*3)*2,{m60:true,m90:true}); },'rgba(255,60,40,.06)'],
  ]}));
