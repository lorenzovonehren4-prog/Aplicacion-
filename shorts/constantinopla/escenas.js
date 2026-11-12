// Constantinopla (1453). Fichas: Mehmed II (turbante blanco, caftán rojo), Constantino XI (corona, púrpura), Orbán (ingeniero, delantal).
const MEHMED={skin:'#c99a6e',hair:'#14100c',hairStyle:'short',beard:'#14100c',tunic:'#a81e24',sleeves:'#a81e24',legs:'#e8e0cc',belt:'#e7b73c',cloak:'#e7b73c',trim:'#a81e24',h:560,helmet:'turban',turbanTop:'#a81e24',boots:'#7a1f2a'};
const CONSTANTINO={skin:'#e2b892',hair:'#6e6a64',hairStyle:'short',beard:'#8a8278',beardLong:true,tunic:'#5b1a5a',armor:'#c99a3e',cloak:'#3a0a3a',trim:'#e7c25a',h:560,helmet:'crown',weapon:'sword'};
const ORBAN={skin:'#e2b892',hair:'#5a4a3a',hairStyle:'bald',mustache:'#5a4a3a',tunic:'#7a5534',sleeves:'#d8cba8',legs:'#4a3a2a',belt:'#3a2a1a',h:520};
const Tm=(id,f)=>T(id)+D(id)*f;
function domo(x,y,s,col='#c9a46a'){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=5; c.fillRect(-220,-120,440,120); c.strokeRect(-220,-120,440,120); c.beginPath(); c.arc(0,-120,150,Math.PI,0); c.fill(); c.stroke(); c.beginPath(); c.arc(-160,-120,60,Math.PI,0); c.fill(); c.stroke(); c.beginPath(); c.arc(160,-120,60,Math.PI,0); c.fill(); c.stroke(); c.fillStyle='rgba(0,0,0,.35)'; for(let i=-4;i<=4;i++) c.fillRect(i*30-5,-150,10,22); c.restore(); }
function cannon(x,y,s,recoil=0){ c.save(); c.translate(x-recoil*40,y); c.scale(s,s); c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillStyle='#5a3a1e'; c.fillRect(-260,-30,420,60); c.strokeRect(-260,-30,420,60);
  const g=c.createLinearGradient(0,-120,0,40); g.addColorStop(0,'#c9a46a'); g.addColorStop(.5,'#8a6a3a'); g.addColorStop(1,'#4a3a1e'); c.fillStyle=g; c.beginPath(); c.moveTo(-300,-110); c.lineTo(330,-90); c.lineTo(330,10); c.lineTo(-300,30); c.closePath(); c.fill(); c.stroke();
  for(let i=0;i<5;i++){ c.fillStyle='#6a4a20'; c.fillRect(-260+i*130,-112,26,145); c.strokeRect(-260+i*130,-112,26,145); } c.fillStyle='#14110e'; c.beginPath(); c.ellipse(332,-40,18,46,0,0,7); c.fill(); c.restore(); }
// murallas teodosianas con cañonazos. o.dmg(t) de 0 a 1, o.shots: tiempos
function murallas(t,o){ setCam(o.keys,t); grad(...(o.sky||['#2a3a5a','#c98a5a','#e8b070']));
  layer(.15); domo(780,1000,.9,'#b08a5a'); for(let i=0;i<8;i++){ c.fillStyle='#8a6a4a'; c.fillRect(100+i*110,1000-60-rnd(i)*120,80,200); }
  layer(.4); const dmg=o.dmg?o.dmg(t):0; const wy=1200;
  c.fillStyle='#8a7a62'; c.fillRect(-400,wy-260,2000,320); c.strokeStyle='#0b0806'; c.lineWidth=5; c.strokeRect(-400,wy-260,2000,320);
  for(let i=0;i<9;i++){ const x=-360+i*240; c.fillStyle='#9a8a70'; c.fillRect(x,wy-380,130,450); c.strokeRect(x,wy-380,130,450); for(let j=0;j<4;j++) c.fillRect(x+j*36,wy-405,22,30); c.fillStyle='#14110e'; c.fillRect(x+50,wy-320,26,40); }
  c.strokeStyle='rgba(60,50,40,.7)'; c.lineWidth=2; for(let r=0;r<7;r++){ c.beginPath(); c.moveTo(-400,wy-250+r*45); c.lineTo(1600,wy-250+r*45); c.stroke(); }
  if(dmg>0){ c.fillStyle='#2a2018'; c.beginPath(); c.moveTo(560-140*dmg,wy+60); c.lineTo(520-60*dmg,wy-260*dmg); c.lineTo(600,wy-300*dmg); c.lineTo(680+60*dmg,wy-220*dmg); c.lineTo(700+140*dmg,wy+60); c.closePath(); c.fill(); for(let i=0;i<14;i++){ c.fillStyle='#7a6a52'; c.fillRect(520+rnd(i)*220*dmg-60,wy+20-rnd(i*3)*40,30+rnd(i*5)*30,22); } }
  if(o.defenders) for(let i=0;i<6;i++) person(SOLDADO.bizantino(i),{x:-200+i*240+65,y:wy-380,s:.45,t,look:-1,seed:i,face:{brow:-.5,mouth:'f'}});
  layer(.7); c.fillStyle='#6a5a3a'; c.fillRect(-500,1300,2100,900); for(let i=0;i<12;i++){ c.fillStyle='#e8dcc0'; const x=-300+i*170; c.beginPath(); c.moveTo(x,1380); c.lineTo(x+60,1290); c.lineTo(x+120,1380); c.fill(); c.strokeStyle='#0b0806'; c.lineWidth=3; c.stroke(); }
  layer(1); for(const s of (o.shots||[])){ const a=t-s; if(a>=0&&a<.5){ const k=a/.5; c.fillStyle='#14110e'; c.beginPath(); c.arc(lerp(330,600,k),lerp(1560,wy-150,k)-Math.sin(k*Math.PI)*300,22,0,7); c.fill(); } explosion(600,wy-140,110,a-.5); if(a>=0&&a<.4){ glow(330,1560,300,'rgba(255,200,120,A)',1-a/.4); smoke(330,1540,70,t,s,.6*(1-a/.4),'200,190,180'); } }
  if(o.cannon!==false){ let rec=0; for(const s of (o.shots||[])){ const a=t-s; if(a>=0&&a<.6) rec=Math.max(rec,Math.sin(a/.6*Math.PI)); } cannon(-40,1640,1.0,rec); }
  if(o.troops) for(let i=0;i<5;i++) person(SOLDADO.otomano(i),{x:-60+i*130,y:1820,s:.8,t,look:1,seed:i,face:{brow:.4}}); }
// mapa esquemático del Cuerno de Oro
function cuerno(t){ setCam([[T('d2'),560,980,.9,0],[Tm('d2',.4),520,900,1.15,0],[E('d2'),480,860,1.3,0]],t); grad('#1d4560','#1d4560');
  layer(1); c.fillStyle='#cfae74'; c.strokeStyle='#4a321a'; c.lineWidth=5;
  c.beginPath(); c.moveTo(-500,1100); c.lineTo(300,1050); c.quadraticCurveTo(600,1000,780,1160); c.lineTo(820,1500); c.quadraticCurveTo(500,1700,-500,1650); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-500,250); c.lineTo(1600,250); c.lineTo(1600,700); c.lineTo(950,760); c.quadraticCurveTo(640,900,300,880); c.lineTo(-500,860); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(1050,900); c.lineTo(1600,820); c.lineTo(1600,2400); c.lineTo(1000,2400); c.closePath(); c.fill(); c.stroke();
  const lab=(s,x,y,col,sz=44)=>{ c.font=`900 ${sz}px Inter`; c.textAlign='center'; c.lineWidth=12; c.strokeStyle='#0b0806'; c.strokeText(s,x,y); c.fillStyle=col; c.fillText(s,x,y); };
  lab('CONSTANTINOPLA',220,1380,'#e6b8ff'); lab('GÁLATA',650,560,'#ffd0a0'); lab('CUERNO DE ORO',360,990,'#bfe0ff',38); lab('BÓSFORO',1000,1300,'#bfe0ff',38);
  c.strokeStyle='#d8dde4'; c.lineWidth=9; c.setLineDash([16,10]); c.beginPath(); c.moveTo(800,1150); c.lineTo(900,790); c.stroke(); c.setLineDash([]); lab('CADENA',930,1020,'#fff',34);
  const path=[[1020,700],[900,520],[620,420],[380,560],[300,860]]; const k=eio(k01(t,Tm('d2',.42),Tm('d2',.95)));
  c.save(); c.strokeStyle='#ffcf3a'; c.lineWidth=12; c.setLineDash([26,16]); c.beginPath(); c.moveTo(...path[0]); const n=Math.floor(k*80); for(let i=1;i<=n;i++){ const u=i/80*(path.length-1), a=Math.min(Math.floor(u),path.length-2), f=u-a; c.lineTo(lerp(path[a][0],path[a+1][0],f),lerp(path[a][1],path[a+1][1],f)); } c.stroke(); c.restore();
  for(let j=0;j<5;j++){ const u=clamp(k*(path.length-1)-j*.18,0,path.length-1.001), a=Math.floor(u), f=u-a; c.save(); c.translate(lerp(path[a][0],path[a+1][0],f),lerp(path[a][1],path[a+1][1],f)); c.scale(.22,.22); ship(0,0,1,'galley',t,-1,'#e8dcc0','#c8102e'); c.restore(); }
  for(let j=0;j<4;j++){ c.save(); c.translate(1200+j*90,1000+j*60); c.scale(.2,.2); ship(0,0,1,'galley',t,-1,'#e8dcc0','#c8102e'); c.restore(); } }
MOTOR.run(()=>({
  hot:/^(mil|cañón|ocho|metros|constantinopla|murallas|1453|mehmed|ii|21|7\.000|orbán|cadena|tierra|colina|53|29|mayo|jenízaros|brecha|constantino|xi|estambul|edad|media)$/i,
  hits:[Tm('h1',.45),...[0,1,2,3,4].map(i=>Tm('d3',.1+i*.18)),T('r1')],
  flashes:[[Tm('h1',.45),.7,.12],[T('r1'),.5,.15]],
  titles:[[0,Tm('h1',.45),'1.000 AÑOS<small>Y UN CAÑÓN</small>'],[Tm('h1',.5),T('c1'),'CONSTANTINOPLA<small>1453</small>'],[E('f2')-.3,TL.total,'1453<small>FIN DE LA EDAD MEDIA</small>']],
  dates:[[T('c2'),T('c3'),'1453'],[T('r1'),Tm('r1',.6),'29 DE MAYO']],
  counts:[[Tm('c3',.2),T('d1'),()=>['≈7.000','DEFENSORES'],420],[T('d3'),T('r1'),t=>['DÍA '+Math.max(1,Math.round(lerp(1,53,k01(t,T('d3'),E('d3'))))),'DEL ASEDIO']]],
  names:[[Tm('c2',.15),T('c3'),'MEHMED II','SULTÁN OTOMANO · 21 AÑOS'],[T('d1')+.2,T('d2'),'ORBÁN','INGENIERO DE CAÑONES'],[T('r2')+.2,E('r2'),'CONSTANTINO XI','ÚLTIMO EMPERADOR BIZANTINO']],
  scenes:[
   [0,t=>murallas(t,{keys:[[0,140,1520,2.2,0],[Tm('h1',.4),180,1500,2.0,0],[Tm('h1',.5),560,1180,1.0,0,eout],[T('c1'),560,1160,.95,0]],shots:[Tm('h1',.4)],dmg:t=>.15*k01(t,Tm('h1',.5),Tm('h1',.6))}),'rgba(255,170,90,.05)'],
   [T('c1'),city({modern:false,sky:['#f0a860','#f6d0a0','#7aa0c0'],keys:[[T('c1'),540,1300,1.35,0],[E('c1'),540,1200,1.1,0]],backdrop:t=>{ domo(540,1300,1.6); },wall:'#8a7a62',mid:t=>{ c.fillStyle='#9a8a70'; for(let i=0;i<8;i++){ c.fillRect(-300+i*240,1220,130,200); } c.fillStyle='#2f6080'; c.fillRect(-500,1500,2100,900); }}),'rgba(255,200,140,.06)'],
   [T('c2'),march({sky:['#6a8ab0','#d8b07a','#e8c08a'],terrain:'plain',army:SOLDADO.otomano,n:14,spacing:150,horsesEvery:5,leader:MEHMED,leaderFace:{brow:.6,mouth:'s'},banners:'otomano',near:'#a0884a',ground:'#9a7a46',mid:'#8a7a4a',t0:T('c2'),keys:[[T('c2'),560,1000,1.0,0],[E('c2'),760,960,1.15,0]],weather:'dust',weatherN:40}),'rgba(255,180,90,.05)'],
   [T('c3'),t=>{ city({modern:false,sky:['#05070f','#141a2c','#2a1a1a'],keys:[[T('c3'),540,1000,1.0,0],[E('c3'),540,1060,1.25,0]],wall:'#14100e',mid:t=>{ for(let i=0;i<60;i++){ const x=-400+rnd(i)*1900, y=1350+rnd(i*3)*500; flame(x,y,20,40,t,i); glow(x,y-10,60,'rgba(255,150,60,A)',.3); } }})(t); layer(.8); c.fillStyle='#4a4038'; c.fillRect(-500,1180,2100,140); for(let i=0;i<9;i++) c.fillRect(-460+i*240,1130,120,60); for(let i=0;i<5;i++) person(SOLDADO.bizantino(i),{x:150+i*200,y:1190,s:.55,t,look:1,seed:i,face:{brow:-.6,mouth:'f'}}); },'rgba(40,60,140,.15)'],
   [T('d1'),talk({bg:'tienda',keys:[[T('d1'),540,1000,1.0,0],[E('d1'),600,1040,1.2,0]],chars:[{P:MEHMED,x:330,look:1,s:1.05,face:()=>({brow:.6,mouth:'s'})},{P:ORBAN,x:760,look:-1,s:1.0,talkIn:['d1'],face:()=>({brow:.2})}],front:t=>{ cannon(560,1880,1.1,0); }}),'rgba(255,170,80,.06)'],
   [T('d2'),cuerno,''],
   [T('d3'),t=>murallas(t,{keys:[[T('d3'),560,1250,.9,0],[E('d3'),560,1200,1.05,0]],shots:[0,1,2,3,4].map(i=>Tm('d3',.1+i*.18-.08)),dmg:t=>lerp(.2,.85,k01(t,T('d3'),E('d3'))),defenders:true,troops:true}),'rgba(255,150,90,.06)'],
   [T('r1'),charge({sky:['#0a0c18','#3a2430','#8a4a3a'],keys:[[T('r1'),540,1300,1.15,0],[E('r1'),540,1280,1.3,0]],chargeAt:T('r1')+.2,clashAt:Tm('r1',.75),n:8,left:{army:i=>({...SOLDADO.otomano(i),tunic:'#2f5f8a',sleeves:'#2f5f8a',helmet:'bork'}),flag:'otomano'},right:{army:SOLDADO.bizantino,flag:'bizancio'},backdrop:t=>{ c.fillStyle='#3a3230'; c.fillRect(-500,900,2100,400); c.fillStyle='#14100e'; c.beginPath(); c.moveTo(380,1300); c.lineTo(450,980); c.lineTo(640,960); c.lineTo(700,1300); c.fill(); }}),'rgba(255,120,60,.08)'],
   [T('r2'),talk({bg:'muralla',keys:[[T('r2'),540,1060,1.2,0],[E('r2'),540,960,1.8,.02]],chars:[{P:CONSTANTINO,x:540,look:1,s:1.15,face:()=>({brow:-.6,mouth:'f'}),armF:[1.9,2.5]}],extra:t=>{ for(let i=0;i<6;i++) smoke(-100+i*260,1400,90,t,i,.5); }}),'rgba(255,90,40,.1)'],
   [T('f1'),city({modern:false,sky:['#f0a860','#f6d0a0','#7aa0c0'],keys:[[T('f1'),540,1000,1.0,0],[E('f1'),540,1060,1.2,0]],backdrop:t=>{ domo(540,1300,1.2); flag(500,820,140,90,'otomano',t); },wall:'#8a7a62',mid:t=>{ c.fillStyle='#2f6080'; c.fillRect(-500,1500,2100,900); }}),'rgba(255,200,140,.06)'],
   [T('f2'),t=>{ setMap(20,45,40); mapCam([[T('f2'),28.97,41.0,2.5],[TL.total,15,46,1.0]],t); mapDraw({colors:{Turkey:['#c8102e',null]}},t); layer(1); mapPulse(28.97,41.0,T('f2'),t); mapLabel('ESTAMBUL',28.97,41.0,'#c8102e',T('f2'),t,{size:48}); },'rgba(255,220,160,.04)'],
  ]}));
