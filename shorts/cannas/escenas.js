// Fondos pintados (generados con SD-Turbo, ver motor/fondos.py)
imgs({can_aula:'fondos/can_aula.jpg',can_campamento:'fondos/can_campamento.jpg',can_campo:'fondos/can_campo.jpg'});
window.FONDOS={"h1": "can_aula", "c1": "can_campo", "c2": "can_campamento", "r2": "can_campo", "f1": "can_aula", "f2": "can_campo"};
// Cannas (216 a. C.): por qué se sigue estudiando. Diagrama aéreo y personajes cabezón.
const Tm=(id,f)=>T(id)+D(id)*f;
window.ESTILO='cabezon';
const ANIBAL={skin:'#d8a878',top:'#c8a03a',trim:'#e8c03a',cape:'#5b2373',hair:'short',hairCol:'#1d140e',beard:'#1d140e',h:540};
const CADETE=i=>({top:'#3a4a3a',hat:'boina',hatCol:'#2a3a2a',hair:'short',hairCol:['#2a1a10','#6a4a2a','#1d140e'][i%3],h:480});
function aula(t,o={}){ grad('#3a3428','#4a4232','#2a2418'); desenfoque(o.blur??5,()=>{ layer(.4); c.fillStyle='#6a5a44'; c.fillRect(-300,200,1700,1350); for(let i=0;i<3;i++){ c.fillStyle='#bfd6ea'; c.fillRect(-200+i*560,320,240,380); } }); layer(.6); pizarra(120,420,840,620); layer(.8); c.fillStyle='#4a3a28'; c.fillRect(-500,1520,2100,900); layer(1); }
function campo(t){ grad('#e8c890','#d8b070','#c89a58'); c.fillStyle='rgba(120,90,40,.12)'; for(let i=0;i<40;i++){ c.beginPath(); c.ellipse(rnd(i)*1080,rnd(i*3)*1920,60+rnd(i*5)*120,20,0,0,7); c.fill(); } c.fillStyle='#3a7ab0'; c.beginPath(); c.moveTo(-50,200); c.bezierCurveTo(300,260,700,150,1130,230); c.lineTo(1130,300); c.bezierCurveTo(700,220,300,330,-50,270); c.fill(); txt('RÍO ÁUFIDO',540,190,36,'#fff',.8); }
// Diagrama: bloque romano (rojo), media luna cartaginesa (morado), alas veteranas (gris) y caballería (dorado).
function diagrama(t,fase){ setCam([[0,540,960,1.0,0]],t); campo(t);
  const avance=clamp(fase.avance||0,0,1), cierre=clamp(fase.cierre||0,0,1), cab=clamp(fase.cab||0,0,1);
  const ry=1250-avance*220; for(let r=0;r<6;r++) for(let i=0;i<10;i++){ const x=300+i*48, y=ry+r*48; c.fillStyle='#b82127'; c.strokeStyle='#0b0806'; c.lineWidth=3; c.fillRect(x,y,40,40); c.strokeRect(x,y,40,40); }
  const bulge=lerp(1,-1,avance); for(let i=0;i<13;i++){ const u=(i-6)/6, x=540+u*330, y=900-bulge*120*(1-u*u)+avance*60; c.fillStyle='#5b2373'; c.strokeStyle='#0b0806'; c.lineWidth=3; c.fillRect(x-22,y-22,44,44); c.strokeRect(x-22,y-22,44,44); }
  for(const sd of [-1,1]) for(let r=0;r<5;r++){ const x=540+sd*(420-cierre*90), y=950+r*70+cierre*sd*0; c.fillStyle='#7a7a8a'; c.strokeStyle='#0b0806'; c.lineWidth=3; c.save(); c.translate(x,y+avance*120); c.rotate(sd*cierre*.6); c.fillRect(-26,-26,52,52); c.strokeRect(-26,-26,52,52); c.restore(); }
  if(cab>0){ for(let i=0;i<8;i++){ const a=Math.PI*(1.0-cab*.95)+i*.08; const x=540+Math.cos(a)*460, y=1250+Math.sin(a)*-80+cab*380; c.fillStyle='#e8c03a'; c.strokeStyle='#0b0806'; c.lineWidth=3; c.beginPath(); c.moveTo(x,y-26); c.lineTo(x+26,y+20); c.lineTo(x-26,y+20); c.closePath(); c.fill(); c.stroke(); } }
  if(fase.flechas){ c.strokeStyle='#ffffff'; c.lineWidth=10; c.setLineDash([24,14]); c.beginPath(); c.moveTo(420,1240); c.lineTo(420,1000); c.moveTo(660,1240); c.lineTo(660,1000); c.stroke(); c.setLineDash([]); }
  txt('ROMA',540,1640,60,'#ff8a8a'); txt('CARTAGO',540,760,52,'#d8a8ff'); }
MOTOR.run(()=>({
  hot:/^(dos|mil|academias|216|cannas|roma|ochenta|aníbal|cincuenta|centro|media|luna|débiles|propósito|rodeados|decenas|envolvimiento|alemán|libros|sabías)$/i,
  hits:[T('r1')+.5,Tm('r1',.6)], flashes:[[T('r1')+.5,.3,.1]],
  titles:[[0,T('c1'),'¿SABÍAS QUE...?<small>LA BATALLA QUE SE SIGUE ESTUDIANDO</small>','150px'],[E('f2')-.3,TL.total,'CANNAS<small>216 a. C. · DOBLE ENVOLVIMIENTO</small>','220px']],
  dates:[[T('c1'),T('r2'),'216 a. C.']],
  counts:[[T('c1')+.5,T('c2'),()=>['≈80.000','ROMANOS'],300],[T('c2')+.3,T('d1'),()=>['≈50.000','CON ANÍBAL'],300]],
  names:[[T('c2')+.4,T('d1'),'ANÍBAL BARCA','GENERAL DE CARTAGO']],
  scenes:[
   [0,t=>{ setCam([[0,540,1050,1.3,0],[E('h1'),540,1000,1.0,0]],t); aula(t); const k=k01(t,.3,E('h1')); tiza([[300,900],[540,700],[780,900]],k,'#f4f1ea',12); tiza([[220,700],[300,880]],k,'#f4f1ea',10); tiza([[860,700],[780,880]],k,'#f4f1ea',10); for(let i=0;i<4;i++) cabezon(CADETE(i),{x:120+i*280,y:1700,s:1.05,t,look:1,seed:i,face:{mouth:'n'},armF:i==1?[2.6,2.9]:null}); },'rgba(255,220,160,.05)'],
   [T('c1'),march({sky:['#e8b070','#f0d0a0','#e8dcc0'],terrain:'plain',army:SOLDADO.roma,n:16,spacing:150,speed:90,banners:'#b82127',t0:T('c1'),keys:[[T('c1'),560,1000,1.0,0],[E('c1'),700,980,1.1,0]],face:{brow:.5,mouth:'f'},far:'#c8a070',mid:'#b89058',near:'#d8b878',ground:'#d8b878'}),'rgba(255,200,130,.06)'],
   [T('c2'),t=>{ setCam([[T('c2'),540,1050,1.0,0],[E('c2'),540,950,1.25,0]],t); grad('#e8a050','#f4c890','#e8dcc0'); desenfoque(6,()=>{ layer(.4); hills(1250,90,'#b89058',3); for(let i=0;i<10;i++) person(SOLDADO.cartago(i),{x:-100+i*140,y:1300,s:.6,t,look:1,seed:i}); }); layer(.8); c.fillStyle='#c8a070'; c.fillRect(-500,1520,2100,900); layer(1); cabezon(ANIBAL,{x:540,y:1540,s:1.4,t,look:1,seed:3,face:{brow:.6,mouth:'n'}}); },'rgba(255,190,120,.06)'],
   [T('d1'),t=>diagrama(t,{flechas:true}),''],
   [T('d2'),t=>diagrama(t,{}),''],
   [T('d3'),t=>diagrama(t,{avance:k01(t,T('d3'),E('d3'))}),''],
   [T('r1'),t=>diagrama(t,{avance:1,cierre:k01(t,T('r1'),Tm('r1',.5)),cab:k01(t,Tm('r1',.4),E('r1'))}),'rgba(255,120,80,.05)'],
   [T('r2'),charge({sky:['#3a2a3a','#c4592a','#f0a040'],left:{army:SOLDADO.cartago,flag:'#5b2373'},right:{army:SOLDADO.roma,flag:'#b82127'},chargeAt:T('r2')+.2,clashAt:T('r2')+1.4,keys:[[T('r2'),540,1250,1.0,0],[E('r2'),540,1200,1.15,0]],far:'#8a4a2e',mid:'#6a3a1e',ground:'#5a3018'}),'rgba(255,120,60,.08)'],
   [T('f1'),t=>{ setCam([[T('f1'),540,1000,1.0,0],[E('f1'),540,900,1.15,0]],t); aula(t); const k=k01(t,T('f1'),Tm('f1',.6)); tiza([[300,950],[540,650],[780,950]],1,'#f4f1ea',12); tiza([[200,600],[260,760],[400,900]],k,'#ffd23a',12); tiza([[880,600],[820,760],[680,900]],k,'#ffd23a',12); txt('DOBLE ENVOLVIMIENTO',540,560,52,'#ffd23a',k01(t,Tm('f1',.4),Tm('f1',.5))); for(let i=0;i<4;i++) cabezon(CADETE(i),{x:120+i*280,y:1700,s:1.05,t,look:1,seed:i,face:{eyes:i%2?'o':'n',mouth:i%2?'o':'n'}}); },'rgba(255,220,160,.05)'],
   [T('f2'),t=>{ setCam([[T('f2'),540,920,1.3,0],[TL.total,540,1000,1.0,0]],t); grad('#2a1a3a','#c4592a','#f0a040'); desenfoque(6,()=>{ layer(.4); glow(800,1100,600,'rgba(255,200,120,A)',.6); hills(1300,80,'#4a2028',4); }); layer(1); cabezon(ANIBAL,{x:500,y:1540,s:1.35,t,look:1,seed:3,face:{brow:.3,mouth:'s'}}); },'rgba(255,160,100,.07)'],
  ]}));

// sobrescrito con escenarios detallados del motor
function aula(t,o={}){ escInterior(t,{pared:'#6a6a5a',blur:o.blur,ventanaX:900}); layer(.6); pizarra(120,420,840,620); layer(1); }
