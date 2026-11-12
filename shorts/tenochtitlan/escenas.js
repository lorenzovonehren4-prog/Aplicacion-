// Cortés y Tenochtitlan (1519–1521). Fichas: Cortés (morrión, coraza, barba), Moctezuma (tocado de plumas verde, manto turquesa), Malinche (huipil blanco, pelo largo), guerreros mexicas (jaguar), tlaxcaltecas (rojo y blanco).
const Tm=(id,f)=>T(id)+D(id)*f;
const CORTES={skin:'#e8c0a0',hair:'#3a2a1c',hairStyle:'short',beard:'#3a2a1c',tunic:'#7a2a2a',armor:'#9aa0a8',legs:'#4a3a2a',boots:'#2a1a10',h:560,helmet:'morion',weapon:'sword'};
const MOCTEZUMA={skin:'#b47b4e',hair:'#14100c',hairStyle:'long',tunic:'#e8dcc0',cloak:'#2a9a9a',trim:'#e8c03a',h:570,helmet:'plumas',hatCol:'#2a9a5a'};
const MALINCHE={skin:'#b47b4e',hair:'#14100c',hairStyle:'long',tunic:'#f4f1ea',belt:'#c8102e',h:520};
const ESP=i=>({skin:['#e8c0a0','#e2b892'][i%2],hair:'#3a2a1c',hairStyle:'short',beard:i%2?'#3a2a1c':null,tunic:'#8a3a2a',armor:'#9aa0a8',legs:'#4a3a2a',boots:'#2a1a10',h:300,helmet:'morion',weapon:i%3?'spear':'musket'});
const MEX=i=>({skin:['#b47b4e','#a06a40','#c08a5c'][i%3],hair:'#14100c',hairStyle:'short',tunic:i%2?'#d8a03a':'#e8e0cc',legs:i%2?'#d8a03a':'#e8e0cc',sleeves:i%2?'#d8a03a':'#e8e0cc',h:300,helmet:i%2?'jaguar':'plumas',hatCol:'#c8102e',shield:'round',shieldCol:['#2a6ab8','#c8102e','#e8c03a'][i%3],weapon:'sword'});
const TLAX=i=>({...MEX(i),tunic:'#c8102e',sleeves:'#f4f1ea',legs:'#f4f1ea',helmet:'plumas',hatCol:'#f4f1ea',shieldCol:'#f4f1ea'});
function ciudad(t,o={}){ setCam(o.keys,t); grad(...(o.sky||['#4a8ad0','#bcd8ee','#e8f0f4'])); layer(.15); mountains(1050,6,300,600,'#6a7a8a','#ffffff',4,2600,-900); layer(.3); clouds(t,250,false);
  layer(.5); c.fillStyle='#3a8aa0'; c.fillRect(-500,1150,2100,900); c.fillStyle='rgba(255,255,255,.25)'; for(let i=0;i<30;i++) c.fillRect(mod(rnd(i)*1900+t*20,1900)-400,1170+rnd(i*3)*400,70,4);
  c.fillStyle='#d8c8a0'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.fillRect(150,1080,780,90); c.strokeRect(150,1080,780,90);
  for(let i=0;i<4;i++){ const w=360-i*80, y=1080-i*70; c.fillStyle=['#e8dcc0','#d8c8a0','#e8dcc0','#c8b890'][i]; c.fillRect(540-w/2,y-70,w,70); c.strokeRect(540-w/2,y-70,w,70); } c.fillStyle='#c8102e'; c.fillRect(470,730,60,60); c.fillStyle='#2a6ab8'; c.fillRect(550,730,60,60); c.strokeRect(470,730,60,60); c.strokeRect(550,730,60,60);
  for(let i=0;i<10;i++){ const x=-200+i*160; if(Math.abs(x-540)<240) continue; c.fillStyle='#e8dcc0'; c.fillRect(x,1110,110,60); c.strokeRect(x,1110,110,60); }
  if(o.fire) for(let i=0;i<6;i++){ const f=clamp(o.fire-i*.1,0,1); if(f>0){ flame(100+i*170,1100,90,200*f,t,i); smoke(100+i*170,950,60,t,i,.5*f); } }
  if(o.canoes) for(let i=0;i<6;i++){ const x=mod(i*300+t*40,1900)-400; c.fillStyle='#6a4426'; c.beginPath(); c.ellipse(x,1300+(i%2)*120,90,16,0,0,7); c.fill(); c.stroke(); } }
MOTOR.run(()=>({
  hot:/^(500|1519|tenochtitlan|200\.000|cortés|tlaxcaltecas|malinche|moctezuma|1520|viruela|1521|13|agosto|cuauhtémoc|méxico|conquista|rebelión|epidemia|solos)$/i,
  hits:[T('d2')+.5,T('r1')+.3,T('r2')+.4], flashes:[[T('r2'),.4,.1]],
  titles:[[0,T('c1'),'500<small>CONTRA UN IMPERIO</small>','240px'],[E('f2')-.3,TL.total,'1521<small>LA CAÍDA DE TENOCHTITLAN</small>']],
  dates:[[T('c1'),T('c3'),'1519'],[T('d2'),T('d3'),'1520'],[T('r1'),T('f1'),'1521']],
  counts:[[Tm('c1',.4),T('c2'),()=>['≈200.000','HABITANTES'],420]],
  names:[[Tm('c2',.2),T('c3'),'HERNÁN CORTÉS','CONQUISTADOR ESPAÑOL'],[T('d1')+.2,T('d2'),'MALINCHE','INTÉRPRETE'],[T('d2')+.2,Tm('d2',.5),'MOCTEZUMA II','HUEY TLATOANI MEXICA']],
  scenes:[
   [0,march({sky:['#4a8ad0','#bcd8ee','#e8f0f4'],terrain:'beach',army:ESP,n:10,spacing:180,horsesEvery:4,leader:CORTES,leaderFace:{brow:.5,mouth:'s'},t0:0,keys:[[0,560,1000,1.2,0],[E('h1'),700,980,1.0,0]],backdrop:t=>{ for(let i=0;i<3;i++){ c.save(); c.translate(-200+i*500,1150); c.scale(.5,.5); ship(0,0,1,'galleon',t,1,'#f2ead8','#c8102e'); c.restore(); } }}),'rgba(255,220,160,.04)'],
   [T('c1'),t=>ciudad(t,{keys:[[T('c1'),540,1000,1.3,0],[E('c1'),540,960,1.0,0]],canoes:true}),'rgba(255,220,160,.04)'],
   [T('c2'),march({sky:['#4a8ad0','#bcd8ee','#e8f0f4'],terrain:'beach',army:ESP,n:10,spacing:180,horsesEvery:3,leader:CORTES,leaderFace:{brow:.6,mouth:'s'},t0:T('c2'),keys:[[T('c2'),560,1000,1.05,0],[E('c2'),720,980,1.15,0]],backdrop:t=>{ for(let i=0;i<3;i++){ c.save(); c.translate(-200+i*500,1150); c.scale(.5,.5); ship(0,0,1,'galleon',t,1,'#f2ead8','#c8102e'); c.restore(); } }}),'rgba(255,220,160,.04)'],
   [T('c3'),march({sky:['#5a9ad0','#c8dce8','#e8d8b0'],terrain:'mountain',army:i=>i%2?ESP(i):TLAX(i),n:14,spacing:160,t0:T('c3'),keys:[[T('c3'),560,1000,1.0,0],[E('c3'),700,980,1.1,0]],far:'#7a8a6a'}),'rgba(255,220,160,.04)'],
   [T('d1'),talk({bg:'tienda',keys:[[T('d1'),540,1040,1.1,0],[E('d1'),480,1000,1.3,0]],chars:[{P:MALINCHE,x:420,look:1,s:1.05,talkIn:['d1'],face:()=>({brow:.2})},{P:CORTES,x:760,look:-1,s:1.0,face:()=>({brow:.3,mouth:'s'})}]}),'rgba(255,170,80,.06)'],
   [T('d2'),t=>{ if(t<Tm('d2',.5)) talk({bg:'palacio',keys:[[T('d2'),540,1020,1.0,0],[Tm('d2',.5),540,1000,1.1,0]],chars:[{P:MOCTEZUMA,x:360,look:1,s:1.05,face:()=>({brow:.1,mouth:'s'})},{P:CORTES,x:760,look:-1,s:1.0,face:()=>({brow:.2,mouth:'s'})}]})(t); else ciudad(t,{sky:['#05070f','#141a2c','#2a1a1a'],keys:[[Tm('d2',.5),540,1050,1.1,0],[E('d2'),540,1050,1.2,0]],fire:k01(t,Tm('d2',.5),E('d2'))*1.5}); },'rgba(60,60,140,.08)'],
   [T('d3'),march({sky:['#4a4a5a','#8a8a7a','#a09a8a'],terrain:'plain',army:MEX,n:10,spacing:190,speed:30,losses:[T('d3'),E('d3')],lossShare:.6,face:{brow:-.8,mouth:'f',eyes:'s'},t0:T('d3'),keys:[[T('d3'),560,1000,1.05,0],[E('d3'),620,1000,1.1,0]]}),'rgba(120,120,140,.12)'],
   [T('r1'),charge({sky:['#3a2a3a','#a0603a','#d0904a'],keys:[[T('r1'),540,1300,1.1,0],[E('r1'),540,1280,1.25,0]],chargeAt:T('r1')+.1,clashAt:Tm('r1',.5),n:9,left:{army:i=>i%3?TLAX(i):ESP(i),horses:true},right:{army:MEX},backdrop:t=>{ c.fillStyle='#e8dcc0'; for(let i=0;i<4;i++){ const w=300-i*70; c.fillRect(540-w/2,1180-i*60-60,w,60); } }}),'rgba(255,120,60,.08)'],
   [T('r2'),t=>ciudad(t,{sky:['#2a1a1a','#8a3a2a','#c0602a'],keys:[[T('r2'),540,1040,1.0,0],[E('r2'),540,1000,1.2,0]],fire:1.5}),'rgba(255,90,40,.1)'],
   [T('f1'),t=>{ setCam([[T('f1'),540,1050,1.0,0],[E('f1'),540,1000,1.15,0]],t); grad('#4a8ad0','#bcd8ee','#e8f0f4'); layer(.3); mountains(1050,6,300,600,'#6a7a8a','#ffffff',4,2600,-900); layer(.6); for(let i=0;i<14;i++){ const x=-300+i*130, h=150+rnd(i)*200; c.fillStyle=['#e8dcc0','#d8c8a0','#c8b890'][i%3]; c.fillRect(x,1250-h,110,h); c.strokeStyle='#0b0806'; c.lineWidth=4; c.strokeRect(x,1250-h,110,h); } c.fillStyle='#e8dcc0'; c.fillRect(420,900,240,350); c.beginPath(); c.arc(540,900,90,Math.PI,0); c.fill(); c.stroke(); layer(1); c.fillStyle='#8a7a62'; c.fillRect(-500,1250,2100,900); },'rgba(255,220,160,.05)'],
   [T('f2'),t=>ciudad(t,{keys:[[T('f2'),540,1000,1.0,0],[TL.total,540,960,1.2,0]],canoes:true}),'rgba(255,200,140,.05)'],
  ]}));
