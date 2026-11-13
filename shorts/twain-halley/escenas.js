// Fondos pintados (generados con SD-Turbo, ver motor/fondos.py)
imgs({twa_estudio:'fondos/twa_estudio.jpg',twa_pueblo:'fondos/twa_pueblo.jpg'});
window.FONDOS={"h1": "twa_pueblo", "c1": "twa_pueblo", "d2": "twa_estudio", "d3": "twa_pueblo", "r1": "twa_pueblo", "f1": "twa_pueblo", "f2": "twa_pueblo"};
// Mark Twain y el cometa Halley (1835–1910).
const Tm=(id,f)=>T(id)+D(id)*f;
const TWAIN={skin:'#e8c4a0',top:'#e8e0c8',top2:'#c8bea0',hair:'short',hairCol:'#fafafa',mustache:'#fafafa',h:540};
const TWAINJ={top:'#2a2a34',top2:'#1a1a24',hair:'short',hairCol:'#8a5a2a',mustache:'#8a5a2a',h:530};
function pueblo(t,o={}){ setCam(o.keys,t); cielo_noche(t); if(o.cometa!==false) cometa(o.cx||760,o.cy||420,1.1,-.5,t); desenfoque(o.blur??5,()=>{ layer(.35); for(let i=0;i<7;i++){ const h=180+rnd(i)*120; c.fillStyle='#2a2430'; c.fillRect(-150+i*190,1250-h,160,h); c.beginPath(); c.moveTo(-165+i*190,1250-h); c.lineTo(-70+i*190,1250-h-90); c.lineTo(25+i*190,1250-h); c.fill(); c.fillStyle=o.luz===false&&i==3?'#2a2430':'rgba(255,210,130,.75)'; c.fillRect(-110+i*190,1250-h+50,40,50); } }); layer(.8); c.fillStyle='#14121a'; c.fillRect(-500,1450,2100,900); layer(1); if(o.extra) o.extra(t); }
function orbita(t,k){ setCam([[0,540,960,1.0,0]],t); cielo_noche(t); layer(1); c.strokeStyle='rgba(255,255,255,.35)'; c.lineWidth=4; c.setLineDash([14,12]); c.beginPath(); c.ellipse(540,1000,430,170,-.4,0,7); c.stroke(); c.setLineDash([]); c.fillStyle='#ffd23a'; glow(250,1120,200,'rgba(255,200,80,A)',.7); c.beginPath(); c.arc(250,1120,46,0,7); c.fill(); c.fillStyle='#3a8ad0'; c.beginPath(); c.arc(330,1060,14,0,7); c.fill(); const a=Math.PI+k*Math.PI*2; const x=540+Math.cos(a)*430*Math.cos(-.4)-Math.sin(a)*170*Math.sin(-.4), y=1000+Math.cos(a)*430*Math.sin(-.4)+Math.sin(a)*170*Math.cos(-.4); cometa(x,y,.6,Math.atan2(y-1120,x-250)+Math.PI,t); txt('SOL',250,1230,40,'#ffd23a'); }
MOTOR.run(()=>({
  hot:/^(twain|cometa|halley|1835|misuri|sol|setenta|seis|tom|sawyer|huckleberry|finn|1909|juntos|20|abril|1910|21|casualidad|sabías)$/i,
  hits:[T('f1')+.3],
  titles:[[0,T('c1'),'¿SABÍAS QUE...?<small>MARK TWAIN Y EL COMETA</small>','150px'],[E('f2')-.3,TL.total,'1835 · 1910<small>LLEGÓ Y SE FUE CON EL COMETA</small>','170px']],
  dates:[[T('c1'),T('d1'),'30 NOV. 1835'],[T('d3'),T('r2'),'1909'],[T('r2'),T('f1'),'20 ABR. 1910'],[T('f1'),T('f2'),'21 ABR. 1910']],
  counts:[[Tm('d1',.3),T('d2'),()=>['≈76 AÑOS','CADA VUELTA'],300]],
  names:[[T('c1')+.5,T('c2'),'SAMUEL CLEMENS','«MARK TWAIN»'],[T('d3')+.4,T('r1'),'MARK TWAIN','CITA RECOGIDA POR SU BIÓGRAFO A. B. PAINE']],
  scenes:[
   [0,t=>pueblo(t,{keys:[[0,700,500,1.5,0],[E('h1'),540,960,1.0,0]],extra:t=>cabezon(TWAIN,{x:400,y:1580,s:1.35,t,look:1,seed:1,face:{eyes:'o',mouth:'o'},armF:[2.4,2.6]})}),'rgba(120,150,255,.08)'],
   [T('c1'),t=>pueblo(t,{keys:[[T('c1'),540,1000,1.0,0],[E('c1'),540,1050,1.12,0]]}),'rgba(120,150,255,.08)'],
   [T('c2'),t=>orbita(t,lerp(.42,.5,k01(t,T('c2'),E('c2')))),'rgba(120,150,255,.06)'],
   [T('d1'),t=>orbita(t,lerp(.5,1.5,k01(t,T('d1'),E('d1')))),'rgba(120,150,255,.06)'],
   [T('d2'),t=>{ setCam([[T('d2'),540,1050,1.0,0],[E('d2'),540,980,1.15,0]],t); grad('#2a1c12','#3a2818','#1a1008'); desenfoque(6,()=>{ layer(.4); c.fillStyle='#5a7a9a'; c.fillRect(-300,400,1700,500); c.fillStyle='#f4f1ea'; c.fillRect(200,560,500,160); c.fillStyle='#14110e'; c.fillRect(320,420,40,140); c.fillRect(520,420,40,140); }); layer(.8); c.fillStyle='#3a2818'; c.fillRect(-500,1520,2100,900); layer(1); cabezon(TWAINJ,{x:330,y:1560,s:1.35,t,look:1,seed:2,face:{mouth:'s'},armF:[1.4,1.6]}); [['TOM SAWYER',T('d2')+.6],['HUCKLEBERRY FINN',Tm('d2',.6)]].forEach(([s,t0],i)=>{ const k=eout(k01(t,t0,t0+.3)); if(k>0){ c.save(); c.translate(790,1000+i*240); c.scale(k,k); c.fillStyle=['#8a2a2a','#2a5a3a'][i]; c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillRect(-170,-90,340,180); c.strokeRect(-170,-90,340,180); c.restore(); txt(s,790,1010+i*240,i?34:40,'#e8c03a',k); } }); },'rgba(255,190,120,.06)'],
   [T('d3'),t=>pueblo(t,{keys:[[T('d3'),540,1050,1.0,0],[E('d3'),540,980,1.2,0]],cometa:false,blur:8,extra:t=>cabezon(TWAIN,{x:540,y:1560,s:1.4,t,look:1,seed:1,talk:true,armF:[-1.6,2.2]})}),'rgba(120,150,255,.08)'],
   [T('r1'),t=>pueblo(t,{keys:[[T('r1'),540,980,1.2,0],[E('r1'),540,1000,1.1,0]],cometa:false,blur:8,extra:t=>cabezon(TWAIN,{x:540,y:1560,s:1.4,t,look:1,seed:1,talk:true,face:{brow:-.3},armF:[1.6,2.4]})}),'rgba(120,150,255,.08)'],
   [T('r2'),t=>orbita(t,lerp(.42,.5,k01(t,T('r2'),E('r2')))),'rgba(120,150,255,.06)'],
   [T('f1'),t=>pueblo(t,{keys:[[T('f1'),540,1000,1.0,0],[E('f1'),540,1050,1.15,0]],luz:false,cx:620,cy:380}),'rgba(90,110,200,.1)'],
   [T('f2'),t=>pueblo(t,{keys:[[T('f2'),540,700,1.3,0],[TL.total,540,960,1.0,0]],cx:lerp(300,900,k01(t,T('f2'),TL.total)),cy:420}),'rgba(120,150,255,.08)'],
  ]}));

// sobrescrito con escenarios detallados del motor
function pueblo(t,o={}){ setCam(o.keys,t); escCalle(t,{sky:['#020410','#0a1430','#1a2448'],cielo:t=>{ for(let i=0;i<160;i++){ c.fillStyle=`rgba(255,255,255,${.3+rnd(i)*.6})`; c.fillRect(rnd(i*3)*1400-160,rnd(i*7)*900,2+rnd(i)*3,2+rnd(i)*3); } if(o.cometa!==false) cometa(o.cx||760,Math.min(o.cy||150,170),1.0,-.35,t); },luz:o.luz!==false,color:'#3a2a3a',letrero:'GENERAL STORE',suelo:'#3a3028',blurFachada:o.blur??5}); if(window.FONDOS&&o.cometa!==false){ screen(); cometa(o.cx||760,170,1.0,-.35,t); layer(1); } if(o.extra) o.extra(t); }
