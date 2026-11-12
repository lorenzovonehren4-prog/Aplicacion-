// Crisis de los misiles (octubre de 1962). Fichas: Kennedy (traje azul, corbata granate), Jrushchov (calvo, traje gris), Castro (uniforme verde olivo, barba, gorra), Arjípov (oficial naval, negro).
const KENNEDY={skin:'#e8c0a0',hair:'#6b4a2e',hairStyle:'short',tunic:'#1d2a4a',sleeves:'#1d2a4a',legs:'#1d2a4a',boots:'#14110e',tie:'#7a1f2a',h:560};
const JRUSHCHOV={skin:'#e8c0a0',hair:'#c8beb4',hairStyle:'bald',tunic:'#5a5a60',sleeves:'#5a5a60',legs:'#5a5a60',boots:'#14110e',tie:'#2a2a2a',h:520};
const CASTRO={skin:'#d8a87e',hair:'#14100c',hairStyle:'short',beard:'#2a1e14',tunic:'#5a6040',sleeves:'#5a6040',legs:'#5a6040',belt:'#2a221a',boots:'#14110e',h:575,helmet:'cap',hatCol:'#4a5034'};
const ARJIPOV={skin:'#e2b892',hair:'#4a3020',hairStyle:'short',tunic:'#1a1e2a',sleeves:'#1a1e2a',legs:'#1a1e2a',boots:'#14110e',h:545,helmet:'officer',hatCol:'#1a1e2a'};
const OFICIAL=i=>({...ARJIPOV,hair:['#2a1a10','#6b4a2e'][i%2],h:520});
const Tm=(id,f)=>T(id)+D(id)*f;
const CIUD={washington:[-77.04,38.9],nuevayork:[-74,40.7],miami:[-80.2,25.8],habana:[-82.38,23.13],moscu:[37.6,55.75]};
function caribe(keys,extra){ return t=>{ setMap(-82,28,70); mapCam(keys,t); mapDraw({colors:{'United States of America':['#4a6aa8',null],Cuba:['#c8102e',null]}},t); layer(1); extra(t); }; }
function rings(t,t0){ const [x,y]=PX(...CIUD.habana); for(const [r,col,dt] of [[1800,'rgba(255,80,60,.18)',0],[3500,'rgba(255,160,60,.1)',.6]]){ const k=eout(k01(t,t0+dt,t0+dt+1.2)); if(k<=0) continue; const R=r/111*MAPA.K*k; c.fillStyle=col; c.beginPath(); c.arc(x,y,R,0,7); c.fill(); c.strokeStyle='rgba(255,90,60,.8)'; c.lineWidth=5/CAM.z; c.stroke(); } }
function u2(t){ setCam([[T('d2'),540,960,1.0,0],[E('d2'),540,960,1.1,0]],t); grad('#1a3a6a','#5a8ac0','#a8c8e8');
  layer(.3); c.fillStyle='#2f6f9f'; c.fillRect(-500,1350,2100,900); c.fillStyle='#4f8a4a'; c.beginPath(); c.ellipse(560,1500,700,140,0,0,7); c.fill();
  layer(1); const k=k01(t,T('d2'),E('d2')); plane(lerp(-200,1300,k),620,.6,'jet',1,'#2a2e34'); c.fillStyle='rgba(255,255,255,.6)'; c.fillRect(lerp(-200,1300,k)-900,612,800,6);
  const ph=k01(t,Tm('d2',.6),Tm('d2',.7)); if(t>Tm('d2',.6)){ screen(); c.fillStyle=`rgba(255,255,255,${(1-ph)*.8})`; c.fillRect(0,0,W,H); c.save(); c.translate(540,1000); c.rotate(-.04); c.fillStyle='#f4f1ea'; c.fillRect(-380,-300,760,600); c.fillStyle='#6a7060'; c.fillRect(-350,-270,700,500); c.strokeStyle='#d8dcc8'; c.lineWidth=4;
    for(let i=0;i<4;i++){ c.strokeRect(-280+i*150,-120,90,26); c.beginPath(); c.moveTo(-280+i*150,-80); c.lineTo(-190+i*150,-60); c.stroke(); } c.fillStyle='#14110e'; c.font='900 30px Inter'; c.textAlign='left'; c.fillText('SAN CRISTÓBAL · 14-10-1962',-340,265); c.strokeStyle='#ff3b30'; c.lineWidth=8; c.beginPath(); c.arc(-50,-100,230,0,7); c.stroke(); c.restore(); } }
function submarino(t){ setCam([[T('r1'),540,1100,1.0,0],[E('r1'),560,1140,1.2,0]],t); grad('#2a5a7a','#0c2236','#050c16');
  layer(.3); for(let i=0;i<5;i++){ c.save(); c.translate(-200+i*350,300); c.scale(.3,.3); ship(0,0,1,'warship',t,-1); c.restore(); }
  layer(1); c.save(); c.translate(540,1250); c.fillStyle='#2a2e34'; c.strokeStyle='#0b0806'; c.lineWidth=6; c.beginPath(); c.ellipse(0,0,420,80,0,0,7); c.fill(); c.stroke(); c.beginPath(); c.roundRect(-60,-150,140,90,20); c.fill(); c.stroke(); c.fillStyle='#e8c25a'; for(let i=0;i<6;i++){ c.beginPath(); c.arc(-250+i*90,0,10,0,7); c.fill(); } c.restore();
  for(let i=0;i<6;i++){ const a=t-T('r1')-i*.6; if(a<0) continue; const x=200+rnd(i)*700, y=500+a*400; if(y<1100) { c.fillStyle='#3a3e44'; c.beginPath(); c.roundRect(x-16,y-26,32,52,8); c.fill(); } else explosion(x,1100,90,(y-1100)/400); }
  for(let i=0;i<40;i++){ const k=mod(t*.3+rnd(i),1); c.fillStyle=`rgba(200,230,255,${.4*(1-k)})`; c.beginPath(); c.arc(300+rnd(i*3)*500,1250-k*900,4+rnd(i)*6,0,7); c.fill(); } }
function interior(t){ setCam([[T('r2'),540,1000,1.0,0],[E('r2'),520,980,1.35,0]],t); grad('#2a0606','#3a0a0a','#140404');
  layer(.4); c.strokeStyle='#5a1a1a'; c.lineWidth=14; for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(-200,300+i*200); c.lineTo(1300,300+i*200); c.stroke(); } for(let i=0;i<8;i++){ c.fillStyle='#4a1a1a'; c.beginPath(); c.arc(100+i*130,700,40,0,7); c.fill(); c.strokeStyle='#0b0806'; c.lineWidth=4; c.stroke(); }
  glow(540,400,800,'rgba(255,40,30,A)',.35); layer(.8); c.fillStyle='#1a0606'; c.fillRect(-500,1500,2100,900);
  layer(1); person(OFICIAL(0),{x:200,y:1560,s:.95,t,look:1,seed:3,face:{brow:.8,mouth:'o'},talk:t<Tm('r2',.4),armF:[1.6,2.0]}); person(OFICIAL(1),{x:850,y:1560,s:.95,t,look:-1,seed:5,face:{brow:.6,mouth:'f'}});
  const shake=Math.sin(t*8)*.25*k01(t,Tm('r2',.35),Tm('r2',.5)); person(ARJIPOV,{x:540,y:1580,s:1.1,t,look:1,seed:7,face:{brow:-.2,mouth:'f'},armF:[.4+shake,.6]}); c.save(); c.translate(540+Math.sin(t*9)*12*k01(t,Tm('r2',.35),Tm('r2',.6)),0); c.restore(); }
MOTOR.run(()=>({
  hot:/^(13|trece|1962|nuclear|guerra|fría|castro|cuba|150|cochinos|jrushchov|secreto|14|u-2|kennedy|bloqueo|27|torpedo|arjípov|turquía|línea|directa|existiendo)$/i,
  hits:[Tm('h1',.6),T('r1')+.6,Tm('r1',.5)],
  flashes:[[Tm('d2',.6),.9,.2]],
  titles:[[0,Tm('h1',.55),'1 HOMBRE<small>EVITÓ LA GUERRA NUCLEAR</small>'],[Tm('h1',.55),T('c1'),'13 DÍAS<small>OCTUBRE DE 1962</small>'],[E('f2')-.3,TL.total,'13 DÍAS<small>EL MUNDO AL BORDE</small>']],
  dates:[[T('c2'),T('c3'),'1959'],[T('c3'),T('d1'),'1961'],[T('d2'),Tm('d2',.6),'14 OCT. 1962'],[T('d3'),T('r1'),'22 OCT. 1962'],[T('r1'),Tm('r1',.5),'27 OCT. 1962'],[T('r3'),Tm('r3',.3),'28 OCT. 1962']],
  names:[[Tm('c2',.3),T('c3'),'FIDEL CASTRO','LÍDER DE CUBA'],[T('d1')+.2,T('d2'),'NIKITA JRUSHCHOV','LÍDER SOVIÉTICO'],[T('d3')+.2,Tm('d3',.6),'JOHN F. KENNEDY','PRESIDENTE DE EE. UU.'],[T('r2')+.2,E('r2'),'VASILI ARJÍPOV','OFICIAL DEL SUBMARINO B-59']],
  scenes:[
   [0,caribe([[0,-80,30,.9],[E('h1'),-80,31,.72]],t=>{ rings(t,T('h1')+.4); mapLabel('Washington',...CIUD.washington,'#fff',T('h1')+1.2,t,{size:38}); mapLabel('Nueva York',...CIUD.nuevayork,'#fff',T('h1')+1.5,t,{size:38}); mapLabel('CUBA',-79,21.5,'#c8102e',T('h1'),t,{size:50,dot:false}); }),'rgba(255,90,60,.04)'],
   [T('c1'),t=>{ setMap(20,45,12); mapCam([[T('c1'),-20,40,.85],[E('c1'),0,45,.75]],t); const ussr={}; ['Russia','Ukraine','Belarus','Kazakhstan','Uzbekistan','Turkmenistan','Kyrgyzstan','Tajikistan','Georgia','Armenia','Azerbaijan','Lithuania','Latvia','Estonia','Moldova'].forEach(n=>ussr[n]=['#c8102e',T('c1')+.3]);
      mapDraw({colors:{...ussr,'United States of America':['#3a5aa8',T('c1')]}},t); layer(1); mapLabel('EE. UU.',-100,40,'#3a5aa8',T('c1')+.2,t,{size:56,dot:false}); mapLabel('URSS',70,60,'#c8102e',T('c1')+.5,t,{size:60,dot:false}); },'rgba(255,220,160,.04)'],
   [T('c2'),talk({bg:'atardecer',keys:[[T('c2'),540,1000,1.0,0],[E('c2'),520,960,1.3,0]],chars:[{P:CASTRO,x:470,look:1,s:1.1,talkIn:['c2'],face:()=>({brow:.5})}],extra:t=>{ flag(700,700,200,130,'cuba',t); for(let i=0;i<3;i++){ c.strokeStyle='#3a2a1a'; c.lineWidth=16; const x=-100+i*500; c.beginPath(); c.moveTo(x,1500); c.quadraticCurveTo(x+40,1100,x+20,900); c.stroke(); c.fillStyle='#2a5a2a'; for(let j=0;j<6;j++){ c.save(); c.translate(x+20,900); c.rotate(j*1.05); c.beginPath(); c.ellipse(90,0,110,24,0,0,7); c.fill(); c.restore(); } } }}),'rgba(255,150,80,.06)'],
   [T('c3'),caribe([[T('c3'),-80.5,23,1.6],[E('c3'),-81.1,22.4,2.6]],t=>{ mapLabel('BAHÍA DE COCHINOS',-81.15,22.1,'#ffcf3a',T('c3')+.3,t,{size:38}); mapPulse(-81.15,22.1,T('c3')+.4,t); for(let i=0;i<4;i++){ const [x,y]=PX(-81.6+i*.25,21.6); c.save(); c.translate(x,y); c.scale(.08/CAM.z,.08/CAM.z); ship(0,0,1,'lander',t,1); c.restore(); } }),'rgba(255,220,160,.04)'],
   [T('d1'),talk({bg:'oficina',flags:['urss'],keys:[[T('d1'),540,1000,1.0,0],[E('d1'),540,980,1.25,.02]],chars:[{P:JRUSHCHOV,x:540,look:1,s:1.15,face:()=>({brow:.5,mouth:'s'}),paper:true,armF:[1.4,1.6]}]}),'rgba(255,200,140,.05)'],
   [T('d2'),u2,''],
   [T('d3'),caribe([[T('d3'),-78,24,.95],[E('d3'),-76,23.5,1.05]],t=>{ const [x,y]=PX(...CIUD.habana); const k=eout(k01(t,T('d3')+.2,T('d3')+1.2)); c.save(); c.setLineDash([22/CAM.z,14/CAM.z]); c.strokeStyle='#4a6aa8'; c.lineWidth=8/CAM.z; c.beginPath(); c.arc(x+60,y+40,900/111*MAPA.K*k,0,7); c.stroke(); c.restore();
      for(let i=0;i<10;i++){ const a=i/10*6.283, R=900/111*MAPA.K*k; c.save(); c.translate(x+60+Math.cos(a)*R,y+40+Math.sin(a)*R); c.scale(.06/CAM.z,.06/CAM.z); ship(0,0,1,'warship',t,1); c.restore(); }
      for(let i=0;i<3;i++){ const q=k01(t,T('d3')+.5,E('d3')); const [sx,sy]=PX(-60+i*.6-q*12,25-i*.8); c.save(); c.translate(sx,sy); c.scale(.07/CAM.z,.07/CAM.z); ship(0,0,1,'warship',t,-1); c.restore(); mapLabel('URSS',-60+i*.6-q*12,25-i*.8,'#c8102e',T('d3')+.6,t,{size:28,dot:false,dy:-40}); }
      mapLabel('BLOQUEO',-79,27.2,'#4a6aa8',T('d3')+.8,t,{size:44,dot:false}); }),'rgba(255,220,160,.04)'],
   [T('r1'),submarino,'rgba(40,80,140,.1)'],
   [T('r2'),interior,'rgba(255,40,30,.08)'],
   [T('r3'),talk({bg:'oficina',flags:['usa','urss'],keys:[[T('r3'),540,1000,1.0,0],[E('r3'),540,1000,1.08,0]],chars:[{P:KENNEDY,x:300,look:1,s:1.05,face:t=>({brow:.2,mouth:'s'}),paper:true,armF:[1.3,1.5]},{P:JRUSHCHOV,x:780,look:-1,s:1.0,face:()=>({brow:.2,mouth:'s'}),paper:true,armF:[-1.3,-1.5]}],front:t=>{ c.strokeStyle='#ffcf3a'; c.lineWidth=10; c.setLineDash([24,16]); c.beginPath(); c.moveTo(540,500); c.lineTo(540,1700); c.stroke(); c.setLineDash([]); }}),'rgba(255,200,140,.05)'],
   [T('f1'),t=>{ setMap(-20,48,14); mapCam([[T('f1'),-20,48,.9],[E('f1'),-20,48,.8]],t); mapDraw({colors:{'United States of America':['#3a5aa8',null],Russia:['#c8102e',null]}},t); layer(1);
      mapArrow([CIUD.washington,[-40,55],[0,58],CIUD.moscu],eio(k01(t,T('f1')+.2,E('f1'))),'#ffcf3a',true,10); mapLabel('Washington',...CIUD.washington,'#fff',T('f1'),t,{size:40}); mapLabel('Moscú',...CIUD.moscu,'#fff',T('f1')+.3,t,{size:40}); mapLabel('LÍNEA DIRECTA · 1963',-20,62,'#ffcf3a',T('f1')+.8,t,{size:44,dot:false}); },'rgba(255,220,160,.04)'],
   [T('f2'),caribe([[T('f2'),-80,26,1.2],[TL.total,-80,30,.6]],t=>{ mapLabel('CUBA',-79,21.5,'#c8102e',T('f2'),t,{size:50,dot:false}); }),'rgba(255,220,160,.04)'],
  ]}));
