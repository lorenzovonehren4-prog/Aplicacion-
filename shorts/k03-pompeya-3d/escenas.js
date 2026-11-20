// Pompeya — estilo «ciudad low-poly» (prueba 3D)
const {clamp,lerp,k01,eio,eout,rnd,cartel}=TRES;
TRES.run({ hot:/^(pompeya|formas|personas|dos|mil|79|vesubio|erupción|ceniza|olvidó|siglos|xix|arqueólogos|huecos|cuerpos|1863|giuseppe|fiorelli|yeso|animales|fotografía|dimensiones|romano)$/i,
 titles:[[0.1,4.2,'¿SABÍAS QUE...?<small>LAS FORMAS DE POMPEYA</small>',150]],
 bigs:[[4.7,7.7,'AÑO 79',250],[10.5,12.3,'SIGLOS',250],[12.7,16.9,'SIGLO XIX',250],[19.8,24.3,'1863<small>GIUSEPPE FIORELLI</small>',250]],
 temblor:t=>t>4.5&&t<8?1.2*Math.exp(-(t-4.6)*1.2):0,
 setup({THREE,scene,cam,R}){
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.95,flatShading:true,...o});
  const cielo=new THREE.Color('#9fc8e4'); scene.background=cielo.clone(); scene.fog=new THREE.Fog('#c8dcea',120,520);
  const hemi=new THREE.HemisphereLight('#fff4e4','#7a8a6a',1.1); scene.add(hemi);
  const sol=new THREE.DirectionalLight('#ffe6c4',2.6); sol.position.set(60,90,50); sol.castShadow=true; sol.shadow.mapSize.set(2048,2048); Object.assign(sol.shadow.camera,{left:-70,right:70,top:70,bottom:-70,far:300}); sol.shadow.bias=-.0006; scene.add(sol); scene.add(sol.target);
  // ---- suelo y volcán ----
  const suelo=new THREE.Mesh(new THREE.CircleGeometry(600,40),M('#8fae62')); suelo.rotation.x=-Math.PI/2; suelo.receiveShadow=true; scene.add(suelo);
  const mar=new THREE.Mesh(new THREE.CircleGeometry(600,40,Math.PI*1.1,Math.PI*.8),M('#3d86b0',{roughness:.5})); mar.rotation.x=-Math.PI/2; mar.position.set(0,.05,160); scene.add(mar);
  const vg=new THREE.CylinderGeometry(14,110,70,16,4,true); { const p=vg.attributes.position; for(let i=0;i<p.count;i++){ const y=p.getY(i); if(y<34&&y>-34){ p.setX(i,p.getX(i)*(1+(rnd(i)-.5)*.12)); p.setZ(i,p.getZ(i)*(1+(rnd(i*3)-.5)*.12)); p.setY(i,y+(rnd(i*5)-.5)*4); } } vg.computeVertexNormals(); }
  const volcan=new THREE.Mesh(vg,M('#6a5a48')); volcan.position.set(-40,35,-190); volcan.castShadow=true; scene.add(volcan);
  const verde=new THREE.Mesh(new THREE.CylinderGeometry(70,112,26,16,1,true),M('#5f7e44')); verde.position.set(-40,13,-190); scene.add(verde);
  const lava=new THREE.Mesh(new THREE.CircleGeometry(13,16),new THREE.MeshBasicMaterial({color:'#ff6a1a'})); lava.rotation.x=-Math.PI/2; lava.position.set(-40,69.5,-190); scene.add(lava);
  // ---- ciudad ----
  const ciudad=new THREE.Group(); scene.add(ciudad);
  const muros=['#e9d8b4','#e2c48e','#d9a878','#efe3c8','#c98f6a'], tejas=['#b5502e','#a8442a','#c2603a'];
  for(let gx=-5;gx<=5;gx++) for(let gz=-5;gz<=5;gz++){ if(Math.abs(gx)<=1&&Math.abs(gz)<=1) continue; if(gx*gx+gz*gz>30) continue;
    for(let q=0;q<4;q++){ const id=(gx+9)*31+(gz+9)*7+q, w=3+rnd(id)*2.2, d=3+rnd(id*2)*2.2, h=2.2+rnd(id*3)*2.5, x=gx*12+(q%2?3.2:-3.2), z=gz*12+(q>1?3.2:-3.2);
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(muros[id%5])); b.position.set(x,h/2,z); b.castShadow=b.receiveShadow=true; ciudad.add(b);
      const r=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.75,1.4,4),M(tejas[id%3])); r.rotation.y=Math.PI/4; r.scale.set(w/Math.max(w,d),1,d/Math.max(w,d)); r.position.set(x,h+.7,z); r.castShadow=true; ciudad.add(r); } }
  // foro y templo
  const foro=new THREE.Mesh(new THREE.BoxGeometry(30,.3,22),M('#e8e0cc')); foro.position.y=.15; foro.receiveShadow=true; ciudad.add(foro);
  const templo=new THREE.Group(); ciudad.add(templo); { const p=new THREE.Mesh(new THREE.BoxGeometry(10,1.6,14),M('#efe8d8')); p.position.y=.8; templo.add(p);
    for(let i=0;i<6;i++) for(const s of [-1,1]){ const c=new THREE.Mesh(new THREE.CylinderGeometry(.42,.48,6,8),M('#f4efe4')); c.position.set(-4+i*1.6,4.6,s*6); c.castShadow=true; templo.add(c); }
    const te=new THREE.Mesh(new THREE.ConeGeometry(8.5,2.6,4),M('#efe8d8')); te.rotation.y=Math.PI/4; te.scale.set(.75,1,1.1); te.position.y=8.9; templo.add(te); const ar=new THREE.Mesh(new THREE.BoxGeometry(10.4,.8,14.4),M('#e4dccb')); ar.position.y=7.8; templo.add(ar); }
  templo.position.set(0,0,-4); templo.children.forEach(c=>c.castShadow=true);
  for(let i=0;i<14;i++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,3.6,8),M('#f4efe4')); c.position.set(-13+i*2,1.8,9); c.castShadow=true; ciudad.add(c); }
  const anfi=new THREE.Mesh(new THREE.TorusGeometry(14,3.2,4,24),M('#d9b98a')); anfi.rotation.x=-Math.PI/2; anfi.scale.set(1.3,1,1); anfi.position.set(62,1,30); anfi.castShadow=true; ciudad.add(anfi);
  // árboles
  const arboles=[]; for(let i=0;i<70;i++){ const a=rnd(i*3)*Math.PI*2, r=75+rnd(i*7)*90, g=new THREE.Group(); const tr=new THREE.Mesh(new THREE.CylinderGeometry(.3,.4,2,5),M('#6a4a2a')); tr.position.y=1;
    const co=new THREE.Mesh(new THREE.IcosahedronGeometry(1.8+rnd(i)*1.2,0),M(i%3?'#5a8a3a':'#4a7a32')); co.position.y=3; co.castShadow=true; g.add(tr,co); g.position.set(Math.cos(a)*r,0,Math.sin(a)*r*.7); scene.add(g); arboles.push(g); }
  // ---- erupción ----
  const humo=new THREE.Group(); scene.add(humo); const hm=M('#4a4440'), hm2=M('#7a706a');
  const bolas=[...Array(60)].map((_,i)=>{ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),i%3?hm:hm2); m.castShadow=false; humo.add(m); return m; });
  function erupcion(e,t){ humo.visible=e>0; bolas.forEach((b,i)=>{ const f=((i/60)+t*.08)%1, h=e*f; const y=70+h*220, r=8+h*55+Math.pow(h,3)*90; const a=i*2.4+t*.2;
      b.position.set(-40+Math.cos(a)*r*.35*(h>.6?1.6:1),y,-190+Math.sin(a)*r*.35); b.scale.setScalar(6+h*26+(i%5)*2); b.visible=e>0&&f<e+.02; }); lava.material.color.set(e>0?'#ff7a20':'#6a5a48'); }
  const ceniza=(()=>{ const g=new THREE.BufferGeometry(), p=new Float32Array(3000*3); g.setAttribute('position',new THREE.BufferAttribute(p,3)); return new THREE.Points(g,new THREE.PointsMaterial({color:'#5a5450',size:.5,transparent:true,opacity:.8})); })(); scene.add(ceniza);
  function caer(t,on){ ceniza.visible=on; if(!on) return; const p=ceniza.geometry.attributes.position.array; for(let i=0;i<3000;i++){ p[i*3]=(rnd(i)-.5)*160; p[i*3+1]=((rnd(i*3)*80-t*12)%80+80)%80; p[i*3+2]=(rnd(i*7)-.5)*160; } ceniza.geometry.attributes.position.needsUpdate=true; }
  const manto=new THREE.Mesh(new THREE.BoxGeometry(170,1,170,1,1,1),M('#8e8680')); manto.receiveShadow=true; scene.add(manto);
  const pasto=new THREE.Mesh(new THREE.BoxGeometry(171,.4,171),M('#86a85a')); scene.add(pasto);
  // ---- excavación (plató aparte para los primeros planos) ----
  const X0=V(400,0,0); const exc=new THREE.Group(); exc.position.copy(X0); scene.add(exc);
  const huecosTex=(()=>{ const cv=document.createElement('canvas'); cv.width=cv.height=1024; const g=cv.getContext('2d'); g.fillStyle='#9a928a'; g.fillRect(0,0,1024,1024);
    for(let i=0;i<4000;i++){ g.fillStyle=`rgba(${rnd(i)>.5?40:200},${rnd(i)>.5?36:190},${rnd(i)>.5?30:180},.08)`; g.fillRect(rnd(i*3)*1024,rnd(i*5)*1024,3+rnd(i)*6,3+rnd(i)*6); }
    g.fillStyle='#1e1a17'; const fig=(x,y,r,s)=>{ g.save(); g.translate(x,y); g.rotate(r); g.scale(s,s); g.beginPath(); g.arc(0,-120,34,0,7); g.fill(); g.beginPath(); g.ellipse(0,-20,44,80,0,0,7); g.fill(); g.lineCap='round'; g.lineWidth=30; g.strokeStyle='#1e1a17';
      g.beginPath(); g.moveTo(-30,-60); g.quadraticCurveTo(-90,-40,-70,-110); g.moveTo(30,-60); g.quadraticCurveTo(80,-20,40,-120); g.moveTo(-18,50); g.quadraticCurveTo(-40,130,10,170); g.moveTo(18,50); g.quadraticCurveTo(70,110,40,180); g.stroke(); g.restore(); };
    fig(330,420,.5,1.2); fig(690,560,-.8,1.1); fig(470,760,1.9,.9);
    const t=new THREE.CanvasTexture(cv); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t; })();
  const fosoSuelo=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({map:huecosTex,roughness:1})); fosoSuelo.rotation.x=-Math.PI/2; fosoSuelo.position.y=.06; fosoSuelo.receiveShadow=true; exc.add(fosoSuelo);
  for(const [x,z,w,d] of [[0,-17,36,4],[0,17,36,4],[-17,0,4,30],[17,0,4,30]]){ const m=new THREE.Mesh(new THREE.BoxGeometry(w,5,d),M('#7e766e')); m.position.set(x,2.5,z); m.castShadow=m.receiveShadow=true; exc.add(m); }
  // figuras: arqueólogos (peones low-poly) y moldes de yeso
  function peon(col,o={}){ const g=new THREE.Group(); const cu=new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,1.8,7),M(col)); cu.position.y=.9; const ca=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),M('#e0b090')); ca.position.y=2.15;
    const so=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.1,8),M(o.som||'#3a2a1a')); so.position.y=2.5; const so2=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.4,8),so.material); so2.position.y=2.7; g.add(cu,ca,so,so2);
    if(o.pala){ const p=new THREE.Group(); const mg=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.2,5),M('#7a5a3a')); mg.position.y=1.1; const hj=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.06),M('#8a8a8a',{metalness:.5})); hj.position.y=-.1; p.add(mg,hj); p.position.set(.6,1,0); g.add(p); g.userData.pala=p; }
    if(o.cubo){ const c=new THREE.Mesh(new THREE.CylinderGeometry(.35,.28,.5,8),M('#d8d8d8')); c.position.set(.55,1.6,.3); g.add(c); g.userData.cubo=c; }
    g.traverse(m=>m.castShadow=true); exc.add(g); return g; }
  const arq=[peon('#3a4a6a',{pala:true}),peon('#6a4a3a',{pala:true}),peon('#4a5a3a',{pala:true})];
  arq[0].position.set(-1,0,4); arq[1].position.set(4,0,-4); arq[2].position.set(-7,0,-1);
  const fiorelli=peon('#2a2a3a',{cubo:true,som:'#1a1a1a'}); fiorelli.position.set(-1,0,-1.5);
  const chorro=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,1.6,6),M('#ffffff',{emissive:'#ffffff',emissiveIntensity:.3})); exc.add(chorro);
  const yeso=M('#f2efe8',{roughness:.8});
  function molde(){ const g=new THREE.Group(); const cap=(r,l,x,y,z,rx,rz)=>{ const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,l,3,7),yeso); m.position.set(x,y,z); m.rotation.set(rx,0,rz); m.castShadow=m.receiveShadow=true; g.add(m); };
    cap(.55,1.3,0,.5,0,Math.PI/2,0); const h=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),yeso); h.position.set(0,.55,-1.4); h.castShadow=true; g.add(h);
    cap(.18,1,-.6,.6,-.7,.9,.9); cap(.18,1,.6,.5,-.9,1.3,-.5); cap(.22,1.2,-.3,.35,1.2,1.4,.3); cap(.22,1.2,.35,.35,1.1,1.9,-.4); exc.add(g); return g; }
  const moldes=[molde(),molde(),molde()]; const MP=[[-5.3,-2.7,.5,1.2],[5.2,1.4,-.8,1.1],[-1.2,7.3,1.9,.9]];
  moldes.forEach((m,i)=>{ m.position.set(MP[i][0],0,MP[i][1]); m.rotation.y=-MP[i][2]; m.scale.setScalar(2.4*MP[i][3]); m.userData.s=2.4*MP[i][3]; });
  const etiqueta=cartel('POMPEYA HOY',{size:80,font:'800 80px Montserrat',bg:'rgba(255,255,255,.92)',col:'#2a1a10',stroke:false,alto:5}); etiqueta.position.set(0,24,-4); scene.add(etiqueta);
  // ---- cámara y estados ----
  const mira=(p,o)=>{ cam.position.copy(p); cam.lookAt(o); };
  const orb=(c,r,h,a)=>V(c.x+Math.cos(a)*r,c.y+h,c.z+Math.sin(a)*r);
  const solExc=()=>{ sol.position.set(X0.x+50,90,X0.z+50); sol.target.position.copy(X0); };
  function estado({nivel=-1,verdeK=0,cielo0='#9fc8e4',humoE=0,t=0,ash=false,exc:ex=false}){ hemi.intensity=1.1; sol.position.set(60,90,50); sol.target.position.set(0,0,0); manto.position.y=nivel-.5; manto.visible=nivel>-.9; pasto.visible=verdeK>0; pasto.position.y=nivel+.15; pasto.scale.y=1;
    scene.background.set(cielo0); scene.fog.color.set(cielo0).lerp(new THREE.Color('#ffffff'),.25); erupcion(humoE,t); caer(t,ash); arboles.forEach((a,i)=>a.scale.setScalar(verdeK>0?clamp(verdeK*1.4-i*.008,0.01,1):1)); etiqueta.visible=false; }
  return [
   // 0 — gancho: vuelo sobre la ciudad
   (k,t)=>{ estado({t}); const a=eio(k01(k,0,4.4)); mira(orb(V(0,0,0),lerp(110,60,a),lerp(70,34,a),lerp(.9,1.45,a)),V(0,4,-20)); },
   // 1 — año 79: el Vesubio entra en erupción
   (k,t)=>{ estado({humoE:eout(k01(k,0,3.4)),t,cielo0:'#c8a888'}); hemi.intensity=1; mira(V(20,14,60),V(-30,lerp(40,110,eio(k01(k,0,3.4))),-190)); },
   // 2 — enterrada bajo metros de ceniza
   (k,t)=>{ const e=eio(k01(k,.2,2.4)); estado({humoE:1,t,ash:true,nivel:lerp(-1,7,e),cielo0:'#6a625c'}); hemi.intensity=.7; mira(orb(V(0,0,0),70,30,1.2+k*.06),V(0,3,0)); },
   // 3 — la ciudad se olvidó durante siglos
   (k,t)=>{ const e=k01(k,0,2.1); estado({nivel:7,verdeK:e,t,cielo0:e*4%1<.5?'#9fc8e4':'#a8cce6'}); hemi.intensity=1.1; sol.position.set(Math.cos(k*6)*90,60+Math.sin(k*6)*40,50); mira(orb(V(0,0,0),90,40,1.4+k*.12),V(0,5,0)); },
   // 4 — siglo XIX: los arqueólogos notan huecos
   (k,t)=>{ estado({t}); solExc(); arq.forEach((p,i)=>{ p.userData.pala.rotation.z=-.4+Math.sin(t*5+i)*.5; p.position.y=Math.abs(Math.sin(t*5+i))*.08; p.lookAt(X0.x,0,X0.z); });
        moldes.forEach(m=>m.visible=false); fiorelli.visible=false; chorro.visible=false; const a=eio(k01(k,0,4.6)); mira(V(X0.x+lerp(18,12,a),lerp(18,13,a),X0.z+lerp(20,14,a)),V(X0.x,0,X0.z)); },
   // 5 — eran los espacios que dejaron los cuerpos
   (k,t)=>{ estado({t}); solExc(); moldes.forEach(m=>m.visible=false); fiorelli.visible=false; chorro.visible=false; const a=eio(k01(k,0,2.3)); mira(V(X0.x+lerp(-2,0,a),lerp(28,22,a),X0.z+lerp(4,1,a)),V(X0.x,0,X0.z)); },
   // 6 — Fiorelli: rellenarlos con yeso
   (k,t)=>{ estado({t}); solExc(); moldes.forEach(m=>m.visible=false); fiorelli.visible=true; const tilt=eio(k01(k,.6,1.4)); fiorelli.userData.cubo.rotation.z=tilt*1.9; fiorelli.lookAt(X0.x-5.3,0,X0.z-2.7);
        chorro.visible=tilt>.9; chorro.position.set(-1.6,.9,-1.8); const a=k01(k,0,4.9); mira(orb(X0,17,10,.5+a*.6),V(X0.x-3,.8,X0.z-2)); },
   // 7 — aparecen las formas
   (k,t)=>{ estado({t}); solExc(); fiorelli.visible=false; chorro.visible=false; moldes.forEach((m,i)=>{ const s=eout(k01(k,.2+i*.6,.9+i*.6)); m.visible=s>0; m.scale.setScalar(m.userData.s*Math.max(.01,s)); });
        const a=eio(k01(k,0,3.5)); mira(V(X0.x+lerp(-16,14,a),22,X0.z+lerp(20,22,a)),V(X0.x+lerp(-3,2,a),0,X0.z+lerp(-1,3,a))); },
   // 8 — hoy: una fotografía en 3D del mundo romano
   (k,t)=>{ estado({t}); etiqueta.visible=k>.5; mira(orb(V(0,0,0),lerp(45,85,eio(k01(k,0,4))),lerp(22,48,eio(k01(k,0,4))),2.2+k*.25),V(0,4,-4)); }
  ];
 }});
