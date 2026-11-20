// Motor 3D de los shorts (estilos «mapa de papel», «repetición de accidente», «ciudad low-poly»).
// Uso: escena.html carga three.min.js, este archivo y escenas.js, que llama TRES.run({...}).
// Una escena por frase de timeline.json: cada una es fn(k, t, seg) con k = segundos desde que empezó la toma.
(function(){
const W=1080,H=1920;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,k)=>a+(b-a)*k, k01=(t,a,b)=>clamp((t-a)/(b-a),0,1);
const eio=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2, eout=k=>1-Math.pow(1-k,3);
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const css=`@font-face{font-family:Anton;src:url(../motor/fuentes/anton-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:Montserrat;font-weight:600;src:url(../motor/fuentes/montserrat-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:Montserrat;font-weight:800;src:url(../motor/fuentes/montserrat-latin-800-normal.woff2) format('woff2')}
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}
#gl{position:absolute;left:0;top:0;width:${W}px;height:${H}px}
.ov{position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none}
#vig{background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 45%,rgba(0,0,0,.42) 100%)}
#grain{opacity:.06;mix-blend-mode:overlay}
#flash{background:#fff;opacity:0}#dark{background:#000;opacity:0}
.tx{position:absolute;left:0;width:${W}px;text-align:center;color:#fff;display:none;transform-origin:50% 50%}
#title{top:250px;padding:0 70px;box-sizing:border-box;font-family:Anton,sans-serif;letter-spacing:3px;-webkit-text-stroke:14px #000;paint-order:stroke fill;text-shadow:0 10px 0 #000,0 0 40px rgba(0,0,0,.6);line-height:1.02}
#title small{display:block;font-family:Montserrat,sans-serif;font-weight:800;font-size:46px;letter-spacing:4px;-webkit-text-stroke:10px #000;margin-top:20px}
#big{top:240px;font-family:Anton,sans-serif;font-size:170px;letter-spacing:3px;-webkit-text-stroke:14px #000;paint-order:stroke fill;text-shadow:0 10px 0 #000}
#big small{display:block;font-family:Montserrat,sans-serif;font-weight:800;font-size:44px;letter-spacing:3px;-webkit-text-stroke:9px #000}
#cap{top:1480px;padding:0 110px;box-sizing:border-box;font-family:Montserrat,sans-serif;font-weight:600;font-size:62px;-webkit-text-stroke:11px #000;paint-order:stroke fill;text-shadow:0 6px 0 #000,0 0 26px rgba(0,0,0,.7);line-height:1.16}
#cap b,#cap .on{font-weight:800}#cap .on{color:#ffd23a;display:inline-block;transform:scale(1.06)}
#tag{position:absolute;right:34px;top:44px;font-family:Montserrat,sans-serif;font-weight:800;font-size:22px;letter-spacing:3px;color:rgba(255,255,255,.75);text-shadow:0 2px 6px #000}
#hud{position:absolute;left:0;top:0;width:${W}px;height:${H}px}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
document.body.innerHTML=`<canvas id="gl" width="${W}" height="${H}"></canvas><canvas id="hud" class="ov" width="${W}" height="${H}"></canvas>
<div id="vig" class="ov"></div><canvas id="grain" class="ov" width="540" height="960"></canvas><div id="flash" class="ov"></div>
<div id="title" class="tx"></div><div id="big" class="tx"></div><div id="cap" class="tx"></div><div id="tag">RECREACIÓN ANIMADA</div><div id="dark" class="ov"></div>`;
const $=id=>document.getElementById(id);
{ const g=$('grain').getContext('2d'), im=g.createImageData(540,960); for(let i=0;i<im.data.length;i+=4){ const v=128+(Math.random()-.5)*110; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; } g.putImageData(im,0,0); }

function capChunks(text){ const words=text.replace(/\.\.\./g,'…').split(/\s+/), out=[]; let cur=[];
  for(const w of words){ cur.push(w); const len=cur.join(' ').length; if(len>=15||/[.,?:…!»;]$/.test(w)||cur.length>=3){ out.push(cur.join(' ')); cur=[]; } } if(cur.length) out.push(cur.join(' ')); return out; }
const pop=(el,t,t0,from=1.4,d=.12)=>{ const k=clamp((t-t0)/d,0,1); el.style.transform=`scale(${lerp(from,1,eout(k))})`; el.style.opacity=clamp(k*3,0,1); };

// texturas de texto para letreros dentro de la escena 3D
function texto(s,o={}){ const cv=document.createElement('canvas'), g=cv.getContext('2d'), fs=o.size||90, font=o.font||`${fs}px Anton`;
  g.font=font; const w=Math.ceil(g.measureText(s).width)+fs*.9, h=Math.ceil(fs*1.5); cv.width=w; cv.height=h;
  if(o.bg){ g.fillStyle=o.bg; g.beginPath(); g.roundRect(4,4,w-8,h-8,fs*.2); g.fill(); if(o.borde){ g.lineWidth=6; g.strokeStyle=o.borde; g.stroke(); } }
  g.font=font; g.textAlign='center'; g.textBaseline='middle'; if(o.stroke!==false){ g.lineJoin='round'; g.lineWidth=fs*.16; g.strokeStyle=o.sc||'#000'; g.strokeText(s,w/2,h/2+fs*.04); }
  g.fillStyle=o.col||'#fff'; g.fillText(s,w/2,h/2+fs*.04); const tx=new THREE.CanvasTexture(cv); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4; return {tx,w,h}; }
function cartel(s,o={}){ const {tx,w,h}=texto(s,o), sc=(o.alto||1)/h; const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:o.depth??false})); sp.scale.set(w*sc,h*sc,1); sp.renderOrder=10; return sp; }

const TRES={ clamp,lerp,k01,eio,eout,rnd,texto,cartel,
run(cfg){
  const TL=window.__TL__, segs=TL.segs, HOT=cfg.hot||/^$/;
  segs.forEach((s,i)=>{ s.ini=i?segs[i-1].start+segs[i-1].dur+ (s.start-(segs[i-1].start+segs[i-1].dur))*.5:0; });
  segs.forEach(s=>{ const ch=capChunks(s.t), tot=ch.reduce((a,x)=>a+x.length+2,0); let a=0; s.caps=ch.map(x=>{ const o={t0:s.start+s.dur*a/tot,txt:x}; a+=x.length+2; o.t1=s.start+s.dur*a/tot; return o; }); s.caps[s.caps.length-1].t1=s.start+s.dur+.12; });
  const hl=(txt,on)=>txt.split(' ').map((w,i)=>{ const hot=HOT.test(w.replace(/[^\p{L}\p{N}.%]/gu,'').replace(/\.$/,'')); return i===on?`<span class="on">${w}</span>`:hot?`<b>${w}</b>`:w; }).join(' ');
  const R=new THREE.WebGLRenderer({canvas:$('gl'),antialias:true,preserveDrawingBuffer:true});
  R.setPixelRatio(1); R.setSize(W,H,false); R.outputColorSpace=THREE.SRGBColorSpace; R.toneMapping=THREE.ACESFilmicToneMapping; R.toneMappingExposure=cfg.exposicion||1.05;
  R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(cfg.fov||40,W/H,.1,4000);
  const hud=$('hud').getContext('2d');
  const ctx={THREE,R,scene,cam,hud,W,H,TL,segs};
  let tomas=null;
  window.__CORTES=segs.slice(1).map(s=>s.ini);
  window.setT=function(t){
    let i=0; for(let j=0;j<segs.length;j++) if(t>=segs[j].ini) i=j; const s=segs[i];
    hud.setTransform(1,0,0,1,0,0); hud.clearRect(0,0,W,H);
    const sh=cfg.temblor?cfg.temblor(t):0;
    tomas[i](t-s.ini,t,s);
    if(sh){ cam.position.x+=(rnd(Math.floor(t*30))-.5)*sh; cam.position.y+=(rnd(Math.floor(t*30)+7)-.5)*sh; }
    R.render(scene,cam);
    const near=t-s.ini; $('flash').style.opacity=(i>0&&near<.2?(1-near/.2)*.35:0).toFixed(3);
    $('dark').style.opacity=(t>TL.total-.6)?k01(t,TL.total-.6,TL.total).toFixed(3):(t<.15?(1-t/.15).toFixed(3):0);
    $('grain').style.transform=`translate(${(Math.floor(t*12)%3)*-4}px,${(Math.floor(t*12)%2)*-4}px) scale(2.02)`; $('grain').style.transformOrigin='0 0';
    const ti=$('title'); let tOn=null; for(const x of (cfg.titles||[])) if(t>=x[0]&&t<x[1]) tOn=x;
    if(tOn){ ti.style.display='block'; ti.innerHTML=tOn[2]; ti.style.fontSize=(tOn[3]||150)+'px'; pop(ti,t,tOn[0],2,.18); } else ti.style.display='none';
    const bg=$('big'); let bOn=null; for(const x of (cfg.bigs||[])) if(t>=x[0]&&t<x[1]) bOn=x;
    if(bOn){ bg.style.display='block'; bg.innerHTML=typeof bOn[2]==='function'?bOn[2](t):bOn[2]; bg.style.top=(bOn[3]||240)+'px'; pop(bg,t,bOn[0],1.7,.14); } else bg.style.display='none';
    const cp=$('cap'); let cc=null; for(const q of s.caps.concat(segs[i-1]?segs[i-1].caps:[])) if(t>=q.t0&&t<q.t1) cc=q;
    if(cc){ cp.style.display='block'; const ws=cc.txt.split(' '), tot=ws.reduce((a,w)=>a+w.length+1,0); let acc=0,on=0; for(let k=0;k<ws.length;k++){ if(t>=cc.t0+(cc.t1-cc.t0)*acc/tot) on=k; acc+=ws[k].length+1; }
      const key=cc.txt+'|'+on; if(cp.dataset.c!==key){ cp.dataset.c=key; cp.innerHTML=hl(cc.txt,on); } pop(cp,t,cc.t0,1.25,.08); } else cp.style.display='none';
  };
  window.ready=Promise.all([document.fonts.load('80px Anton'),document.fonts.load('600 60px Montserrat'),document.fonts.load('800 60px Montserrat'),document.fonts.load('800 40px Montserrat')]).then(()=>{ tomas=cfg.setup(ctx); });
}};
window.TRES=TRES;
})();
