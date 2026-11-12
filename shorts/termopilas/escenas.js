// Las Termópilas (480 a. C.). Fichas fijas: Leónidas (casco con cresta roja, capa roja), Jerjes (tiara dorada, púrpura), Efialtes (pastor).
const LEONIDAS={skin:'#c99a6e',hair:'#2a1a10',hairStyle:'long',beard:'#2a1a10',beardLong:true,tunic:'#8a1414',armor:'#c99a3e',cloak:'#a81e1e',trim:'#e7b73c',h:560,helmet:'greek',crest:'#b82127',weapon:'spear'};
const JERJES={skin:'#b47b4e',hair:'#14100c',hairStyle:'curlyShort',beard:'#14100c',beardLong:true,tunic:'#5b2373',sleeves:'#5b2373',legs:'#e7b73c',boots:'#7a1f2a',cloak:'#e7b73c',trim:'#5b2373',h:580,helmet:'tiara'};
const HERALDO={...SOLDADO.persa(1),h:520,weapon:null,shield:null};
const EFIALTES={skin:'#c99a6e',hair:'#4a3020',hairStyle:'short',beard:'#4a3020',tunic:'#8a6a4a',belt:'#4a3020',h:520,weapon:null};
const INMORTAL=i=>({...SOLDADO.persa(i),tunic:'#e8dcc0',sleeves:'#e8dcc0',legs:'#2f5f8a',hatCol:'#f4f1ea',shieldCol:'#8a6a40',weapon:'spear'});
const Tm=(id,f)=>T(id)+D(id)*f;
// frente: la falange contra la masa persa
function frente(t,o){ setCam(o.keys,t); grad(...(o.sky||['#3a5a8a','#c9a46a','#e0b878']));
  layer(.15); mountains(1100,7,500,800,'#6a5a48',null,4,2600,-900); layer(.4); c.fillStyle='#4a7aa0'; c.fillRect(600,1180,2000,700); c.fillStyle='rgba(255,255,255,.3)'; for(let i=0;i<30;i++) c.fillRect(600+rnd(i)*1500+mod(t*20,40),1200+rnd(i*3)*600,60,4);
  hills(1260,40,'#8a7448',3,-900,620);
  layer(1); c.fillStyle='#a08454'; c.fillRect(-900,1420,3000,900);
  const wave=o.wave?mod(t-o.wave[0],o.wave[1])/o.wave[1]:0;
  for(let r=2;r>=0;r--) for(let i=0;i<(o.nP||14);i++){ const bx=640+i*85+r*40-(o.adv?eio(k01(t,o.adv[0],o.adv[1]))*o.adv[2]:0)+(o.wave?-Math.sin(wave*Math.PI)*120:0), y=1500-r*50;
    const P=(r===0&&i%3===0)?INMORTAL(i):SOLDADO.persa(i+r*7); person(P,{x:bx,y,s:.75+r*.04,t,walk:o.wave||o.adv?t*8+i:null,look:-1,seed:i+r*20,face:{brow:.6,mouth:'o'}}); }
  for(let r=0;r<3;r++) for(let i=0;i<(o.nG||7);i++){ const x=520-i*70-r*36, y=1510-r*44; person(SOLDADO.griego(i+r*3),{x,y,s:.85-r*.05,t,look:1,seed:i+r*9,face:{brow:.8,mouth:'g'},armF:[1.4,1.6]}); }
  if(o.leon) person(LEONIDAS,{x:o.leon,y:1540,s:.95,t,look:1,seed:2,wind:.7,face:{brow:.9,mouth:'g'},armF:[1.6,1.9]});
  if(o.clash&&wave>.35&&wave<.65) for(let i=0;i<4;i++) glow(560+rnd(i+Math.floor(t*6))*120,1300+rnd(i*3)*200,90,'rgba(255,240,200,A)',.8);
  if(o.arrows){ screen(); c.strokeStyle='rgba(20,14,10,.75)'; c.lineWidth=3; for(let i=0;i<120;i++){ const k=mod(t*.8+rnd(i),1), x=W*1.2-k*W*1.5+rnd(i*3)*400, y=-100+k*H*.9+rnd(i*7)*300; c.beginPath(); c.moveTo(x,y); c.lineTo(x-26,y+22); c.stroke(); } } }
// paso visto desde arriba: mar a la derecha, montaña a la izquierda
function paso(t,o){ setCam(o.keys,t); grad('#2f5f80','#2f5f80');
  layer(1); c.fillStyle='#2f5f80'; c.fillRect(-600,-600,2300,3200); c.fillStyle='#b89c64'; c.beginPath(); c.moveTo(-600,-600); c.lineTo(700,-600); c.bezierCurveTo(720,500,640,800,620,960); c.bezierCurveTo(640,1150,760,1500,820,2600); c.lineTo(-600,2600); c.fill();
  c.fillStyle='#6e5a3a'; c.beginPath(); c.moveTo(-600,-600); c.lineTo(480,-600); c.bezierCurveTo(500,400,430,800,420,960); c.bezierCurveTo(440,1200,520,1600,560,2600); c.lineTo(-600,2600); c.fill();
  for(let i=0;i<40;i++){ const x=-500+rnd(i)*900, y=-400+rnd(i*3)*2800; if(x<400){ c.fillStyle='#5a4a2e'; c.beginPath(); c.moveTo(x-50,y+40); c.lineTo(x,y-50); c.lineTo(x+50,y+40); c.fill(); } }
  c.fillStyle='rgba(255,255,255,.25)'; for(let i=0;i<40;i++) c.fillRect(760+rnd(i)*900,-400+rnd(i*3)*2800+mod(t*15,30),70,5);
  c.font='900 44px Inter'; c.textAlign='center'; c.lineWidth=12; c.strokeStyle='#0b0806'; const lab=(s,x,y,col)=>{ c.strokeText(s,x,y); c.fillStyle=col; c.fillText(s,x,y); };
  lab('MONTAÑA',150,300,'#e8dcc0'); lab('MAR',950,500,'#bfe0ff');
  const tok=(x,y,col,w=26)=>{ c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=3; c.beginPath(); c.roundRect(x-w/2,y-9,w,18,4); c.fill(); c.stroke(); };
  const leave=o.leave?eio(k01(t,o.leave[0],o.leave[1])):0;
  for(let r=0;r<4;r++) for(let q=0;q<7;q++){ const ally=r>=2&&q%2; tok(460+q*24,920+r*22-(ally?leave*900:0),r<2?'#b82127':'#c99a3e'); }
  const push=o.push?Math.sin(mod(t*1.3,1)*Math.PI):0;
  for(let r=0;r<16;r++) for(let q=0;q<12;q++){ const x=430+q*26+(rnd(r*12+q)-.5)*8, y=1040+r*34+push*-30*(r<3?1:.3)+Math.sin(t*3+q)*2; if(x>620+r*12) continue; tok(x,y,['#2f5f8a','#c9a24a','#7a2a6a','#e8dcc0'][(r+q)%4]); }
  if(o.flank){ const k=eio(k01(t,o.flank[0],o.flank[1])); c.save(); c.setLineDash([26,18]); c.strokeStyle='rgba(255,207,58,.9)'; c.lineWidth=12; c.beginPath(); const pts=[[380,1500],[200,1250],[150,900],[250,600],[480,700]]; const n=Math.max(1,Math.floor(k*(pts.length-1)*20));
    c.moveTo(...pts[0]); for(let i=1;i<=n;i++){ const u=i/20, a=Math.min(Math.floor(u),pts.length-2), f=u-a; c.lineTo(lerp(pts[a][0],pts[a+1][0],f),lerp(pts[a][1],pts[a+1][1],f)); } c.stroke(); c.restore();
    for(let i=0;i<10;i++){ const u=clamp(k*(pts.length-1)-i*.12,0,pts.length-1.001), a=Math.floor(u), f=u-a; tok(lerp(pts[a][0],pts[a+1][0],f),lerp(pts[a][1],pts[a+1][1],f),'#e8dcc0',22); } }
  if(o.labels){ lab('GRIEGOS',560,850,'#ffcf3a'); lab('PERSAS',530,1640,'#9ad0ff'); } }
setMap(25.5,38.6,190);
const mapa=(keys,ev)=>t=>{ mapCam(keys,t); mapDraw({colors:{Turkey:['#c9a24a',Tm('c1',.15)],Greece:['#d8c8a0',null]}},t); layer(1); ev(t); };
MOTOR.run(()=>({
  hot:/^(espartanos|trescientos|300|jerjes|persia|grecia|heródoto|millones|termópilas|leónidas|plutarco|tomarlas|inmortales|efialtes|sendero|salamina|100\.000|300\.000|7\.000|480|mueren|final)$/i,
  hits:[Tm('h1',.55),Tm('d4',.2),Tm('d4',.55),T('r3')],
  flashes:[[Tm('h1',.55),.5,.1],[T('d4'),.6,.12],[T('r3'),.5,.2]],
  titles:[[Tm('h1',.55),T('c1'),'TERMÓPILAS<small>480 a. C.</small>'],[E('f2')-.3,TL.total,'TERMÓPILAS<small>RESISTIR HASTA EL FINAL</small>','140px']],
  dates:[[T('c1'),T('c2'),'480 a. C.'],[T('f1'),T('f2'),'SALAMINA']],
  counts:[[Tm('c2',.4),T('d1'),()=>['100.000–300.000','PERSAS (ESTIMACIÓN ACTUAL)']],[T('d2'),T('d3'),()=>['300 + 7.000','GRIEGOS EN EL PASO']]],
  names:[[Tm('c2',.1),T('d1'),'JERJES I','REY DE PERSIA'],[Tm('d2',.15),T('d3'),'LEÓNIDAS I','REY DE ESPARTA'],[Tm('r1',.2),T('r2'),'EFIALTES','EL TRAIDOR']],
  quotes:[[T('d3'),E('d3')+.2,'«Ven a tomarlas.»<small>— LEÓNIDAS A JERJES, SEGÚN PLUTARCO</small>']], noCaps:['d3'],
  scenes:[
   [0,t=>frente(t,{keys:[[0,420,1260,2.4,0],[Tm('h1',.5),420,1240,2.2,0],[Tm('h1',.62),620,1100,.95,0,eout],[T('c1'),660,1080,.9,0]],leon:560}),'rgba(255,170,90,.05)'],
   [T('c1'),mapa([[T('c1'),31,39.5,.7],[E('c1'),26,39.2,.85]],t=>{ mapLabel('PERSIA',33,39.3,'#c9a24a',T('c1')+.1,t,{size:60}); mapLabel('GRECIA',21.8,39.6,'#d8c8a0',T('c1')+.3,t,{size:56}); mapLabel('Atenas',23.73,37.98,'#ffcf3a',T('c1')+.5,t,{size:40}); mapLabel('Esparta',22.43,37.07,'#b82127',T('c1')+.6,t,{size:40});
      const k=eio(k01(t,T('c1')+.5,E('c1'))); mapArrow([[28,38.5],[27,39.6],[26.4,40.25],[25,40.8],[23.4,40.4],[22.6,39.3],[22.53,38.8]],k,'#c9a24a',false,16); mapLabel('Sardes',28.03,38.49,'#c9a24a',T('c1')+.4,t,{size:34}); }),'rgba(255,220,160,.04)'],
   [T('c2'),talk({bg:'palacio',keys:[[T('c2'),540,1000,1.0,0],[E('c2'),560,880,1.4,.02]],chars:[{P:JERJES,x:540,look:1,s:1.15,face:()=>({brow:.4,mouth:'s'}),armF:[1.2,1.6]}],
      extra:t=>{ for(let i=0;i<6;i++) person(INMORTAL(i),{x:-140+i*90+(i>2?540:0),y:1500,s:.85,t,look:i>2?-1:1,seed:i,face:{brow:.3}}); }}),'rgba(255,200,120,.05)'],
   [T('d1'),t=>paso(t,{keys:[[T('d1'),560,1000,.62,0],[E('d1'),540,960,1.0,0]],labels:true}),''],
   [T('d2'),march({sky:['#4a78b0','#d8c08a','#e8d0a0'],terrain:'mountain',army:i=>SOLDADO.griego(i),n:12,spacing:150,leader:LEONIDAS,leaderFace:{brow:.7,mouth:'g'},banners:'esparta',far:'#7a6a50',t0:T('d2'),keys:[[T('d2'),560,1000,1.0,0],[E('d2'),700,960,1.12,0]],weather:'dust',weatherN:30}),'rgba(255,190,110,.05)'],
   [T('d3'),talk({bg:'atardecer',keys:[[T('d3'),540,1000,1.0,0],[Tm('d3',.55),540,980,1.05,0],[E('d3'),380,1030,1.8,.02]],chars:[{P:LEONIDAS,x:360,look:1,s:1.05,talkIn:['d3'],face:t=>({brow:.9})},{P:HERALDO,x:780,look:-1,s:1.0,face:()=>({brow:-.3,mouth:'f'}),paper:true}]}),'rgba(255,120,60,.06)'],
   [T('d4'),t=>frente(t,{keys:[[T('d4'),560,1260,1.25,0],[Tm('d4',.5),600,1240,1.35,-.02],[E('d4'),560,1200,1.1,0]],wave:[T('d4'),1.4],clash:true,leon:470}),'rgba(255,160,90,.05)'],
   [T('r1'),march({sky:['#060a18','#10182c','#1a1a2a'],terrain:'mountain',far:'#1c2234',mid:'#232a3a',near:'#2a2a30',ground:'#24222a',army:INMORTAL,n:12,spacing:150,leader:EFIALTES,leaderFace:{brow:-.4,mouth:'n'},t0:T('r1'),keys:[[T('r1'),560,980,1.0,0],[E('r1'),720,960,1.15,0]],weather:null}),'rgba(40,60,140,.18)'],
   [T('r2'),t=>paso(t,{keys:[[T('r2'),520,1000,.7,0],[E('r2'),480,920,.95,0]],flank:[T('r2')-.2,Tm('r2',.55)],leave:[Tm('r2',.45),E('r2')],labels:true}),''],
   [T('r3'),t=>frente(t,{sky:['#2a0e10','#8a3a1e','#c0602a'],keys:[[T('r3'),480,1280,1.8,0],[E('r3')+.4,480,1260,2.3,.03]],nG:5,leon:500,arrows:true}),'rgba(255,90,40,.1)'],
   [T('f1'),t=>{ mapCam([[T('f1'),23.3,38.3,1.2],[E('f1'),23.5,38.0,2.0]],t); mapDraw({colors:{Greece:['#d8c8a0',null]}},t); layer(1); mapLabel('SALAMINA',23.5,37.95,'#ffcf3a',T('f1')+.3,t,{size:46}); mapLabel('Atenas',23.73,37.98,'#d8c8a0',T('f1')+.1,t,{size:34,dy:50});
      for(let i=0;i<8;i++){ const [x,y]=PX(23.35+i*.04,37.85+(i%2)*.04); c.save(); c.translate(x,y); c.scale(.22/CAM.z,.22/CAM.z); ship(0,0,1,'galley',t,i<4?1:-1,i<4?'#f2ead8':'#c9a24a'); c.restore(); } },'rgba(255,220,160,.04)'],
   [T('f2'),talk({bg:'atardecer',keys:[[T('f2'),540,1100,1.6,0],[TL.total,540,1000,1.0,0]],chars:[{P:LEONIDAS,x:540,look:1,s:1.2,face:()=>({brow:.6,mouth:'g'}),armF:[1.4,1.6]}]}),'rgba(255,120,60,.08)'],
  ]}));
