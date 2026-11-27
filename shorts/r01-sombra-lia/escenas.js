// «La sombra de Lía» — historia estilo bloques (personajes tipo Roblox, hechos aquí; sin recursos de terceros)
const {clamp,lerp,k01,eio,eout,rnd}=TRES;
TRES.run({ hot:/^(sombra|feliz|baila|mientes|fingir|enamorado|árbol|fría|valor|rindió|triste|viento|sol|abrazaba|corriendo|tomate|sonrió|verdad)$/i,
 exposicion:1.0,
 titles:[[0.2,2.7,'EN ESTE MUNDO<small>TU SOMBRA DICE LA VERDAD</small>',130]],
 bigs:[[5.4,7.2,'¡MENTIRA!'],[7.7,9.3,'NADIE PUEDE<br>FINGIR'],[15.6,17.4,'¿FRÍA?'],[36.5,40.5,'¿QUÉ DIRÍA<br>TU SOMBRA?',90]],
 setup({THREE,scene,cam,R,hud,W,H}){
  const PI=Math.PI, V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const M=(c,o={})=>new THREE.MeshLambertMaterial({color:c,...o});
  const box=(w,h,d,m,x=0,y=0,z=0)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); return o; };
  // ---- cielo, luz, suelo ----
  { const cv=document.createElement('canvas'); cv.width=4; cv.height=256; const g=cv.getContext('2d'), gr=g.createLinearGradient(0,0,0,256); gr.addColorStop(0,'#4f9be0'); gr.addColorStop(.6,'#9fd0f2'); gr.addColorStop(1,'#d8eefb'); g.fillStyle=gr; g.fillRect(0,0,4,256); const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; scene.background=t; }
  scene.fog=new THREE.Fog('#bfe0f5',70,230);
  const hemi=new THREE.HemisphereLight('#e6f2ff','#7da05a',1.15); scene.add(hemi);
  const sol=new THREE.DirectionalLight('#fff3da',1.7); sol.position.set(12,40,26); scene.add(sol);
  { const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.fillStyle='#62ad43'; g.fillRect(0,0,128,128); g.fillStyle='#579a3b'; g.fillRect(0,0,64,64); g.fillRect(64,64,64,64); g.fillStyle='rgba(255,255,255,.10)'; g.beginPath(); g.arc(32,32,9,0,7); g.arc(96,96,9,0,7); g.fill();
    const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(70,70); t.colorSpace=THREE.SRGBColorSpace; t.magFilter=THREE.NearestFilter;
    const sue=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshLambertMaterial({map:t})); sue.rotation.x=-PI/2; scene.add(sue); }
  const camino=box(70,.12,5,M('#c9c4b8'),0,.06,-12); scene.add(camino);
  // escuela
  { const g=new THREE.Group(); g.add(box(40,11,8,M('#efdcb4'),0,5.5,-26)); g.add(box(42,1.2,10,M('#a8442a'),0,11.6,-26)); g.add(box(8,2.4,9,M('#a8442a'),0,13,-26));
    for(let i=0;i<9;i++) if(i!==4){ g.add(box(3,3.2,.3,M('#8fcdf0'),-16+i*4,6.2,-21.9)); g.add(box(3.3,.4,.4,M('#fff7e6'),-16+i*4,4.4,-21.85)); }
    g.add(box(3.4,5,.4,M('#7a4a2a'),0,2.5,-21.8)); g.add(box(8,.6,3,M('#fff7e6'),0,5.6,-21)); scene.add(g);
    for(let i=0;i<14;i++) scene.add(box(1.2,.8+rnd(i)*.5,1.2,M(i%2?'#4f9a3a':'#468a33'),-24+i*3.7,.5,-17.5)); }
  // nubes de bloques
  const nubes=[...Array(7)].map((_,i)=>{ const g=new THREE.Group(); for(let j=0;j<4;j++) g.add(box(5+rnd(i+j)*3,1.6,3,M('#ffffff'),j*3.4-5,rnd(i*3+j)*.8,rnd(j)*1.5)); g.position.set(-60+i*22,34+rnd(i)*10,-90); scene.add(g); return g; });
  // árbol
  const ARBOL=V(-9.8,0,-4); const arbol=new THREE.Group(); arbol.position.copy(ARBOL); scene.add(arbol); arbol.add(box(1.8,7,1.8,M('#7a5230'),0,3.5,0));
  const copa=new THREE.Group(); copa.position.y=7; arbol.add(copa); const verdes=['#4b9a3c','#58a845','#3f8a34'];
  for(let i=0;i<11;i++) copa.add(box(4.2,3.4,4.2,M(verdes[i%3]),(rnd(i)-.5)*7,(rnd(i*3)-.2)*3,(rnd(i*5)-.5)*7));
  const sombraArbol=new THREE.Mesh(new THREE.CircleGeometry(5.8,28),new THREE.MeshBasicMaterial({color:'#0a2a12',transparent:true,opacity:.4,depthWrite:false})); sombraArbol.rotation.x=-PI/2; sombraArbol.position.set(-8.6,.05,-1.4); sombraArbol.scale.set(1.2,1,1); scene.add(sombraArbol);
  const haz=new THREE.Mesh(new THREE.ConeGeometry(3.6,16,20,1,true),new THREE.MeshBasicMaterial({color:'#fff2b0',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})); haz.position.set(-8.2,8,-1); scene.add(haz);
  const brillo=new THREE.Mesh(new THREE.CircleGeometry(3.4,28),new THREE.MeshBasicMaterial({color:'#fff6c8',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false})); brillo.rotation.x=-PI/2; brillo.position.set(-8.2,.08,-1); scene.add(brillo);
  const hojas=[...Array(22)].map((_,i)=>{ const o=box(.5,.5,.15,M(verdes[i%3])); scene.add(o); return o; });
  // ---- caras ----
  const mkFace=()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const tx=new THREE.CanvasTexture(cv); tx.colorSpace=THREE.SRGBColorSpace; return {cv,tx,key:''}; };
  function dibujaCara(F,kind,blink){ const key=kind+(blink?'b':''); if(F.key===key) return; F.key=key; const g=F.cv.getContext('2d'); g.clearRect(0,0,128,128); g.lineCap='round'; g.fillStyle='#1b1b1b'; g.strokeStyle='#1b1b1b'; g.lineWidth=7;
    const ojo=(x,y,rx,ry)=>{ if(blink){ g.beginPath(); g.moveTo(x-rx,y); g.lineTo(x+rx,y); g.stroke(); } else { g.beginPath(); g.ellipse(x,y,rx,ry,0,0,7); g.fill(); } };
    const ceja=(x,y,a,l=16)=>{ g.lineWidth=6; g.beginPath(); g.moveTo(x-l,y-a); g.lineTo(x+l,y+a); g.stroke(); g.lineWidth=7; };
    const mejilla=()=>{ g.fillStyle='rgba(255,90,110,.55)'; g.beginPath(); g.ellipse(26,80,13,9,0,0,7); g.ellipse(102,80,13,9,0,0,7); g.fill(); g.fillStyle='#1b1b1b'; };
    if(kind==='neutral'){ ojo(42,54,6,10); ojo(86,54,6,10); g.beginPath(); g.moveTo(52,92); g.lineTo(76,92); g.stroke(); }
    else if(kind==='happy'){ ojo(42,52,6,10); ojo(86,52,6,10); g.beginPath(); g.arc(64,74,26,.1*PI,.9*PI); g.stroke(); }
    else if(kind==='laugh'){ ojo(42,52,6,10); ojo(86,52,6,10); g.beginPath(); g.moveTo(34,80); g.quadraticCurveTo(64,128,94,80); g.closePath(); g.fillStyle='#3a1010'; g.fill(); g.fillStyle='#ff7a8a'; g.beginPath(); g.ellipse(64,100,13,7,0,0,7); g.fill(); g.fillStyle='#1b1b1b'; }
    else if(kind==='sad'){ ojo(42,58,6,10); ojo(86,58,6,10); ceja(42,36,-7); ceja(86,36,7); g.beginPath(); g.arc(64,108,20,1.15*PI,1.85*PI); g.stroke(); g.fillStyle='#5ab4ff'; g.beginPath(); g.ellipse(36,84,5,8,0,0,7); g.fill(); g.fillStyle='#1b1b1b'; }
    else if(kind==='cry'){ ojo(42,58,6,10); ojo(86,58,6,10); ceja(42,36,-7); ceja(86,36,7); g.beginPath(); g.arc(64,110,20,1.15*PI,1.85*PI); g.stroke(); g.fillStyle='#5ab4ff'; g.fillRect(30,68,8,40); g.fillRect(90,68,8,40); g.fillStyle='#1b1b1b'; }
    else if(kind==='nervous'){ ojo(40,54,6,11); ojo(84,54,6,11); g.beginPath(); g.moveTo(46,94); g.lineTo(54,88); g.lineTo(62,96); g.lineTo(70,88); g.lineTo(78,94); g.stroke(); g.fillStyle='#5ab4ff'; g.beginPath(); g.ellipse(108,38,6,10,0,0,7); g.fill(); g.fillStyle='#1b1b1b'; }
    else if(kind==='love'){ ojo(42,54,6,10); ojo(86,54,6,10); mejilla(); g.beginPath(); g.arc(64,82,16,.15*PI,.85*PI); g.stroke(); }
    else if(kind==='serious'){ ceja(42,38,6); ceja(86,38,-6); g.fillRect(34,50,16,8); g.fillRect(78,50,16,8); g.fillRect(50,90,28,7); }
    else if(kind==='shock'){ ojo(42,52,10,15); ojo(86,52,10,15); g.beginPath(); g.ellipse(64,98,13,18,0,0,7); g.fill(); }
    else if(kind==='angry'){ ceja(42,36,7); ceja(86,36,-7); ojo(42,58,6,9); ojo(86,58,6,9); g.beginPath(); g.arc(64,104,20,1.15*PI,1.85*PI); g.stroke(); }
    else if(kind==='blush'){ ojo(42,54,6,10); ojo(86,54,6,10); mejilla(); g.beginPath(); g.moveTo(50,92); g.quadraticCurveTo(58,84,64,92); g.quadraticCurveTo(70,100,78,92); g.stroke(); }
    F.tx.needsUpdate=true; }
  // ---- personajes de bloques (cuerpo tipo R6) ----
  const SOMBRA_M=new THREE.MeshBasicMaterial({color:'#0e2a0b'});
  function cuerpo(o,plana){ const mk=c=>plana?SOMBRA_M:M(c); const sk=mk(o.piel||'#e9bc8c'), cam_=mk(o.camisa), pan=mk(o.pantalon), pelo=mk(o.pelo);
    const root=new THREE.Group(); root.add(box(2,2,1,cam_,0,3,0));
    const head=new THREE.Group(); head.position.set(0,4.75,0); root.add(head); head.add(new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,1.2,16),sk));
    head.add(box(1.32,.34,1.32,pelo,0,.62,0)); head.add(box(1.32,.3,.3,pelo,0,.42,.52));
    if(o.tipo==='pinchos'){ for(const [x,z] of [[-.4,-.3],[.3,-.2],[0,.25],[-.2,.1],[.45,.25]]) head.add(box(.34,.45,.34,pelo,x,.95+Math.abs(x)*.2,z)); }
    if(o.tipo==='larga'){ head.add(box(1.4,2,.34,pelo,0,-.35,-.62)); for(const s of [-1,1]) head.add(box(.3,1.4,1.1,pelo,s*.68,-.1,-.1)); }
    if(o.tipo==='coleta'){ head.add(box(.45,1.3,.45,pelo,0,-.1,-.75)); head.add(box(.5,.5,.5,pelo,0,.7,-.55)); }
    let F=null; if(!plana){ F=mkFace(); const p=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.05),new THREE.MeshBasicMaterial({map:F.tx,transparent:true})); p.position.set(0,0,.635); head.add(p); }
    const brazo=s=>{ const g=new THREE.Group(); g.position.set(s*1.0,3.95,0); g.add(box(1,2,1,cam_,s*.5,-1,0)); g.add(box(1.04,.55,1.04,sk,s*.5,-1.72,0)); root.add(g); return g; };
    const pierna=s=>{ const g=new THREE.Group(); g.position.set(s*.5,2,0); g.add(box(1,2,1,pan,0,-1,0)); root.add(g); return g; };
    return {root,head,aL:brazo(-1),aR:brazo(1),lL:pierna(-1),lR:pierna(1),F,kind:'neutral',sit:false,seed:rnd(o.camisa.length*7)*6}; }
  function personaje(o){ const c=cuerpo(o,false); scene.add(c.root); const blob=new THREE.Mesh(new THREE.CircleGeometry(1.25,16),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.22,depthWrite:false})); blob.rotation.x=-PI/2; blob.position.y=.04; scene.add(blob); c.blob=blob;
    const f=cuerpo(o,true); const inner=f.root; inner.scale.set(1,.72,.03); const lay=new THREE.Group(); lay.rotation.x=-PI/2; lay.add(inner); const wrap=new THREE.Group(); wrap.add(lay); wrap.position.y=.05; scene.add(wrap);
    c.S={fig:f,inner,wrap,mode:'idle',ph:0,off:V(0,0,0),vis:true,roll:0}; return c; }
  const leo=personaje({camisa:'#2f6fd0',pantalon:'#2a2f45',pelo:'#c8501e',tipo:'pinchos'});
  const lia=personaje({camisa:'#8a4fd6',pantalon:'#2b2438',pelo:'#6a2fb0',tipo:'larga'});
  const nina=personaje({camisa:'#ff7ab6',pantalon:'#3a4a7a',pelo:'#ffb347',tipo:'coleta'});
  const tomi=personaje({camisa:'#3fae6a',pantalon:'#5a4632',pelo:'#5a3a1e',tipo:'normal'});
  const dani=personaje({camisa:'#f0a030',pantalon:'#2b3a2b',pelo:'#1c1c1c',tipo:'normal'});
  const sofi=personaje({camisa:'#35b8c8',pantalon:'#6a3a5a',pelo:'#2a1a12',tipo:'larga'});
  const TODOS=[leo,lia,nina,tomi,dani,sofi];
  // corazones y lluvia
  const heartTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=128; const g=cv.getContext('2d'); g.fillStyle='#ff4a78'; g.beginPath(); g.moveTo(64,112); g.bezierCurveTo(-10,60,20,6,64,40); g.bezierCurveTo(108,6,138,60,64,112); g.fill(); g.lineWidth=7; g.strokeStyle='#b0173f'; g.stroke(); const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const corazones=[...Array(8)].map(()=>{ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:heartTex,transparent:true,depthTest:false})); s.renderOrder=5; s.visible=false; scene.add(s); return s; });
  const nube=new THREE.Group(); [[0,0],[1.4,.3],[-1.4,.2],[.5,.9]].forEach(([x,y])=>nube.add(box(1.8,1.2,1.8,M('#7d8794'),x,y,0))); scene.add(nube); nube.visible=false;
  const gotas=[...Array(10)].map(()=>{ const o=box(.12,.45,.12,M('#5ab4ff')); o.visible=false; scene.add(o); return o; });
  // ---- utilidades ----
  const colocar=(c,x,z,yaw=0,y=0)=>{ c.root.position.set(x,y,z); c.root.rotation.y=yaw; };
  const mira=(c,x,z)=>{ c.root.rotation.y=Math.atan2(x-c.root.position.x,z-c.root.position.z); };
  const caminar=(c,ph,a=.75)=>{ const s=Math.sin(ph); c.lL.rotation.x=s*a; c.lR.rotation.x=-s*a; c.aL.rotation.x=-s*a*.8; c.aR.rotation.x=s*a*.8; c.root.position.y=Math.abs(Math.cos(ph))*.14; };
  const orb=(tx,ty,tz,d,h,az)=>{ cam.position.set(tx+Math.sin(az)*d,h,tz+Math.cos(az)*d); cam.lookAt(tx,ty,tz); };
  const brazosSombra=(S,a)=>{ S.fig.aL.rotation.z=-a; S.fig.aR.rotation.z=a; };
  const piernasSombra=(S,b)=>{ S.fig.lL.rotation.z=-b; S.fig.lR.rotation.z=b; };
  function animaSombra(c,t){ const S=c.S, f=S.fig; f.root.rotation.set(0,0,0); f.head.rotation.set(0,0,0); for(const m of [f.aL,f.aR,f.lL,f.lR]) m.rotation.set(0,0,0); S.inner.position.set(0,0,0);
    S.wrap.visible=S.vis&&c.root.visible; const p=c.root.position; S.wrap.position.set(p.x+S.off.x,.05+S.off.y,p.z+S.off.z); S.wrap.rotation.y=-PI/2+S.roll;
    const m=S.mode, q=t+c.seed;
    if(m==='dance'){ brazosSombra(S,2.3+Math.sin(q*10)*.8); piernasSombra(S,.25+Math.abs(Math.sin(q*10))*.45); f.root.rotation.z=Math.sin(q*5)*.18; S.inner.position.y=Math.abs(Math.sin(q*10))*.7; }
    else if(m==='laugh'){ brazosSombra(S,.55+Math.sin(q*16)*.2); f.root.rotation.z=Math.sin(q*14)*.13; f.head.rotation.z=Math.sin(q*14)*.4; piernasSombra(S,.2); }
    else if(m==='sad'){ brazosSombra(S,.12); f.head.rotation.z=.55; f.root.rotation.z=.12; piernasSombra(S,.06); }
    else if(m==='cry'){ brazosSombra(S,.9+Math.sin(q*12)*.1); f.head.rotation.z=.7; f.root.rotation.z=Math.sin(q*12)*.08+.1; }
    else if(m==='angry'){ brazosSombra(S,2.6+Math.sin(q*9)*.3); piernasSombra(S,.3+Math.abs(Math.sin(q*7))*.4); f.root.rotation.z=Math.sin(q*7)*.1; S.inner.position.y=Math.abs(Math.sin(q*7))*.3; }
    else if(m==='wave'){ S.fig.aR.rotation.z=2.5+Math.sin(q*9)*.5; S.fig.aL.rotation.z=-.3; piernasSombra(S,.12); }
    else if(m==='walk'){ const s=Math.sin(S.ph); S.fig.lL.rotation.z=-s*.5; S.fig.lR.rotation.z=s*.5; brazosSombra(S,.15+Math.abs(s)*.2); }
    else if(m==='walkSad'){ const s=Math.sin(S.ph); S.fig.lL.rotation.z=-s*.25; S.fig.lR.rotation.z=s*.25; brazosSombra(S,.1); f.head.rotation.z=.6; f.root.rotation.z=.14; }
    else if(m==='hugL'){ S.fig.aL.rotation.z=-.15; S.fig.aR.rotation.z=1.5+Math.sin(q*4)*.08; f.root.rotation.z=-.1; }
    else if(m==='hugR'){ S.fig.aR.rotation.z=.15; S.fig.aL.rotation.z=-1.5-Math.sin(q*4)*.08; f.root.rotation.z=.1; }
    else if(m==='flip'){ brazosSombra(S,2.8); piernasSombra(S,.5); }
    else { brazosSombra(S,.1+Math.sin(q*2)*.03); } }
  function base(t){ for(const c of TODOS){ for(const m of [c.aL,c.aR,c.lL,c.lR]) m.rotation.set(0,0,0); c.head.rotation.set(0,0,0); c.root.position.y=0; c.root.visible=true; c.sit=false;
      const q=t*2+c.seed; c.aL.rotation.x=Math.sin(q)*.04; c.aR.rotation.x=-Math.sin(q)*.04; c.S.mode='idle'; c.S.vis=true; c.S.off.set(0,0,0); c.S.roll=0; c.S.ph=0; }
    colocar(leo,7,5.5,-PI/2); colocar(lia,-8.2,-1,PI/2); colocar(nina,3,3,0); colocar(tomi,-2,4,0); colocar(dani,-5,1.5,0); colocar(sofi,7.5,2.5,0);
    leo.kind='neutral'; lia.kind='serious'; nina.kind='happy'; tomi.kind='nervous'; dani.kind='happy'; sofi.kind='happy';
    nina.S.mode='dance'; tomi.S.mode='laugh'; dani.S.mode='sad'; sofi.S.mode='angry'; lia.S.vis=false;
    sombraArbol.material.opacity=.4; sombraArbol.position.set(-8.6,.05,-1.4); haz.material.opacity=0; brillo.material.opacity=0; copa.position.set(0,7,0); copa.rotation.set(0,0,0);
    corazones.forEach(h=>h.visible=false); nube.visible=false; gotas.forEach(o=>o.visible=false); hojas.forEach(o=>o.visible=false); cam.fov=40; cam.updateProjectionMatrix();
    nubes.forEach((n,i)=>n.position.x=-60+i*22+t*.9); }
  function terminar(t){ for(const c of TODOS){ if(c.sit){ c.root.position.y=-1.5; c.lL.rotation.x=-PI/2; c.lR.rotation.x=-PI/2; c.aL.rotation.x=-1.15; c.aR.rotation.x=-1.15; c.aL.rotation.z=.45; c.aR.rotation.z=-.45; }
      dibujaCara(c.F,c.kind,((t*.9+c.seed)%3.4)<.1); c.blob.position.set(c.root.position.x,.04,c.root.position.z); c.blob.visible=c.root.visible&&c.root.position.y>-1.6; animaSombra(c,t); } }
  const solo=(...cs)=>{ for(const c of TODOS) c.root.visible=cs.includes(c); };
  function corazonesSobre(x,y,z,k,n=5,r=1.4){ for(let i=0;i<n;i++){ const h=corazones[i], f=((k*.55+i/n)%1); h.visible=true; h.position.set(x+Math.sin(i*2.1+k)*r,y+f*3.6,z+Math.cos(i*1.7)*.6); h.scale.setScalar(.9+.5*Math.sin(f*PI)); h.material.opacity=Math.sin(f*PI); } }
  const hoja=(k,i)=>{ const o=hojas[i], f=((k*.5+i*.137)%1); o.visible=true; o.position.set(ARBOL.x+(rnd(i)-.3)*8+f*7,10-f*10,ARBOL.z+(rnd(i*3)-.5)*6+f*3); o.rotation.set(f*9+i,f*7,f*5); };
  const ESC=[
   // 0 — plano general: cada sombra cuenta la verdad
   (k,t)=>{ const a=eio(k01(k,0,2.7)); orb(1.5,1.5,3,lerp(36,29,a),lerp(23,19,a),lerp(.3,.08,a)); },
   // 1 — Nina feliz: su sombra baila
   (k,t)=>{ solo(nina); nina.root.position.y=Math.abs(Math.sin(t*10+nina.seed))*.7; caminar(nina,0,0); nina.aL.rotation.x=0; nina.aR.rotation.z=-.5; nina.aL.rotation.z=.5; const a=eio(k01(k,0,1.9)); orb(5,1.8,3.5,lerp(19,16,a),lerp(10,8.8,a),lerp(.1,-.1,a)); },
   // 2 — Tomi miente: su sombra se ríe
   (k,t)=>{ solo(tomi); tomi.S.mode='laugh'; tomi.kind='nervous'; tomi.aL.rotation.z=.25; tomi.aR.rotation.z=-.25; const a=eio(k01(k,0,2)); orb(-.2,2.2,4.6,lerp(18,14.5,a),lerp(9.5,8,a),lerp(-.1,.1,a)); },
   // 3 — nadie puede fingir: fila de niños con sombras distintas
   (k,t)=>{ solo(nina,tomi,dani,sofi); [[nina,-6],[tomi,-2],[dani,2],[sofi,6]].forEach(([c,x])=>colocar(c,x,3,0)); nina.kind='happy'; const a=eio(k01(k,0,1.8)); orb(lerp(-4.4,7.6,a),1.8,3.6,18,9.5,lerp(.1,-.1,a)); },
   // 4 — Leo enamorado
   (k,t)=>{ solo(leo); colocar(leo,-.5,3,-PI/2); leo.kind='love'; leo.S.mode='idle'; leo.root.position.y=Math.abs(Math.sin(t*3))*.12; corazonesSobre(-.5,6,3,k,6); const a=eio(k01(k,0,1.9)); orb(-.5,3.4,3,lerp(14,11.5,a),lerp(7.5,6.5,a),lerp(-1.1,-.85,a)); },
   // 5 — Lía bajo el árbol
   (k,t)=>{ solo(lia); lia.sit=true; lia.kind='serious'; lia.S.vis=false; const a=eio(k01(k,0,1.8)); orb(-8.2,2.2,-1,lerp(18,13,a),lerp(7.5,5.4,a),lerp(.9,1.15,a)); },
   // 6 — nadie veía su sombra: todos pasan de largo
   (k,t)=>{ solo(lia,dani,sofi,tomi); lia.sit=true; lia.kind='serious'; lia.S.vis=false; const w=k01(k,0,3.2); [[dani,0],[sofi,.5],[tomi,1.1]].forEach(([c,d],i)=>{ const x=lerp(-1,-14.5,clamp(w*1.2-d*.2,0,1)); colocar(c,x,2.2+i*.6,-PI/2); caminar(c,t*7+i,.6); c.kind='neutral'; c.S.mode='walk'; c.S.ph=t*7+i; c.head.rotation.y=.5; });
        const a=eio(k01(k,0,3.6)); orb(-8.2,2.2,-1,lerp(17,10,a),lerp(6.5,4.4,a),lerp(1.15,1.3,a)); },
   // 7 — Leo junta valor y se acerca
   (k,t)=>{ solo(leo,lia); const a=eio(k01(k,0,1.5)); const x=lerp(-.5,-5.5,a); colocar(leo,x,lerp(3,0,a),-PI/2); leo.kind='nervous'; caminar(leo,t*9); leo.S.mode='walk'; leo.S.ph=t*9; lia.sit=true; lia.S.vis=false; orb(x,3,lerp(3,0,a),14,6.5,2.3); },
   // 8 — «¿Lía, te caigo mal?» (por encima del hombro de Lía)
   (k,t)=>{ solo(leo,lia); colocar(leo,-5.6,-.4,-PI/2); leo.kind='nervous'; leo.aL.rotation.z=.2; lia.sit=true; lia.S.vis=false; const a=eio(k01(k,0,1.5)); cam.position.set(lerp(-14.5,-13,a),6.2,2.6); cam.lookAt(-5.6,3.8,-.4); },
   // 9 — «No me hables» (por encima del hombro de Leo)
   (k,t)=>{ solo(leo,lia); colocar(leo,-5.6,-.4,-PI/2); leo.kind='sad'; lia.sit=true; lia.S.vis=false; lia.kind='serious'; lia.head.rotation.y=-eio(k01(k,.3,.8))*1.1; cam.position.set(-2.8,4.6,5.6); cam.lookAt(-8.2,3,-1); },
   // 10 — Leo se rinde y se va
   (k,t)=>{ solo(leo,lia); const a=eio(k01(k,.2,1.3)); const x=lerp(-5.6,-2,a); colocar(leo,x,lerp(-.4,.8,a),PI/2*(a>.1?1:-1)); leo.kind='sad'; caminar(leo,a>.1?t*8:0,.6); leo.S.mode='walkSad'; leo.S.ph=t*8; lia.sit=true; lia.S.vis=false; orb(-4.4,2,0,lerp(22,20,k01(k,0,1.3)),11,.2); },
   // 11 — su sombra camina muy triste (con su nubecita)
   (k,t)=>{ solo(leo,lia); const x=lerp(-1,3,k01(k,0,1.5)); colocar(leo,x,3,PI/2); leo.kind='sad'; caminar(leo,t*6,.5); leo.S.mode='walkSad'; leo.S.ph=t*6; leo.S.off.set(0,0,0); lia.sit=true; lia.S.vis=false;
        const sx=x+3.2, sz=3; nube.visible=true; nube.position.set(sx,6.2+Math.sin(t*2)*.15,sz); gotas.forEach((o,i)=>{ const f=((t*1.6+i/10)%1); o.visible=true; o.position.set(sx+(rnd(i)-.5)*2.6,5.8-f*5.6,sz+(rnd(i*3)-.5)*1.2); });
        orb(x+1.7,1.8,3.8,17,8.5,.1); },
   // 12 — el viento mueve las ramas
   (k,t)=>{ solo(lia); lia.sit=true; lia.S.vis=false; const w=1+k*.5; copa.rotation.z=Math.sin(t*5)*.06*w; copa.position.x=Math.sin(t*4)*.5*w; hojas.forEach((o,i)=>hoja(k,i)); const a=eio(k01(k,0,1.9)); cam.position.set(-3.4,lerp(1.6,2.6,a),6); cam.lookAt(-9.4,lerp(5.5,8.2,a),-3.6); },
   // 13 — el sol cae justo sobre Lía
   (k,t)=>{ solo(lia); lia.sit=true; const s=eio(k01(k,.1,.9)); copa.position.set(-3.2*s,7,0); sombraArbol.material.opacity=.4*(1-s); haz.material.opacity=.32*s; brillo.material.opacity=.55*s; lia.kind=k>.6?'shock':'serious'; lia.S.vis=s>.5; lia.S.mode='hugR'; lia.S.off.set(0,0,0);
        hojas.forEach((o,i)=>{ if(i<8) hoja(k+3,i); }); const a=eio(k01(k,0,1.6)); orb(-8.2,2.8,-1,lerp(14,9.5,a),lerp(6,4.6,a),lerp(.9,1.1,a)); },
   // 14 — su sombra abraza la sombra de Leo
   (k,t)=>{ solo(leo,lia); colocar(lia,-4.2,-2.4,PI/2); lia.sit=true; lia.kind='shock'; colocar(leo,4.2,-2.4,-PI/2); leo.kind='shock';
        lia.S.vis=true; leo.S.vis=true; lia.S.off.set(1.4,0,2.3); leo.S.off.set(-1.4,0,3.5); leo.S.roll=PI; lia.S.mode='hugL'; leo.S.mode='hugR'; corazonesSobre(0,1.2,.6,k,6,1.6); copa.position.set(-3.2,7,0); haz.material.opacity=0;
        const a=eio(k01(k,0,1.8)); orb(0,.6,-.6,lerp(22,17,a),lerp(18,14,a),lerp(.05,0,a)); },
   // 15 — todo el patio lo ve
   (k,t)=>{ solo(nina,tomi,dani,sofi); [[nina,-5.5],[tomi,-1.8],[dani,1.8],[sofi,5.5]].forEach(([c,x],i)=>{ colocar(c,x,2,0); c.kind='shock'; c.S.mode='wave'; c.root.position.y=Math.abs(Math.sin(t*9+i))*.2; c.aL.rotation.x=-2.5; c.aR.rotation.x=-2.5; });
        const a=eio(k01(k,0,1.0)); orb(lerp(5.5,-5.5,a),2.2,3.2,15,10,lerp(.25,-.25,a)); },
   // 16 — Lía sale corriendo, roja como un tomate
   (k,t)=>{ solo(leo,lia); const a=eio(k01(k,0,2.3)); const x=lerp(-4,6,a); colocar(lia,x,lerp(1.5,3.5,a),PI/2); lia.kind='blush'; caminar(lia,t*13,1.1); lia.S.vis=true; lia.S.mode='wave'; lia.S.off.set(-.3,0,0); corazonesSobre(x-1.2,5.6,lia.root.position.z,k,3,.9);
        colocar(leo,-3,0,PI/2); leo.kind='happy'; orb(x+2.5,2.8,lia.root.position.z,13,5.6,1.35); },
   // 17 — Leo sonríe y pregunta
   (k,t)=>{ solo(leo,lia); colocar(leo,0,4,0); leo.kind='happy'; leo.S.mode=k>1.2?'flip':'idle'; leo.S.roll=k>1.2?(k-1.2)*PI*2:0; leo.S.off.set(0,Math.max(0,Math.sin(clamp((k-1.2)/1,0,1)*PI))*1.4,0); leo.root.position.y=Math.abs(Math.sin(t*4))*.25; leo.aR.rotation.x=-.2;
        lia.sit=false; colocar(lia,-4,0,.4); lia.kind='blush'; lia.S.vis=true; lia.S.mode='wave'; const a=eio(k01(k,0,3.7)); orb(1.4,5.4,4,lerp(19,14,a),lerp(8,6.5,a),lerp(-.1,.1,a)); }
  ];
  return ESC.map(fn=>(k,t,s)=>{ base(t); fn(k,t,s); terminar(t); });
 }});
