// «A la puerta», episodio 2: «No estás solo». Ficción original. Reutiliza los dibujos del episodio 1 (misma casa, puerta, celular y protagonista).
(function(){
const OSC='rgba(4,6,16,.5)';
function lluvia(t,a=.5){ screen(); c.save(); c.strokeStyle=`rgba(170,190,230,${a*.35})`; c.lineWidth=3; for(let i=0;i<70;i++){ const x=mod(rnd(i)*1300+t*260,1300)-110, y=mod(rnd(i*7)*2100+t*(1700+rnd(i*3)*600),2100)-90; c.beginPath(); c.moveTo(x,y); c.lineTo(x-16,y+70); c.stroke(); } c.restore(); }
function rayo(t){ const d=mod(t,7.3); const f=d<.08?1:d<.16?.2:d<.24?.7:d<.6?(.6-d)*.6:0; if(f>0){ screen(); c.fillStyle=`rgba(190,210,255,${f*.3})`; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); } }
function oscuro(t,a=.5){ screen(); c.fillStyle=`rgba(4,6,16,${a})`; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); const g=c.createRadialGradient(540,1000,300,540,1000,1150); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.8)'); c.fillStyle=g; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); layer(1); }
function rr(x,y,w,h,r){ c.beginPath(); c.roundRect(x,y,w,h,r); }
// puerta dibujada: siempre la misma. o.golpes:[tiempos], o.pica: giro del picaporte 0..1, o.sombra: pies bajo la puerta
function puerta(t,o={}){ let sh=0; for(const g of (o.golpes||[])){ const d=t-g; if(d>=0&&d<.3) sh+=Math.sin(d*90)*14*Math.exp(-d*12); }
  c.save(); c.fillStyle='#0a0d18'; c.beginPath(); c.rect(-400,-200,1900,2500); c.fill();
  const wg=c.createLinearGradient(0,0,1080,0); wg.addColorStop(0,'#10162a'); wg.addColorStop(.5,'#1a2440'); wg.addColorStop(1,'#0c1122'); c.fillStyle=wg; c.beginPath(); c.rect(-400,-200,1900,1960); c.fill();
  c.fillStyle='#070912'; c.beginPath(); c.rect(-400,1760,1900,600); c.fill(); c.fillStyle='#0d1222'; c.beginPath(); c.rect(-400,1720,1900,40); c.fill();
  c.translate(sh,0);
  c.fillStyle='#05070e'; c.strokeStyle='#000'; c.lineWidth=10; rr(190,250,700,1520,6); c.fill();
  // rendija de luz bajo la puerta, con la sombra de dos pies
  c.fillStyle='rgba(150,175,230,.75)'; c.beginPath(); c.rect(232,1742,616,16); c.fill(); glow(540,1760,330,'rgba(120,150,230,A)',.22);
  if(o.sombra){ c.fillStyle='rgba(0,0,0,.95)'; for(const k of [-1,1]){ c.beginPath(); c.rect(540+k*80-55+Math.sin(t*1.3)*6,1738,110,24); c.fill(); } }
  const dg=c.createLinearGradient(230,0,850,0); dg.addColorStop(0,'#2a1c16'); dg.addColorStop(.5,'#3a261c'); dg.addColorStop(1,'#1c120e'); c.fillStyle=dg; rr(232,290,616,1450,4); c.fill(); c.stroke();
  c.strokeStyle='rgba(0,0,0,.55)'; c.lineWidth=8; for(const [x,y,w,h] of [[290,360,220,520],[570,360,220,520],[290,1010,220,600],[570,1010,220,600]]){ rr(x,y,w,h,6); c.stroke(); c.fillStyle='rgba(255,255,255,.03)'; rr(x+10,y+10,w-20,h-20,4); c.fill(); }
  c.fillStyle='#0b0806'; c.beginPath(); c.arc(540,860,26,0,7); c.fill(); c.fillStyle='#8a7a4a'; c.beginPath(); c.arc(540,860,17,0,7); c.fill(); c.fillStyle=o.ojo?'#000':'#1a2a4a'; c.beginPath(); c.arc(540,860,9,0,7); c.fill();
  // cerradura y picaporte
  c.fillStyle='#8a7a4a'; c.strokeStyle='#000'; c.lineWidth=6; rr(742,1010,70,190,12); c.fill(); c.stroke(); c.fillStyle='#000'; c.beginPath(); c.arc(777,1160,9,0,7); c.fill();
  c.save(); c.translate(777,1060); c.rotate((o.pica||0)*.6+(o.pica?Math.sin(t*26)*.03*o.pica:0)); c.fillStyle='#b8a45e'; rr(-150,-17,170,34,17); c.fill(); c.stroke(); c.beginPath(); c.arc(0,0,27,0,7); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.3)'; rr(-135,-11,110,7,4); c.fill(); c.restore();
  if(o.pica) glow(700,1060,260,'rgba(255,220,140,A)',.16*o.pica);
  c.restore(); }
function ondas(t,x,y,col='rgba(200,215,255,A)'){ for(let i=0;i<3;i++){ const q=mod(t*1.4+i/3,1); c.strokeStyle=col.replace('A',(1-q)*.7); c.lineWidth=7; c.beginPath(); c.arc(x,y,60+q*240,-.7,.7); c.stroke(); c.beginPath(); c.arc(x,y,60+q*240,Math.PI-.7,Math.PI+.7); c.stroke(); } }
function partir(s,max){ const w=s.split(' '), out=[]; let l=''; for(const x of w){ if(c.measureText(l+' '+x).width>max&&l){ out.push(l); l=x; } else l=l?l+' '+x:x; } out.push(l); return out; }
// celular en primer plano con mensajes: msgs=[[texto, aparece(0..1), alerta]]
function celular(t,q,hora,msgs,vib=0){ screen(); c.save(); const a=eio(clamp(q*4,0,1)); c.globalAlpha=a; c.translate(540+Math.sin(t*70)*10*vib,1000+(1-a)*500); c.rotate(-.03+Math.sin(t*.9)*.01+Math.sin(t*64)*.012*vib);
  glow(0,0,900,'rgba(120,160,255,A)',.28); c.fillStyle='#0b0d14'; c.strokeStyle='#000'; c.lineWidth=12; rr(-400,-720,800,1440,70); c.fill(); c.stroke(); c.fillStyle='#e9edf5'; rr(-366,-680,732,1360,44); c.fill();
  c.fillStyle='#1e2a44'; rr(-366,-680,732,170,44); c.fill(); c.beginPath(); c.rect(-366,-590,732,80); c.fill(); c.fillStyle='#7f93c8'; c.beginPath(); c.arc(-280,-596,46,0,7); c.fill(); c.fillStyle='#fff'; c.font='800 52px Montserrat'; c.textAlign='left'; c.fillText('Hermano',-210,-600); c.font='600 30px Montserrat'; c.fillStyle='#b8c4e4'; c.fillText('en línea',-210,-556); c.textAlign='right'; c.fillStyle='#fff'; c.font='600 34px Montserrat'; c.fillText(hora,330,-630);
  let y=-440; for(const [s,en,al] of msgs){ const m=eio(clamp((q-en)*8,0,1)); c.font=`800 ${al?62:50}px Montserrat`; const ls=partir(s,560), lh=al?76:62, h=ls.length*lh+56; if(m>0){ c.save(); c.globalAlpha=a*m; c.translate(0,(1-m)*40); c.fillStyle=al?'#c8102e':'#fff'; c.strokeStyle=al?'#5a0612':'#c8cfde'; c.lineWidth=5; rr(-330,y,640,h,30); c.fill(); c.stroke(); c.fillStyle=al?'#fff':'#141820'; c.textAlign='left'; ls.forEach((l,i)=>c.fillText(l,-296,y+lh*(i+1)-6)); c.font='600 28px Montserrat'; c.fillStyle=al?'#ffd0d6':'#7a8296'; c.textAlign='right'; c.fillText(al?'2:19':'23:41',290,y+h-14); c.restore(); } y+=h+34; }
  c.restore(); layer(1); }
function reloj(t,q){ screen(); c.save(); c.globalAlpha=clamp(q*5,0,1); c.fillStyle='#07080c'; c.strokeStyle='#000'; c.lineWidth=10; rr(250,1010,580,250,26); c.fill(); c.stroke(); glow(540,1135,420,'rgba(255,40,40,A)',.25); c.fillStyle='#ff2a2a'; c.font='210px Anton'; c.textAlign='center'; c.shadowColor='#ff2a2a'; c.shadowBlur=30; c.fillText(mod(t,1)<.5?'2:17':'2 17',500,1215); c.font='70px Anton'; c.fillText('AM',740,1215); c.restore(); layer(1); }
function mirilla(t){ screen(); c.fillStyle='#000'; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); c.save(); c.beginPath(); c.arc(540,900,430,0,7); c.clip(); const g=c.createRadialGradient(540,860,40,540,900,430); g.addColorStop(0,'#27324e'); g.addColorStop(.6,'#0e1424'); g.addColorStop(1,'#020308'); c.fillStyle=g; c.beginPath(); c.rect(0,400,1080,1000); c.fill();
  c.fillStyle='rgba(8,10,20,.9)'; c.beginPath(); c.rect(0,1080,1080,400); c.fill(); c.fillStyle='rgba(180,200,255,.12)'; c.beginPath(); c.ellipse(760,640,26,26,0,0,7); c.fill(); glow(760,640,220,'rgba(160,190,255,A)',.25+Math.sin(t*9)*.08);
  // una forma oscura, sin rasgos: no se sabe quién es
  c.fillStyle='rgba(0,0,0,.82)'; c.filter='blur(14px)'; c.beginPath(); c.arc(520+Math.sin(t*.8)*8,800,120,0,7); c.fill(); c.beginPath(); c.moveTo(360,1400); c.quadraticCurveTo(380,930,520,920); c.quadraticCurveTo(680,930,700,1400); c.fill(); c.filter='none';
  c.strokeStyle='rgba(170,190,230,.25)'; c.lineWidth=3; for(let i=0;i<40;i++){ const x=mod(rnd(i)*900+t*200,900)+90, y=mod(rnd(i*7)*900+t*1500,900)+450; c.beginPath(); c.moveTo(x,y); c.lineTo(x-10,y+50); c.stroke(); }
  c.restore(); c.strokeStyle='#1a1a1a'; c.lineWidth=40; c.beginPath(); c.arc(540,900,445,0,7); c.stroke(); c.strokeStyle='rgba(255,255,255,.07)'; c.lineWidth=6; c.beginPath(); c.arc(540,900,420,3.6,4.6); c.stroke(); layer(1); }
function opciones(t,q){ screen(); const R=[['A','Apagar todas las luces','y esconderte.','#2a5ab8'],['B','Llamar a emergencias','y alejarte de la puerta.','#c8102e']]; R.forEach(([l,a,b,col],i)=>{ const m=eio(clamp((q-.05-i*.3)*5,0,1)); if(m<=0) return; c.save(); c.globalAlpha=m; c.translate((1-m)*(i?300:-300),0); const y=470+i*470; c.fillStyle='rgba(6,8,16,.93)'; c.strokeStyle=col; c.lineWidth=12; rr(70,y,940,400,40); c.fill(); c.stroke(); c.fillStyle=col; c.beginPath(); c.arc(215,y+200,115,0,7); c.fill(); c.fillStyle='#fff'; c.font='190px Anton'; c.textAlign='center'; c.fillText(l,215,y+270); c.textAlign='left'; c.font='800 47px Montserrat'; c.fillText(a,355,y+180); c.font='600 44px Montserrat'; c.fillStyle='#dfe4f2'; c.fillText(b,360,y+260); c.restore(); }); layer(1); }
const G=(id,...o)=>o.map(x=>E(id)+x);
const P={prota:{top:'#3a4a6a',sleeve:'#3a4a6a',legs:'#1c2030',hair:'short',hairCol:'#2a1a10',buttons:false,belt:false,h:540}};
const fono=(ex,ey)=>{ c.save(); c.translate(ex,ey-30); c.rotate(.15); c.fillStyle='#0b0d14'; c.strokeStyle='#000'; c.lineWidth=5; rr(-30,-62,60,112,10); c.fill(); c.stroke(); c.fillStyle='#cfe0ff'; rr(-23,-53,46,94,6); c.fill(); c.restore(); glow(ex,ey-60,460,'rgba(140,175,255,A)',.3); };
// protagonista con poses propias: o.tiembla, o.salto (px), o.walk, o.armF
const YO=(t,o)=>cabezon(P.prota,{x:o.x+(o.tiembla?Math.sin(t*41)*5*o.tiembla:0),y:(o.y||1720)-(o.salto||0)+Math.sin(t*1.8)*3,s:o.s||1.5,t,look:o.look||1,seed:3,walk:o.walk,face:o.face,armF:o.armF,armB:o.armB,hold:o.hold});
function sofa(){ c.save(); c.fillStyle='#141a2c'; c.strokeStyle='#05070e'; c.lineWidth=12; rr(60,1180,960,520,60); c.fill(); c.stroke(); c.fillStyle='rgba(255,255,255,.04)'; rr(110,1220,860,200,40); c.fill(); c.restore(); }
function sofaFrente(){ c.save(); c.fillStyle='#1a2238'; c.strokeStyle='#05070e'; c.lineWidth=12; rr(20,1560,1040,420,50); c.fill(); c.stroke(); for(const x of [-10,880]){ c.fillStyle='#202a44'; rr(x,1400,210,600,70); c.fill(); c.stroke(); } c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=6; c.beginPath(); c.moveTo(540,1570); c.lineTo(540,1900); c.stroke(); c.restore(); }
// plano sobre el hombro: nuca y hombro del protagonista en primer plano, respirando o temblando
function hombro(t,o={}){ screen(); c.save(); const tb=(o.tiembla||0), bx=Math.sin(t*39)*5*tb, by=Math.sin(t*1.9)*10+(o.dy||0)-(o.salto||0); c.translate(850+bx+(o.dx||0),1790+by); c.scale(o.s||1,o.s||1); c.filter='blur(3px)';
  c.fillStyle='#0c1220'; c.strokeStyle='#000'; c.lineWidth=14; c.beginPath(); c.moveTo(-420,420); c.quadraticCurveTo(-380,60,-150,40); c.lineTo(170,40); c.quadraticCurveTo(380,60,420,420); c.closePath(); c.fill(); c.stroke();
  c.fillStyle='#b89a74'; for(const k of [-1,1]){ c.beginPath(); c.ellipse(k*262,-170,40,58,0,0,7); c.fill(); c.stroke(); } c.fillStyle='#1c120c'; c.beginPath(); c.arc(0,-200,268,0,7); c.fill(); c.stroke();
  c.strokeStyle='rgba(130,160,235,.35)'; c.lineWidth=10; c.beginPath(); c.arc(0,-200,246,Math.PI*1.08,Math.PI*1.5); c.stroke(); c.strokeStyle='rgba(130,160,235,.2)'; c.beginPath(); c.moveTo(-330,150); c.quadraticCurveTo(-300,70,-150,60); c.stroke(); c.filter='none'; c.restore(); layer(1); }
function toc(t,g){ for(const x of g){ const d=t-x; if(d>=0&&d<.5){ screen(); txt('¡TOC!',250+g.indexOf(x)*150,560+g.indexOf(x)*110,150,'#fff',1-d*2); layer(1);} } }
const salto=(t,g)=>g.reduce((a,x)=>{ const d=t-x; return a+(d>=0&&d<.5?Math.sin(d*Math.PI/.5)*46*Math.exp(-d*3):0); },0);

// linterna: todo oscuro salvo un círculo de luz
function linterna(t,x,y,r,a=.93){ screen(); const g=c.createRadialGradient(x,y,r*.15,x,y,r); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.7,`rgba(2,3,8,${a*.6})`); g.addColorStop(1,`rgba(2,3,8,${a})`); c.fillStyle=g; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); layer(1); }
// celular con contacto propio y mensajes enviados (yo=true, a la derecha y en azul)
function chat(t,q,hora,nombre,msgs,vib=0){ screen(); c.save(); const a=eio(clamp(q*4,0,1)); c.globalAlpha=a; c.translate(540+Math.sin(t*70)*10*vib,1000+(1-a)*500); c.rotate(-.03+Math.sin(t*.9)*.01+Math.sin(t*64)*.012*vib);
  glow(0,0,900,'rgba(120,160,255,A)',.28); c.fillStyle='#0b0d14'; c.strokeStyle='#000'; c.lineWidth=12; rr(-400,-720,800,1440,70); c.fill(); c.stroke(); c.fillStyle='#e9edf5'; rr(-366,-680,732,1360,44); c.fill();
  c.fillStyle='#1e2a44'; rr(-366,-680,732,170,44); c.fill(); c.beginPath(); c.rect(-366,-590,732,80); c.fill(); c.fillStyle='#c88aa8'; c.beginPath(); c.arc(-280,-596,46,0,7); c.fill(); c.fillStyle='#fff'; c.font='800 52px Montserrat'; c.textAlign='left'; c.fillText(nombre,-210,-600); c.font='600 30px Montserrat'; c.fillStyle='#b8c4e4'; c.fillText('en línea',-210,-556); c.textAlign='right'; c.fillStyle='#fff'; c.font='600 34px Montserrat'; c.fillText(hora,330,-630);
  let y=-470; for(const [s,en,yo] of msgs){ const m=eio(clamp((q-en)*8,0,1)); c.font='800 46px Montserrat'; const ls=partir(s,520), lh=58, h=ls.length*lh+46; if(m>0){ c.save(); c.globalAlpha=a*m; c.translate(0,(1-m)*40); const x0=yo?-250:-330; c.fillStyle=yo?'#3a6ad8':'#fff'; c.strokeStyle=yo?'#2a4aa8':'#c8cfde'; c.lineWidth=5; rr(x0,y,580,h,30); c.fill(); c.stroke(); c.fillStyle=yo?'#fff':'#141820'; c.textAlign='left'; ls.forEach((l,i)=>c.fillText(l,x0+30,y+lh*(i+1)-4)); c.restore(); } y+=h+26; }
  c.restore(); layer(1); }
function llamada(t,q,t0){ screen(); c.save(); const a=eio(clamp(q*4,0,1)); c.globalAlpha=a; c.translate(540,1000+(1-a)*500); c.rotate(-.03+Math.sin(t*.9)*.01); glow(0,0,900,'rgba(120,255,160,A)',.2);
  c.fillStyle='#0b0d14'; c.strokeStyle='#000'; c.lineWidth=12; rr(-400,-720,800,1440,70); c.fill(); c.stroke(); const g=c.createLinearGradient(0,-680,0,680); g.addColorStop(0,'#14301e'); g.addColorStop(1,'#0a1410'); c.fillStyle=g; rr(-366,-680,732,1360,44); c.fill();
  c.fillStyle='#fff'; c.textAlign='center'; c.font='600 40px Montserrat'; c.fillText('Llamada en curso',0,-420); c.font='800 86px Montserrat'; c.fillText('EMERGENCIAS',0,-300); const s=Math.max(0,Math.floor(t-t0)); c.font='600 56px Montserrat'; c.fillStyle='#9ae8b4'; c.fillText(`00:${String(s).padStart(2,'0')}`,0,-200);
  for(let i=0;i<3;i++){ const r=120+mod(t*90+i*60,180); c.strokeStyle=`rgba(154,232,180,${1-r/300})`; c.lineWidth=6; c.beginPath(); c.arc(0,120,r,0,7); c.stroke(); } c.fillStyle='#c8102e'; c.beginPath(); c.arc(0,470,90,0,7); c.fill(); c.restore(); layer(1); }
function temporizador(t,q,seg){ screen(); c.save(); c.globalAlpha=clamp(q*5,0,1); c.fillStyle='rgba(6,6,10,.85)'; c.strokeStyle='#ff2a2a'; c.lineWidth=8; rr(260,1010,560,240,30); c.fill(); c.stroke(); c.fillStyle='#ff2a2a'; c.shadowColor='#ff2a2a'; c.shadowBlur=30; c.font='190px Anton'; c.textAlign='center'; const m=Math.floor(seg/60), s=seg%60; c.fillText(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,540,1200); c.restore(); layer(1); }
// luz cálida que se enciende arriba de la escalera
function luzArriba(t,q){ if(q<=0) return; screen(); const f=q<.15?(Math.sin(t*90)>0?1:.2):1; glow(540,330,520,'rgba(255,200,120,A)',.55*f); c.fillStyle=`rgba(255,215,150,${.55*f})`; c.beginPath(); c.moveTo(380,200); c.lineTo(700,200); c.lineTo(760,520); c.lineTo(320,520); c.closePath(); c.fill(); layer(1); }
// sombra en la pared, sin rasgos
function sombra(t,q,x0,x1){ if(q<=0) return; screen(); c.save(); c.filter='blur(18px)'; c.fillStyle=`rgba(0,0,0,${.75*Math.sin(Math.PI*clamp(q,0,1))})`; const x=lerp(x0,x1,q); c.beginPath(); c.arc(x,560,90,0,7); c.fill(); c.beginPath(); c.ellipse(x,900,150,300,0,0,7); c.fill(); c.filter='none'; c.restore(); layer(1); }
// silueta inmóvil tras las cajas; al final inclina la cabeza
function silueta(t,q){ screen(); c.save(); c.filter='blur(3px)'; c.fillStyle='#030305'; const inc=eio(clamp((q-.55)*3,0,1))*.35; c.save(); c.translate(820,880); c.rotate(inc); c.beginPath(); c.arc(0,0,95,0,7); c.fill(); c.restore(); c.beginPath(); c.ellipse(820,1260,190,330,0,0,7); c.fill(); c.filter='none';
  c.fillStyle='#4a3622'; c.strokeStyle='#1a120a'; c.lineWidth=8; for(const [x,y,w,h] of [[560,1180,330,280],[640,1440,420,300],[300,1400,360,340]]){ c.fillRect(x,y,w,h); c.strokeRect(x,y,w,h); c.beginPath(); c.moveTo(x,y+h*.35); c.lineTo(x+w,y+h*.35); c.stroke(); } c.restore(); layer(1); }
function sacudida(t,at){ const d=t-at; return d>=0&&d<.4?Math.sin(d*80)*20*Math.exp(-d*8):0; }
AUTO({tipo:2,P,titulo:['A LA PUERTA','EPISODIO 2','230px'],final:['NO ESTÁS SOLO','PARTE 3: ABRE LA PUERTA','170px'],
 hot:/^(manija|afuera|entrar|hermano|patrulla|quince|minutos|seguro|aguantar|sótano|puerta|hola|celular|vibró|madre|mensaje|arriba|luz|linterna|pasos|abajo|abre|yo|casa|caminando|piso|solo)$/i,
 golpes:[], nombres:[[1,'TÚ','SUSURRANDO'],[2,'OPERADORA','EMERGENCIAS'],[10,'VOZ DESCONOCIDA','DESDE ARRIBA'],[12,'LA VOZ DE AFUERA','DETRÁS DE LA PUERTA']],
 escenas:[
  {cam:'in',extra:(t,k)=>{ puerta(t,{sombra:1,pica:clamp(1-k*2.5,0,1)}); oscuro(t,.3); hombro(t,{tiembla:1.2,dy:lerp(80,200,eio(k)),s:lerp(.95,.85,k)}); }},
  {cam:'detalle',extra:(t,k)=>{ oscuro(t,.6); llamada(t,k,T('s1')); }},
  {bg:'t01_pasillo',cam:'espalda',extra:(t,k)=>{ YO(t,{x:540,s:1.6,tiembla:.7,face:{eyes:'o',mouth:'f',brow:-.6},armF:[2.6,2.7],armB:[-.3,-.2],hold:fono}); oscuro(t,.45); lluvia(t,.2); }},
  {cam:'out',extra:(t,k)=>{ puerta(t,{sombra:1}); oscuro(t,.35); temporizador(t,k,900-Math.floor(k*4)); }},
  {bg:'t02_escaleras',cam:'baja',extra:(t,k)=>{ YO(t,{x:540,y:lerp(1500,1900,eio(k)),s:lerp(1.4,1.1,k),walk:t*5,look:-1,face:{eyes:'o',mouth:'n'},armF:[1.6,1.7],hold:fono}); linterna(t,540,lerp(1100,1350,k),lerp(700,520,k)); }},
  {bg:'t02_sotano',cam:'orbit',extra:(t,k)=>{ const d=t-E('s4')-.9; YO(t,{x:500,s:1.5,look:d>0?-1:1,tiembla:d>0?.6:0,face:{eyes:'o',mouth:'o',brow:-.5},armF:[1.7,1.8],hold:fono}); linterna(t,lerp(620,780,k),900,560); }},
  {cam:'detalle',extra:(t,k)=>{ oscuro(t,.75); chat(t,k,'2:24','Mamá',[['¿Estás en casa?',.05],['Sí. ¿Dónde estás? Hay alguien intentando entrar.',.32,1],['Estoy intentando llegar. No salgas del sótano.',.62]],k<.1?1:0); }},
  {cam:'in',extra:(t,k)=>{ oscuro(t,.75); chat(t,1,'2:25','Mamá',[['¿Estás en casa?',-1],['Sí. ¿Dónde estás? Hay alguien intentando entrar.',-1,1],['Estoy intentando llegar. No salgas del sótano.',-1],['Y por favor, no enciendas la luz del pasillo.',.12+ (k*0)]].map((m,i)=>i===3?[m[0],k>.15?-1:2,0]:m),k<.15?1:0); }},
  {bg:'t02_abajo',cam:'sube',extra:(t,k)=>{ oscuro(t,.5); luzArriba(t,clamp((k-.25)*3,0,1)); }},
  {bg:'t02_sotano',cam:'pasa',extra:(t,k)=>{ YO(t,{x:420,s:1.5,tiembla:1,face:{eyes:'o',mouth:'n',brow:-.8},armF:[2.6,2.7],armB:[-2.6,-2.7]}); linterna(t,420,1250,lerp(520,240,clamp(k*3,0,1)),.97); }},
  {bg:'t02_abajo',cam:'detalle',extra:(t,k)=>{ oscuro(t,.45); luzArriba(t,1); sombra(t,clamp(k*1.4,0,1),360,700); const s=sacudida(t,E('s10')+.9); if(s){ screen(); c.fillStyle='rgba(255,255,255,.08)'; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); layer(1); } }},
  {cam:'detalle',extra:(t,k)=>{ oscuro(t,.8); chat(t,k,'2:27','Mamá',[['Y por favor, no enciendas la luz del pasillo.',-1],['Hijo, ya estoy en casa.',.08]],k<.12?1:0); }},
  {bg:'t02_sotano',cam:'in',extra:(t,k)=>{ YO(t,{x:540,s:1.7,look:-1,tiembla:1.3,face:{eyes:'o',mouth:'o',brow:-.9},armF:[1.8,1.9],hold:fono}); linterna(t,540,1150,620,.95); }},
  {bg:'t02_abajo',cam:'in',extra:(t,k)=>{ oscuro(t,.5); luzArriba(t,1); }},
  {bg:'t02_esquina',cam:'detalle',extra:(t,k)=>{ oscuro(t,.55); silueta(t,k); if(k>.88){ screen(); c.fillStyle='#000'; c.beginPath(); c.rect(0,0,1080,1920); c.fill(); layer(1); } }}]});
})();
