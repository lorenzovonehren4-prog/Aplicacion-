// Motor común de los shorts: personajes, ejércitos, mapas, vehículos, efectos, cámara, subtítulos y rótulos.
// Cada vídeo trae su escena.html (que carga mundo.js, motor.js y escenas.js) y llama a MOTOR.run(cfg).
const W=1080, H=1920, $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,k)=>a+(b-a)*k, k01=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, eout=k=>1-Math.pow(1-k,3), ein=k=>k*k*k, esm=k=>k*k*(3-2*k);
const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)}, mod=(a,n)=>((a%n)+n)%n;
let TL, S={}, c, fxc, TT=0, SHAKE=0, CAM={x:540,y:960,z:1,r:0};
const T=id=>S[id].start, D=id=>S[id].dur, E=id=>S[id].start+S[id].dur;

// ---------------- DOM y estilos ----------------
(function(){
  const css=`*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1920px;overflow:hidden;background:#000}
#stage{position:absolute;inset:0;overflow:hidden;font-family:Inter,sans-serif;font-weight:900}canvas,.ov{position:absolute;inset:0;width:1080px;height:1920px;pointer-events:none}
#vig{background:radial-gradient(ellipse at 50% 46%,transparent 45%,rgba(0,0,0,.62) 100%)}
.txt{position:absolute;left:0;width:1080px;text-align:center;color:#fff;-webkit-text-stroke:16px #000;paint-order:stroke fill;line-height:1.04;text-shadow:0 8px 0 #000}
#cap{top:1215px;font-size:84px;padding:0 60px;text-transform:uppercase;letter-spacing:-1px}#cap b{color:#ffcf3a;font-weight:900}#cap .on{display:inline-block;background:#ffcf3a;color:#14100c;-webkit-text-stroke:0;padding:0 14px 4px;border-radius:14px;box-shadow:0 8px 0 #000;transform:scale(1.08) rotate(-2deg);text-shadow:none}
#quote{top:1240px;font-size:72px;padding:0 80px;color:#fff3d6;font-style:italic;letter-spacing:-1px}#quote small{display:block;font-size:42px;color:#ffcf3a;font-style:normal;margin-top:22px;-webkit-text-stroke:10px #000;letter-spacing:2px}
#date{top:170px;font-size:150px;color:#ffcf3a;-webkit-text-stroke:22px #000;letter-spacing:-4px}
#title{top:250px;font-size:200px;color:#fff;-webkit-text-stroke:24px #000;letter-spacing:4px;padding:0 30px}#title small{display:block;font-size:54px;color:#ffcf3a;letter-spacing:8px;-webkit-text-stroke:12px #000;margin-top:12px}
#lower{position:absolute;left:60px;top:1010px;padding:16px 30px 18px;background:#14100c;border-left:14px solid #ffcf3a;color:#fff;font-size:52px;letter-spacing:1px;box-shadow:0 10px 0 #000;white-space:nowrap}#lower small{display:block;font-size:30px;color:#ffcf3a;letter-spacing:4px;margin-top:4px}
#count{top:300px;font-size:116px;-webkit-text-stroke:18px #000;padding:0 40px}#count small{display:block;font-size:44px;color:#ffcf3a;-webkit-text-stroke:10px #000;letter-spacing:3px}
#tag{position:absolute;right:28px;top:34px;font-size:24px;color:#ffffffaa;letter-spacing:2px;font-weight:700}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  document.body.innerHTML=`<div id="stage"><canvas id="sc" width="1080" height="1920"></canvas><canvas id="fx" width="1080" height="1920"></canvas><div class="ov" id="grade"></div><div class="ov" id="vig"></div>
<div class="txt" id="title"></div><div class="txt" id="date"></div><div class="txt" id="count"></div><div id="lower"></div><div class="txt" id="quote"></div><div class="txt" id="cap"></div><div id="tag"></div>
<div class="ov" id="flash" style="background:#fff;opacity:0"></div><div class="ov" id="dark" style="background:#000;opacity:0"></div></div>`;
  c=$('sc').getContext('2d'); fxc=$('fx').getContext('2d');
})();

// ---------------- cámara ----------------
function camAt(keys,t){ if(t<=keys[0][0]) return keys[0]; for(let i=0;i<keys.length-1;i++){ const a=keys[i],b=keys[i+1]; if(t<=b[0]){ const e=(b[5]||eio)(k01(t,a[0],b[0])); return [t,lerp(a[1],b[1],e),lerp(a[2],b[2],e),lerp(a[3],b[3],e),lerp(a[4]||0,b[4]||0,e)]; } } return keys[keys.length-1]; }
function setCam(keys,t){ const k=camAt(keys,t); CAM={x:k[1],y:k[2],z:k[3],r:k[4]||0}; }
function layer(d){ const z=Math.pow(CAM.z,d), sx=SHAKE*(Math.sin(TT*63)+Math.sin(TT*41.7))*.5, sy=SHAKE*(Math.sin(TT*57)+Math.sin(TT*33.1))*.5;
  c.setTransform(1,0,0,1,0,0); c.translate(W/2+sx,H/2+sy); c.rotate(CAM.r*d); c.scale(z,z); c.translate(-(W/2+(CAM.x-W/2)*d),-(H/2+(CAM.y-H/2)*d)); }
function screen(){ c.setTransform(1,0,0,1,0,0); }

// ---------------- piezas ----------------
function grad(c0,c1,c2){ screen(); const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,c0); g.addColorStop(.62,c1); g.addColorStop(1,c2||c1); c.fillStyle=g; c.fillRect(0,0,W,H); }
function glow(x,y,r,col,a){ if(a<=0||r<=0) return; c.save(); c.globalCompositeOperation='lighter'; const g=c.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col.replace('A',a)); g.addColorStop(1,col.replace('A',0)); c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill(); c.restore(); }
function flame(x,y,w,h,t,seed){ c.save(); c.globalCompositeOperation='lighter';
  for(const [sc,col] of [[1,'rgba(255,70,10,.8)'],[.7,'rgba(255,155,30,.85)'],[.4,'rgba(255,238,160,.9)']]){ const hh=h*sc*(.85+.15*Math.sin(t*11+seed*3)), ww=w*sc, tip=Math.sin(t*7.3+seed)*w*.22;
    c.fillStyle=col; c.beginPath(); c.moveTo(x-ww/2,y); c.bezierCurveTo(x-ww*.7,y-hh*.45,x-ww*.1+tip*.4,y-hh*.6,x+tip,y-hh); c.bezierCurveTo(x+ww*.2+tip*.3,y-hh*.55,x+ww*.75,y-hh*.4,x+ww/2,y); c.closePath(); c.fill(); } c.restore(); }
function smoke(x,y,r,t,seed,a=.5,col='20,16,18'){ for(let i=0;i<7;i++){ const k=mod(t*.22+rnd(i*3+seed),1); c.fillStyle=`rgba(${col},${a*(1-k)})`; c.beginPath(); c.arc(x+Math.sin(i+t*.7+seed)*r*.6+k*r*.8,y-k*r*5,r*(.6+k*1.3),0,7); c.fill(); } }
function column(x,top,bot,w,col,shade){ c.fillStyle=col; c.fillRect(x-w/2,top,w,bot-top); c.fillStyle=shade; for(let i=-2;i<=2;i++) c.fillRect(x+i*w*.18-3,top,6,bot-top); c.fillStyle=col; c.fillRect(x-w*.65,top-30,w*1.3,34); c.fillRect(x-w*.65,bot-10,w*1.3,30); c.strokeStyle='#0b0806'; c.lineWidth=5; c.strokeRect(x-w/2,top,w,bot-top); c.strokeRect(x-w*.65,top-30,w*1.3,34); }
function mountains(base,n,hmin,hmax,col,snow,seed,width=2600,x0=-760){ for(let i=0;i<n;i++){ const cx=x0+i*width/n+rnd(seed+i)*80, h=hmin+rnd(seed*3+i)*(hmax-hmin), w=h*1.25;
  c.fillStyle=col; c.beginPath(); c.moveTo(cx-w,base); c.lineTo(cx,base-h); c.lineTo(cx+w,base); c.fill();
  if(snow){ c.fillStyle=snow; c.beginPath(); c.moveTo(cx,base-h); c.lineTo(cx-w*.32,base-h*.68); c.lineTo(cx-w*.12,base-h*.74); c.lineTo(cx+w*.05,base-h*.64); c.lineTo(cx+w*.3,base-h*.7); c.closePath(); c.fill(); } } }
function hills(base,amp,col,seed,x0=-900,x1=3200){ c.fillStyle=col; c.beginPath(); c.moveTo(x0,base); for(let x=x0;x<=x1;x+=60) c.lineTo(x,base-amp*(.5+.5*Math.sin(x*.004+seed)*Math.cos(x*.0017+seed*2))); c.lineTo(x1,3000); c.lineTo(x0,3000); c.fill(); }
function particles(kind,t,n=160){ screen(); for(let i=0;i<n;i++){ const sp=.5+rnd(i)*1.5;
  if(kind==='snow'){ const x=mod(rnd(i*3)*W*1.4-t*300*sp,W*1.4)-100, y=mod(rnd(i*7)*H+t*160*sp,H); c.fillStyle=`rgba(255,255,255,${.5+rnd(i*5)*.5})`; c.beginPath(); c.arc(x,y,2+rnd(i*9)*5,0,7); c.fill(); }
  else if(kind==='rain'){ const x=mod(rnd(i*3)*W*1.3-t*240*sp,W*1.3)-100, y=mod(rnd(i*7)*H+t*1500*sp,H); c.strokeStyle='rgba(190,210,235,.45)'; c.lineWidth=2; c.beginPath(); c.moveTo(x,y); c.lineTo(x-10,y+38); c.stroke(); }
  else if(kind==='embers'){ const k=mod(t*.2*sp+rnd(i),1); c.fillStyle=`rgba(255,${130+rnd(i*3)*100|0},50,${(1-k)*.85})`; c.beginPath(); c.arc(mod(rnd(i*5)*W+Math.sin(t+i)*40,W),H-k*H*1.1,2+rnd(i*7)*4,0,7); c.fill(); }
  else if(kind==='dust'){ const k=mod(t*.08*sp+rnd(i),1); c.fillStyle=`rgba(210,190,140,${.12*(1-Math.abs(k-.5)*2)})`; c.beginPath(); c.arc(mod(rnd(i*5)*W+t*40*sp,W+200)-100,rnd(i*7)*H,30+rnd(i)*80,0,7); c.fill(); }
  else if(kind==='ash'){ const x=mod(rnd(i*3)*W*1.2-t*40*sp,W*1.2)-80, y=mod(rnd(i*7)*H+t*60*sp,H); c.fillStyle=`rgba(80,76,72,${.6})`; c.fillRect(x,y,4,4); } } }
function explosion(x,y,r,age){ if(age<0||age>2.5) return; const k=eout(clamp(age/.35,0,1)), f=Math.exp(-age*1.4);
  glow(x,y,r*4*k,'rgba(255,200,120,A)',.9*f); c.save(); c.globalCompositeOperation='lighter';
  for(let i=0;i<12;i++){ const a=i/12*6.283+rnd(i)*.5, d=r*(.2+.6*rnd(i*3))*k; c.fillStyle=`rgba(255,${120+rnd(i*5)*110|0},40,${.7*f})`; c.beginPath(); c.arc(x+Math.cos(a)*d,y+Math.sin(a)*d*.8,r*(.35+.25*rnd(i*7))*k,0,7); c.fill(); } c.restore();
  for(let i=0;i<6;i++){ const q=clamp(age-.2,0,3); c.fillStyle=`rgba(30,26,26,${.55*Math.exp(-q*.6)})`; c.beginPath(); c.arc(x+(rnd(i*4)-.5)*r*1.2,y-q*r*.9-rnd(i)*r*.4,r*(.5+q*.5),0,7); c.fill(); } }
function shockRing(x,y,r,a,w=40){ if(a<=0||r<=0) return; c.save(); c.globalCompositeOperation='lighter'; c.strokeStyle=`rgba(255,235,200,${a})`; c.lineWidth=w; c.beginPath(); c.arc(x,y,r,0,7); c.stroke(); c.restore(); }
// misil en arco: k de 0 a 1
function missile(x0,y0,x1,y1,k,hgt,col='#ffd27a',size=1){ if(k<=0||k>1) return; const pt=q=>[lerp(x0,x1,q),lerp(y0,y1,q)-Math.sin(q*Math.PI)*hgt];
  c.save(); c.lineCap='round'; for(let i=0;i<14;i++){ const q=k-i*.012; if(q<0) break; const [a,b]=pt(q); c.fillStyle=`rgba(240,235,230,${.45*(1-i/14)})`; c.beginPath(); c.arc(a,b,(6+i*1.6)*size,0,7); c.fill(); }
  const [x,y]=pt(k), [xb,yb]=pt(Math.max(0,k-.01)); glow(x,y,40*size,'rgba(255,190,90,A)',.9); c.translate(x,y); c.rotate(Math.atan2(y-yb,x-xb)); c.fillStyle='#e8e8ea'; c.strokeStyle='#0b0806'; c.lineWidth=3; c.beginPath(); c.roundRect(-22*size,-5*size,34*size,10*size,4); c.fill(); c.stroke(); c.fillStyle=col; c.beginPath(); c.moveTo(12*size,-5*size); c.lineTo(22*size,0); c.lineTo(12*size,5*size); c.fill(); c.restore(); }

// ---------------- atmósfera ----------------
function lum(hex){ if(!hex||hex[0]!=='#') return .5; const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255); return .2126*v[0]+.7152*v[1]+.0722*v[2]; }
function clouds(t,y0,dark){ for(let i=0;i<7;i++){ const x=mod(rnd(i*3)*2600+t*(14+rnd(i)*20),2900)-900, y=y0+rnd(i*7)*380, s=.7+rnd(i*5)*.9; c.fillStyle=dark?'rgba(140,150,190,.16)':'rgba(255,255,255,.55)'; for(let j=0;j<5;j++){ c.beginPath(); c.ellipse(x+j*70*s,y+Math.sin(j*1.7+i)*18*s,110*s,48*s,0,0,7); c.fill(); } } }
function rays(t,x,y,a=.09){ c.save(); c.globalCompositeOperation='lighter'; for(let i=0;i<6;i++){ const ang=2.0+i*.16+Math.sin(t*.3+i)*.02, L=2600; const g=c.createLinearGradient(x,y,x+Math.cos(ang)*L,y+Math.sin(ang)*L); g.addColorStop(0,`rgba(255,235,190,${a})`); g.addColorStop(1,'rgba(255,235,190,0)'); c.fillStyle=g; c.beginPath(); c.moveTo(x,y); c.lineTo(x+Math.cos(ang-.05)*L,y+Math.sin(ang-.05)*L); c.lineTo(x+Math.cos(ang+.05)*L,y+Math.sin(ang+.05)*L); c.closePath(); c.fill(); } c.restore(); }
function foreground(t,sp,col='#14100c',y0=1840){ c.fillStyle=col; for(let i=0;i<9;i++){ const x=mod(rnd(i*11)*2600-t*sp,2700)-700, h=40+rnd(i*5)*90; c.beginPath(); c.moveTo(x-40,y0+200); for(let j=0;j<7;j++){ const a=j/6; c.lineTo(x-40+a*80+Math.sin(t*2+i+j)*6,y0-h*(j%2?1:.55)); } c.lineTo(x+40,y0+200); c.closePath(); c.fill(); } c.beginPath(); c.ellipse(mod(-t*sp*1.1+700,2600)-700,y0+80,260,90,0,0,7); c.fill(); }
// ---------------- personajes ----------------
function limb(x,y,a1,l1,a2,l2,w,col){ const ex=x+Math.sin(a1)*l1, ey=y+Math.cos(a1)*l1, hx=ex+Math.sin(a2)*l2, hy=ey+Math.cos(a2)*l2;
  c.lineCap='round'; c.lineJoin='round'; c.strokeStyle='#0b0806'; c.lineWidth=w+7; c.beginPath(); c.moveTo(x,y); c.lineTo(ex,ey); c.lineTo(hx,hy); c.stroke();
  c.strokeStyle=col; c.lineWidth=w; c.beginPath(); c.moveTo(x,y); c.lineTo(ex,ey); c.lineTo(hx,hy); c.stroke(); return [hx,hy]; }
function person(P,o){
  const s=o.s||1, Hh=P.h*s, x=o.x, y=o.y, lk=o.look||1, t=o.t||0, sd0=o.seed||0;
  const hr=Hh*.13, hy=y-Hh+hr, shY=y-Hh*.73, hipY=y-Hh*.43, lw=Hh*.052, ow=Math.max(2.5,Hh*.011);
  const ph=o.walk, sw=ph==null?0:Math.sin(ph), breath=Math.sin(t*2.2+sd0)*Hh*.004;
  c.save(); c.translate(0,breath+(ph==null?0:-Math.abs(Math.cos(ph))*Hh*.012));
  if(!o.noShadow){ c.fillStyle='rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x,y+4,Hh*.2,Hh*.03,0,0,7); c.fill(); }
  if(P.cloak){ const wv=(o.wind??.3), fl=Math.sin(t*5+sd0)*Hh*.03*wv; c.fillStyle=P.cloak; c.strokeStyle='#0b0806'; c.lineWidth=ow;
    c.beginPath(); c.moveTo(x-Hh*.14,shY-Hh*.02); c.lineTo(x+Hh*.14,shY-Hh*.02); c.quadraticCurveTo(x+Hh*.2-lk*Hh*.05*wv,y-Hh*.3,x+Hh*.17-lk*(Hh*.14*wv)+fl,y-Hh*.12);
    c.lineTo(x-Hh*.17-lk*(Hh*.16*wv)+fl*1.4,y-Hh*.1); c.quadraticCurveTo(x-Hh*.2-lk*Hh*.05*wv,y-Hh*.3,x-Hh*.14,shY-Hh*.02); c.fill(); c.stroke();
    if(P.trim){ c.strokeStyle=P.trim; c.lineWidth=ow*1.3; c.beginPath(); c.moveTo(x+Hh*.17-lk*(Hh*.14*wv)+fl,y-Hh*.12); c.lineTo(x-Hh*.17-lk*(Hh*.16*wv)+fl*1.4,y-Hh*.1); c.stroke(); } }
  const la=o.legs||[sw*.42,-sw*.42], legCol=P.legs||P.skin;
  for(const [i,a] of [[0,la[0]],[1,la[1]]]){ const lx=x+(i?1:-1)*Hh*.055, knee=ph==null?0:Math.max(0,Math.sin(ph+(i?Math.PI:0)))*.35;
    const [fx,fy]=limb(lx,hipY,a,Hh*.22,a-knee,Hh*.22,lw,legCol);
    c.fillStyle=P.boots||'#4a3020'; c.strokeStyle='#0b0806'; c.lineWidth=ow; c.beginPath(); c.ellipse(fx+lk*Hh*.02,fy,Hh*.045,Hh*.022,0,0,7); c.fill(); c.stroke(); }
  const aB=o.armB||[-lk*.15-sw*.35,-lk*.05], aF=o.armF||[lk*.15+sw*.35,lk*.3], sxB=x-lk*Hh*.13, sxF=x+lk*Hh*.13, armCol=P.sleeves||P.skin;
  limb(sxB,shY+Hh*.02,aB[0],Hh*.17,aB[1],Hh*.16,lw*.9,armCol);
  c.strokeStyle='#0b0806'; c.lineWidth=ow; c.fillStyle=P.tunic;
  c.beginPath(); c.moveTo(x-Hh*.13,shY-Hh*.02); c.lineTo(x+Hh*.13,shY-Hh*.02); c.lineTo(x+Hh*.155,hipY+Hh*(P.legs?.02:.1)); c.lineTo(x-Hh*.155,hipY+Hh*(P.legs?.02:.1)); c.closePath(); c.fill(); { const sg=c.createLinearGradient(x-Hh*.15,0,x+Hh*.15,0); sg.addColorStop(0,'rgba(255,240,210,.18)'); sg.addColorStop(.45,'rgba(0,0,0,0)'); sg.addColorStop(1,'rgba(30,10,30,.32)'); c.save(); c.fillStyle=sg; c.fill(); c.restore(); } c.stroke();
  if(P.armor){ const g=c.createLinearGradient(x-Hh*.14,0,x+Hh*.14,0); g.addColorStop(0,P.armor); g.addColorStop(.45,'#fff3c8'); g.addColorStop(.55,P.armor); g.addColorStop(1,'#4a3820');
    c.fillStyle=g; c.beginPath(); c.moveTo(x-Hh*.135,shY-Hh*.03); c.lineTo(x+Hh*.135,shY-Hh*.03); c.lineTo(x+Hh*.12,hipY); c.lineTo(x-Hh*.12,hipY); c.closePath(); c.fill(); c.stroke();
    if(!P.legs){ c.fillStyle='#5a3a1e'; for(let i=-2;i<=2;i++){ c.fillRect(x+i*Hh*.052-Hh*.022,hipY,Hh*.044,Hh*.09); c.strokeRect(x+i*Hh*.052-Hh*.022,hipY,Hh*.044,Hh*.09); } } }
  if(P.straps){ c.strokeStyle=P.straps; c.lineWidth=Hh*.022; c.beginPath(); c.moveTo(x-Hh*.12,shY); c.lineTo(x+Hh*.12,hipY-Hh*.02); c.moveTo(x+Hh*.12,shY); c.lineTo(x-Hh*.12,hipY-Hh*.02); c.stroke(); }
  if(P.tie){ c.fillStyle=P.tie; c.beginPath(); c.moveTo(x,shY-Hh*.02); c.lineTo(x-Hh*.025,shY+Hh*.03); c.lineTo(x,shY+Hh*.2); c.lineTo(x+Hh*.025,shY+Hh*.03); c.closePath(); c.fill(); c.fillStyle='#f4f1ea'; c.beginPath(); c.moveTo(x-Hh*.06,shY-Hh*.02); c.lineTo(x,shY+Hh*.04); c.lineTo(x+Hh*.06,shY-Hh*.02); c.fill(); }
  if(P.belt){ c.fillStyle=P.belt; c.fillRect(x-Hh*.14,hipY-Hh*.02,Hh*.28,Hh*.035); }
  const [hx,hy2]=limb(sxF,shY+Hh*.02,aF[0],Hh*.17,aF[1],Hh*.16,lw*.9,armCol);
  const wp=P.weapon||(P.spear?'spear':null);
  if(wp==='spear'){ c.strokeStyle='#5a3a1e'; c.lineWidth=Hh*.018; c.beginPath(); c.moveTo(hx,hy2+Hh*.25); c.lineTo(hx+lk*Hh*.06,hy2-Hh*.55); c.stroke(); c.fillStyle='#c8ccd2'; c.beginPath(); c.moveTo(hx+lk*Hh*.06,hy2-Hh*.62); c.lineTo(hx+lk*Hh*.06-Hh*.02,hy2-Hh*.53); c.lineTo(hx+lk*Hh*.06+Hh*.02,hy2-Hh*.53); c.fill(); }
  if(wp==='musket'||wp==='rifle'){ const ang=o.aim?-1.45*lk:-.35*lk; c.save(); c.translate(hx,hy2); c.rotate(ang); c.fillStyle=wp==='musket'?'#6a4426':'#3a3a36'; c.strokeStyle='#0b0806'; c.lineWidth=ow; c.beginPath(); c.roundRect(-Hh*.05,-Hh*.018,Hh*(wp==='musket'?.5:.38),Hh*.036,3); c.fill(); c.stroke(); if(wp==='musket'){ c.strokeStyle='#c8ccd2'; c.lineWidth=ow*.8; c.beginPath(); c.moveTo(Hh*.45,0); c.lineTo(Hh*.58,0); c.stroke(); } c.restore(); }
  if(wp==='sword'){ c.save(); c.translate(hx,hy2); c.rotate(o.swordA??(-.6*lk)); c.fillStyle='#d8dde4'; c.strokeStyle='#0b0806'; c.lineWidth=ow; c.beginPath(); c.moveTo(-Hh*.012,0); c.lineTo(Hh*.012,0); c.lineTo(Hh*.008,-Hh*.32); c.lineTo(0,-Hh*.35); c.lineTo(-Hh*.008,-Hh*.32); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#c99a3e'; c.fillRect(-Hh*.04,-Hh*.01,Hh*.08,Hh*.02); c.restore(); }
  if(wp==='bow'){ c.strokeStyle='#5a3a1e'; c.lineWidth=Hh*.016; c.beginPath(); c.arc(hx,hy2,Hh*.18,-1.2,1.2); c.stroke(); }
  if(P.shield){ const sx=x-lk*Hh*.02, sy=shY+Hh*.2; c.fillStyle=P.shieldCol||'#7a5534'; c.strokeStyle='#0b0806'; c.lineWidth=ow*1.2;
    if(P.shield==='round'||P.shield==='hoplon'){ const R=P.shield==='hoplon'?Hh*.19:Hh*.15; c.beginPath(); c.arc(sx,sy,R,0,7); c.fill(); c.stroke(); if(P.shieldMark){ c.strokeStyle=P.shieldMark; c.lineWidth=ow*2.4; c.beginPath(); c.moveTo(sx-R*.45,sy+R*.45); c.lineTo(sx,sy-R*.5); c.lineTo(sx+R*.45,sy+R*.45); c.stroke(); } else { c.fillStyle='#d9b45a'; c.beginPath(); c.arc(sx,sy,Hh*.04,0,7); c.fill(); c.stroke(); } }
    else if(P.shield==='wicker'){ c.beginPath(); c.roundRect(sx-Hh*.1,sy-Hh*.16,Hh*.2,Hh*.3,Hh*.08); c.fill(); c.stroke(); c.strokeStyle='rgba(60,30,10,.6)'; for(let i=-2;i<=2;i++){ c.beginPath(); c.moveTo(sx+i*Hh*.035,sy-Hh*.15); c.lineTo(sx+i*Hh*.035,sy+Hh*.13); c.stroke(); } }
    else { c.beginPath(); c.roundRect(sx-Hh*.1,sy-Hh*.18,Hh*.2,Hh*.36,Hh*.03); c.fill(); c.stroke(); c.strokeStyle='#e8c25a'; c.lineWidth=ow; c.beginPath(); c.moveTo(sx,sy-Hh*.16); c.lineTo(sx,sy+Hh*.16); c.stroke(); } }
  if(o.cup){ c.fillStyle='#b98a3a'; c.strokeStyle='#0b0806'; c.lineWidth=ow; c.beginPath(); c.moveTo(hx-Hh*.04,hy2-Hh*.05); c.lineTo(hx+Hh*.04,hy2-Hh*.05); c.lineTo(hx+Hh*.02,hy2+Hh*.02); c.lineTo(hx-Hh*.02,hy2+Hh*.02); c.closePath(); c.fill(); c.stroke(); }
  if(o.paper){ c.fillStyle='#f4eedc'; c.strokeStyle='#0b0806'; c.lineWidth=ow; c.beginPath(); c.rect(hx-Hh*.06,hy2-Hh*.1,Hh*.12,Hh*.15); c.fill(); c.stroke(); }
  // cabeza
  c.fillStyle=P.skin; c.strokeStyle='#0b0806'; c.lineWidth=ow*1.1; c.beginPath(); c.arc(x,hy,hr,0,7); c.fill();
  c.save(); c.beginPath(); c.arc(x,hy,hr,0,7); c.clip(); c.fillStyle='rgba(40,16,40,.24)'; c.beginPath(); c.arc(x+hr*.5,hy+hr*.38,hr*1.02,0,7); c.fill(); c.fillStyle='rgba(255,240,215,.22)'; c.beginPath(); c.arc(x-hr*.45,hy-hr*.45,hr*.55,0,7); c.fill(); c.restore();
  c.strokeStyle='#0b0806'; c.beginPath(); c.arc(x,hy,hr,0,7); c.stroke(); c.strokeStyle='rgba(255,236,200,.7)'; c.lineWidth=ow*1.1; c.beginPath(); c.arc(x,hy,hr-ow*1.2,Math.PI*1.05,Math.PI*1.55); c.stroke();
  const f=o.face||{};
  if(P.beard){ const L=P.beardLong?1.55:1.25; c.fillStyle=P.beard; c.beginPath(); c.moveTo(x-hr*.92,hy+hr*.05); c.quadraticCurveTo(x-hr*.8,hy+hr*L,x,hy+hr*(L+.1)); c.quadraticCurveTo(x+hr*.8,hy+hr*L,x+hr*.92,hy+hr*.05); c.quadraticCurveTo(x,hy+hr*.55,x-hr*.92,hy+hr*.05); c.fill(); c.stroke(); }
  if(P.mustache){ c.fillStyle=P.mustache; c.beginPath(); c.ellipse(x+lk*hr*.08,hy+hr*.32,hr*.32,hr*.09,0,0,7); c.fill(); }
  c.fillStyle=P.hair;
  if(P.hairStyle==='curly'||P.hairStyle==='curlyShort'){ const n=P.hairStyle==='curly'?9:7; for(let i=0;i<n;i++){ const a=Math.PI*(1.02+i/(n-1)*.96); c.beginPath(); c.arc(x+Math.cos(a)*hr*.88,hy+Math.sin(a)*hr*.88-hr*.05,hr*.3,0,7); c.fill(); } c.beginPath(); c.arc(x,hy-hr*.35,hr*.75,Math.PI*1.05,Math.PI*1.95); c.fill(); }
  else if(P.hairStyle==='bald'){ c.beginPath(); c.arc(x-hr*.9,hy-hr*.05,hr*.22,0,7); c.arc(x+hr*.9,hy-hr*.05,hr*.22,0,7); c.fill(); }
  else if(P.hairStyle==='long'){ c.beginPath(); c.arc(x,hy-hr*.05,hr*1.05,Math.PI*1.0,Math.PI*2.0); c.fill(); c.fillRect(x-hr*1.05,hy-hr*.1,hr*.35,hr*1.0); c.fillRect(x+hr*.7,hy-hr*.1,hr*.35,hr*1.0); }
  else if(P.hairStyle){ c.beginPath(); c.arc(x,hy-hr*.05,hr*1.03,Math.PI*1.05,Math.PI*1.95); c.quadraticCurveTo(x,hy-hr*.55,x-hr*1.0,hy-hr*.2); c.fill(); }
  const ex=lk*hr*.14, eyT=f.eyes||'n', blink=(mod(t+sd0*1.7,3.6)<.12)||eyT==='c';
  for(const sd of [-1,1]){ const cx=x+sd*hr*.36+ex, cy=hy-hr*.05;
    if(blink){ c.strokeStyle='#0b0806'; c.lineWidth=ow*1.1; c.beginPath(); c.moveTo(cx-hr*.13,cy); c.lineTo(cx+hr*.13,cy); c.stroke(); }
    else { c.fillStyle='#fff'; c.beginPath(); c.ellipse(cx,cy,hr*.15,hr*(eyT==='w'?.2:eyT==='s'?.08:.15),0,0,7); c.fill(); c.fillStyle='#120c08'; c.beginPath(); c.arc(cx+lk*hr*.04,cy+hr*.01,hr*(eyT==='w'?.075:.085),0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(cx+lk*hr*.04-hr*.03,cy-hr*.03,hr*.028,0,7); c.fill(); }
    if(o.patch&&sd===-lk){ c.fillStyle='#120c08'; c.beginPath(); c.ellipse(cx,cy,hr*.19,hr*.17,0,0,7); c.fill(); }
    if(P.glasses){ c.strokeStyle='#120c08'; c.lineWidth=ow*.9; c.beginPath(); c.arc(cx,cy,hr*.2,0,7); c.stroke(); }
    const b=f.brow||0; c.strokeStyle=P.browCol||'#120c08'; c.lineWidth=ow*1.5; c.beginPath(); c.moveTo(cx-sd*hr*.2,cy-hr*.27+b*hr*.13); c.lineTo(cx+sd*hr*.2,cy-hr*.29-b*hr*.05); c.stroke(); }
  if(o.patch){ c.strokeStyle='#120c08'; c.lineWidth=ow; c.beginPath(); c.moveTo(x-hr*.95,hy-hr*.3); c.lineTo(x+hr*.95,hy-hr*.15); c.stroke(); }
  const mo=f.mouth||'n', talk=o.talk?Math.abs(Math.sin(t*17+sd0))*.9+.1:0, my=hy+hr*.45;
  c.strokeStyle='#120c08'; c.fillStyle='#4a1810'; c.lineWidth=ow*1.2;
  if(talk>0||mo==='o'){ c.beginPath(); c.ellipse(x+ex*.6,my,hr*.17,hr*(.05+.13*(mo==='o'?1:talk)),0,0,7); c.fill(); c.stroke(); }
  else { c.beginPath(); const cv=mo==='s'?.12:mo==='f'?-.12:mo==='g'?-.05:0; c.moveTo(x+ex*.6-hr*.2,my-cv*hr*.4); c.quadraticCurveTo(x+ex*.6,my+cv*hr,x+ex*.6+hr*.2,my-cv*hr*.4); c.stroke(); }
  hat(P.helmet,x,hy,hr,ow,P,lk);
  c.restore();
}
function hat(kind,x,hy,hr,ow,P,lk){ if(!kind) return; c.strokeStyle='#0b0806'; c.lineWidth=ow;
  if(kind===true||kind==='roman'){ c.fillStyle='#9aa0a8'; c.beginPath(); c.arc(x,hy-hr*.1,hr*1.05,Math.PI,0); c.fill(); c.stroke(); c.fillRect(x-hr*1.05,hy-hr*.12,hr*.3,hr*.6); c.fillRect(x+hr*.75,hy-hr*.12,hr*.3,hr*.6); c.fillStyle='#b82127'; c.beginPath(); c.ellipse(x,hy-hr*1.2,hr*.7,hr*.28,0,0,7); c.fill(); c.stroke(); }
  else if(kind==='greek'){ c.fillStyle='#c99a3e'; c.beginPath(); c.arc(x,hy-hr*.05,hr*1.08,Math.PI*.95,Math.PI*2.05); c.lineTo(x+hr*1.0,hy+hr*.7); c.lineTo(x+hr*.45,hy+hr*.7); c.lineTo(x+hr*.62,hy-hr*.4); c.lineTo(x-hr*.62,hy-hr*.4); c.lineTo(x-hr*.45,hy+hr*.7); c.lineTo(x-hr*1.0,hy+hr*.7); c.closePath(); c.fill(); c.stroke();
    c.fillStyle=P.crest||'#b82127'; c.beginPath(); c.moveTo(x-hr*1.1,hy-hr*.9); c.quadraticCurveTo(x,hy-hr*2.0,x+hr*1.1,hy-hr*.9); c.quadraticCurveTo(x,hy-hr*1.35,x-hr*1.1,hy-hr*.9); c.fill(); c.stroke(); }
  else if(kind==='tiara'){ c.fillStyle=P.hatCol||'#e7b73c'; c.beginPath(); c.moveTo(x-hr*.8,hy-hr*.55); c.lineTo(x-hr*.6,hy-hr*1.9); c.lineTo(x+hr*.6,hy-hr*1.9); c.lineTo(x+hr*.8,hy-hr*.55); c.closePath(); c.fill(); c.stroke(); for(let i=0;i<4;i++){ c.fillStyle='#b82127'; c.fillRect(x-hr*.5+i*hr*.3,hy-hr*1.85,hr*.12,hr*.12); } }
  else if(kind==='cloth'){ c.fillStyle=P.hatCol||'#e2d2a8'; c.beginPath(); c.arc(x,hy-hr*.2,hr*1.05,Math.PI,0); c.fill(); c.stroke(); c.fillRect(x-hr*1.05,hy-hr*.25,hr*.25,hr*1.1); c.strokeRect(x-hr*1.05,hy-hr*.25,hr*.25,hr*1.1); }
  else if(kind==='turban'){ c.fillStyle=P.hatCol||'#f4f1ea'; c.beginPath(); c.ellipse(x,hy-hr*.75,hr*1.15,hr*.75,0,0,7); c.fill(); c.stroke(); c.strokeStyle='rgba(0,0,0,.25)'; c.beginPath(); c.arc(x,hy-hr*.6,hr*.9,Math.PI*1.1,Math.PI*1.9); c.stroke(); if(P.turbanTop){ c.fillStyle=P.turbanTop; c.beginPath(); c.ellipse(x,hy-hr*1.35,hr*.35,hr*.35,0,0,7); c.fill(); } }
  else if(kind==='bork'){ c.fillStyle='#f4f1ea'; c.beginPath(); c.moveTo(x-hr*.85,hy-hr*.6); c.lineTo(x-hr*.6,hy-hr*1.7); c.quadraticCurveTo(x+hr*.2,hy-hr*2.0,x+hr*.9,hy-hr*.6); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#c99a3e'; c.fillRect(x-hr*.85,hy-hr*.75,hr*1.75,hr*.2); }
  else if(kind==='crown'){ c.fillStyle='#e7b73c'; c.beginPath(); c.moveTo(x-hr*.85,hy-hr*.6); c.lineTo(x-hr*.85,hy-hr*1.35); c.lineTo(x-hr*.42,hy-hr*1.0); c.lineTo(x,hy-hr*1.5); c.lineTo(x+hr*.42,hy-hr*1.0); c.lineTo(x+hr*.85,hy-hr*1.35); c.lineTo(x+hr*.85,hy-hr*.6); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#b82127'; c.beginPath(); c.arc(x,hy-hr*.8,hr*.12,0,7); c.fill(); }
  else if(kind==='bicorne'){ c.fillStyle='#14110e'; c.beginPath(); c.moveTo(x-hr*1.6,hy-hr*.6); c.quadraticCurveTo(x,hy-hr*2.2,x+hr*1.6,hy-hr*.6); c.quadraticCurveTo(x,hy-hr*.95,x-hr*1.6,hy-hr*.6); c.fill(); c.stroke(); c.fillStyle='#2a3a8a'; c.beginPath(); c.arc(x+hr*.5,hy-hr*1.05,hr*.15,0,7); c.fill(); }
  else if(kind==='shako'){ c.fillStyle=P.hatCol||'#14110e'; c.beginPath(); c.moveTo(x-hr*.8,hy-hr*.55); c.lineTo(x-hr*.9,hy-hr*1.75); c.lineTo(x+hr*.9,hy-hr*1.75); c.lineTo(x+hr*.8,hy-hr*.55); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#e7c25a'; c.beginPath(); c.arc(x,hy-hr*1.1,hr*.18,0,7); c.fill(); c.fillStyle=P.plume||'#b82127'; c.fillRect(x-hr*.12,hy-hr*2.25,hr*.24,hr*.5); }
  else if(kind==='m1'||kind==='modern'){ c.fillStyle=P.hatCol||(kind==='m1'?'#4f5a3a':'#5a6448'); c.beginPath(); c.arc(x,hy-hr*.1,hr*1.12,Math.PI,0); c.lineTo(x+hr*1.25,hy-hr*.05); c.lineTo(x-hr*1.25,hy-hr*.05); c.closePath(); c.fill(); c.stroke(); if(kind==='modern'){ c.fillStyle='#2a2e26'; c.fillRect(x-hr*.4,hy-hr*1.05,hr*.8,hr*.25); } }
  else if(kind==='stahl'){ c.fillStyle='#5a5f62'; c.beginPath(); c.arc(x,hy-hr*.1,hr*1.1,Math.PI,0); c.lineTo(x+hr*1.3,hy+hr*.25); c.lineTo(x+hr*.9,hy+hr*.15); c.lineTo(x-hr*.9,hy+hr*.15); c.lineTo(x-hr*1.3,hy+hr*.25); c.closePath(); c.fill(); c.stroke(); }
  else if(kind==='cap'){ c.fillStyle=P.hatCol||'#4f5a3a'; c.beginPath(); c.arc(x,hy-hr*.35,hr*.95,Math.PI,0); c.fill(); c.stroke(); c.fillRect(x-hr*.95,hy-hr*.4,hr*1.9,hr*.18); c.fillStyle=P.hatCol||'#4f5a3a'; c.beginPath(); c.ellipse(x+lk*hr*.75,hy-hr*.3,hr*.6,hr*.14,0,0,7); c.fill(); c.stroke(); }
  else if(kind==='officer'){ c.fillStyle=P.hatCol||'#3a4a2a'; c.beginPath(); c.ellipse(x,hy-hr*.85,hr*1.2,hr*.4,0,0,7); c.fill(); c.stroke(); c.fillRect(x-hr*.85,hy-hr*.85,hr*1.7,hr*.4); c.strokeRect(x-hr*.85,hy-hr*.85,hr*1.7,hr*.4); c.fillStyle='#14110e'; c.beginPath(); c.ellipse(x+lk*hr*.3,hy-hr*.45,hr*.8,hr*.16,0,0,7); c.fill(); c.fillStyle='#e7c25a'; c.beginPath(); c.arc(x,hy-hr*.8,hr*.14,0,7); c.fill(); }
  else if(kind==='kufiya'){ c.fillStyle='#f4f1ea'; c.beginPath(); c.arc(x,hy-hr*.15,hr*1.1,Math.PI,0); c.lineTo(x+hr*1.2,hy+hr*.9); c.lineTo(x+hr*.9,hy+hr*.9); c.lineTo(x+hr*.9,hy); c.lineTo(x-hr*.9,hy); c.lineTo(x-hr*.9,hy+hr*.9); c.lineTo(x-hr*1.2,hy+hr*.9); c.closePath(); c.fill(); c.stroke(); c.strokeStyle='#14110e'; c.lineWidth=ow*1.6; c.beginPath(); c.ellipse(x,hy-hr*.75,hr*.95,hr*.22,0,0,7); c.stroke(); }
  else if(kind==='kippah'){ c.fillStyle=P.hatCol||'#1d2a5a'; c.beginPath(); c.ellipse(x,hy-hr*.95,hr*.5,hr*.18,0,0,7); c.fill(); }
  else if(kind==='ushanka'){ c.fillStyle='#5a4a3a'; c.beginPath(); c.arc(x,hy-hr*.25,hr*1.15,Math.PI,0); c.fill(); c.stroke(); c.fillRect(x-hr*1.2,hy-hr*.3,hr*.35,hr*.75); c.fillRect(x+hr*.85,hy-hr*.3,hr*.35,hr*.75); }
}
function elephant(x,y,s,ph,dir=1,blanket='#5b2373'){
  c.save(); c.translate(x,y); c.scale(s*dir,s); c.lineJoin='round'; c.strokeStyle='#0b0806'; c.lineWidth=6;
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0,4,190,22,0,0,7); c.fill();
  const leg=(lx,o,dark)=>{ const a=Math.sin(ph+o)*.25; c.save(); c.translate(lx,-120); c.rotate(a); c.fillStyle=dark?'#5f6168':'#787a82'; c.beginPath(); c.roundRect(-24,0,48,120,14); c.fill(); c.stroke(); c.restore(); };
  leg(-80,Math.PI,1); leg(70,0,1); c.fillStyle='#80828a'; c.beginPath(); c.ellipse(-10,-185,145,90,0,0,7); c.fill(); c.stroke(); leg(-110,0,0); leg(40,Math.PI,0);
  if(blanket){ c.fillStyle=blanket; c.beginPath(); c.moveTo(-90,-262); c.lineTo(50,-262); c.lineTo(60,-175); c.lineTo(-100,-175); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#e7b73c'; c.fillRect(-100,-185,160,10); }
  c.fillStyle='#80828a'; c.beginPath(); c.arc(130,-205,62,0,7); c.fill(); c.stroke();
  const tr=Math.sin(ph*.5)*20; c.lineWidth=34; c.strokeStyle='#0b0806'; c.beginPath(); c.moveTo(170,-195); c.quadraticCurveTo(205,-120,185+tr*.4,-40); c.stroke(); c.lineWidth=22; c.strokeStyle='#80828a'; c.stroke();
  c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillStyle='#f4ecd8'; c.beginPath(); c.moveTo(160,-170); c.quadraticCurveTo(205,-150,215,-180); c.lineTo(205,-170); c.quadraticCurveTo(195,-158,165,-160); c.fill(); c.stroke();
  c.fillStyle='#6a6c73'; c.beginPath(); c.ellipse(105,-205,40,58,-.2,0,7); c.fill(); c.stroke(); c.fillStyle='#0b0806'; c.beginPath(); c.arc(150,-222,7,0,7); c.fill(); c.restore(); }
function horse(x,y,s,ph,dir=1,col='#6a4426',rider){
  c.save(); c.translate(x,y); c.scale(s*dir,s); c.lineJoin='round'; c.strokeStyle='#0b0806'; c.lineWidth=5;
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0,4,120,16,0,0,7); c.fill();
  const leg=(lx,o)=>{ const a=Math.sin(ph+o)*.45; c.save(); c.translate(lx,-95); c.rotate(a); c.fillStyle=col; c.fillRect(-9,0,18,95); c.strokeRect(-9,0,18,95); c.fillStyle='#14110e'; c.fillRect(-10,82,20,14); c.restore(); };
  leg(-60,Math.PI); leg(55,0); c.fillStyle=col; c.beginPath(); c.ellipse(0,-120,95,42,0,0,7); c.fill(); c.stroke(); leg(-75,0); leg(40,Math.PI);
  c.beginPath(); c.moveTo(60,-140); c.lineTo(110,-215); c.lineTo(150,-205); c.lineTo(120,-130); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.ellipse(140,-200,32,17,.5,0,7); c.fill(); c.stroke(); c.fillStyle='#14110e'; c.beginPath(); c.moveTo(70,-150); c.lineTo(105,-222); c.lineTo(92,-150); c.fill(); c.beginPath(); c.moveTo(-92,-130); c.quadraticCurveTo(-140,-110+Math.sin(ph)*8,-130,-60); c.lineTo(-115,-115); c.fill();
  c.restore(); if(rider) person(rider.P,{...rider,x:x-5*s*dir,y:y-130*s,legs:[.9*dir,-.2*dir],s:(rider.s||1)*s});
}
function ship(x,y,s,kind,t,dir=1,sail='#f2ead8',flag){ c.save(); c.translate(x,y+Math.sin(t*2+x*.01)*4*s); c.scale(s*dir,s); c.rotate(Math.sin(t*1.6+x*.01)*.025); c.strokeStyle='#0b0806'; c.lineWidth=5; c.lineJoin='round';
  if(kind==='galley'||kind==='galleon'){ c.fillStyle='#5a3a1e'; c.beginPath(); c.moveTo(-170,-40); c.lineTo(170,-40); c.quadraticCurveTo(160,20,110,30); c.lineTo(-120,30); c.quadraticCurveTo(-170,10,-185,-60); c.closePath(); c.fill(); c.stroke();
    if(kind==='galley'){ c.strokeStyle='#3a2410'; c.lineWidth=5; for(let i=0;i<8;i++){ const a=Math.sin(t*4+i*.3)*.35; c.beginPath(); c.moveTo(-120+i*32,0); c.lineTo(-130+i*32+Math.sin(a)*40,70); c.stroke(); } }
    c.strokeStyle='#0b0806'; c.lineWidth=7; c.beginPath(); c.moveTo(0,-40); c.lineTo(0,-300); c.stroke(); c.fillStyle=sail; c.lineWidth=5; c.beginPath(); c.moveTo(-110,-280); c.quadraticCurveTo(-10+Math.sin(t)*10,-180,-110,-80); c.lineTo(110,-80); c.quadraticCurveTo(10+Math.sin(t)*10,-180,110,-280); c.closePath(); c.fill(); c.stroke();
    if(flag){ c.fillStyle=flag; c.fillRect(0,-330,60,30); c.strokeRect(0,-330,60,30); } }
  else if(kind==='raft'){ c.fillStyle='#7a5534'; for(let i=0;i<6;i++){ c.beginPath(); c.roundRect(-180+i*60,-20,58,34,10); c.fill(); c.stroke(); } }
  else if(kind==='lander'){ c.fillStyle='#5a6448'; c.beginPath(); c.moveTo(-150,-60); c.lineTo(140,-60); c.lineTo(150,20); c.lineTo(-140,20); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#4a5238'; c.fillRect(120,-90,30,90); c.strokeRect(120,-90,30,90); }
  else { c.fillStyle='#6a7078'; c.beginPath(); c.moveTo(-220,-30); c.lineTo(230,-30); c.lineTo(190,25); c.lineTo(-200,25); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#7c838c'; c.fillRect(-80,-90,140,60); c.strokeRect(-80,-90,140,60); c.fillRect(-10,-150,30,60); c.strokeRect(-10,-150,30,60); }
  c.restore(); }
function tank(x,y,s,t,dir=1,col='#4f5a3a'){ c.save(); c.translate(x,y); c.scale(s*dir,s); c.strokeStyle='#0b0806'; c.lineWidth=5; c.lineJoin='round';
  c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0,5,170,18,0,0,7); c.fill(); c.fillStyle='#2a2e26'; c.beginPath(); c.roundRect(-160,-50,320,55,26); c.fill(); c.stroke();
  for(let i=0;i<6;i++){ c.fillStyle='#5a5f56'; c.beginPath(); c.arc(-125+i*50,-22,20,0,7); c.fill(); c.stroke(); c.strokeStyle='#2a2e26'; c.beginPath(); const a=t*5; c.moveTo(-125+i*50,-22); c.lineTo(-125+i*50+Math.cos(a)*16,-22+Math.sin(a)*16); c.stroke(); c.strokeStyle='#0b0806'; }
  c.fillStyle=col; c.beginPath(); c.moveTo(-150,-50); c.lineTo(150,-50); c.lineTo(120,-95); c.lineTo(-130,-95); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.roundRect(-60,-150,130,58,18); c.fill(); c.stroke(); c.fillStyle='#3a4230'; c.fillRect(65,-130,170,16); c.strokeRect(65,-130,170,16); c.restore(); }
function plane(x,y,s,kind,dir=1,col='#3a3f46'){ c.save(); c.translate(x,y); c.scale(s*dir,s); c.strokeStyle='#0b0806'; c.lineWidth=5; c.lineJoin='round'; c.fillStyle=col;
  if(kind==='b2'){ c.beginPath(); c.moveTo(160,0); c.lineTo(-90,-170); c.lineTo(-120,-140); c.lineTo(-100,-60); c.lineTo(-140,-30); c.lineTo(-110,0); c.lineTo(-140,30); c.lineTo(-100,60); c.lineTo(-120,140); c.lineTo(-90,170); c.closePath(); c.fill(); c.stroke(); }
  else if(kind==='prop'){ c.beginPath(); c.ellipse(0,0,150,24,0,0,7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-10,-10); c.lineTo(-60,-120); c.lineTo(-20,-120); c.lineTo(40,-10); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-130,-5); c.lineTo(-160,-55); c.lineTo(-135,-55); c.lineTo(-110,-5); c.fill(); c.stroke(); }
  else { c.beginPath(); c.moveTo(170,0); c.lineTo(80,-18); c.lineTo(-20,-18); c.lineTo(-70,-110); c.lineTo(-100,-110); c.lineTo(-70,-18); c.lineTo(-140,-14); c.lineTo(-170,-60); c.lineTo(-190,-60); c.lineTo(-175,0); c.lineTo(-190,14); c.lineTo(-140,14); c.lineTo(-70,18); c.lineTo(80,18); c.closePath(); c.fill(); c.stroke(); }
  c.restore(); }
// banderas sencillas
function flag(x,y,w,h,kind,t=0,pole=true){ c.save(); c.translate(x,y); if(pole){ c.fillStyle='#3a2a1a'; c.fillRect(-6,0,10,h*2.4); } const wave=i=>Math.sin(t*4+i*.06)*h*.06;
  c.beginPath(); for(let i=0;i<=20;i++) c.lineTo(i*w/20,wave(i*w/20)); for(let i=20;i>=0;i--) c.lineTo(i*w/20,h+wave(i*w/20)); c.closePath(); c.save(); c.clip();
  const R=(cx,cy,cw,ch,col)=>{ c.fillStyle=col; c.fillRect(cx,cy,cw,ch); };
  if(kind==='israel'){ R(0,-20,w,h+40,'#fff'); R(0,h*.1,w,h*.13,'#0038b8'); R(0,h*.77,w,h*.13,'#0038b8'); c.strokeStyle='#0038b8'; c.lineWidth=h*.05; for(const s of [1,-1]){ c.beginPath(); c.moveTo(w/2,h/2-s*h*.2); c.lineTo(w/2-h*.17,h/2+s*h*.1); c.lineTo(w/2+h*.17,h/2+s*h*.1); c.closePath(); c.stroke(); } }
  else if(kind==='palestina'){ R(0,-20,w,h/3+20,'#141414'); R(0,h/3,w,h/3,'#fff'); R(0,2*h/3,w,h/3+20,'#149954'); c.fillStyle='#e4312b'; c.beginPath(); c.moveTo(0,-20); c.lineTo(w*.38,h/2); c.lineTo(0,h+20); c.fill(); }
  else if(kind==='iran'){ R(0,-20,w,h/3+20,'#239f40'); R(0,h/3,w,h/3,'#fff'); R(0,2*h/3,w,h/3+20,'#da0000'); c.fillStyle='#da0000'; c.beginPath(); c.arc(w/2,h/2,h*.1,0,7); c.fill(); }
  else if(kind==='usa'){ for(let i=0;i<13;i++) R(0,i*h/13-(i==0?20:0),w,h/13+(i==0||i==12?20:0),i%2?'#fff':'#b22234'); R(0,-20,w*.4,h*.54+20,'#3c3b6e'); c.fillStyle='#fff'; for(let i=0;i<4;i++) for(let j=0;j<5;j++){ c.beginPath(); c.arc(w*.05+j*w*.075,h*.07+i*h*.12,h*.025,0,7); c.fill(); } }
  else if(kind==='rusia'){ R(0,-20,w,h/3+20,'#fff'); R(0,h/3,w,h/3,'#0039a6'); R(0,2*h/3,w,h/3+20,'#d52b1e'); }
  else if(kind==='ucrania'){ R(0,-20,w,h/2+20,'#0057b7'); R(0,h/2,w,h/2+20,'#ffd700'); }
  else if(kind==='cuba'){ for(let i=0;i<5;i++) R(0,i*h/5-(i==0?20:0),w,h/5+(i==0||i==4?20:0),i%2?'#fff':'#002a8f'); c.fillStyle='#cf142b'; c.beginPath(); c.moveTo(0,-20); c.lineTo(w*.45,h/2); c.lineTo(0,h+20); c.fill(); }
  else if(kind==='urss'){ R(0,-20,w,h+40,'#cc0000'); c.fillStyle='#ffd700'; c.font=`900 ${h*.35}px Inter`; c.fillText('☭',w*.08,h*.45); }
  else if(kind==='francia'){ R(0,-20,w/3,h+40,'#0055a4'); R(w/3,-20,w/3,h+40,'#fff'); R(2*w/3,-20,w/3+5,h+40,'#ef4135'); }
  else if(kind==='otomano'){ R(0,-20,w,h+40,'#c8102e'); c.fillStyle='#fff'; c.beginPath(); c.arc(w*.42,h/2,h*.25,0,7); c.fill(); c.fillStyle='#c8102e'; c.beginPath(); c.arc(w*.48,h/2,h*.2,0,7); c.fill(); }
  else if(kind==='bizancio'){ R(0,-20,w,h+40,'#6a1b5a'); c.fillStyle='#e7c25a'; c.fillRect(w*.45,0,w*.1,h); c.fillRect(0,h*.43,w,h*.14); }
  else if(kind==='alemania'){ R(0,-20,w,h+40,'#7a1414'); c.fillStyle='#ddd'; c.beginPath(); c.arc(w/2,h/2,h*.3,0,7); c.fill(); }
  else if(kind==='gb'){ R(0,-20,w,h+40,'#012169'); c.strokeStyle='#fff'; c.lineWidth=h*.2; c.beginPath(); c.moveTo(0,0); c.lineTo(w,h); c.moveTo(w,0); c.lineTo(0,h); c.stroke(); c.strokeStyle='#c8102e'; c.lineWidth=h*.18; c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.moveTo(0,h/2); c.lineTo(w,h/2); c.stroke(); }
  else if(kind==='esparta'){ R(0,-20,w,h+40,'#8a1414'); c.strokeStyle='#e7c25a'; c.lineWidth=h*.1; c.beginPath(); c.moveTo(w*.3,h*.8); c.lineTo(w*.5,h*.2); c.lineTo(w*.7,h*.8); c.stroke(); }
  else if(kind==='persia'){ R(0,-20,w,h+40,'#e7b73c'); c.fillStyle='#8a1414'; c.beginPath(); c.arc(w/2,h/2,h*.25,0,7); c.fill(); }
  else if(kind==='roma'){ R(0,-20,w,h+40,'#a81e24'); c.fillStyle='#e7c25a'; c.font=`900 ${h*.32}px Inter`; c.textAlign='center'; c.fillText('SPQR',w/2,h*.62); }
  else if(kind==='cartago'){ R(0,-20,w,h+40,'#5b2373'); c.fillStyle='#e7b73c'; c.beginPath(); c.arc(w/2,h*.4,h*.15,0,7); c.fill(); c.fillRect(w/2-h*.05,h*.5,h*.1,h*.3); }
  else R(0,-20,w,h+40,kind);
  c.restore(); c.strokeStyle='#0b0806'; c.lineWidth=4; c.restore(); }

// ---------------- soldados por época ----------------
const SKINS=['#b47b4e','#8a5a38','#c99a6e','#6e4428','#e2b892','#d8a87e'];
const SOLDADO={
  cartago:i=>({skin:SKINS[i%4],hair:'#1d140e',hairStyle:i%2?'short':'curlyShort',beard:i%3==0?'#1d140e':null,tunic:['#d8c8a0','#3d5e8c','#c9b48a','#8a3a2a'][i%4],h:300,shield:'round',shieldCol:['#7a5534','#5b2373','#a8823a'][i%3],weapon:'spear'}),
  roma:i=>({skin:SKINS[4+i%2],hair:'#3a2a1c',hairStyle:'short',tunic:'#b82127',armor:'#9aa0a8',h:300,helmet:'roman',shield:'scutum',shieldCol:'#a81e24',weapon:'spear'}),
  griego:i=>({skin:SKINS[[2,4,5][i%3]],hair:'#2a1a10',hairStyle:'short',beard:'#2a1a10',tunic:'#9a1c1c',armor:'#c99a3e',cloak:'#a81e1e',h:300,helmet:'greek',crest:i%2?'#b82127':'#1d140e',shield:'hoplon',shieldCol:'#b88a34',shieldMark:'#8a1414',weapon:'spear'}),
  persa:i=>({skin:SKINS[[0,1,2][i%3]],hair:'#1d140e',hairStyle:'short',beard:'#1d140e',tunic:['#2f5f8a','#c9a24a','#7a2a6a','#2f7a5a'][i%4],legs:['#c9a24a','#2f5f8a','#d8c8a0'][i%3],sleeves:['#2f5f8a','#c9a24a','#7a2a6a','#2f7a5a'][i%4],h:300,helmet:'cloth',hatCol:'#e2d2a8',shield:'wicker',shieldCol:'#b89060',weapon:i%3==0?'bow':'spear'}),
  otomano:i=>({skin:SKINS[[0,2,1][i%3]],hair:'#1d140e',hairStyle:'short',mustache:'#1d140e',tunic:['#2f5f8a','#b82127','#2f7a5a'][i%3],legs:'#e8e0cc',sleeves:['#2f5f8a','#b82127','#2f7a5a'][i%3],belt:'#e7b73c',h:300,helmet:i%2?'bork':'turban',weapon:i%3==0?'bow':'sword'}),
  bizantino:i=>({skin:SKINS[[4,5,2][i%3]],hair:'#3a2a1c',hairStyle:'short',beard:'#3a2a1c',tunic:'#6a1b5a',armor:'#8a9098',h:300,helmet:'roman',shield:'round',shieldCol:'#6a1b5a',weapon:'spear'}),
  frances:i=>({skin:SKINS[4+i%2],hair:'#3a2a1c',hairStyle:'short',tunic:'#1f3a8a',sleeves:'#1f3a8a',legs:'#f1ede2',straps:'#f1ede2',boots:'#14110e',h:300,helmet:'shako',plume:'#b82127',weapon:'musket'}),
  ruso:i=>({skin:SKINS[4+i%2],hair:'#5a3a1e',hairStyle:'short',mustache:i%2?'#5a3a1e':null,tunic:'#2a4a2a',sleeves:'#2a4a2a',legs:'#e8e2d0',straps:'#f1ede2',boots:'#14110e',h:300,helmet:'shako',hatCol:'#14110e',plume:'#1d140e',weapon:'musket'}),
  usa44:i=>({skin:SKINS[[4,5,1,2][i%4]],hair:'#3a2a1c',hairStyle:'short',tunic:'#6a6a44',sleeves:'#6a6a44',legs:'#6a6a44',boots:'#3a2a1a',h:300,helmet:'m1',weapon:'rifle'}),
  aleman44:i=>({skin:SKINS[4+i%2],hair:'#5a4a3a',hairStyle:'short',tunic:'#5a6360',sleeves:'#5a6360',legs:'#5a6360',boots:'#14110e',h:300,helmet:'stahl',weapon:'rifle'}),
  moderno:(i,col='#5f6648')=>({skin:SKINS[i%6],hair:'#1d140e',hairStyle:'short',tunic:col,sleeves:col,legs:col,boots:'#2a221a',h:300,helmet:'modern',hatCol:col,weapon:'rifle'}),
  civil:i=>({skin:SKINS[i%6],hair:['#1d140e','#5a3a1e','#2a1a10','#8a8278'][i%4],hairStyle:['short','long','curlyShort','short'][i%4],tunic:['#c94c3a','#3a6a9a','#e2c25a','#5a8a5a','#8a5a9a','#d8d2c4'][i%6],sleeves:['#c94c3a','#3a6a9a','#e2c25a','#5a8a5a','#8a5a9a','#d8d2c4'][i%6],legs:['#2a3a5a','#3a3530','#5a4a3a'][i%3],boots:'#2a221a',h:290})
};

// ---------------- escenas genéricas ----------------
// Columna en marcha (travelling lateral). o: {sky:[c0,c1,c2], terrain:'snow'|'mountain'|'desert'|'plain'|'beach'|'city', army:fn(i), n, leader, leaderAt, elephantsEvery, horsesEvery, speed, river, weather, losses:[t0,t1], keys, banners}
function march(o){ return t=>{
  setCam(o.keys||[[0,540,980,1.1,0]],t); grad(...(o.sky||['#7c93b4','#c9d6e6','#eef3fa']));
  const tr=o.terrain||'plain', snow=tr==='snow';
  const night=lum((o.sky||['#7c93b4'])[0])<.18; layer(.06); clouds(t,250,night); if(!night&&o.rays!==false){ layer(.1); rays(t,1150,-200,.08); }
  layer(.12); if(tr!=='desert'&&tr!=='beach') mountains(1000,8,380,720,snow?'#9fb0c8':(o.far||'#7d8a9e'),snow||tr==='mountain'?'#ffffff':null,3,2800,-900); else hills(1080,120,o.far||'#d8b47a',2);
  if(o.backdrop) o.backdrop(t);
  layer(.35); if(tr==='snow'||tr==='mountain') mountains(1150,9,280,520,snow?'#6f819e':'#5d6a54',snow?'#f3f6fb':null,7,3000,-1000); else hills(1180,110,o.mid||(tr==='desert'?'#c9a066':'#6e8a4a'),5);
  layer(.6); hills(1290,50,o.near||(snow?'#e6edf6':tr==='desert'?'#d6b072':tr==='beach'?'#d9c08a':'#7f9a54'),9);
  if(o.river){ c.fillStyle='#3b6e8f'; c.fillRect(-900,1330,4200,140); c.fillStyle='rgba(255,255,255,.35)'; for(let i=0;i<40;i++) c.fillRect(mod(rnd(i)*4000-t*80,4200)-900,1350+rnd(i*3)*110,60,4); }
  layer(1); const sp=o.speed??95, off=-t*sp; c.save(); c.translate(off,0);
  const groundY=o.groundY||1490; c.fillStyle=o.ground||(snow?'#d6dfeb':tr==='desert'?'#d9b878':tr==='beach'?'#e2cc96':'#8aa45c'); c.fillRect(-900,groundY-50,9000,900);
  const n=o.n||16, sp2=o.spacing||165, x0=(o.startX??-200)+(o.t0||0)*sp, lost=o.losses?k01(t,o.losses[0],o.losses[1]):0;
  for(let i=0;i<n;i++){ const x=x0+i*sp2+(rnd(i*5)-.5)*40, fade=(rnd(i*9)<(o.lossShare||.55))?1-lost:1; if(fade<=.02) continue; c.globalAlpha=fade;
    const y=groundY+(i%3)*10;
    if(o.elephantsEvery&&i%o.elephantsEvery===o.elephantsEvery-1) elephant(x,y,.72,t*5+i,1,o.blanket);
    else if(o.horsesEvery&&i%o.horsesEvery===o.horsesEvery-1) horse(x,y,.8,t*7+i,1,['#6a4426','#2a1a10','#8a6a4a'][i%3],{P:o.army(i),t,look:1,seed:i,s:.8});
    else person(o.army(i),{x,y,s:o.scale||.95,t,walk:t*6+i*1.3,look:1,seed:i,wind:.6,face:o.face||{brow:-.4,mouth:'f'}});
    if(o.banners&&i%6===2){ flag(x-10,y-420,90,60,o.banners,t); }
    c.globalAlpha=1; }
  if(o.leader){ const lx=x0+n*sp2+(o.leaderGap||220); person(o.leader,{x:lx,y:groundY+10,s:1.05,t,walk:t*6,look:1,seed:1,wind:.9,face:o.leaderFace||{brow:-.5,mouth:'f'}}); }
  if(o.foreground) o.foreground(t);
  c.restore(); layer(1.35); foreground(t,(o.speed??95)*1.6,night?'#06070c':'#1a140e'); if(o.weather) particles(o.weather,t,o.weatherN||200); }; }
// Dos ejércitos que se cargan. o: {sky, ground, left:{army,leader,flag}, right:{...}, chargeAt, clashAt, keys, n}
function charge(o){ return t=>{
  setCam(o.keys,t); grad(...(o.sky||['#2a1a3a','#c4592a','#f0a040'])); layer(.06); clouds(t,300,lum((o.sky||['#2a1a3a'])[0])<.18); layer(.1); rays(t,900,700,.07);
  layer(.2); if(o.backdrop) o.backdrop(t); else hills(1150,140,o.far||'#5a2a2e',3);
  layer(.5); hills(1260,60,o.mid||'#3a1a1e',6);
  layer(1); const gy=1560; c.fillStyle=o.ground||'#2a1210'; c.fillRect(-900,gy-60,3000,900);
  const ch=k01(t,o.chargeAt,o.clashAt), run=eio(ch), n=o.n||9;
  for(const side of ['left','right']){ const L=o[side], dir=side==='left'?1:-1;
    for(let r=0;r<3;r++) for(let i=0;i<n;i++){ const bx=side==='left'?-380+i*70+r*30:1460-i*70-r*30, x=bx+dir*run*560, y=gy-r*48;
      const sc=.62+r*.1; const P=L.army(i+r*n); c.globalAlpha=r===0?.55:1;
      if(L.elephants&&i%4==0&&r==2) elephant(x,y,.5,t*7+i,dir,L.blanket); else if(L.horses&&i%3==0&&r==1) horse(x,y,.6,t*10+i,dir,'#4a3020',{P,t,look:dir,seed:i,s:.75});
      else person(P,{x,y,s:sc,t,walk:ch>0&&ch<1?t*11+i:null,look:dir,seed:i+r*30,face:{brow:.7,mouth:ch>0?'o':'g'},armF:ch>0?[dir*1.8,dir*2.2]:null});
      c.globalAlpha=1; }
    if(L.flag) flag(side==='left'?-200+run*560:1180-run*560,gy-520,110,72,L.flag,t); }
  if(t>=o.clashAt){ const a=t-o.clashAt; for(let i=0;i<8;i++){ const q=mod(a*1.6+rnd(i),1); c.fillStyle=`rgba(200,170,120,${.35*(1-q)})`; c.beginPath(); c.arc(540+(rnd(i*3)-.5)*600,gy-120-q*200,80+q*140,0,7); c.fill(); }
    for(let i=0;i<5;i++){ const q=mod(a*3+rnd(i*7),1); if(q<.15) glow(540+(rnd(i*5+Math.floor(a*3))-.5)*500,gy-200-rnd(i)*200,90,'rgba(255,240,200,A)',.9); } }
  if(o.front) o.front(t); layer(1.3); foreground(t,30,'#14100c');
}; }
// Interiores y exteriores para diálogos. o:{bg:'oficina'|'sala'|'tienda'|'palacio'|'atardecer'|'noche'|'muralla', chars:[{P,x,look,s,talkIn:[ids], face(t)}], keys, extra(t)}
function talk(o){ return t=>{
  setCam(o.keys,t); const bg=o.bg;
  if(bg==='oficina'){ grad('#4a3a26','#5a4630','#2a2016'); layer(.4); c.fillStyle='#4a3a28'; c.fillRect(-300,200,1700,1350); c.fillStyle='#bfd6ea'; for(const x of [150,750]){ c.fillRect(x,380,200,560); c.strokeStyle='#e8e0cc'; c.lineWidth=14; c.strokeRect(x,380,200,560); c.beginPath(); c.moveTo(x+100,380); c.lineTo(x+100,940); c.stroke(); } glow(540,600,700,'rgba(255,230,180,A)',.18); if(o.flags) o.flags.forEach((f,i)=>flag(430+i*170,620,110,72,f,t)); }
  else if(bg==='sala'){ grad('#1e2a38','#283646','#141c26'); layer(.4); c.fillStyle='#2c3c4e'; c.fillRect(-300,200,1700,1350); c.fillStyle='#2f4a5a'; c.fillRect(160,360,760,460); c.strokeStyle='#8ab4d0'; c.lineWidth=6; c.strokeRect(160,360,760,460); if(o.wallMap) o.wallMap(t); glow(540,580,600,'rgba(120,190,255,A)',.15); }
  else if(bg==='tienda'){ grad('#2a1a0e','#4a2e18','#1a1008'); layer(.4); c.fillStyle='#8a6a40'; c.beginPath(); c.moveTo(-200,1500); c.lineTo(540,250); c.lineTo(1280,1500); c.fill(); c.strokeStyle='#5a4020'; c.lineWidth=8; for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(540,250); c.lineTo(-200+i*296,1500); c.stroke(); } glow(540,1000,600,'rgba(255,170,80,A)',.3); }
  else if(bg==='palacio'){ grad('#1a0a14','#3a1424','#140810'); layer(.4); for(let i=0;i<6;i++) column(-200+i*290,380,1500,100,'#5a3a4a','#4a2a3a'); c.fillStyle='#7a1f2a'; c.fillRect(380,300,320,1200); glow(540,700,600,'rgba(255,200,120,A)',.25); }
  else if(bg==='muralla'){ grad('#2a1a2a','#8a4a3a','#d0804a'); layer(.4); c.fillStyle='#6a5a4a'; c.fillRect(-500,1000,2100,600); for(let i=0;i<9;i++){ c.fillRect(-500+i*260,880,140,140); c.strokeStyle='#0b0806'; c.lineWidth=5; c.strokeRect(-500+i*260,880,140,140); } }
  else if(bg==='noche'){ grad('#0a0c16','#141826','#0c0e16'); layer(.4); c.fillStyle='#1a1e2c'; c.fillRect(-300,200,1700,1300); glow(840,1180,700,'rgba(255,170,80,A)',.4); }
  else { grad('#3a2a5a','#d8703a','#f6b050'); layer(.06); clouds(t,300,false); layer(.2); glow(860,1050,600,'rgba(255,210,140,A)',.6); rays(t,860,1050,.07); layer(.5); hills(1300,80,'#4a2028',4); }
  layer(.8); c.fillStyle=o.floor||'#120e0c'; c.fillRect(-500,1500,2100,900);
  if(o.extra) o.extra(t);
  layer(1); for(const ch of o.chars){ const speaking=(ch.talkIn||[]).some(id=>t>=T(id)&&t<E(id)); const fc=ch.face?ch.face(t):{}; person(ch.P,{x:ch.x,y:ch.y||1560,s:ch.s||1.05,t,look:ch.look,seed:ch.seed||ch.x,talk:speaking,wind:.2,face:{...fc,mouth:speaking?'o':fc.mouth},armF:speaking?[ch.look*(1.6+Math.sin(t*3+ch.x)*.3),ch.look*2.1]:ch.armF,armB:ch.armB,paper:ch.paper}); }
  if(o.front) o.front(t); }; }
// Ciudad con misiles, explosiones o cañonazos. o:{modern:true|false, sky, events:[{type:'missile'|'boom'|'intercept'|'cannon', t0, dur, x0,y0,x1,y1,h}], keys, siren:[t0,t1]}
function city(o){ return t=>{
  setCam(o.keys,t); grad(...(o.sky||['#05070f','#141a2c','#2a1a1a']));
  layer(.15); for(let i=0;i<150;i++){ c.fillStyle=`rgba(255,255,255,${.3+rnd(i)*.5})`; c.fillRect(rnd(i*3)*1400-160,rnd(i*7)*900,2+rnd(i)*2,2+rnd(i)*2); }
  layer(.35); if(o.modern!==false){ for(let i=0;i<16;i++){ const x=-300+i*120, h=260+rnd(i*4)*420; c.fillStyle='#141824'; c.fillRect(x,1300-h,100,h); c.fillStyle='rgba(255,220,140,.6)'; for(let r=0;r<h/40;r++) for(let q=0;q<3;q++) if(rnd(i*31+r*7+q)>.55) c.fillRect(x+12+q*30,1300-h+12+r*40,16,20); } }
  else { c.fillStyle='#3a3040'; for(let i=0;i<12;i++){ const x=-300+i*150, h=180+rnd(i*4)*200; c.fillRect(x,1300-h,120,h); c.beginPath(); c.arc(x+60,1300-h,50,Math.PI,0); c.fill(); } }
  if(o.backdrop) o.backdrop(t);
  layer(.6); c.fillStyle=o.wall||'#0c0e14'; c.fillRect(-500,1300,2100,900); if(o.mid) o.mid(t);
  layer(1); for(const ev of (o.events||[])){ const a=t-ev.t0;
    if(ev.type==='missile'){ const k=a/ev.dur; missile(ev.x0,ev.y0,ev.x1,ev.y1,k,ev.h||600,undefined,ev.s||1); if(k>=1) explosion(ev.x1,ev.y1,ev.r||70,a-ev.dur); }
    else if(ev.type==='intercept'){ const k=a/ev.dur; if(k<1){ missile(ev.x0,ev.y0,ev.x1,ev.y1,k,ev.h||500,undefined,.8); missile(ev.ix0,ev.iy0,ev.ix1,ev.iy1,k,200,'#9ad8ff',.6); } else if(k<1+2.5/ev.dur){ glow(ev.ix1,ev.iy1,200,'rgba(255,240,200,A)',Math.exp(-(a-ev.dur)*3)); explosion(ev.ix1,ev.iy1,40,a-ev.dur); } }
    else if(ev.type==='boom') explosion(ev.x,ev.y,ev.r||90,a);
    else if(ev.type==='cannon'){ if(a>=0&&a<1.2){ const k=a/1.2; c.fillStyle='#14110e'; c.beginPath(); c.arc(lerp(ev.x0,ev.x1,k),lerp(ev.y0,ev.y1,k)-Math.sin(k*Math.PI)*ev.h,16,0,7); c.fill(); } explosion(ev.x1,ev.y1,ev.r||60,a-1.2); } }
  if(o.front) o.front(t);
  if(o.siren&&t>=o.siren[0]&&t<o.siren[1]){ screen(); const ph=Math.floor(t*3)%2; c.fillStyle=ph?'rgba(255,40,40,.12)':'rgba(40,40,40,0)'; c.fillRect(0,0,W,H); } }; }

// ---------------- mapas ----------------
const MAPA={lon0:0,lat0:0,K:60,cos:1};
function setMap(lon0,lat0,K){ MAPA.lon0=lon0; MAPA.lat0=lat0; MAPA.K=K; MAPA.cos=Math.cos(lat0*Math.PI/180); }
const PX=(lo,la)=>[540+(lo-MAPA.lon0)*MAPA.K*MAPA.cos,960+(MAPA.lat0-la)*MAPA.K];
function mapCam(keys,t){ setCam(keys.map(k=>{ const [x,y]=PX(k[1],k[2]); return [k[0],x,y,k[3],k[4]||0,k[5]]; }),t); }
function ring(pts){ c.beginPath(); pts.forEach((p,i)=>{ const [x,y]=PX(p[0],p[1]); i?c.lineTo(x,y):c.moveTo(x,y); }); c.closePath(); }
// o: {land, sea, colors:{País:[color, t0, t1?]}, polys:[{pts,color,t0}], borders}
function mapDraw(o,t){
  screen(); const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,o.sea||'#23587a'); g.addColorStop(1,o.sea2||'#1a4562'); c.fillStyle=g; c.fillRect(0,0,W,H);
  layer(1); c.fillStyle='rgba(255,255,255,.05)'; for(let i=0;i<30;i++){ const [x,y]=[rnd(i*3)*6000-2500,rnd(i*7)*6000-2000]; c.beginPath(); c.ellipse(x+Math.sin(t*.6+i)*10,y,120,6,0,0,7); c.fill(); }
  for(const name in MUNDO){ if(o.countries&&!o.countries.includes(name)) continue; const col=o.colors&&o.colors[name]; let fill=o.land||'#cfae74';
    if(col){ const a=col[1]==null?1:esm(k01(t,col[1],col[1]+.5))*(col[2]!=null?1-esm(k01(t,col[2],col[2]+.5)):1); if(a>0) fill=mixCol(o.land||'#cfae74',col[0],a); }
    for(const r of MUNDO[name]){ ring(r); c.fillStyle=fill; c.fill(); c.strokeStyle=o.border||'rgba(74,50,26,.85)'; c.lineWidth=3/CAM.z; c.stroke(); } }
  for(const p of (o.polys||[])){ const a=p.t0==null?1:esm(k01(t,p.t0,p.t0+.5))*(p.t1!=null?1-esm(k01(t,p.t1,p.t1+.5)):1); if(a<=0) continue; c.globalAlpha=a; ring(p.pts); c.fillStyle=p.color; c.fill(); if(p.stroke){ c.strokeStyle=p.stroke; c.lineWidth=4/CAM.z; c.stroke(); } c.globalAlpha=1; } }
function mixCol(a,b,k){ const h=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]; const A=h(a),B=h(b); return `rgb(${A.map((v,i)=>Math.round(lerp(v,B[i],k))).join(',')})`; }
function mapLabel(txt,lo,la,col,t0,t,o={}){ const k=eout(k01(t,t0,t0+.25))*(o.t1!=null?1-k01(t,o.t1,o.t1+.25):1); if(k<=0) return; const [x,y]=PX(lo,la); c.save(); c.translate(x,y); c.scale(1/CAM.z,1/CAM.z);
  if(o.dot!==false){ c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.arc(0,0,13*k,0,7); c.fill(); c.stroke(); }
  c.globalAlpha=k; c.font=`900 ${o.size||46}px Inter`; c.textAlign='center'; c.lineJoin='round'; c.lineWidth=12; c.strokeStyle='#0b0806'; const dy=o.dy??-44; c.strokeText(txt,o.dx||0,dy+(1-k)*20); c.fillStyle=o.textCol||'#fff8e6'; c.fillText(txt,o.dx||0,dy+(1-k)*20); c.restore(); }
function routePts(pts,k){ const P=pts.map(p=>PX(p[0],p[1])); let L=0; const seg=[]; for(let i=1;i<P.length;i++){ const d=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); seg.push(d); L+=d; } let want=L*k, out=[P[0]];
  for(let i=1;i<P.length;i++){ if(want>=seg[i-1]){ out.push(P[i]); want-=seg[i-1]; } else { const q=want/seg[i-1]; out.push([lerp(P[i-1][0],P[i][0],q),lerp(P[i-1][1],P[i][1],q)]); break; } } return out; }
function mapArrow(pts,k,col,dash,width=12){ if(k<=0) return null; const P=routePts(pts,k); if(P.length<2) return P[0]; c.save(); c.lineCap='round'; c.lineJoin='round'; c.setLineDash(dash?[34/CAM.z,22/CAM.z]:[]);
  c.strokeStyle='#0b0806'; c.lineWidth=(width+8)/CAM.z; c.beginPath(); P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); c.strokeStyle=col; c.lineWidth=width/CAM.z; c.stroke(); c.restore();
  const e=P[P.length-1], b=P[P.length-2], a=Math.atan2(e[1]-b[1],e[0]-b[0]); c.save(); c.translate(e[0],e[1]); c.rotate(a); c.scale(1/CAM.z,1/CAM.z); c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.moveTo(30,0); c.lineTo(-18,-24); c.lineTo(-18,24); c.closePath(); c.fill(); c.stroke(); c.restore(); return e; }
function mapPulse(lo,la,t0,t,col='rgba(255,80,60,A)'){ const a=t-t0; if(a<0) return; const [x,y]=PX(lo,la); for(let i=0;i<3;i++){ const q=mod(a*.8+i/3,1); c.save(); c.strokeStyle=col.replace('A',(1-q)*.9); c.lineWidth=6/CAM.z; c.beginPath(); c.arc(x,y,(20+q*90)/CAM.z,0,7); c.stroke(); c.restore(); } }
function mapIcon(fn,lo,la,s,t0,t){ const k=eout(k01(t,t0,t0+.3)); if(k<=0) return; const [x,y]=PX(lo,la); c.save(); c.translate(x,y); c.scale(k*s/CAM.z,k*s/CAM.z); fn(); c.restore(); }
function mapMissile(a,b,k,hgt){ const [x0,y0]=PX(a[0],a[1]), [x1,y1]=PX(b[0],b[1]); c.save(); missile(x0,y0,x1,y1,k,hgt,undefined,1/CAM.z*1.4); c.restore(); if(k>=1) return [x1,y1]; }
function swords(lo,la,t0,t){ const k=k01(t,t0,t0+.2); if(k<=0) return; const [x,y]=PX(lo,la); c.save(); c.translate(x,y); const s=(1.6-.6*eout(k))/CAM.z; c.scale(s,s); c.globalAlpha=k;
  for(const sg of [-1,1]){ c.save(); c.rotate(sg*.7); c.fillStyle='#e8ecf0'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.moveTo(-6,-60); c.lineTo(6,-60); c.lineTo(6,30); c.lineTo(-6,30); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#c99a3e'; c.fillRect(-22,24,44,10); c.strokeRect(-22,24,44,10); c.restore(); } c.restore(); }

// ---------------- subtítulos y rótulos ----------------
function capChunks(text){ const words=text.replace(/\.\.\./g,'…').split(/\s+/), out=[]; let cur=[];
  for(const w of words){ cur.push(w); const len=cur.join(' ').length; if(len>=15||/[.,?:…!»;]$/.test(w)||cur.length>=3){ out.push(cur.join(' ')); cur=[]; } } if(cur.length) out.push(cur.join(' ')); return out; }
const pop=(el,t,t0,from=1.4,d=.12)=>{ const k=clamp((t-t0)/d,0,1); el.style.transform=`scale(${lerp(from,1,eout(k))})`; el.style.opacity=clamp(k*3,0,1); };
const show=(el,on)=>el.style.display=on?'block':'none';
const MOTOR={ run(cfg){
  TL=window.__TL__; TL.segs.forEach(s=>S[s.id]=s);
  const C=cfg(); const HOT=C.hot||/^$/;
  TL.segs.forEach(s=>{ const ch=capChunks(s.c||s.t), tot=ch.reduce((a,x)=>a+x.length+2,0); let a=0; s.caps=ch.map(x=>{ const o={t0:s.start+s.dur*a/tot,txt:x}; a+=x.length+2; o.t1=s.start+s.dur*a/tot; return o; }); s.caps[s.caps.length-1].t1=s.start+s.dur+.1; });
  const hl=(txt,on)=>txt.split(' ').map((w,i)=>{ const hot=HOT.test(w.replace(/[^\p{L}\p{N}.%]/gu,'').replace(/\.$/,'')); return i===on?`<span class="on">${w}</span>`:hot?`<b>${w}</b>`:w; }).join(' ');
  window.ALLCAPS=[]; let ix=0; TL.segs.forEach(s=>s.caps.forEach(q=>{ q.i=ix++; ALLCAPS.push(q); }));
  $('tag').textContent=C.tag||'RECREACIÓN ANIMADA';
  const cuts=C.scenes.map(s=>s[0]);
  window.setT=function(t){
    TT=t; SHAKE=0; for(const h of (C.hits||[])){ const d=t-h; if(d>=0&&d<1.1) SHAKE+=34*Math.exp(-d*4); }
    screen(); c.clearRect(0,0,W,H); c.globalAlpha=1; c.globalCompositeOperation='source-over'; c.setLineDash([]); c.filter='none';
    let sc=C.scenes[0]; for(const s of C.scenes) if(t>=s[0]) sc=s; c.save(); sc[1](t); c.restore(); screen();
    { const PP=C.post||{}; if(!window.__off){ window.__off=document.createElement('canvas'); __off.width=W; __off.height=H; }
      const oc=__off.getContext('2d'); oc.setTransform(1,0,0,1,0,0); oc.clearRect(0,0,W,H); oc.drawImage($('sc'),0,0);
      let ci=-1, c0=0; for(const q of ALLCAPS){ if(t>=q.t0) { ci=q.i; c0=q.t0; } }
      const tgt=ci<0?1:(ci%3===0?1:ci%3===1?1.06:1.11), prev=ci<1?1:((ci-1)%3===0?1:(ci-1)%3===1?1.06:1.11);
      const pz=(PP.punch===false)?1:lerp(prev,tgt,eout(k01(t,c0,c0+.16))), dx=Math.sin(t*.9)*7+Math.sin(t*2.3)*3, dy=Math.cos(t*.7)*6, rr=Math.sin(t*.5)*.004;
      c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,W,H); c.translate(W/2+dx,H/2+dy); c.rotate(rr); c.scale(pz*1.02,pz*1.02); c.translate(-W/2,-H/2);
      c.filter=`brightness(${PP.b||1.13}) contrast(${PP.c||1.3}) saturate(${PP.s||1.04})`; c.drawImage(__off,0,0);
      c.globalCompositeOperation='screen'; c.globalAlpha=PP.bloom??.22; c.filter='blur(18px) brightness(1.25)'; c.drawImage(__off,0,0);
      c.globalCompositeOperation='source-over'; c.globalAlpha=1; c.filter='none'; screen(); }
    fxc.clearRect(0,0,W,H); let near=99; for(const k of cuts) if(t>=k) near=t-k;
    if(near<.18&&t>.3){ const q=1-near/.18; fxc.save(); fxc.globalCompositeOperation='lighter'; for(let i=0;i<50;i++){ fxc.fillStyle=`rgba(255,255,255,${.12*q*rnd(i+Math.floor(t*30))})`; fxc.fillRect(rnd(i*3+Math.floor(t*40))*W*1.2-100,rnd(i*7)*H,300+rnd(i)*500,3+rnd(i*5)*6); } fxc.restore(); }
    $('grade').style.background=sc[2]||'transparent';
    let f=0; for(const fl of (C.flashes||[])){ const d=t-fl[0]; if(d>=0) f=Math.max(f,fl[1]*Math.exp(-d/fl[2])); } $('flash').style.opacity=f.toFixed(3);
    $('dark').style.opacity=(t>TL.total-.6)?k01(t,TL.total-.6,TL.total).toFixed(3):(t<.12?(1-t/.12).toFixed(3):0);
    const ti=$('title'); let tOn=null; for(const x of (C.titles||[])) if(t>=x[0]&&t<x[1]) tOn=x; if(tOn){ show(ti,1); ti.innerHTML=tOn[2]; ti.style.fontSize=tOn[3]||Math.round(clamp(1150/tOn[2].replace(/<small>.*$/,'').replace(/<[^>]+>/g,'').length,90,200))+'px'; pop(ti,t,tOn[0],2,.18); } else show(ti,0);
    const dt=$('date'); let dOn=null; for(const d of (C.dates||[])) if(t>=d[0]&&t<d[1]) dOn=d; if(dOn){ show(dt,1); dt.textContent=dOn[2]; dt.style.fontSize=dOn[2].length>11?'104px':''; pop(dt,t,dOn[0],1.8,.14); } else show(dt,0);
    const ct=$('count'); let cOn=null; for(const d of (C.counts||[])) if(t>=d[0]&&t<d[1]) cOn=d; if(cOn){ const v=cOn[2](t); show(ct,1); ct.innerHTML=v[0]+'<small>'+v[1]+'</small>'; ct.style.top=(cOn[3]||300)+'px'; pop(ct,t,cOn[0],1.5,.14); } else show(ct,0);
    const lw=$('lower'); let nOn=null; for(const n of (C.names||[])) if(t>=n[0]&&t<n[1]) nOn=n; if(nOn){ show(lw,1); lw.innerHTML=nOn[2]+'<small>'+nOn[3]+'</small>'; lw.style.top=(nOn[4]||1430)+'px'; const k=eout(k01(t,nOn[0],nOn[0]+.3)); lw.style.transform=`translateX(${(1-k)*-700}px)`; } else show(lw,0);
    const qt=$('quote'); let qOn=null; for(const q of (C.quotes||[])) if(t>=q[0]&&t<q[1]) qOn=q; if(qOn){ show(qt,1); qt.innerHTML=qOn[2]; pop(qt,t,qOn[0],1.1,.2); } else show(qt,0);
    const cp=$('cap'); let cc=null; for(const s of TL.segs) if(!(C.noCaps||[]).includes(s.id)) for(const q of s.caps) if(t>=q.t0&&t<q.t1) cc=q;
    if(cc){ show(cp,1); const ws=cc.txt.split(' '), tot=ws.reduce((a,w)=>a+w.length+1,0); let acc=0, on=0; for(let i=0;i<ws.length;i++){ if(t>=cc.t0+(cc.t1-cc.t0)*acc/tot) on=i; acc+=ws[i].length+1; } const key=cc.txt+'|'+on; if(cp.dataset.c!==key){ cp.dataset.c=key; cp.innerHTML=hl(cc.txt,on); } pop(cp,t,cc.t0,1.25,.08); } else show(cp,0);
  };
  window.ready=document.fonts.ready;
} };
