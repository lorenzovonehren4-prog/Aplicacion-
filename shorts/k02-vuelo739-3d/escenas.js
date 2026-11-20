// Vuelo 739 — estilo «repetición de accidente aéreo» (prueba 3D)
const {clamp,lerp,k01,eio,eout,rnd,cartel}=TRES;
TRES.run({ hot:/^(1962|avión|cien|pacífico|resto|16|marzo|lockheed|constellation|guam|filipinas|93|soldados|posición|responder|destello|búsquedas|nada|restos|aceite|chalecos|explotó|739)$/i,
 titles:[[0.1,4.2,'¿SABÍAS QUE...?<small>EL AVIÓN QUE DESAPARECIÓ</small>',150]],
 bigs:[[8.5,11.4,'16 MAR<small>1962</small>',250],[15.2,19.9,'93<small>SOLDADOS A BORDO</small>',230],[43.5,50.5,'VUELO 739<small>SIN RESPUESTA</small>',250]],
 setup({THREE,scene,cam,R,hud,W,H}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  // ---- cielo ----
  const grad=(a,b,c)=>{ const cv=document.createElement('canvas'); cv.width=4; cv.height=512; const g=cv.getContext('2d'), gr=g.createLinearGradient(0,0,0,512); gr.addColorStop(0,a); gr.addColorStop(.55,b); gr.addColorStop(1,c); g.fillStyle=gr; g.fillRect(0,0,4,512); const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; return t; };
  const NOCHE=grad('#02040c','#0b1a33','#1d3a55'), DIA=grad('#3d6f9e','#8fb8d4','#cfe0e6');
  scene.fog=new THREE.Fog('#16304a',60,420);
  const estrellas=(()=>{ const g=new THREE.BufferGeometry(), p=[]; for(let i=0;i<1500;i++){ const a=rnd(i)*Math.PI*2, e=.08+rnd(i*3)*1.3; p.push(Math.cos(a)*Math.cos(e)*900,Math.sin(e)*900,Math.sin(a)*Math.cos(e)*900); } g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); return new THREE.Points(g,new THREE.PointsMaterial({color:'#fff',size:2,sizeAttenuation:false,fog:false})); })(); scene.add(estrellas);
  // ---- mar low-poly animado ----
  const mg=new THREE.PlaneGeometry(1400,1400,90,90); mg.rotateX(-Math.PI/2); const base=mg.attributes.position.array.slice();
  const mar=new THREE.Mesh(mg,new THREE.MeshStandardMaterial({color:'#1b4766',roughness:.55,metalness:.1,flatShading:true})); mar.receiveShadow=true; scene.add(mar);
  function olas(t,amp=1){ const a=mg.attributes.position.array; for(let i=0;i<a.length;i+=3){ const x=base[i], z=base[i+2]; a[i+1]=amp*(Math.sin(x*.05+t*1.1)*1.1+Math.sin(z*.07+t*.8)*.9+Math.sin((x+z)*.11+t*1.7)*.4); } mg.attributes.position.needsUpdate=true; mg.computeVertexNormals(); }
  // ---- luces ----
  const hemi=new THREE.HemisphereLight('#9ab4d8','#0a1420',.7); scene.add(hemi);
  const luz=new THREE.DirectionalLight('#c8d8ff',1.6); luz.position.set(-80,120,60); luz.castShadow=true; luz.shadow.mapSize.set(1024,1024); Object.assign(luz.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:400}); scene.add(luz); scene.add(luz.target);
  const lunaS=cartel('●',{size:200,col:'#f4f0dc',stroke:false,alto:60}); lunaS.material.fog=false; scene.add(lunaS);
  function noche(){ scene.background=NOCHE; scene.fog.color.set('#16304a'); hemi.color.set('#9ab4d8'); hemi.intensity=.7; luz.color.set('#c8d8ff'); luz.intensity=1.6; estrellas.visible=true; lunaS.visible=true; mar.material.color.set('#1b4766'); R.toneMappingExposure=1.1; }
  function dia(){ scene.background=DIA; scene.fog.color.set('#bcd2de'); hemi.color.set('#ffffff'); hemi.intensity=1.2; luz.color.set('#fff2dc'); luz.intensity=2.6; estrellas.visible=false; lunaS.visible=false; mar.material.color.set('#2c6a8c'); R.toneMappingExposure=1.0; }
  // ---- nubes ----
  const nubes=new THREE.Group(); scene.add(nubes); const nm=new THREE.MeshStandardMaterial({color:'#c8d2e0',roughness:1,flatShading:true});
  for(let i=0;i<70;i++){ const c=new THREE.Group(); for(let j=0;j<5;j++){ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(4+rnd(i*9+j)*5,0),nm); m.position.set((j-2)*5+rnd(i+j)*3,rnd(i*2+j)*2,rnd(i*5+j)*4); c.add(m); }
    c.position.set(100-rnd(i*3)*700,46+rnd(i*7)*30,(rnd(i*11)-.5)*900); c.scale.setScalar(1+rnd(i)*1.5); nubes.add(c); }
  // ---- avión (cuatrimotor de triple deriva) ----
  const metal=new THREE.MeshStandardMaterial({color:'#c4c9d0',roughness:.35,metalness:.65,flatShading:true});
  const blanco=new THREE.MeshStandardMaterial({color:'#e8ecf0',roughness:.5,metalness:.2,flatShading:true});
  function avion(){ const g=new THREE.Group(); const perfil=[]; for(let i=0;i<=16;i++){ const u=i/16; perfil.push(new THREE.Vector2(Math.max(.02,Math.sin(Math.PI*Math.pow(u,.8))*.42*(1-.25*u)),u*7-3.5)); }
    const fus=new THREE.Mesh(new THREE.LatheGeometry(perfil,10),blanco); fus.rotation.x=Math.PI/2; fus.castShadow=true; g.add(fus);
    const ala=new THREE.Mesh(new THREE.BoxGeometry(8.6,.1,1.1),metal); ala.position.set(0,-.12,-.2); ala.castShadow=true; g.add(ala);
    const est=new THREE.Mesh(new THREE.BoxGeometry(3,.07,.6),metal); est.position.set(0,.15,3.1); g.add(est);
    for(const x of [-1.5,0,1.5]){ const d=new THREE.Mesh(new THREE.BoxGeometry(.06,.9,.55),metal); d.position.set(x,.55,3.15); g.add(d); }
    g.userData.helices=[]; for(const x of [-3,-1.5,1.5,3]){ const n=new THREE.Mesh(new THREE.CylinderGeometry(.18,.14,1.1,8),metal); n.rotation.x=Math.PI/2; n.position.set(x,-.1,-.6); g.add(n);
      const h=new THREE.Mesh(new THREE.CircleGeometry(.62,20),new THREE.MeshBasicMaterial({color:'#9aa0a8',transparent:true,opacity:.28,side:THREE.DoubleSide})); h.position.set(x,-.1,-1.18); g.add(h); g.userData.helices.push(h); }
    const roja=new THREE.Mesh(new THREE.SphereGeometry(.09),new THREE.MeshBasicMaterial({color:'#ff2a2a'})); roja.position.set(-4.3,-.1,-.2); const verde=new THREE.Mesh(new THREE.SphereGeometry(.09),new THREE.MeshBasicMaterial({color:'#2aff5a'})); verde.position.set(4.3,-.1,-.2); g.add(roja,verde);
    const ven=new THREE.Mesh(new THREE.BoxGeometry(.02,.08,4.2),new THREE.MeshBasicMaterial({color:'#ffd88a'})); for(const s of [-1,1]){ const v=ven.clone(); v.position.set(s*.4,.08,-.3); g.add(v); }
    g.userData.nav=[roja,verde]; g.rotation.order='YXZ'; return g; }
  const av=avion(); av.scale.setScalar(1); scene.add(av);
  const parpadeo=t=>{ const on=(t*1.3)%1<.12; av.userData.nav.forEach(n=>n.visible=on||true); av.userData.helices.forEach((h,i)=>h.rotation.z=t*40+i); };
  // ---- isla de Guam con pista ----
  const isla=new THREE.Group(); scene.add(isla);
  { const g=new THREE.CylinderGeometry(30,40,4,14,1); const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#3a5a34',roughness:1,flatShading:true})); m.position.y=0; m.receiveShadow=true; isla.add(m);
    const pista=new THREE.Mesh(new THREE.BoxGeometry(5,.1,48),new THREE.MeshStandardMaterial({color:'#2a2c30',roughness:.9})); pista.position.y=2.05; isla.add(pista);
    for(let i=0;i<24;i++) for(const s of [-1,1]){ const l=new THREE.Mesh(new THREE.SphereGeometry(.12),new THREE.MeshBasicMaterial({color:i%2?'#ffd27a':'#fff4d0'})); l.position.set(s*2.7,2.15,-23+i*2); isla.add(l); }
    for(let i=0;i<10;i++){ const b=new THREE.Mesh(new THREE.BoxGeometry(3+rnd(i)*3,1.5+rnd(i*2)*2,3),new THREE.MeshStandardMaterial({color:'#6a6a64',roughness:1})); b.position.set(9+rnd(i*3)*10,2.8,-15+i*3.4); isla.add(b); } }
  isla.position.set(0,0,0);
  // ---- barcos ----
  function barco(col='#3a3e44',L=14){ const g=new THREE.Group(); const c=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.4,L),new THREE.MeshStandardMaterial({color:col,roughness:.8,flatShading:true})); c.position.y=.5; g.add(c);
    const p=new THREE.Mesh(new THREE.ConeGeometry(1.3,3,4),c.material); p.rotation.x=-Math.PI/2; p.rotation.y=Math.PI/4; p.position.set(0,.5,-L/2-1.4); p.scale.set(1,1,.5); g.add(p);
    const sup=new THREE.Mesh(new THREE.BoxGeometry(2.2,2,2.4),new THREE.MeshStandardMaterial({color:'#d8d4c8',roughness:.8})); sup.position.set(0,2.1,L/2-2); g.add(sup);
    const ch=new THREE.Mesh(new THREE.CylinderGeometry(.35,.4,1.6,8),new THREE.MeshStandardMaterial({color:'#8a2a22'})); ch.position.set(0,3.6,L/2-2.6); g.add(ch);
    const fl=new THREE.PointLight('#ffe0a0',3,14); fl.position.set(0,3.4,L/2-1); g.add(fl); scene.add(g); return g; }
  const petrolero=barco('#2e3236',22);
  const busca=[barco('#56606a'),barco('#4a5560'),barco('#5c646c'),barco('#50585e')];
  const avs=[avion(),avion(),avion()]; avs.forEach(a=>{ a.scale.setScalar(.8); scene.add(a); });
  const conos=avs.map(()=>{ const c=new THREE.Mesh(new THREE.ConeGeometry(6,30,20,1,true),new THREE.MeshBasicMaterial({color:'#fff6c8',transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide})); scene.add(c); return c; });
  // destello
  const brillo=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=256; const g=cv.getContext('2d'), gr=g.createRadialGradient(128,128,0,128,128,128); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.2,'rgba(255,240,200,.8)'); gr.addColorStop(1,'rgba(255,200,120,0)'); g.fillStyle=gr; g.fillRect(0,0,256,256); return new THREE.CanvasTexture(cv); })();
  const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:brillo,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,fog:false})); scene.add(flash);
  const flashL=new THREE.PointLight('#fff0d0',0,600,1.2); scene.add(flashL);
  // ---- HUD de reconstrucción ----
  const M=(w,s)=>`${w} ${s}px Montserrat`;
  function marco(t,datos){ hud.save(); hud.strokeStyle='rgba(255,255,255,.75)'; hud.lineWidth=5; const m=60,L=70;
    for(const [x,y,dx,dy] of [[m,m+40,1,1],[W-m,m+40,-1,1],[m,H-m-260,1,-1],[W-m,H-m-260,-1,-1]]){ hud.beginPath(); hud.moveTo(x,y+dy*L); hud.lineTo(x,y); hud.lineTo(x+dx*L,y); hud.stroke(); }
    hud.fillStyle='rgba(200,30,30,.9)'; hud.fillRect(m+20,m+70,330,56); hud.fillStyle='#fff'; hud.font=M(800,30); hud.fillText('RECONSTRUCCIÓN',m+38,m+109);
    if((t*2)%1<.6){ hud.fillStyle='#ff3030'; hud.beginPath(); hud.arc(m+380,m+98,12,0,7); hud.fill(); }
    if(datos){ hud.font=M(800,34); hud.fillStyle='rgba(0,0,0,.45)'; hud.fillRect(m+20,1290,520,150); hud.fillStyle='#e8f4ff'; datos.forEach((d,i)=>hud.fillText(d,m+40,1340+i*46)); }
    hud.restore(); }
  function mapa(k){ hud.save(); const x0=110,y0=560,w=860,h=560; hud.fillStyle='rgba(6,18,32,.86)'; hud.strokeStyle='rgba(140,200,255,.6)'; hud.lineWidth=3; hud.fillRect(x0,y0,w,h); hud.strokeRect(x0,y0,w,h);
    hud.strokeStyle='rgba(140,200,255,.12)'; for(let i=1;i<8;i++){ hud.beginPath(); hud.moveTo(x0+i*w/8,y0); hud.lineTo(x0+i*w/8,y0+h); hud.stroke(); } for(let i=1;i<5;i++){ hud.beginPath(); hud.moveTo(x0,y0+i*h/5); hud.lineTo(x0+w,y0+i*h/5); hud.stroke(); }
    hud.fillStyle='#3a5a40'; hud.beginPath(); hud.ellipse(x0+150,y0+300,60,150,.2,0,7); hud.fill(); hud.beginPath(); hud.ellipse(x0+110,y0+440,40,70,.4,0,7); hud.fill();
    const G=[x0+w-130,y0+250], F=[x0+190,y0+260]; hud.fillStyle='#3a5a40'; hud.beginPath(); hud.arc(G[0],G[1],14,0,7); hud.fill();
    hud.setLineDash([16,12]); hud.strokeStyle='#ffd23a'; hud.lineWidth=5; hud.beginPath(); hud.moveTo(G[0],G[1]); hud.lineTo(lerp(G[0],F[0],k),lerp(G[1],F[1],k)); hud.stroke(); hud.setLineDash([]);
    hud.fillStyle='#fff'; hud.font=M(800,34); hud.fillText('GUAM',G[0]-50,G[1]+60); hud.fillText('FILIPINAS',F[0]-90,F[1]+190); hud.font=M(800,26); hud.fillStyle='rgba(140,200,255,.9)'; hud.fillText('OCÉANO PACÍFICO',x0+w/2-120,y0+h-30);
    const px=lerp(G[0],F[0],k), py=lerp(G[1],F[1],k); hud.save(); hud.translate(px,py); hud.rotate(-Math.PI/2); hud.fillStyle='#ffd23a'; hud.beginPath(); hud.moveTo(0,-26); hud.lineTo(18,18); hud.lineTo(0,8); hud.lineTo(-18,18); hud.closePath(); hud.fill(); hud.restore(); hud.restore(); }
  function radar(k,t){ hud.save(); hud.fillStyle='#020a06'; hud.fillRect(0,0,W,H); const cx=W/2, cy=860, r=430;
    const gr=hud.createRadialGradient(cx,cy,0,cx,cy,r); gr.addColorStop(0,'#08321c'); gr.addColorStop(1,'#03170c'); hud.fillStyle=gr; hud.beginPath(); hud.arc(cx,cy,r,0,7); hud.fill();
    hud.strokeStyle='rgba(60,255,140,.35)'; hud.lineWidth=2; for(let i=1;i<=4;i++){ hud.beginPath(); hud.arc(cx,cy,r*i/4,0,7); hud.stroke(); } hud.beginPath(); hud.moveTo(cx-r,cy); hud.lineTo(cx+r,cy); hud.moveTo(cx,cy-r); hud.lineTo(cx,cy+r); hud.stroke();
    const a=t*2.2; for(let i=0;i<40;i++){ hud.strokeStyle=`rgba(60,255,140,${.5*(1-i/40)})`; hud.lineWidth=6; hud.beginPath(); hud.moveTo(cx,cy); hud.lineTo(cx+Math.cos(a-i*.02)*r,cy+Math.sin(a-i*.02)*r); hud.stroke(); }
    const bx=cx-120-k*30, by=cy-150; const vivo=k<2.0; if(vivo){ const d=((a-Math.atan2(by-cy,bx-cx))%(Math.PI*2)+Math.PI*2)%(Math.PI*2); hud.fillStyle=`rgba(120,255,170,${.35+.65*Math.max(0,1-d/3)})`; hud.beginPath(); hud.arc(bx,by,14,0,7); hud.fill(); hud.font=M(800,30); hud.fillText('739',bx+24,by-14); }
    else { hud.strokeStyle=`rgba(255,60,60,${.6+.4*Math.sin(t*12)})`; hud.lineWidth=4; hud.beginPath(); hud.arc(bx,by,30,0,7); hud.stroke(); }
    if(!vivo){ hud.fillStyle=(t*2)%1<.55?'#ff3a3a':'#a01818'; hud.font='110px Anton'; hud.textAlign='center'; hud.fillText('SIN RESPUESTA',cx,cy+r+150); }
    hud.fillStyle='rgba(120,255,170,.9)'; hud.font=M(800,30); hud.textAlign='left'; hud.fillText('CONTROL · 16-03-1962',90,250); hud.restore(); }
  function lista(k){ hud.save(); const items=['RESTOS','MANCHAS DE ACEITE','CHALECOS SALVAVIDAS']; items.forEach((s,i)=>{ const a=eout(k01(k,.4+i*1.15,.7+i*1.15)); if(a<=0) return; const y=560+i*170;
      hud.globalAlpha=a; hud.fillStyle='rgba(8,14,22,.82)'; hud.fillRect(140-(1-a)*200,y,800,130); hud.fillStyle='#fff'; hud.font=M(800,50); hud.fillText(s,180-(1-a)*200,y+84);
      hud.strokeStyle='#ff3a3a'; hud.lineWidth=14; hud.lineCap='round'; const x=870,yy=y+65,q=eout(k01(k,.75+i*1.15,1+i*1.15)); if(q>0){ hud.beginPath(); hud.moveTo(x-30,yy-30); hud.lineTo(x-30+60*q,yy-30+60*q); hud.stroke(); hud.beginPath(); hud.moveTo(x+30,yy-30); hud.lineTo(x+30-60*q,yy-30+60*q); hud.stroke(); } }); hud.restore(); }
  // ---- cámara ----
  const mira=(p,o)=>{ cam.position.copy(p); cam.lookAt(o); };
  function vuelo(t,alt=30){ const x=-t*9; mar.position.x=Math.round(x/15.5556)*15.5556; av.position.set(x,alt+Math.sin(t*.7)*.4,0); av.rotation.set(0,-Math.PI/2,Math.sin(t*.5)*.06); luz.position.set(x-80,120,60); luz.target.position.copy(av.position); lunaS.position.set(x-300,260,-500); estrellas.position.x=x; return av.position; }
  function reset(){ mar.position.x=0; cam.fov=40; cam.updateProjectionMatrix(); noche(); isla.visible=false; petrolero.visible=false; busca.forEach(b=>b.visible=false); avs.forEach(a=>a.visible=false); conos.forEach(c=>c.visible=false); flash.visible=false; flashL.intensity=0; av.visible=true; scene.fog.near=60; scene.fog.far=420; }
  return [
   // 0 — gancho: avión de noche sobre el Pacífico
   (k,t)=>{ reset(); olas(t); parpadeo(t); const p=vuelo(t); const a=k*.12; mira(V(p.x+Math.cos(a+.6)*lerp(30,22,k/8),p.y+4+k*.3,p.z+Math.sin(a+.6)*lerp(30,22,k/8)),p); marco(t,['ALT  18.000 ft','RUMBO  OESTE']); },
   // 1 — 16 de marzo de 1962
   (k,t)=>{ reset(); olas(t); parpadeo(t); const p=vuelo(t); mira(V(p.x-26,p.y-3,p.z+8),V(p.x,p.y+1,p.z)); marco(t); },
   // 2 — despega de Guam rumbo a Filipinas
   (k,t)=>{ reset(); mar.position.x=0; olas(t,.6); parpadeo(t); isla.visible=true; const a=eio(k01(k,0,3.6)), z=lerp(18,-30,a), y=2.6+Math.max(0,(a-.55))*20;
        av.position.set(0,y,z); av.rotation.set(Math.max(0,a-.5)*.25,0,0); luz.position.set(-80,120,60); luz.target.position.copy(av.position); lunaS.position.set(-300,260,-500); estrellas.position.x=0;
        if(k<3.8) mira(V(16,6,z+24),V(0,y,z-4)); else { mira(V(30,40,30),V(0,8,-20)); mapa(eio(k01(k,4,8))); } marco(t,['GUAM','93 SOLDADOS']); },
   // 3 — reporte normal
   (k,t)=>{ reset(); olas(t); parpadeo(t); const p=vuelo(t+10); mira(V(p.x+4,p.y+2,p.z+17),V(p.x-2,p.y,p.z)); marco(t,['RADIO: POSICIÓN','NORMAL ✓']);
        hud.save(); hud.strokeStyle='#7cffb0'; hud.lineWidth=5; hud.beginPath(); for(let i=0;i<=60;i++){ const x=140+i*13, y=1200+Math.sin(i*.9+t*20)*40*Math.sin(i/60*Math.PI)*(.4+.6*Math.abs(Math.sin(t*6))); i?hud.lineTo(x,y):hud.moveTo(x,y); } hud.stroke(); hud.restore(); },
   // 4 — el radar lo pierde
   (k,t)=>{ reset(); radar(k,t); },
   // 5 — un petrolero ve un destello
   (k,t)=>{ reset(); av.visible=false; olas(t); petrolero.visible=true; petrolero.position.set(0,0,0); petrolero.rotation.set(Math.sin(t)*.02,.3,Math.sin(t*.8)*.03);
        const f=k01(k,1.6,1.75)*(1-k01(k,1.75,3.6)); flash.visible=true; flash.position.set(-60,70,-160); flash.scale.setScalar(20+f*160); flash.material.opacity=f; flashL.position.copy(flash.position); flashL.intensity=f*900; R.toneMappingExposure=1.1+f*.8;
        mira(V(9,8,34),V(-12,lerp(2,12,eio(k01(k,0,1.6))),-60)); },
   // 6 — la gran búsqueda (de día)
   (k,t)=>{ reset(); dia(); av.visible=false; olas(t); busca.forEach((b,i)=>{ b.visible=true; b.position.set(-24+i*16,0,-50+i*22-k*3); b.rotation.y=.2*i; });
        avs.forEach((a,i)=>{ a.visible=true; const an=t*.4+i*2.1; a.position.set(Math.cos(an)*28,26+i*4,Math.sin(an)*28-10); a.rotation.set(0,-an,.35); });
        const a=eio(k01(k,0,3.8)); mira(V(lerp(10,40,a),lerp(70,50,a),lerp(90,110,a)),V(0,4,-10)); },
   // 7 — no apareció nada
   (k,t)=>{ reset(); dia(); av.visible=false; olas(t,1.2); mira(V(-k*3,6,20),V(-k*3-10,2,-40)); lista(k); },
   // 8 — ¿explotó? sigue sin respuesta
   (k,t)=>{ reset(); olas(t); parpadeo(t); const p=vuelo(t,52); scene.fog.near=lerp(60,6,eio(k01(k,1.5,6))); scene.fog.far=lerp(420,40,eio(k01(k,1.5,6)));
        mira(V(p.x+lerp(22,36,eio(k01(k,0,8))),p.y-lerp(1,8,eio(k01(k,0,8))),p.z+lerp(6,14,k01(k,0,8))),p); marco(t,['VUELO 739','SIN RESTOS']); }
  ];
 }});
