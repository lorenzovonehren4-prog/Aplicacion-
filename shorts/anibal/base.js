// Escenas originales de Aníbal (personajes, mapa, Cannas, colina, Escipión, Zama, final), sobre el motor común.
// ================= FICHAS DE PERSONAJE (no cambian entre escenas) =================
const ANIBAL ={skin:'#b47b4e',hair:'#16100c',hairStyle:'curly',beard:'#16100c',tunic:'#efe2c4',armor:'#c99a3e',cloak:'#5b2373',trim:'#e7b73c',h:560};
const ANIBAL_NINO={...ANIBAL,beard:null,hairStyle:'curlyShort',armor:null,cloak:null,tunic:'#f2e8d2',belt:'#5b2373',h:330};
const ANIBAL_VIEJO={...ANIBAL,hair:'#9a958d',beard:'#a7a29a',armor:null,tunic:'#4a3a5a',cloak:'#2e1d3a'};
const AMILCAR={skin:'#a87048',hair:'#3b3330',hairStyle:'short',beard:'#5e5651',beardLong:true,tunic:'#e4d6b6',armor:'#a8823a',cloak:'#7a1f2a',trim:'#d9a93a',h:600};
const MAHARBAL={skin:'#c08a5c',hair:'#4a2f1c',hairStyle:'short',beard:'#4a2f1c',tunic:'#d9cba8',armor:'#7a5534',cloak:'#2f6b45',trim:'#c9a24a',h:540};
const ESCIPION={skin:'#e2b892',hair:'#6b4a2e',hairStyle:'short',beard:null,tunic:'#b82127',armor:'#d4a64a',cloak:'#c4252b',trim:'#f0d38a',h:550,helmet:false};
const SOLD_C=i=>({skin:['#b47b4e','#8a5a38','#c99a6e','#6e4428'][i%4],hair:'#1d140e',hairStyle:i%2?'short':'curlyShort',beard:i%3==0?'#1d140e':null,tunic:['#d8c8a0','#3d5e8c','#c9b48a','#8a3a2a'][i%4],armor:null,cloak:null,h:300,shield:'round',shieldCol:['#7a5534','#5b2373','#a8823a'][i%3],spear:true});
const SOLD_R=i=>({skin:['#e2b892','#d8a87e','#c9956a'][i%3],hair:'#3a2a1c',hairStyle:'short',beard:null,tunic:'#b82127',armor:'#9aa0a8',cloak:null,h:300,helmet:true,shield:'scutum',shieldCol:'#a81e24',spear:true});

// ================= MAPA =================
const PXa=(lo,la)=>[(lo+10)*112,(47.5-la)*142];
const EUROPA=[[-9.3,43.2],[-8,43.7],[-4,43.5],[-1.6,43.4],[-1.2,44.6],[-1.2,46.2],[-2.2,47.1],[-4.5,47.9],[-5,49],[21,49],[21,39.6],[19.4,40.5],[19.4,41.8],[18.5,42.4],[17,43.2],[15.2,44.3],[14,45.2],[13.6,45.7],[12.3,45.3],[12.4,44.2],[13.6,43.6],[14,42.8],[15,42.1],[16,41.9],[17,41.1],[18.5,40.6],[18.4,40.1],[17,40.5],[16.5,39.7],[17.1,39],[16.6,38.4],[16.1,38],[15.65,38.25],[15.8,38.8],[16.1,39.4],[15.7,40],[15,40.2],[14.5,40.6],[14,40.8],[13,41.2],[12.2,41.7],[11.1,42.4],[10.5,42.9],[10.2,43.9],[8.8,44.4],[7.5,43.8],[6,43.1],[4.8,43.4],[3.5,43.3],[3.2,42.3],[3.2,41.9],[0.9,41],[0,39.8],[-0.3,38.5],[-0.7,37.6],[-2.1,36.7],[-4.4,36.7],[-5.6,36],[-6.4,36.8],[-7.4,37.2],[-8.9,37],[-8.8,38.7],[-9.5,39.4],[-8.8,41],[-8.9,42.5]];
const AFRICA=[[-11,29],[-11,31],[-9.8,31.5],[-8.5,33.3],[-6.8,34.1],[-5.9,35.8],[-5.3,35.9],[-2.2,35.1],[0,35.9],[1.5,36.6],[3,36.8],[5,36.8],[7,37],[8.6,36.9],[9.8,37.3],[10.3,36.9],[11.1,37.1],[10.5,36.4],[11.1,35.2],[10.1,34.2],[11.2,33.2],[13,32.9],[15.2,32.4],[15.6,31.5],[17,31],[19,30.3],[21,30.8],[21,29]];
const ISLAS=[[[12.4,37.8],[13.3,38.2],[15.6,38.3],[15.1,37.4],[15.1,36.7],[14.3,36.8],[12.6,37.6]],[[8.4,39],[8.2,40.6],[9.2,41.2],[9.8,40.5],[9.6,39.1],[9,39]],[[8.6,41.4],[8.6,42.4],[9.4,43],[9.6,42.1],[9.2,41.4]],[[2.4,39.5],[3.4,39.8],[3.2,39.3],[2.7,39.4]]];
const CITY={cartago:[10.3,36.85],roma:[12.5,41.9],cartagena:[-0.98,37.6],cannas:[16.13,41.3],trebia:[9.6,45.05],trasimeno:[12.1,43.15],zama:[9.3,36.1],sicilia:[13.4,37.9]};
const RUTA=[[-0.98,37.6],[-0.3,39.7],[0.9,41.2],[2.4,42.45],[4.6,43.75],[5.6,44.8],[6.9,45.15],[7.7,45.1],[9.6,45.05],[11,44.1],[12.1,43.15],[14.3,42.4],[16.13,41.3]];
const RUTA_IDX={pirineos:3,alpes:6,trebia:8,trasimeno:10,cannas:12};
function polyA(pts,fill,stroke){ c.beginPath(); pts.forEach((p,i)=>{const [x,y]=PXa(p[0],p[1]); i?c.lineTo(x,y):c.moveTo(x,y);}); c.closePath(); c.fillStyle=fill; c.fill(); if(stroke){ c.strokeStyle=stroke; c.lineWidth=5/CAM.z; c.stroke(); } }
function routePtsA(pts,k){ const P=pts.map(p=>PXa(p[0],p[1])); let L=0; const seg=[]; for(let i=1;i<P.length;i++){ const d=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); seg.push(d); L+=d; } let want=L*k, out=[P[0]];
  for(let i=1;i<P.length;i++){ if(want>=seg[i-1]){ out.push(P[i]); want-=seg[i-1]; } else { const q=want/seg[i-1]; out.push([lerp(P[i-1][0],P[i][0],q),lerp(P[i-1][1],P[i][1],q)]); break; } } return out; }
function routeKA(idx){ const P=RUTA.map(p=>PXa(p[0],p[1])); let L=0,A=0; for(let i=1;i<P.length;i++){ const d=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]); L+=d; if(i<=idx) A+=d; } return A/L; }
function drawRouteA(pts,k,col,dash){ const P=routePtsA(pts,k); if(P.length<2) return P[0]; c.save(); c.lineCap='round'; c.lineJoin='round'; c.strokeStyle='#0b0806'; c.lineWidth=20/CAM.z; c.setLineDash(dash?[34/CAM.z,22/CAM.z]:[]); c.beginPath(); P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.stroke(); c.strokeStyle=col; c.lineWidth=12/CAM.z; c.stroke(); c.restore();
  const e=P[P.length-1], b=P[P.length-2], a=Math.atan2(e[1]-b[1],e[0]-b[0]); c.save(); c.translate(e[0],e[1]); c.rotate(a); c.scale(1/CAM.z,1/CAM.z); c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.moveTo(30,0); c.lineTo(-18,-24); c.lineTo(-18,24); c.closePath(); c.fill(); c.stroke(); c.restore(); return e; }
function labelA(txt,lo,la,col,t0,t,dx=0,dy=-46,size=48){ const k=eout(k01(t,t0,t0+.25)); if(k<=0) return; const [x,y]=PXa(lo,la); c.save(); c.translate(x,y); c.scale(1/CAM.z,1/CAM.z);
  c.fillStyle=col; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.arc(0,0,14*k,0,7); c.fill(); c.stroke();
  c.globalAlpha=k; c.font=`900 ${size}px Inter`; c.textAlign='center'; c.lineJoin='round'; c.lineWidth=12; c.strokeText(txt,dx,dy+(1-k)*20); c.fillStyle='#fff8e6'; c.fillText(txt,dx,dy+(1-k)*20); c.restore(); }
function swordsA(lo,la,t0,t){ const k=k01(t,t0,t0+.2); if(k<=0) return; const [x,y]=PXa(lo,la); c.save(); c.translate(x,y); c.scale((1.6-0.6*eout(k))/CAM.z,(1.6-0.6*eout(k))/CAM.z); c.globalAlpha=k;
  for(const s of [-1,1]){ c.save(); c.rotate(s*.7); c.fillStyle='#e8ecf0'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.beginPath(); c.moveTo(-6,-60); c.lineTo(6,-60); c.lineTo(6,30); c.lineTo(-6,30); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#c99a3e'; c.fillRect(-22,24,44,10); c.strokeRect(-22,24,44,10); c.restore(); } c.restore(); }
function mapBase(t,tint){
  grad('#163246','#1b3c55','#122a3b');
  layer(1);
  c.fillStyle='#1d4560'; for(let i=0;i<40;i++){ const [x,y]=[rnd(i*3)*3600-200,rnd(i*7)*2900]; c.globalAlpha=.25; c.beginPath(); c.ellipse(x+Math.sin(t*.6+i)*10,y,90,6,0,0,7); c.fill(); } c.globalAlpha=1;
  polyA(EUROPA,'#cfae74','#4a321a'); polyA(AFRICA,'#c79e62','#4a321a'); ISLAS.forEach(p=>polyA(p,'#cfae74','#4a321a'));
  // relieve: Pirineos y Alpes
  const mt=(lo,la,sz)=>{ const [x,y]=PXa(lo,la); c.fillStyle='#8a6a3e'; c.strokeStyle='#4a321a'; c.lineWidth=3; c.beginPath(); c.moveTo(x-sz,y+sz*.4); c.lineTo(x,y-sz*.8); c.lineTo(x+sz,y+sz*.4); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#f3f1ea'; c.beginPath(); c.moveTo(x,y-sz*.8); c.lineTo(x-sz*.35,y-sz*.25); c.lineTo(x+sz*.35,y-sz*.25); c.closePath(); c.fill(); };
  [[-1,42.8],[0.5,42.7],[2,42.5]].forEach(p=>mt(p[0],p[1],30)); [[6.3,45],[7.2,45.8],[8.4,46.2],[9.8,46.4],[11.2,46.6],[12.6,46.6],[6.9,44.3]].forEach(p=>mt(p[0],p[1],36));
  [[10.5,44.3],[12,43.6],[13.4,42.6],[14.8,41.4]].forEach(p=>mt(p[0],p[1],20));
  if(tint){ c.fillStyle=tint; polyA(EUROPA,tint); }
}

// ================= ESCENAS =================
// 1. Templo: el juramento (noche, luz del fuego)
function templo(t,keys,childOnly){
  setCam(keys,t);
  grad('#0b0710','#1a0f12','#241510');
  layer(.4); c.fillStyle='#160d10'; c.fillRect(-400,300,1900,1400); for(let i=0;i<7;i++) column(-300+i*290,420,1450,90,'#2a1c18','#1f1512');
  layer(.8); c.fillStyle='#2a1a12'; c.fillRect(-500,1450,2100,800); c.fillStyle='#21140e'; for(let i=0;i<14;i++) c.fillRect(-500+i*160,1450,6,800);
  // altar
  c.fillStyle='#6e5a4a'; c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillRect(420,1180,240,270); c.strokeRect(420,1180,240,270); c.fillStyle='#857060'; c.fillRect(395,1150,290,40); c.strokeRect(395,1150,290,40);
  c.fillStyle='#4a3a2e'; c.font='900 46px Inter'; c.textAlign='center'; c.fillText('☾ ☉',540,1330);
  const fl=.85+.15*Math.sin(t*13)+.05*Math.sin(t*31);
  glow(540,1080,700*fl,'rgba(255,130,40,A)',.45); flame(540,1150,170,260,t,1); flame(500,1150,70,130,t,2); flame(585,1150,80,150,t,3);
  if(!childOnly) person(AMILCAR,{x:720,y:1460,s:1,t,look:-1,seed:2,face:{brow:.7,mouth:'f'},armF:[-.9,-.5],armB:[.25,.1]});
  const raise=eout(k01(t,T('g1')+.6,T('g1')+1.4));
  person(ANIBAL_NINO,{x:420,y:1460,s:1,t,look:1,seed:5,face:{brow:lerp(0,.9,raise),mouth:'g',eyes:raise>.5?'s':'n'},armF:[lerp(.2,2.0,raise),lerp(.3,2.3,raise)],armB:[-.15,-.05]});
  // luz de contorno del fuego
  layer(1); glow(540,1150,380*fl,'rgba(255,200,120,A)',.25);
  c.save(); c.setTransform(1,0,0,1,0,0); for(let i=0;i<40;i++){ const k=mod(t*.25+rnd(i),1); c.fillStyle=`rgba(255,${150+rnd(i*3)*80|0},60,${(1-k)*.8})`; c.beginPath(); c.arc(W/2+(rnd(i*5)-.5)*500+Math.sin(t*2+i)*30,1100-k*900,2+rnd(i*7)*4,0,7); c.fill(); } c.restore();
}
// 2. Aníbal adulto ante la ciudad en llamas
function heroe(t){
  setCam([[T('g2a'),540,720,3.4,.04],[T('g2b'),540,700,2.9,.03],[T('g2b')+.35,540,1000,1,0,eout],[T('c1'),540,1020,.94,0]],t);
  grad('#1a0606','#5a1408','#b8401a');
  layer(.25); glow(540,900,900,'rgba(255,120,40,A)',.55); c.fillStyle='#2a0a08';
  for(let i=0;i<9;i++){ const x=-200+i*180, h=180+rnd(i*3)*260; c.fillRect(x,1150-h,140,h); c.beginPath(); c.moveTo(x-10,1150-h); c.lineTo(x+70,1150-h-60); c.lineTo(x+150,1150-h); c.fill(); }
  for(let i=0;i<6;i++){ const x=-100+i*260; for(let j=0;j<4;j++){ const k=mod(t*.2+j/4+i*.3,1); c.fillStyle=`rgba(30,10,10,${.6*(1-k)})`; c.beginPath(); c.arc(x+k*120,900-k*500,60+k*120,0,7); c.fill(); } flame(x+60,1000,120,240,t,i); }
  layer(.55); c.fillStyle='#120404'; c.fillRect(-500,1150,2100,900);
  for(let i=0;i<4;i++){ c.save(); c.globalAlpha=.85; c.filter='brightness(0.15)'; elephant(-150+i*420+mod(t*30,420),1300,.8,t*4+i,1); c.restore(); }
  layer(1); c.fillStyle='#0d0806'; c.beginPath(); c.moveTo(-500,1520); c.quadraticCurveTo(540,1380,1600,1520); c.lineTo(1600,2400); c.lineTo(-500,2400); c.fill();
  person(ANIBAL,{x:540,y:1500,s:1.45,t,look:1,seed:9,wind:.9,face:{brow:.6,mouth:'g',eyes:t<T('g2a')+.4?'c':'n'},armF:[.25,.15],armB:[-.25,-.1]});
  glow(540,560,300,'rgba(255,170,80,A)',.25);
}
// 3. Mapa: contexto, ruta, batallas, Cannas, quince años, Escipión
function mapa(t){
  const P=(n)=>{const [x,y]=PXa(...CITY[n]); return [x,y];};
  const [cx,cy]=P('cartago'), [rx,ry]=P('roma'), [hx,hy]=P('cartagena');
  const k1m=T('k1')+D('k1')*.42;
  const keys=[[T('c1'),(cx+rx)/2,(cy+ry)/2+60,.62,0],[T('c1')+1.6,(cx+rx)/2,(cy+ry)/2,.7,0],[T('c2'),hx-150,hy-80,1.15,-.02],[T('r1'),hx+400,hy-300,.85,0],
    [T('r2a'),PXa(2.4,42.5)[0],PXa(2.4,42.5)[1],1.05,.02],[T('r2a')+D('r2a')*.55,PXa(6.9,45.1)[0],PXa(6.9,45.1)[1],1.3,-.01],[E('r2b'),PXa(6.9,45.1)[0],PXa(6.9,45.1)[1],1.5,0],
    [T('b1'),PXa(9,44.8)[0],PXa(9,44.8)[1],1.1,0],[T('b1')+D('b1')*.7,PXa(11.5,43.5)[0],PXa(11.5,43.5)[1],1.25,.01],[T('k1'),PXa(13.5,42.4)[0],PXa(13.5,42.4)[1],1.0,0],
    [k1m-.35,PXa(16.13,41.3)[0],PXa(16.13,41.3)[1],1.4,0],[k1m,PXa(16.13,41.3)[0],PXa(16.13,41.3)[1],6,0,ein],
    [T('e1'),PXa(13.5,40.8)[0],PXa(13.5,40.8)[1],.8,0],[T('e2'),PXa(13.5,40.8)[0],PXa(13.5,40.8)[1],.85,0],[T('e2')+D('e2')*.42,(rx+cx)/2,(ry+cy)/2,.68,0],[E('e2'),(rx+cx)/2,(ry+cy)/2+40,.72,0]];
  setCam(keys,t);
  const italy= t>=T('e1')&&t<T('e2')+.4 ? `rgba(91,35,115,${.25*esm(k01(t,T('e1'),T('e1')+1))})`:null;
  mapBase(t);
  if(italy){ c.save(); c.beginPath(); const [ix,iy]=PXa(12.5,42); c.arc(ix,iy,420,0,7); c.clip(); polyA(EUROPA,italy); c.restore(); }
  layer(1);
  // contexto: Roma contra Cartago
  if(t<T('c2')+.5){ labelA('ROMA',...CITY.roma,'#c4252b',T('c1')+.2,t,0,-46,58); labelA('CARTAGO',...CITY.cartago,'#7a3a92',T('c1')+.45,t,0,70,58);
    if(t>T('c1')+1.2){ const k=eout(k01(t,T('c1')+1.2,T('c1')+1.7)); c.save(); c.strokeStyle='rgba(255,240,200,.8)'; c.lineWidth=8/CAM.z; c.setLineDash([20/CAM.z,16/CAM.z]); c.beginPath(); c.moveTo(cx,cy); c.lineTo(lerp(cx,rx,k),lerp(cy,ry,k)); c.stroke(); c.restore(); swordsA(11.4,39.4,T('c1')+1.7,t); } }
  // Hispania: Aníbal toma el mando
  if(t>=T('c2')-.2){ labelA('HISPANIA',-4,40,'#7a3a92',T('c2'),t,0,-10,64); labelA('Qart Hadasht',...CITY.cartagena,'#7a3a92',T('c2')+.5,t,0,62,40);
    const k=eout(k01(t,T('c2')+1.2,T('c2')+1.7)); if(k>0&&t<T('r2b')+.2){ c.save(); c.translate(hx,hy-150/CAM.z); c.scale(k/CAM.z,k/CAM.z); c.fillStyle='#fff8e6'; c.strokeStyle='#0b0806'; c.lineWidth=6; c.beginPath(); c.arc(0,0,92,0,7); c.fill(); c.stroke(); c.save(); c.beginPath(); c.arc(0,0,86,0,7); c.clip(); person(ANIBAL,{x:0,y:260,s:.62,t,look:1,seed:3,face:{brow:.4}}); c.restore(); c.restore(); } }
  // ruta por mar tachada y ruta por tierra
  if(t>=T('r1')&&t<T('k1')){ const k=eout(k01(t,T('r1')+.2,T('r1')+1.2)); if(t<T('r2a')){ c.save(); c.globalAlpha=.9; drawRouteA([[-0.98,37.6],[4,39.2],[9,40.3],[12.3,41.7]],k,'#7fc6ff',true); c.restore();
      const kx=eout(k01(t,T('r1')+1.5,T('r1')+1.8)); if(kx>0){ const [mx,my]=PXa(5,39.4); c.save(); c.translate(mx,my); c.scale(kx*1.4/CAM.z,kx*1.4/CAM.z); c.strokeStyle='#0b0806'; c.lineWidth=34; c.lineCap='round'; c.beginPath(); c.moveTo(-70,-70); c.lineTo(70,70); c.moveTo(70,-70); c.lineTo(-70,70); c.stroke(); c.strokeStyle='#ff3b30'; c.lineWidth=20; c.stroke(); c.restore(); } } }
  if(t>=T('r1')+2.2&&t<T('e1')){ let k=0; const kA=routeKA(RUTA_IDX.alpes), kTb=routeKA(RUTA_IDX.trebia), kTs=routeKA(RUTA_IDX.trasimeno);
    if(t<T('r2a')) k=lerp(0,routeKA(2),eio(k01(t,T('r1')+2.2,T('r2a'))));
    else if(t<E('r2b')) k=lerp(routeKA(2),kA,eio(k01(t,T('r2a'),T('r2a')+D('r2a')*.9)));
    else if(t<T('b1')) k=kA;
    else if(t<T('k1')) k=lerp(kA,kTs,eio(k01(t,T('b1')+.2,T('b1')+D('b1')*.9)));
    else k=lerp(kTs,1,eio(k01(t,T('k1')+.1,k1m-.4)));
    if(t<T('e1')){ const e=drawRouteA(RUTA,k,'#ffcf3a',false);
      if(t>=T('r2b')-.1&&t<T('b1')){ c.save(); c.translate(e[0],e[1]-60/CAM.z); c.scale(.28/CAM.z,.28/CAM.z); elephant(0,0,1,t*8,1); c.restore(); } }
    labelA('PIRINEOS',2,42.6,'#8a6a3e',T('r2a')+.2,t,0,-60,44); labelA('ALPES',8.6,46.4,'#8a6a3e',T('r2a')+D('r2a')*.55,t,0,-70,54);
    if(t>=T('b1')){ swordsA(...CITY.trebia,T('b1')+D('b1')*.5,t); labelA('TREBIA · 218',...CITY.trebia,'#ffcf3a',T('b1')+D('b1')*.5,t,-40,-80,42);
      swordsA(...CITY.trasimeno,T('b1')+D('b1')*.82,t); labelA('TRASIMENO · 217',...CITY.trasimeno,'#ffcf3a',T('b1')+D('b1')*.82,t,60,-80,42); }
    if(t>=T('k1')) labelA('CANNAS',...CITY.cannas,'#ff3b30',T('k1')+.5,t,0,-60,54);
    if(t>=T('k1')||t>=T('b1')) labelA('ROMA',...CITY.roma,'#c4252b',T('b1'),t,-70,10,40);
  }
  // quince años en Italia y regreso a África
  if(t>=T('e1')){ labelA('ROMA',...CITY.roma,'#c4252b',T('e1'),t,0,-46,50); labelA('CARTAGO',...CITY.cartago,'#7a3a92',T('e1'),t,0,70,50);
    const yrs=Math.round(lerp(218,203,eio(k01(t,T('e1')+.3,T('e1')+D('e1')*.8)))); const [ix,iy]=PXa(16.2,39.6);
    c.save(); c.translate(ix,iy); c.scale(1/CAM.z,1/CAM.z); c.font='900 64px Inter'; c.textAlign='center'; c.lineWidth=14; c.strokeStyle='#0b0806'; c.lineJoin='round'; c.strokeText(yrs+' a. C.',0,0); c.fillStyle='#ffcf3a'; c.fillText(yrs+' a. C.',0,0); c.restore();
    if(t>=T('e2')+D('e2')*.42){ const k1=eout(k01(t,T('e2')+D('e2')*.42,T('e2')+D('e2')*.7)), k2=eout(k01(t,T('e2')+D('e2')*.66,E('e2')));
      drawRouteA([[13.4,38.1],[11.5,37.6],[10.1,37.05]],k1,'#ff5a50',false); labelA('ESCIPIÓN',13.6,38.4,'#c4252b',T('e2')+D('e2')*.42,t,40,-56,40);
      if(k2>0) drawRouteA([[17.1,39.1],[14.5,37.2],[11.2,36]],k2,'#ffcf3a',true); }
  }
}
// 4. Los Alpes: travelling lateral con la columna
function alpes(t){
  setCam([[T('a1'),420,980,1.25,0],[T('a2'),620,980,1.1,0],[T('b1'),760,1000,1.0,-.02]],t);
  grad('#7c93b4','#c9d6e6','#eef3fa');
  layer(.15); mountains(1000,8,420,700,'#9fb0c8','#ffffff',3,2800,-900);
  layer(.35); mountains(1150,9,300,520,'#6f819e','#f3f6fb',7,3000,-1000);
  layer(.6); c.fillStyle='#e6edf6'; c.beginPath(); c.moveTo(-800,1250); for(let i=0;i<=20;i++) c.lineTo(-800+i*180,1230-Math.sin(i*1.3)*40); c.lineTo(3000,2400); c.lineTo(-800,2400); c.fill();
  // avalancha
  const av=k01(t,T('a1')+.7,T('a1')+2.2); if(av>0&&av<1){ c.fillStyle='rgba(255,255,255,.95)'; for(let i=0;i<26;i++){ const q=clamp(av*1.4-rnd(i)*.4,0,1); c.beginPath(); c.arc(1300-q*600+rnd(i*3)*200,500+q*700+rnd(i*5)*120,40+rnd(i*7)*70,0,7); c.fill(); } }
  layer(1); const off=-t*95;
  c.save(); c.translate(off,0);
  // camino
  c.fillStyle='#d6dfeb'; c.fillRect(-800,1440,6000,900); c.fillStyle='#b9c6d8'; for(let i=0;i<30;i++) c.fillRect(-800+i*200,1450+rnd(i)*60,120,10);
  const col=[]; for(let i=0;i<14;i++) col.push(i);
  const start=T('a1')*95-200; const lost=k01(t,T('a2')+.2,E('a2')+.4);
  col.forEach(i=>{ const x=start+i*170+(i>6?160:0), fade=(rnd(i*9)<.55)?1-lost:1; if(fade<=.02) return; c.globalAlpha=fade;
    if(i===3||i===9) elephant(x,1480,.75,t*5+i,1,null);
    else person(SOLD_C(i),{x,y:1490+(i%2)*8,s:.95,t,walk:t*6+i,look:1,seed:i,wind:.6,face:{brow:-.5,mouth:'f'}});
    c.globalAlpha=1; });
  const ax=start+14*170+260; person(ANIBAL,{x:ax,y:1500,s:1.05,t,walk:t*6,look:1,seed:1,wind:1,face:{brow:-.6,mouth:'f'}});
  c.restore();
  // nieve con viento
  c.save(); c.setTransform(1,0,0,1,0,0); for(let i=0;i<220;i++){ const sp=.5+rnd(i)*1.5; const x=mod(rnd(i*3)*W*1.4-t*300*sp,W*1.4)-100, y=mod(rnd(i*7)*H+t*160*sp,H); c.fillStyle=`rgba(255,255,255,${.5+rnd(i*5)*.5})`; c.beginPath(); c.arc(x,y,2+rnd(i*9)*5,0,7); c.fill(); } c.restore();
}
// 5. Cannas: vista táctica desde arriba
function cannas(t){
  const t0=T('k1')+D('k1')*.42;
  setCam([[t0,540,1000,1.7,0],[t0+.6,540,960,1.0,0,eout],[T('k2a'),540,980,1.05,0],[T('k3'),540,1000,1.0,-.03],[T('k4a'),540,920,1.08,-.06],[T('k4a')+.2,540,900,1.45,-.06,eout],[T('m1'),540,900,1.3,-.08]],t);
  grad('#7c7038','#8f8444','#6e6230');
  layer(1); c.fillStyle='#8f8444'; c.fillRect(-500,-200,2100,2400);
  for(let i=0;i<60;i++){ c.fillStyle=`rgba(60,50,20,${.12+rnd(i)*.1})`; c.beginPath(); c.ellipse(rnd(i*3)*1400-160,rnd(i*7)*2200-100,80+rnd(i)*120,20,rnd(i*5),0,7); c.fill(); }
  // río Aufidus
  c.strokeStyle='#3b6e8f'; c.lineWidth=70; c.lineCap='round'; c.beginPath(); c.moveTo(-200,1900); c.bezierCurveTo(200,1700,-100,1300,120,900); c.bezierCurveTo(300,500,0,200,150,-200); c.stroke(); c.strokeStyle='#5d93b4'; c.lineWidth=30; c.stroke();
  c.font='900 34px Inter'; c.fillStyle='rgba(255,255,255,.7)'; c.save(); c.translate(70,1180); c.rotate(-1.2); c.fillText('río Aufidus',0,0); c.restore();
  const p2=eio(k01(t,T('k2a')+.4,T('k2b')+.5)), p3=eio(k01(t,T('k3')+.2,T('k3')+D('k3')*.55)), pc=eio(k01(t,T('k3')+D('k3')*.4,T('k4a'))), dead=k01(t,T('k4b'),T('m1'));
  // romanos: bloque que avanza y se comprime
  for(let r=0;r<11;r++) for(let q=0;q<15;q++){ const id=r*15+q; if(dead>0&&rnd(id*1.7)<dead*.82) continue;
    const bx=240+q*40, by=420+r*34; const adv=p3*320*(1-Math.abs(q-7)/12); const sq=pc*(q-7)*-9;
    const x=bx+sq+Math.sin(t*3+id)*2, y=by+adv+(pc*r*-6)+(p2*40);
    c.fillStyle='#b82127'; c.strokeStyle='#3a0606'; c.lineWidth=3; c.beginPath(); c.roundRect(x-14,y-10,28,20,5); c.fill(); c.stroke(); }
  // línea cartaginesa: media luna que se invierte
  const bulge=lerp(-130,170,p2);
  for(let q=0;q<17;q++){ const u=(q-8)/8; const x=180+q*45, yb=1060+bulge*(1-u*u)+p3*60*(1-u*u)*(1-Math.abs(u));
    const flank=Math.abs(u)>.7, inward=flank?pc*(u>0?-1:1)*60:0; for(let r=0;r<3;r++){ const y=yb+r*32-(flank?pc*220:0); c.fillStyle=flank?'#3d2650':'#7a3a92'; c.strokeStyle='#1a0a22'; c.lineWidth=3; c.beginPath(); c.roundRect(x+inward-14,y-10,28,20,5); c.fill(); c.stroke(); } }
  // caballería: rodea por detrás
  for(const side of [-1,1]){ const a=lerp(0,Math.PI*.98,pc), cx0=540, R=420; const x=side<0? cx0-Math.cos(a)*R*1.0 : cx0+Math.cos(a)*R*1.0, y=lerp(1080,330,Math.sin(a/2)**1.3)+(side<0?0:0);
    const xx=pc<.02?(side<0?110:970):x, yy=pc<.02?1080:y;
    for(let i=0;i<8;i++){ const ox=(i%4)*34-50, oy=Math.floor(i/4)*40; c.fillStyle='#e7b73c'; c.strokeStyle='#3a2a06'; c.lineWidth=3; c.beginPath(); c.ellipse(xx+ox,yy+oy,18,13,0,0,7); c.fill(); c.stroke(); }
    if(pc>0&&pc<1){ c.strokeStyle='rgba(255,207,58,.85)'; c.lineWidth=10; c.setLineDash([24,16]); c.beginPath(); c.arc(cx0,1080,R,side<0?Math.PI:0,side<0?Math.PI+Math.PI*.55*pc:-Math.PI*.55*pc,side>0); c.stroke(); c.setLineDash([]); } }
  // flechas del repliegue
  if(p2>0&&p2<1&&t<T('k3')){ c.strokeStyle='rgba(255,255,255,.9)'; c.lineWidth=12; for(const x of [440,540,640]){ c.beginPath(); c.moveTo(x,1010); c.lineTo(x,1010+90*p2); c.stroke(); c.beginPath(); c.moveTo(x-24,990+90*p2); c.lineTo(x,1020+90*p2); c.lineTo(x+24,990+90*p2); c.stroke(); } }
  // polvo
  c.save(); c.globalCompositeOperation='source-over'; const dust=(t>T('k3')?1:.3); for(let i=0;i<40;i++){ const k=mod(t*.15+rnd(i),1); c.fillStyle=`rgba(200,180,120,${.18*dust*(1-k)})`; c.beginPath(); c.arc(300+rnd(i*3)*480+Math.sin(t+i)*40,600+rnd(i*7)*600-k*120,60+k*100,0,7); c.fill(); } c.restore();
  // marcadores
  c.font='900 40px Inter'; c.textAlign='center'; c.lineJoin='round'; const lab=(s,x,y,col)=>{ c.lineWidth=12; c.strokeStyle='#0b0806'; c.strokeText(s,x,y); c.fillStyle=col; c.fillText(s,x,y); };
  if(t<T('k3')+1){ lab('ROMA',540,380,'#ff6a60'); lab('ANÍBAL',540,1250+bulge*.4,'#e6b8ff'); }
}
// 6. Colina al atardecer: Maharbal y Aníbal
function colina(t){
  setCam([[T('m1'),360,1000,1.0,0],[T('m2'),560,1000,1.1,0],[T('m3'),620,960,1.2,0],[T('m3')+D('m3')*.6,440,1040,2.2,.02],[T('e1'),440,1030,2.4,.02]],t);
  grad('#2a1a3a','#c4592a','#f0a040');
  layer(.1); glow(880,1050,500,'rgba(255,200,120,A)',.6); c.fillStyle='#ffd890'; c.beginPath(); c.arc(880,1060,110,0,7); c.fill();
  layer(.25); c.fillStyle='#6a3a40'; // Roma a lo lejos
  for(let i=0;i<8;i++){ const x=760+i*42, h=60+rnd(i*4)*90; c.fillRect(x,1180-h,34,h); } c.fillRect(740,1140,360,50); c.beginPath(); c.moveTo(860,1100); c.lineTo(930,1060); c.lineTo(1000,1100); c.fill();
  layer(.45); c.fillStyle='#5a2a2e'; c.beginPath(); c.moveTo(-500,1260); c.quadraticCurveTo(400,1150,1600,1250); c.lineTo(1600,2400); c.lineTo(-500,2400); c.fill();
  layer(.75); c.fillStyle='#3a1a1e'; c.beginPath(); c.moveTo(-500,1420); c.quadraticCurveTo(300,1300,1000,1380); c.quadraticCurveTo(1300,1400,1700,1500); c.lineTo(1700,2400); c.lineTo(-500,2400); c.fill();
  layer(1); c.fillStyle='#24100f'; c.beginPath(); c.moveTo(-500,1560); c.quadraticCurveTo(500,1440,1700,1600); c.lineTo(1700,2400); c.lineTo(-500,2400); c.fill();
  const mIn=eout(k01(t,T('m2')-.3,T('m2')+.6)), speaking=t>=T('m3')&&t<E('m3');
  person(ANIBAL,{x:430,y:1540,s:1.05,t,look:1,seed:4,wind:.5,face:{brow:t>T('m3')+1?-.6:.2,mouth:t>T('m3')+1.5?'f':'n'},armF:[.15,.2],armB:[-.2,-.05]});
  person(MAHARBAL,{x:lerp(1250,760,mIn),y:1555,s:1,t,look:-1,seed:7,wind:.5,walk:mIn<1?t*7:null,talk:speaking,face:{brow:speaking?.5:.2,mouth:speaking?'o':'n'},armF:speaking?[-1.9+Math.sin(t*4)*.2,-2.3]:[-.2,-.2],armB:[.2,.1]});
  c.save(); c.setTransform(1,0,0,1,0,0); const g=c.createLinearGradient(0,0,W,0); g.addColorStop(0,'rgba(255,140,60,0)'); g.addColorStop(1,'rgba(255,170,90,.18)'); c.fillStyle=g; c.fillRect(0,0,W,H); c.restore();
}
// 7. Escipión: presentación
function escipion(t){
  const t0=T('e2');
  setCam([[t0,540,1000,1.0,-.03],[t0+D('e2')*.42,540,880,1.35,.03]],t);
  grad('#2a0a0c','#5a1418','#1c0608');
  layer(.3); c.fillStyle='#8a1a1f'; for(let i=0;i<4;i++){ const x=80+i*300; c.fillRect(x,300,200,900); c.fillStyle='#e7c25a'; c.font='900 60px Inter'; c.textAlign='center'; c.fillText('SPQR',x+100,520); c.fillStyle='#8a1a1f'; c.strokeStyle='#0b0806'; c.lineWidth=5; c.strokeRect(x,300,200,900); }
  layer(.7); c.fillStyle='#160506'; c.fillRect(-500,1450,2100,900);
  for(let i=0;i<7;i++) person(SOLD_R(i),{x:-60+i*190,y:1470,s:.9,t,look:i<3?1:-1,seed:i+20,face:{brow:.3}});
  layer(1); glow(540,700,500,'rgba(255,210,150,A)',.2);
  person(ESCIPION,{x:540,y:1560,s:1.35,t,look:-1,seed:12,wind:.6,face:{brow:.5,mouth:'s'},armF:[-1.2,-1.9],armB:[.2,.1]});
}
// 8. Zama: el encuentro
function zama(t){
  const t0=T('z1'), lose=t0+D('z1')*.55;
  setCam([[t0,760,950,1.6,0],[t0+.9,760,950,1.6,0],[t0+1.25,320,950,1.6,0,eout],[lose,320,950,1.7,0],[lose+.15,330,1010,2.4,0,eout],[E('z1')+.4,330,1000,2.6,.02]],t);
  grad('#1a0e1e','#8a3a24','#d2783a');
  layer(.2); glow(540,1150,600,'rgba(255,170,90,A)',.45);
  layer(.45); c.fillStyle='#4a2420'; c.fillRect(-500,1200,2100,1000);
  for(let i=0;i<10;i++){ c.globalAlpha=.75; person(SOLD_C(i),{x:-200+i*70,y:1260,s:.55,t,look:1,seed:i,face:{}}); person(SOLD_R(i),{x:760+i*70,y:1260,s:.55,t,look:-1,seed:i+40,face:{}}); } c.globalAlpha=1;
  for(const x of [-100,1180]){ c.strokeStyle='#3a2a1a'; c.lineWidth=10; c.beginPath(); c.moveTo(x,1250); c.lineTo(x,900); c.stroke(); }
  c.fillStyle='#c4252b'; c.fillRect(1180,900,90,120); c.fillStyle='#e7c25a'; c.font='900 30px Inter'; c.textAlign='center'; c.fillText('SPQR',1225,970);
  c.fillStyle='#5b2373'; c.fillRect(-190,900,90,120);
  layer(1); c.fillStyle='#2a1210'; c.fillRect(-500,1520,2100,900);
  const sad=k01(t,lose,lose+.4);
  person(ANIBAL,{x:320,y:1560,s:1.15,t,look:1,seed:6,wind:.7,face:{brow:lerp(.6,-.8,sad),mouth:sad>.5?'f':'g',eyes:sad>.5?'s':'n'},armF:[.25,.2],armB:[-.2,-.05]});
  person(ESCIPION,{x:760,y:1560,s:1.15,t,look:-1,seed:12,wind:.7,face:{brow:.5,mouth:sad>.5?'s':'g'},armF:[-.3,-.6],armB:[.2,.1]});
  if(sad>0){ c.save(); c.setTransform(1,0,0,1,0,0); c.fillStyle=`rgba(40,40,60,${.35*sad})`; c.globalCompositeOperation='saturation'; c.fillRect(0,0,W,H); c.restore(); }
}
// 9. Final: el viejo Aníbal, la lámpara
function final(t){
  setCam([[T('f1'),540,1000,1.0,0],[E('f1'),520,860,1.55,.02]],t);
  grad('#0a0c16','#141826','#0c0e16');
  layer(.4); c.fillStyle='#1a1e2c'; c.fillRect(-300,200,1700,1300); c.fillStyle='#232838'; for(let r=0;r<12;r++) for(let q=0;q<8;q++) c.fillRect(-300+q*210+(r%2)*100,200+r*110,200,100);
  c.fillStyle='#0a1222'; c.fillRect(700,420,220,300); c.fillStyle='#d8e4ff'; c.beginPath(); c.arc(840,520,40,0,7); c.fill(); c.strokeStyle='#0b0806'; c.lineWidth=12; c.strokeRect(700,420,220,300); c.beginPath(); c.moveTo(810,420); c.lineTo(810,720); c.stroke();
  layer(.8); c.fillStyle='#120e0c'; c.fillRect(-500,1500,2100,900);
  c.fillStyle='#4a3020'; c.strokeStyle='#0b0806'; c.lineWidth=6; c.fillRect(560,1240,420,30); c.strokeRect(560,1240,420,30); c.fillRect(600,1270,24,240); c.fillRect(916,1270,24,240);
  const dim=1-.55*k01(t,T('f1')+D('f1')*.7,E('f1'));
  c.fillStyle='#8a6a3a'; c.beginPath(); c.ellipse(820,1230,50,16,0,0,7); c.fill(); c.stroke(); flame(840,1222,26,60,t,4);
  glow(840,1180,700*dim,'rgba(255,170,80,A)',.5*dim);
  layer(1);
  const lift=eio(k01(t,T('f1')+D('f1')*.6,E('f1')));
  person(ANIBAL_VIEJO,{x:420,y:1520,s:1.1,t,look:1,seed:8,patch:true,face:{brow:-.5,mouth:'f',eyes:lift>.7?'s':'n'},cup:true,armF:[lerp(.4,2.3,lift),lerp(.6,2.9,lift)],armB:[-.15,-.05]});
  c.save(); c.setTransform(1,0,0,1,0,0); c.fillStyle=`rgba(0,0,10,${.35*(1-dim)})`; c.fillRect(0,0,W,H); c.restore();
}

