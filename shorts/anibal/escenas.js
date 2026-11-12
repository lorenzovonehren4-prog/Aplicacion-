// Aníbal, versión 2: las escenas originales (base.js) más escenas de ejército del motor común.
const Tm=(id,f)=>T(id)+D(id)*f;
const ANIBAL_TUERTO=ANIBAL;
// Ródano: balsas con elefantes y soldados cruzando el río
function rodano(t){ setCam([[T('r2b')-.2,560,1180,1.1,0],[E('r2b')+.25,600,1150,1.2,0]],t); grad('#6a9ad0','#c8dcec','#e8f0f4');
  layer(.15); mountains(1050,8,300,500,'#8aa0b8','#ffffff',5,2800,-900); layer(.4); hills(1150,70,'#6e8a4a',3);
  layer(.7); c.fillStyle='#4a7a9a'; c.fillRect(-500,1200,2100,900); c.fillStyle='rgba(255,255,255,.3)'; for(let i=0;i<40;i++) c.fillRect(mod(rnd(i)*1900+t*60,1900)-400,1220+rnd(i*3)*500,70,5);
  layer(1); for(let j=0;j<2;j++){ const x=lerp(-300,1300,mod((t-T('r2b'))*.18+j*.5,1)), y=1430+j*170; c.save(); c.translate(x,y+Math.sin(t*2+j)*6); ship(0,0,1.1,'raft',t,1); c.restore(); elephant(x,y-20+Math.sin(t*2+j)*6,.55,t*2+j,1); for(let i=0;i<2;i++) person(SOLD_C(i+j),{x:x-150+i*300,y:y-12,s:.55,t,look:1,seed:i+j*5,face:{brow:-.4,mouth:'f'}}); }
  for(let i=0;i<4;i++){ const x=-200+i*350+mod(t*40,350); c.save(); c.translate(x,1300); c.scale(.45,.45); ship(0,0,1,'galley',t,1,'#e8dcc0'); c.restore(); } }
MOTOR.run(()=>{
const k1m=T('k1')+D('k1')*.42;
// Cannas de lado: los dos ejércitos frente a frente
const frenteCannas=charge({sky:['#4a6a9a','#d8b878','#e8c88a'],keys:[[k1m,540,1320,1.6,0],[k1m+.5,540,1300,1.0,0,eout],[T('k2a'),540,1290,1.05,0]],chargeAt:999,clashAt:1000,n:10,
  left:{army:SOLD_C,flag:'cartago',horses:true,elephants:false},right:{army:SOLD_R,flag:'roma'},far:'#8a7a4a',mid:'#a08a50',ground:'#9a8444'});
const cargaZama=charge({sky:['#1a0e1e','#8a3a24','#d2783a'],keys:[[T('z1'),540,1300,1.1,0],[Tm('z1',.5),540,1280,1.25,0]],chargeAt:T('z1')+.2,clashAt:Tm('z1',.42),n:9,
  left:{army:SOLD_C,flag:'cartago',elephants:true,blanket:'#5b2373'},right:{army:SOLD_R,flag:'roma',horses:true},far:'#4a2420',mid:'#3a1a18',ground:'#2a1210'});
return {
  hot:/^(roma|cartago|aníbal|barca|hispania|pirineos|alpes|elefantes|trebia|trasimeno|cannas|escipión|zama|veneno|nueve|mitad|propósito|rodeados|brillante|livio|quince|221|216|202|26|80\.000|50\.000|70\.000|años)$/i,
  hits:[T('g2b'),T('a1')+.7,T('b1')+D('b1')*.55,T('b1')+D('b1')*.85,T('k4a'),Tm('z1',.42),T('z1')+D('z1')*.55],
  flashes:[[T('g2a'),.9,.18],[T('g2b'),.6,.12],[k1m,.8,.15],[T('k4a'),.8,.2],[T('z1'),.5,.12],[T('f2'),.6,.25]],
  titles:[[0,T('g2a'),'JURÓ<br>DESTRUIR ROMA','150px'],[T('g2b'),T('c1'),'ANÍBAL<small>EL HOMBRE QUE CASI DESTRUYE ROMA</small>','220px'],[E('f2')-.2,TL.total,'ANÍBAL BARCA<small>247 – c. 183 a. C.</small>','130px']],
  dates:[[T('c2'),T('r1'),'221 a. C.'],[T('r1'),T('r2a'),'218 a. C.'],[T('k1')+.2,k1m,'216 a. C.'],[T('z1'),Tm('z1',.5),'202 a. C.']],
  counts:[[T('a2'),T('b1'),t=>[Math.round(lerp(59000,26000,eio(k01(t,T('a2')+.2,E('a2'))))).toLocaleString('es-ES'),'SOLDADOS']],
    [k1m+.4,T('k2a'),()=>['<span style="color:#ff6a60">+80.000</span> vs <span style="color:#e6b8ff">50.000</span>','ROMA · ANÍBAL'],250],
    [T('k4b')+D('k4b')*.5,T('m1'),()=>['<span style="color:#ff3b30">50.000–70.000</span>','MUERTOS EN UNA TARDE']],
    [T('e1')+.3,T('e2'),t=>[Math.round(lerp(218,203,eio(k01(t,T('e1')+.3,Tm('e1',.85)))))+' a. C.','15 AÑOS EN ITALIA'],250]],
  names:[[T('g1')+.2,T('g2a'),'AMÍLCAR Y SU HIJO ANÍBAL','CARTAGO · c. 238 a. C.'],[T('m2'),E('m3'),'MAHARBAL','JEFE DE CABALLERÍA',860],[T('e2')+.3,T('e2')+D('e2')*.42,'PUBLIO CORNELIO ESCIPIÓN','GENERAL ROMANO']],
  quotes:[[T('m3'),E('m3')+.25,'«Sabes vencer, Aníbal, pero no sabes aprovechar la victoria.»<small>— MAHARBAL, SEGÚN TITO LIVIO</small>']], noCaps:['m3'],
  scenes:[
   [0,t=>templo(t,[[0,540,1100,1.0,0],[T('g1')+1.4,500,1020,1.35,.01],[T('g2a')-.25,440,900,2.4,.03],[T('g2a'),440,880,4.5,.03,ein]]),'rgba(255,120,40,.05)'],
   [T('g2a'),heroe,'rgba(255,120,60,.08)'],
   [T('c1'),mapa,'rgba(255,220,160,.04)'],
   [T('r2a'),march({sky:['#6a9ad0','#c8d8e4','#e8eef2'],terrain:'mountain',far:'#7a8a7a',army:SOLD_C,n:16,spacing:150,horsesEvery:4,elephantsEvery:7,leader:ANIBAL,leaderFace:{brow:.5,mouth:'g'},banners:'cartago',t0:T('r2a'),keys:[[T('r2a'),560,1000,1.0,0],[E('r2a'),760,980,1.12,0]],weather:'dust',weatherN:30}),'rgba(255,200,140,.05)'],
   [T('r2b')-.2,rodano,'rgba(255,220,160,.05)'],
   [T('a1'),alpes,'rgba(120,160,255,.07)'],
   [T('b1'),mapa,'rgba(255,220,160,.04)'],
   [k1m,frenteCannas,'rgba(255,200,120,.05)'],
   [T('k2a'),cannas,'rgba(255,200,120,.06)'],
   [T('m1'),colina,'rgba(255,120,60,.08)'],
   [T('e1'),march({sky:['#6a9ad0','#d8c8a0','#e8d8b0'],terrain:'plain',army:SOLD_C,n:16,spacing:150,horsesEvery:3,elephantsEvery:16,leader:ANIBAL,leaderFace:{brow:.6,mouth:'g'},banners:'cartago',mid:'#8a9a4a',near:'#9aa85a',ground:'#a8a060',t0:T('e1'),keys:[[T('e1'),560,1000,1.05,0],[E('e1'),760,980,1.15,0]],backdrop:t=>{ for(let i=0;i<4;i++){ const x=-200+i*450; c.fillStyle='#c8a46a'; c.fillRect(x,1050,140,90); c.fillStyle='#8a3a2a'; c.beginPath(); c.moveTo(x-10,1050); c.lineTo(x+70,1000); c.lineTo(x+150,1050); c.fill(); } },weather:'dust',weatherN:30}),'rgba(255,200,140,.05)'],
   [T('e2'),escipion,'rgba(255,90,60,.06)'],
   [T('e2')+D('e2')*.42,mapa,'rgba(255,220,160,.04)'],
   [T('z1'),cargaZama,'rgba(255,110,40,.08)'],
   [Tm('z1',.5),zama,'rgba(255,110,40,.08)'],
   [T('f1'),final,'rgba(40,60,140,.12)'],
   [T('f2'),t=>templo(t,[[T('f2'),540,1060,3.6,0],[T('f2')+1.6,520,1000,1.25,0,eout],[TL.total,500,980,1.1,0]]),'rgba(255,120,40,.05)'],
  ]};});
