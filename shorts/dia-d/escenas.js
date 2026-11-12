// Día D (6 de junio de 1944). Fichas: Eisenhower (gorra de oficial, uniforme oliva). Aliados en oliva; alemanes en gris.
const IKE={skin:'#e2b892',hair:'#c9b48a',hairStyle:'bald',tunic:'#6a6a44',sleeves:'#6a6a44',legs:'#6a6a44',belt:'#4a3a2a',boots:'#3a2a1a',h:550,helmet:'officer',hatCol:'#5a5a38'};
const Tm=(id,f)=>T(id)+D(id)*f;
function mar(t,night){ grad(...(night?['#05070f','#0e1626','#162436']:['#8aa0b8','#b8c4cc','#9aa8b0'])); }
function flota(t){ setCam([[T('h1'),540,1150,1.2,0],[E('h1'),540,1050,.95,0]],t); mar(t,true);
  layer(.15); for(let i=0;i<120;i++){ c.fillStyle=`rgba(255,255,255,${.3+rnd(i)*.5})`; c.fillRect(rnd(i*3)*1400-160,rnd(i*7)*900,2,2); }
  layer(.3); c.fillStyle='#0c1824'; c.fillRect(-500,1000,2100,1200); for(let i=0;i<30;i++){ c.save(); c.translate(-300+rnd(i)*1800+t*8,1010+rnd(i*3)*60); c.scale(.12,.12); ship(0,0,1,'warship',t,1); c.restore(); }
  layer(.6); for(let i=0;i<10;i++){ c.save(); c.translate(-300+i*220+t*20,1180+(i%2)*40); c.scale(.4,.4); ship(0,0,1,i%3?'lander':'warship',t,1); c.restore(); }
  for(let i=0;i<6;i++){ const x=mod(-200+i*300+t*160,1600)-300; plane(x,520+i*60,.35,'prop',1,'#2a2e34'); }
  layer(1); c.fillStyle='rgba(30,50,70,.7)'; c.fillRect(-500,1400,2100,900); c.fillStyle='rgba(255,255,255,.12)'; for(let i=0;i<40;i++) c.fillRect(mod(rnd(i)*1800-t*60,1900)-400,1420+rnd(i*3)*500,80,4);
  c.save(); c.translate(560,1520); c.scale(1.1,1.1); ship(0,0,1,'lander',t,1); c.restore(); for(let i=0;i<5;i++) person(SOLDADO.usa44(i),{x:420+i*60,y:1460,s:.42,t,look:1,seed:i,face:{brow:-.6,mouth:'f'}}); }
function muro(t){ setCam([[Tm('c1',.5),540,1150,1.0,0],[E('c1'),560,1100,1.15,0]],t); mar(t,false);
  layer(.3); c.fillStyle='#5a7080'; c.fillRect(-500,1000,2100,300); layer(.6); c.fillStyle='#d8c8a0'; c.fillRect(-500,1250,2100,900);
  for(let i=0;i<12;i++){ const x=-300+i*160, y=1300+(i%3)*80; c.strokeStyle='#3a3530'; c.lineWidth=12; c.beginPath(); c.moveTo(x-40,y+40); c.lineTo(x+40,y-40); c.moveTo(x+40,y+40); c.lineTo(x-40,y-40); c.moveTo(x,y-50); c.lineTo(x,y+50); c.stroke(); }
  layer(1); c.fillStyle='#7a7a72'; c.strokeStyle='#0b0806'; c.lineWidth=6; for(const x of [200,780]){ c.beginPath(); c.moveTo(x-200,1700); c.lineTo(x-160,1480); c.lineTo(x+160,1480); c.lineTo(x+200,1700); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#14110e'; c.fillRect(x-90,1540,180,30); c.fillStyle='#7a7a72';
    person(SOLDADO.aleman44(x),{x,y:1620,s:.45,t,look:-1,seed:x,face:{brow:.4},noShadow:true}); } c.fillStyle='#c8b890'; c.fillRect(-500,1700,2100,400); }
function inflables(t){ setCam([[T('c3'),540,1100,1.0,0],[E('c3'),560,1080,1.15,0]],t); grad('#7aa0d0','#c8d8e8','#e8eef4'); layer(.3); hills(1250,80,'#6a8a4a',2); layer(1); c.fillStyle='#7f9a54'; c.fillRect(-500,1400,2100,900);
  for(let i=0;i<3;i++){ const k=eout(k01(t,T('c3')+.3+i*.4,T('c3')+1.2+i*.4)); c.save(); c.translate(80+i*420,1640); c.scale(1,.15+.85*k); tank(0,0,.9,0,1,'#6a7a4a'); c.restore(); }
  person({...SOLDADO.usa44(2),weapon:null},{x:880,y:1700,s:.9,t,look:-1,seed:3,face:{mouth:'s',brow:.2},armF:[-1.2,-1.6]});
  c.fillStyle='#e8dcc0'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.fillRect(60,1200,300,110); c.strokeRect(60,1200,300,110); c.fillStyle='#5a3a1e'; c.fillRect(200,1310,14,120); c.fillStyle='#14110e'; c.font='900 54px Inter'; c.textAlign='center'; c.fillText('→ CALAIS',210,1275); }
function paracaidas(t){ setCam([[T('d1'),540,900,1.0,0],[E('d1'),540,1000,1.1,0]],t); grad('#04060e','#0c1422','#141c2a');
  layer(.2); for(let i=0;i<120;i++){ c.fillStyle=`rgba(255,255,255,${.3+rnd(i)*.5})`; c.fillRect(rnd(i*3)*1400-160,rnd(i*7)*1500,2,2); } c.fillStyle='#e8eef8'; c.beginPath(); c.arc(820,300,60,0,7); c.fill();
  layer(.5); for(let i=0;i<5;i++) plane(mod(-300+i*350+t*200,1800)-300,300+i*70,.45,'prop',1,'#1a1e24'); layer(.7); hills(1650,60,'#0a1008',5);
  layer(1); for(let i=0;i<9;i++){ const a=t-T('d1')-rnd(i)*1.2; if(a<0) continue; const x=100+rnd(i*3)*880+Math.sin(t*1.5+i)*20, y=200+a*220+rnd(i*7)*200; if(y>1600) continue;
    c.fillStyle='#e8e2d0'; c.strokeStyle='#0b0806'; c.lineWidth=4; c.beginPath(); c.arc(x,y-170,90,Math.PI,0); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x-90,y-170); c.lineTo(x,y-80); c.lineTo(x+90,y-170); c.stroke();
    person(SOLDADO.usa44(i),{x,y,s:.42,t,look:1,seed:i,face:{brow:-.4},noShadow:true,armF:[2.6,2.9],armB:[-2.6,-2.9]}); } }
function playa(t){ setCam([[T('d3'),620,1300,1.25,0],[Tm('d3',.5),560,1260,1.15,-.01],[E('d3'),520,1240,1.1,0]],t); grad('#6a7a88','#9aa6ae','#7a8690');
  layer(.25); c.fillStyle='#5a6050'; c.beginPath(); c.moveTo(-500,1050); c.lineTo(400,960); c.lineTo(1600,980); c.lineTo(1600,1300); c.lineTo(-500,1300); c.fill(); c.fillStyle='#7a7a72'; for(const x of [200,640]){ c.fillRect(x,960,120,60); c.fillStyle='#ffd27a'; if(mod(t*8+x,1)<.5) c.fillRect(x+120,980,20,10); c.fillStyle='#7a7a72'; }
  c.strokeStyle='rgba(255,220,120,.7)'; c.lineWidth=3; for(let i=0;i<14;i++){ const k=mod(t*2+rnd(i),1); const x0=260+(i%2)*440, y0=990, x1=100+rnd(i*5)*900, y1=1500+rnd(i*7)*300; c.beginPath(); c.moveTo(lerp(x0,x1,k),lerp(y0,y1,k)); c.lineTo(lerp(x0,x1,k+.04),lerp(y0,y1,k+.04)); c.stroke(); }
  layer(.6); c.fillStyle='#d8c8a0'; c.fillRect(-500,1300,2100,350); for(let i=0;i<10;i++){ const x=-300+i*190, y=1360+(i%3)*90; c.strokeStyle='#3a3530'; c.lineWidth=10; c.beginPath(); c.moveTo(x-34,y+34); c.lineTo(x+34,y-34); c.moveTo(x+34,y+34); c.lineTo(x-34,y-34); c.stroke(); }
  for(let i=0;i<5;i++) explosion(100+rnd(i*3)*800,1380+rnd(i*5)*200,70,mod(t-T('d3')+i*.7,2.4)-.1);
  layer(1); c.fillStyle='#4a6a7a'; c.fillRect(-500,1650,2100,700); c.fillStyle='rgba(255,255,255,.25)'; for(let i=0;i<30;i++) c.fillRect(mod(rnd(i)*1800+t*30,1900)-400,1670+rnd(i*3)*400,70,4);
  c.save(); c.translate(560,1780); c.scale(1.3,1.3); ship(0,0,1,'lander',t,1); c.restore();
  for(let i=0;i<7;i++){ const run=mod(t*.35+rnd(i),1); const x=200+i*110+run*80, y=lerp(1720,1500,run); person(SOLDADO.usa44(i),{x,y,s:.6,t,walk:t*9+i,look:1,seed:i,face:{brow:-.8,mouth:'o'}}); } }
function cementerio(t){ setCam([[T('r2'),540,1200,1.3,0],[E('r2')+.3,540,1100,1.0,0]],t); grad('#2a3a5a','#c8a080','#e8c8a0'); layer(.3); hills(1200,40,'#4a6a3a',3);
  layer(1); c.fillStyle='#5a7a3a'; c.fillRect(-500,1250,2100,900); for(let r=0;r<7;r++) for(let i=0;i<10+r*2;i++){ const sc=.4+r*.12, x=540+(i-(10+r*2)/2)*90*sc*1.8, y=1290+r*r*14+r*30; c.fillStyle='#f4f1ea'; c.strokeStyle='#0b0806'; c.lineWidth=2.5; c.fillRect(x-6*sc,y-70*sc,12*sc,70*sc); c.fillRect(x-24*sc,y-56*sc,48*sc,12*sc); c.strokeRect(x-6*sc,y-70*sc,12*sc,70*sc); } }
const NORM=[[-2.4,49.72],[-1.95,49.72],[-1.6,49.65],[-1.27,49.7],[-1.25,49.55],[-1.22,49.42],[-1.1,49.36],[-0.9,49.39],[-0.6,49.35],[-0.3,49.29],[0.1,49.29],[0.23,49.42],[0.1,49.49],[0.2,49.7],[0.37,49.76],[1.08,49.93],[1.6,50.2],[1.6,46.5],[-2.4,46.5]];
setMap(-0.7,49.35,700);
MOTOR.run(()=>({
  hot:/^(1944|150\.000|mancha|hitler|muro|atlántico|overlord|falso|inflables|calais|paracaidistas|7\.000|utah|omaha|gold|juno|sword|francia|4\.000|nazi|rinde|europa)$/i,
  hits:[T('h1')+.1,T('d3'),Tm('d3',.4)],
  flashes:[[T('d3'),.4,.1]],
  titles:[[T('c2'),Tm('c2',.9),'OPERACIÓN<br>OVERLORD','150px'],[E('f2')-.3,TL.total,'6 · 6 · 1944<small>EL DÍA MÁS LARGO</small>']],
  dates:[[T('h1'),Tm('h1',.45),'6 JUNIO 1944'],[T('f1'),T('f2'),'8 MAYO 1945']],
  counts:[[Tm('h1',.5),T('c1'),()=>['+150.000','SOLDADOS ALIADOS'],420],[Tm('d2',.3),T('d3'),()=>['≈7.000','BARCOS'],170],[Tm('r2',.35),T('f1'),()=>['+4.000','ALIADOS MUERTOS ESE DÍA'],300]],
  names:[[Tm('c2',.2),T('c3'),'DWIGHT D. EISENHOWER','COMANDANTE SUPREMO ALIADO']],
  scenes:[
   [0,flota,'rgba(40,60,140,.1)'],
   [T('c1'),t=>{ setMap(8,50,38); mapCam([[T('c1'),8,49,.85],[Tm('c1',.5),2,49.5,1.2]],t); const occ={}; ['Germany','France','Netherlands','Belgium','Poland','Denmark','Norway','Czechia','Austria','Luxembourg','Italy'].forEach(n=>occ[n]=['#7a7a7a',T('c1')]);
      mapDraw({colors:occ},t); layer(1); mapLabel('EUROPA OCUPADA',8,50.5,'#7a7a7a',T('c1')+.2,t,{size:52}); mapLabel('REINO UNIDO',-2,53,'#3a5aa8',T('c1')+.4,t,{size:44}); setMap(-0.7,49.35,700); },'rgba(255,220,160,.04)'],
   [Tm('c1',.5),muro,'rgba(200,210,220,.06)'],
   [T('c2'),talk({bg:'sala',keys:[[T('c2'),540,1000,1.0,0],[E('c2'),520,960,1.3,0]],chars:[{P:IKE,x:440,look:1,s:1.1,face:()=>({brow:.3,mouth:'s'}),armF:[1.3,1.5]}],wallMap:t=>{ c.fillStyle='#cfae74'; c.fillRect(200,400,680,380); c.fillStyle='#4a7aa0'; c.fillRect(200,400,680,140); c.strokeStyle='#b82127'; c.lineWidth=10; c.beginPath(); c.moveTo(400,450); c.lineTo(460,600); c.stroke(); }}),'rgba(255,200,140,.05)'],
   [T('c3'),inflables,'rgba(255,220,160,.04)'],
   [T('d1'),paracaidas,'rgba(40,60,140,.15)'],
   [T('d2'),t=>{ mapCam([[T('d2'),-0.5,49.7,.7],[E('d2'),-0.75,49.5,1.0]],t); mapDraw({countries:[],polys:[{pts:NORM,color:'#d8c8a0',stroke:'#4a321a'},{pts:[[-2.2,51.5],[1.6,51.5],[1.6,50.75],[1.2,50.75],[-0.5,50.8],[-2.2,50.6]],color:'#cfae74',stroke:'#4a321a'}]},t); layer(1); mapLabel('FRANCIA',0.7,49.15,'#d8c8a0',T('d2'),t,{dot:false,size:56}); mapLabel('CANAL DE LA MANCHA',-0.6,50.1,'#9ad0ff',T('d2'),t,{dot:false,size:40,textCol:'#bfe0ff'});
      const B=[['UTAH',-1.2,49.42],['OMAHA',-0.88,49.37],['GOLD',-0.58,49.34],['JUNO',-0.4,49.33],['SWORD',-0.28,49.3]];
      B.forEach((b,i)=>{ const t0=T('d2')+D('d2')*(.45+i*.1); mapArrow([[b[1],49.75],[b[1],b[2]+.02]],eio(k01(t,t0-.4,t0)),i<2?'#ffcf3a':'#9ad0ff',false,10); mapLabel(b[0],b[1],b[2],i<2?'#ffcf3a':'#9ad0ff',t0,t,{size:34,dy:46}); });
      for(let i=0;i<14;i++){ const [x,y]=PX(-1.3+i*.09,49.7+rnd(i)*.06); c.save(); c.translate(x,y); c.scale(.06/CAM.z,.06/CAM.z); ship(0,0,1,'warship',t,1); c.restore(); } },'rgba(255,220,160,.04)'],
   [T('d3'),playa,'rgba(160,170,180,.1)'],
   [T('r1'),t=>{ setCam([[T('r1'),540,1150,1.0,0],[E('r1'),560,1100,1.1,0]],t); grad('#2a2a4a','#c87a4a','#e8a060'); layer(.3); hills(1150,90,'#4a5a3a',3); layer(1); c.fillStyle='#c8b890'; c.fillRect(-500,1450,2100,900);
      flag(700,1050,140,90,'usa',t); flag(300,1080,130,85,'gb',t); for(let i=0;i<7;i++) person(SOLDADO.usa44(i),{x:80+i*140,y:1520+(i%2)*20,s:.8,t,walk:t*6+i,look:1,seed:i,face:{brow:-.2,mouth:'n'}}); },'rgba(255,140,80,.06)'],
   [T('r2'),cementerio,'rgba(255,160,100,.06)'],
   [T('f1'),t=>{ setMap(8,50,38); mapCam([[T('f1'),3,50,1.0],[E('f1'),8,51,.85]],t); mapDraw({colors:{Germany:['#7a7a7a',null]}},t); layer(1);
      mapArrow([[-0.7,49.35],[2.35,48.86],[6,50],[10,51.5],[13.4,52.52]],eio(k01(t,T('f1'),E('f1'))),'#ffcf3a',false,16); mapArrow([[37,55.7],[30,53.9],[21,52.2],[13.4,52.52]],eio(k01(t,T('f1')+.3,E('f1'))),'#e04848',false,16); mapLabel('BERLÍN',13.4,52.52,'#fff',T('f1')+.5,t,{size:46}); setMap(-0.7,49.35,700); },'rgba(255,220,160,.04)'],
   [T('f2'),cementerio,'rgba(255,160,100,.08)'],
  ]}));
