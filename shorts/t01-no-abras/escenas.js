// «No abras la puerta»: corto de terror interactivo. Ficción original. Motor AUTO con dibujos propios.
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
const tel=(x,y)=>(t)=>{ c.save(); c.fillStyle='#0b0d14'; c.strokeStyle='#000'; c.lineWidth=5; rr(x-34,y-60,68,120,10); c.fill(); c.stroke(); c.fillStyle='#cfe0ff'; rr(x-27,y-50,54,100,6); c.fill(); c.restore(); glow(x,y-40,420,'rgba(140,175,255,A)',.3); };
AUTO({tipo:2,P,titulo:['NO ABRAS','LA PUERTA','230px'],final:['¿A O B?','TU DECISIÓN CAMBIA LA HISTORIA','250px'],
 hot:/^(2:17|madrugada|solo|alguien|puerta|yo|abre|frío|voz|hermano|problema|volvería|noche|abres|ahí|mirilla|oscuro|quién|celular|vibra|leíste|mensaje|decidir|harías|a:|b:|apagar|esconderte|llamar|emergencias|alejarte|decisión|historia)$/i,
 golpes:[], nombres:[[3,'VOZ AL OTRO LADO','PARECE TU HERMANO'],[6,'VOZ AL OTRO LADO','???'],[9,'UN SUSURRO','DETRÁS DE LA PUERTA']],
 escenas:[
  {bg:'t01_fuera',cam:'in',extra:(t,k)=>{ oscuro(t,.35); rayo(t+7.1); lluvia(t,.9); reloj(t,k-.25); }},
  {bg:'t01_sala',cam:'orbit',chars:[{p:'prota',x:520,s:1.5,cara:'n'}],extra:(t,k)=>{ tel(690,1420)(t); oscuro(t,.42); lluvia(t,.25); }},
  {bg:'t01_pasillo',cam:'in',extra:(t,k)=>{ oscuro(t,.3); rayo(t+2); const g=G('s2',.5,.95,1.4); for(const x of g){ const d=t-x; if(d>=0&&d<.5){ screen(); txt('¡TOC!',300+g.indexOf(x)*240,780+g.indexOf(x)*40,150,'#fff',1-d*2); layer(1);} } }},
  {cam:'crash',extra:(t,k)=>{ puerta(t,{sombra:1}); ondas(t,540,1000); oscuro(t,.25); }},
  {bg:'t01_pasillo',cam:'orbit',chars:[{p:'prota',x:540,s:1.6,cara:'o'}],extra:(t,k)=>{ oscuro(t,.4); lluvia(t,.2); }},
  {bg:'t01_sala',cam:'detalle',extra:(t,k)=>{ oscuro(t,.6); celular(t,k,'2:18',[['¿Vienes a dormir?',-1],['No voy a volver esta noche. Quédate tranquilo.',.12]]); }},
  {cam:'in',extra:(t,k)=>{ puerta(t,{sombra:1,golpes:G('s5',.5,1.0).concat([T('s6')+.05])}); ondas(t,540,1000); oscuro(t,.25); }},
  {cam:'in',extra:(t,k)=>{ mirilla(t); }},
  {bg:'t01_pasillo',cam:'whip',chars:[{p:'prota',x:540,s:1.6,cara:'o'}],extra:(t,k)=>{ oscuro(t,.45); const d=t-E('s8'); if(d>.3){ const v=d<1.2?1:0; celular(t,(d-.3)/2.4,'2:19',[['No voy a volver esta noche. Quédate tranquilo.',-1],['NO ABRAS. ESTOY VIENDO A ALGUIEN FRENTE A TU CASA.',.28,1]],v); } }},
  {cam:'in',extra:(t,k)=>{ puerta(t,{sombra:1,ojo:1}); oscuro(t,.32); }},
  {cam:'orbit',extra:(t,k)=>{ puerta(t,{sombra:1,pica:clamp((k-.25)*1.6,0,1)}); oscuro(t,.3); }},
  {cam:'detalle',extra:(t,k)=>{ puerta(T('s11'),{sombra:1,pica:1}); oscuro(t,.55); opciones(t,k*2.2); }},
  {cam:'out',extra:(t,k)=>{ puerta(T('s11'),{sombra:1,pica:1}); oscuro(t,.6); }}]});
})();
