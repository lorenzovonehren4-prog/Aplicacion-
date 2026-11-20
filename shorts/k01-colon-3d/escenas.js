// Colón y el eclipse — estilo «mapa en relieve de papel» (prueba 3D)
const {clamp,lerp,k01,eio,eout,rnd,cartel,texto}=TRES;
TRES.run({ hot:/^(colón|cristóbal|eclipse|comida|1504|jamaica|alimentos|almanaque|luna|29|febrero|dios|roja|hernando)$/i,
 titles:[[0.1,3.0,'¿SABÍAS QUE...?<small>COLÓN Y EL ECLIPSE</small>',150]],
 bigs:[[3.6,7.9,'1504<small>JAMAICA</small>',250],[11.9,13.3,'SIN COMIDA',250],[22.2,24.5,'LUNA ROJA',250]],
 setup({THREE,scene,cam,R,hud}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  // ---- papel ----
  const papel=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=512; const g=cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,512,512);
    for(let i=0;i<9000;i++){ g.fillStyle=`rgba(${rnd(i)>.5?0:255},${rnd(i)>.5?0:255},${rnd(i)>.5?0:255},${.03+rnd(i*3)*.05})`; g.fillRect(rnd(i*7)*512,rnd(i*11)*512,1+rnd(i*5)*3,1); }
    const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const mat=(col,o={})=>new THREE.MeshStandardMaterial({color:col,roughness:1,metalness:0,map:papel,flatShading:true,...o});
  // ---- islas: contorno con ruido, capas apiladas como cartón recortado ----
  function contorno(cx,cz,rx,rz,rot,seed,n=90){ const p=[]; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; let r=1+.13*Math.sin(a*3+seed)+.08*Math.sin(a*7+seed*2)+.05*Math.sin(a*13+seed*3);
      const x=Math.cos(a)*rx*r, z=Math.sin(a)*rz*r; p.push([cx+x*Math.cos(rot)-z*Math.sin(rot), cz+x*Math.sin(rot)+z*Math.cos(rot)]); } return p; }
  const ISLAS=[{n:'JAMAICA',c:[0,0,15,4.6,0,1]},{n:'CUBA',c:[-8,-24,46,5.5,.12,4]},{n:'LA ESPAÑOLA',c:[42,-10,17,7,-.05,7]},{n:'',c:[70,-6,7,2.4,0,9]}];
  const COL=['#ead9ae','#c8d697','#9dbb72','#7a9e58','#5f8445'];
  const tierra=new THREE.Group(); scene.add(tierra);
  for(const is of ISLAS){ const [cx,cz,rx,rz,rot,sd]=is.c; const capas=rx>20?4:5;
    for(let L=0;L<capas;L++){ const f=1-L*.2; if(f<=.15) break; const pts=contorno(cx,cz,rx*f,rz*Math.max(.25,f-.05*L),rot,sd+L*1.7);
      const sh=new THREE.Shape(pts.map(([x,z])=>new THREE.Vector2(x,-z))); const g=new THREE.ExtrudeGeometry(sh,{depth:.55,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:1}); g.rotateX(-Math.PI/2);
      const m=new THREE.Mesh(g,mat(COL[L])); m.position.y=L*.55; m.castShadow=m.receiveShadow=true; tierra.add(m); } }
  // ---- mar de papel con curvas de nivel ----
  const mar=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=2048; const g=cv.getContext('2d'); const S=2048/300, X=x=>(x+150)*S, Z=z=>(z+150)*S;
    const gr=g.createRadialGradient(1024,1024,100,1024,1024,1500); gr.addColorStop(0,'#8cc4d8'); gr.addColorStop(1,'#4f8fb0'); g.fillStyle=gr; g.fillRect(0,0,2048,2048);
    for(const is of ISLAS){ const [cx,cz,rx,rz,rot,sd]=is.c; for(let k=6;k>=1;k--){ const pts=contorno(cx,cz,rx+k*3.2,rz+k*3.2,rot,sd); g.beginPath(); pts.forEach(([x,z],i)=>i?g.lineTo(X(x),Z(z)):g.moveTo(X(x),Z(z))); g.closePath(); g.fillStyle=`rgba(190,228,236,${.07+.05*(6-k)})`; g.fill(); g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=3; g.stroke(); } }
    g.strokeStyle='rgba(255,255,255,.18)'; g.lineWidth=2; g.setLineDash([14,12]); for(let i=0;i<=300;i+=25){ g.beginPath(); g.moveTo(X(i-150),0); g.lineTo(X(i-150),2048); g.stroke(); g.beginPath(); g.moveTo(0,Z(i-150)); g.lineTo(2048,Z(i-150)); g.stroke(); }
    const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; })();
  const mp=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({map:mar,roughness:1})); mp.rotation.x=-Math.PI/2; mp.position.y=-.02; mp.receiveShadow=true; scene.add(mp);
  // nombres de islas
  const nombres=ISLAS.filter(i=>i.n).map(is=>{ const s=cartel(is.n,{size:80,col:'#3a2a1a',stroke:false,font:'800 80px Montserrat',bg:'rgba(245,235,210,.92)',borde:'#3a2a1a',alto:2.6}); s.position.set(is.c[0],3.6,is.c[1]+(is.n==='JAMAICA'?6.5:0)); scene.add(s); return s; });
  // ---- luces ----
  const hemi=new THREE.HemisphereLight('#fff4e0','#6a8aa0',1.1); scene.add(hemi);
  const sol=new THREE.DirectionalLight('#fff1d6',2.4); sol.position.set(-40,60,30); sol.castShadow=true; sol.shadow.mapSize.set(2048,2048); const sc=sol.shadow.camera; sc.left=-60; sc.right=60; sc.top=60; sc.bottom=-60; sc.far=200; sol.shadow.bias=-.0008; scene.add(sol);
  const cielo=new THREE.Color('#cfe3ea'), NOCHE=new THREE.Color('#0e1530'); scene.background=cielo.clone(); scene.fog=new THREE.Fog(cielo.clone(),90,260);
  // ---- barcos de papel ----
  function barco(){ const g=new THREE.Group(); const casco=new THREE.Shape([V(-2.2,0),V(2.2,0),V(1.5,-1),V(-1.5,-1)].map(v=>new THREE.Vector2(v.x,v.y))); const cg=new THREE.ExtrudeGeometry(casco,{depth:1.4,bevelEnabled:false}); cg.translate(0,1,-.7);
    const c=new THREE.Mesh(cg,mat('#f4efe2')); c.castShadow=true; g.add(c); const v=new THREE.Mesh(new THREE.ConeGeometry(1.1,2.6,3),mat('#ffffff')); v.position.y=2.3; v.rotation.y=.5; v.castShadow=true; g.add(v);
    const ms=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,3.2),mat('#7a5a3a')); ms.position.y=2.1; g.add(ms); return g; }
  const barcos=[barco(),barco()]; barcos.forEach(b=>scene.add(b));
  // ---- figuras (peones de papel) ----
  function peon(col,o={}){ const g=new THREE.Group(); const cu=new THREE.Mesh(new THREE.ConeGeometry(.55,1.6,7),mat(col)); cu.position.y=.8; cu.castShadow=true; g.add(cu);
    const ca=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),mat(o.piel||'#d9a77a')); ca.position.y=1.85; ca.castShadow=true; g.add(ca);
    if(o.pluma){ const p=new THREE.Mesh(new THREE.ConeGeometry(.12,.8,4),mat('#f2c230')); p.position.set(0,2.5,0); g.add(p); }
    if(o.sombrero){ const s=new THREE.Mesh(new THREE.CylinderGeometry(.55,.6,.12,8),mat('#2a2a3a')); s.position.y=2.2; g.add(s); const s2=new THREE.Mesh(new THREE.CylinderGeometry(.3,.35,.4,8),mat('#2a2a3a')); s2.position.y=2.42; g.add(s2); }
    if(o.caja){ const c=new THREE.Mesh(new THREE.BoxGeometry(.8,.55,.6),mat('#c99a5a')); c.position.set(0,2.55,0); c.castShadow=true; g.add(c); g.userData.caja=c; }
    g.scale.setScalar(o.s||1); scene.add(g); return g; }
  const BAHIA=V(-2,1.2,-3.9);    // costa norte de Jamaica (Santa Ana)
  const ALDEA=V(4,2.6,1.2);
  const nativos=[...Array(6)].map((_,i)=>peon('#b5623a',{caja:true,piel:'#b07a50',s:.62}));
  const jefes=[...Array(5)].map((_,i)=>peon('#9c4a2a',{pluma:true,piel:'#b07a50',s:.75}));
  const colon=peon('#3a5a8a',{sombrero:true,s:.8});
  const casas=[...Array(5)].map((_,i)=>{ const h=new THREE.Group(); const b=new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,.8,8),mat('#d8b884')); b.position.y=.4; const r=new THREE.Mesh(new THREE.ConeGeometry(1,1,8),mat('#a07a3a')); r.position.y=1.3; b.castShadow=r.castShadow=true; h.add(b,r); h.position.set(ALDEA.x+Math.cos(i*1.3)*2.4,ALDEA.y-.4,ALDEA.z+Math.sin(i*1.3)*1.4); h.scale.setScalar(.7); scene.add(h); return h; });
  // ---- ruta desde España ----
  const ruta=new THREE.CatmullRomCurve3([V(150,.3,-60),V(110,.3,-30),V(70,.3,8),V(30,.3,12),V(6,.3,-7),V(-1.5,.3,-6)]);
  const rpts=ruta.getPoints(300); const rgeo=new THREE.BufferGeometry().setFromPoints(rpts); const rline=new THREE.Line(rgeo,new THREE.LineDashedMaterial({color:'#b5302a',dashSize:1.6,gapSize:1.1,linewidth:3})); rline.computeLineDistances(); scene.add(rline);
  const rtubo=new THREE.Mesh(new THREE.TubeGeometry(ruta,300,.28,6),new THREE.MeshStandardMaterial({color:'#c0392b',roughness:1})); scene.add(rtubo);
  const desde=cartel('DESDE ESPAÑA →',{size:70,font:'800 70px Montserrat',col:'#fff',bg:'#b5302a',stroke:false,alto:2.6}); desde.position.set(60,3,12); scene.add(desde);
  // ---- almanaque ----
  const libro=new THREE.Group(); scene.add(libro);
  const pag=(()=>{ const cv=document.createElement('canvas'); cv.width=1024; cv.height=1400; const g=cv.getContext('2d'); g.fillStyle='#f3e6c4'; g.fillRect(0,0,1024,1400);
    for(let i=0;i<5000;i++){ g.fillStyle=`rgba(90,60,20,${rnd(i)*.06})`; g.fillRect(rnd(i*3)*1024,rnd(i*5)*1400,2,2); }
    g.fillStyle='#3a2410'; g.textAlign='center'; g.font='120px Anton'; g.fillText('ALMANAQUE',512,190); g.font='800 54px Montserrat'; g.fillText('ECLIPSES DE LUNA',512,280);
    g.strokeStyle='#3a2410'; g.lineWidth=4; g.beginPath(); g.moveTo(120,320); g.lineTo(904,320); g.stroke();
    const fases=[0,.25,.5,.75,1]; fases.forEach((f,i)=>{ const x=170+i*170,y=520; g.fillStyle='#e9d9a0'; g.beginPath(); g.arc(x,y,62,0,7); g.fill(); g.stroke(); g.fillStyle='rgba(120,20,10,.85)'; g.beginPath(); g.arc(x+124*(1-f)-0,y,62,0,7); g.save(); g.clip(); g.restore(); g.save(); g.beginPath(); g.arc(x,y,62,0,7); g.clip(); g.beginPath(); g.arc(x+130*(1-f),y,66,0,7); g.fill(); g.restore(); });
    g.font='180px Anton'; g.fillStyle='#9a1f14'; g.fillText('29 FEB',512,860); g.font='140px Anton'; g.fillText('1504',512,1020);
    g.fillStyle='#3a2410'; g.font='600 40px Montserrat'; for(let i=0;i<5;i++) g.fillRect(160,1110+i*50,704-(i%3)*120,10);
    const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; })();
  const tapa=mat('#6a2e1a'), base=new THREE.Mesh(new THREE.BoxGeometry(7.4,.5,10),tapa); base.castShadow=base.receiveShadow=true; libro.add(base);
  const hoja=new THREE.Mesh(new THREE.PlaneGeometry(7,9.6),new THREE.MeshStandardMaterial({map:pag,roughness:1})); hoja.rotation.x=-Math.PI/2; hoja.position.y=.27; hoja.receiveShadow=true; libro.add(hoja);
  const bis=new THREE.Group(); bis.position.set(-3.7,.3,0); libro.add(bis); const tp=new THREE.Mesh(new THREE.BoxGeometry(7.4,.18,10),tapa); tp.position.x=3.7; tp.castShadow=true; bis.add(tp);
  libro.position.set(-60,0,40); // fuera de escena hasta que se use
  // ---- luna ----
  const luna=new THREE.Mesh(new THREE.IcosahedronGeometry(6,3),new THREE.MeshStandardMaterial({color:'#f2ecd0',emissive:'#f2ecd0',emissiveIntensity:.6,roughness:1,flatShading:true,map:papel})); luna.position.set(-9,30,-62); scene.add(luna);
  const sombra=new THREE.Mesh(new THREE.CircleGeometry(6.6,40),new THREE.MeshBasicMaterial({color:'#2a0806',transparent:true,opacity:.0})); scene.add(sombra);
  const antorchas=[...Array(6)].map(()=>{ const l=new THREE.PointLight('#ffa040',0,10,2); scene.add(l); return l; });
  // ---- utilidades de cámara ----
  const mira=(p,o)=>{ cam.position.copy(p); cam.lookAt(o); };
  const orbita=(c,r,h,a)=>V(c.x+Math.cos(a)*r,c.y+h,c.z+Math.sin(a)*r);
  function noche(k){ scene.background.copy(cielo).lerp(NOCHE,k); scene.fog.color.copy(scene.background); hemi.intensity=lerp(1.1,.18,k); sol.intensity=lerp(2.4,.35,k); sol.color.set(k>.5?'#8aa0ff':'#fff1d6'); R.toneMappingExposure=lerp(1.05,1.15,k); }
  function lunaRoja(k){ luna.material.color.set('#f2ecd0').lerp(new THREE.Color('#9a2a14'),k); luna.material.emissive.set('#f2ecd0').lerp(new THREE.Color('#6a1408'),k); luna.material.emissiveIntensity=lerp(.6,.5,k); }
  function sitios(){ barcos[0].position.set(-4.5,.05,-5.6); barcos[0].rotation.set(.12,.4,.08); barcos[1].position.set(.5,.05,-6.1); barcos[1].rotation.set(-.1,-.3,-.1);
    colon.position.set(-1.8,BAHIA.y-.1,-3.1); }
  function nativosCamino(k,ida=true,carga=true){ nativos.forEach((n,i)=>{ const kk=clamp(k*1.25-i*.06,0,1), a=ALDEA, b=V(BAHIA.x+(i-2.5)*.9,BAHIA.y-.1,BAHIA.z+.9+(i%2)*.5);
      const p=ida?a.clone().lerp(b,eio(kk)):b.clone().lerp(a,eio(kk)); n.position.set(p.x+Math.sin(i)*.6,p.y-.1+Math.abs(Math.sin(k*30+i))*.12*(kk<1?1:0),p.z+Math.cos(i*2)*.3); n.lookAt(ida?b.x:a.x,n.position.y,ida?b.z:a.z); n.userData.caja.visible=carga; }); }
  const ocultar=(arr,v)=>arr.forEach(o=>o.visible=v);
  function base0(){ cam.fov=40; cam.updateProjectionMatrix(); noche(0); lunaRoja(0); sombra.material.opacity=0; ocultar(nativos,false); ocultar(jefes,false); colon.visible=false; antorchas.forEach(l=>l.intensity=0); libro.position.set(-60,0,40); nombres.forEach(n=>n.visible=true); desde.visible=false; rtubo.visible=false; rline.visible=true; luna.visible=false; sitios(); }
  return [
   // 0 — gancho: caída hacia el mapa
   k=>{ base0(); const a=eio(k01(k,0,3.1)); barcos[0].position.set(lerp(18,-4.5,a),.05,lerp(-12,-5.6,a)); barcos[1].position.set(lerp(24,.5,a),.05,lerp(-15,-6.1,a)); barcos.forEach(b=>b.rotation.set(0,-.6,Math.sin(k*3)*.05));
        mira(V(lerp(60,10,a),lerp(140,30,a),lerp(120,34,a)),V(lerp(10,0,a),0,lerp(-10,-3,a))); },
   // 1 — 1504: ruta y varados
   k=>{ base0(); desde.visible=true; rtubo.visible=true; const d=clamp(k/2.6,0,1); rtubo.geometry.setDrawRange(0,Math.floor(d*300)*6*6);
        const a=eio(k01(k,0,5)); mira(orbita(V(10,0,-4),lerp(70,30,a),lerp(55,18,a),lerp(.9,1.5,a)),V(lerp(30,0,a),0,-4)); },
   // 2 — les daban alimentos
   k=>{ base0(); ocultar(nativos,true); colon.visible=true; nativosCamino(k/3.2,true,true); nombres.forEach(n=>n.visible=false); const p=nativos[2].position; mira(V(p.x+9,p.y+7,p.z+10),V(p.x-1,p.y+.6,p.z-1.5)); },
   // 3 — dejaron de hacerlo
   k=>{ base0(); ocultar(nativos,true); colon.visible=true; nombres.forEach(n=>n.visible=false); nativosCamino(k/1.9,false,false); const a=eout(k01(k,0,1.9)); mira(V(-1+a*2,lerp(14,9,a),lerp(8,5,a)),V(-1.5,1.2,-4.4)); },
   // 4 — el almanaque
   k=>{ base0(); nombres.forEach(n=>n.visible=false); rline.visible=false; libro.position.set(-1,3.2,2); libro.rotation.set(0,0,0); bis.rotation.z=lerp(0,Math.PI*.995,eio(k01(k,.2,1.6)));
        const a=eio(k01(k,0,4)); mira(V(lerp(2,-.6,a),lerp(13,10.5,a),lerp(10,3.4,a)),V(-1,3.2,lerp(1,1.9,a))); },
   // 5 — reúne a los jefes (atardecer)
   k=>{ base0(); noche(eio(k01(k,0,4.3))*.55); luna.visible=true; colon.visible=true; colon.position.set(-1,BAHIA.y-.1,-2.2); ocultar(jefes,true);
        jefes.forEach((j,i)=>{ const an=i/5*Math.PI*1.3-Math.PI*.15; j.position.set(-1+Math.cos(an)*2.4,BAHIA.y-.1,-2.2+Math.sin(an)*2.4); j.lookAt(-1,j.position.y,-2.2); });
        colon.rotation.y=Math.sin(k*2)*.3; colon.position.y=BAHIA.y-.1+Math.abs(Math.sin(k*5))*.15; nombres.forEach(n=>n.visible=false); mira(orbita(V(-1,BAHIA.y,-2.2),8,8.5,1.1+k*.2),V(-1,BAHIA.y+1,-2.2)); },
   // 6 — la Luna se oscurece y se vuelve roja
   k=>{ base0(); noche(1); luna.visible=true; ocultar(jefes,true); colon.visible=true; colon.position.set(-1,BAHIA.y-.1,-2.2);
        nombres.forEach(n=>n.visible=false); const e=eio(k01(k,.3,2.4)); lunaRoja(e); const dir=cam.position.clone().sub(luna.position).normalize(); sombra.position.copy(luna.position).addScaledVector(dir,6.5).add(V(lerp(-13,0,e),lerp(4,0,e),0)); sombra.lookAt(cam.position); sombra.material.opacity=.55*(1-Math.abs(e-.5)*2)+.0;
        const c0=V(-1,BAHIA.y+2,-2.2), up=eio(k01(k,0,1.2)); cam.position.set(1.5,BAHIA.y+1.6,5.5); cam.lookAt(c0.clone().lerp(luna.position,up)); cam.fov=lerp(40,30,eio(k01(k,.6,2.9))); cam.updateProjectionMatrix(); },
   // 7 — vuelven con comida (de noche, con antorchas)
   k=>{ base0(); cam.fov=40; cam.updateProjectionMatrix(); noche(1); lunaRoja(1); luna.visible=true; colon.visible=true; ocultar(nativos,true); nativosCamino(k/2.2,true,true);
        nativos.forEach((n,i)=>{ antorchas[i].position.set(n.position.x,n.position.y+2.2,n.position.z); antorchas[i].intensity=6+Math.sin(k*20+i*3)*1.5; });
        nombres.forEach(n=>n.visible=false); mira(V(-8,8.5,7),V(0,1.4,-2.5)); },
   // 8 — Hernando Colón lo contó; plano general final
   k=>{ base0(); noche(1); lunaRoja(1); luna.visible=true; colon.visible=true; libro.position.set(-1,3.2,2); bis.rotation.z=Math.PI*.995;
        const a=eio(k01(k,0,3)); mira(V(lerp(4,30,a),lerp(12,85,a),lerp(10,80,a)),V(0,lerp(3,0,a),lerp(1,-8,a))); }
  ];
 }});
