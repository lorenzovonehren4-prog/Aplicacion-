'use strict';
// Posprocesado propio (sin EffectComposer): la escena se dibuja en HDR a una textura,
// se extraen las luces fuertes, se desenfocan en tres tamaños (bloom) y se juntan con
// tone mapping ACES, un leve ajuste de color y viñeta.

const POST = { on: false, rt: null, levels: [], quad: null, qscene: null, qcam: null, mats: {}, bloom: 0.55, threshold: 0.9 };

const POST_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function initPost() {
  POST.on = save.opt.quality === 'alta' && W.renderer.capabilities.isWebGL2;
  if (!POST.on) return;
  POST.qscene = new THREE.Scene();
  POST.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  POST.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  POST.quad.frustumCulled = false;
  POST.qscene.add(POST.quad);
  const sm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
  POST.mats.bright = sm(`
    uniform sampler2D tSrc; uniform float threshold; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float w = smoothstep(threshold, threshold * 1.8, l);
      gl_FragColor = vec4(min(c * w, vec3(30.0)), 1.0);
    }`, { tSrc: { value: null }, threshold: { value: POST.threshold } });
  POST.mats.blur = sm(`
    uniform sampler2D tSrc; uniform vec2 dir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270;
      c += texture2D(tSrc, vUv + dir * 1.3846153).rgb * 0.3162162;
      c += texture2D(tSrc, vUv - dir * 1.3846153).rgb * 0.3162162;
      c += texture2D(tSrc, vUv + dir * 3.2307692).rgb * 0.0702702;
      c += texture2D(tSrc, vUv - dir * 3.2307692).rgb * 0.0702702;
      gl_FragColor = vec4(c, 1.0);
    }`, { tSrc: { value: null }, dir: { value: new THREE.Vector2() } });
  POST.mats.copy = sm(`uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }`, { tSrc: { value: null } });
  POST.mats.final = sm(`
    uniform sampler2D tScene; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3;
    uniform float bloom; uniform float exposure; uniform float vignette; uniform float sat; uniform vec3 tint;
    varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 color){
      const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= exposure / 0.6; color = IN * color; color = RRTAndODTFit(color); color = OUT * color; return clamp(color, 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c){ return mix(pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb;
      vec3 b = texture2D(tB1, vUv).rgb * 0.6 + texture2D(tB2, vUv).rgb * 0.8 + texture2D(tB3, vUv).rgb * 1.0;
      c += b * bloom;
      c = aces(c * tint);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat);
      vec2 d = vUv - 0.5; c *= 1.0 - vignette * smoothstep(0.35, 0.85, length(d * vec2(1.15, 1.0)));
      gl_FragColor = vec4(toSRGB(c), 1.0);
    }`, {
    tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
    bloom: { value: POST.bloom }, exposure: { value: 1 }, vignette: { value: 0.28 }, sat: { value: 1.08 }, tint: { value: new THREE.Vector3(1, 1, 1) },
  });
  resizePost();
}

function resizePost() {
  if (!POST.on) return;
  const r = W.renderer, pr = r.getPixelRatio();
  const w = Math.max(2, Math.floor(window.innerWidth * pr)), h = Math.max(2, Math.floor(window.innerHeight * pr));
  if (POST.rt) { POST.rt.dispose(); POST.levels.forEach(l => { l.a.dispose(); l.b.dispose(); }); }
  POST.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  POST.levels = [2, 4, 8].map(div => {
    const lw = Math.max(1, Math.floor(w / div)), lh = Math.max(1, Math.floor(h / div));
    const o = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    return { a: new THREE.WebGLRenderTarget(lw, lh, o), b: new THREE.WebGLRenderTarget(lw, lh, o), w: lw, h: lh };
  });
}

function postPass(mat, target) {
  POST.quad.material = mat;
  W.renderer.setRenderTarget(target);
  W.renderer.render(POST.qscene, POST.qcam);
}

// Ajustes por ambiente: cuánto bloom, tinte y saturación
function setPostLook(look) {
  if (!POST.on) return;
  const f = POST.mats.final.uniforms, L = Object.assign({ bloom: 0.55, threshold: 0.9, vignette: 0.28, sat: 1.08, tint: [1, 1, 1] }, look || {});
  f.bloom.value = L.bloom; f.vignette.value = L.vignette; f.sat.value = L.sat; f.tint.value.set(...L.tint);
  POST.mats.bright.uniforms.threshold.value = L.threshold;
}

function renderFrame(scene, camera) {
  const r = W.renderer;
  if (!POST.on) { r.render(scene, camera); return; }
  r.setRenderTarget(POST.rt);
  r.render(scene, camera);
  // luces fuertes al primer nivel y desenfoque en cascada
  POST.mats.bright.uniforms.tSrc.value = POST.rt.texture;
  postPass(POST.mats.bright, POST.levels[0].a);
  POST.levels.forEach((L, k) => {
    if (k > 0) { POST.mats.copy.uniforms.tSrc.value = POST.levels[k - 1].a.texture; postPass(POST.mats.copy, L.a); }
    const bl = POST.mats.blur.uniforms;
    bl.tSrc.value = L.a.texture; bl.dir.value.set(1 / L.w, 0); postPass(POST.mats.blur, L.b);
    bl.tSrc.value = L.b.texture; bl.dir.value.set(0, 1 / L.h); postPass(POST.mats.blur, L.a);
  });
  const f = POST.mats.final.uniforms;
  f.tScene.value = POST.rt.texture; f.tB1.value = POST.levels[0].a.texture; f.tB2.value = POST.levels[1].a.texture; f.tB3.value = POST.levels[2].a.texture;
  f.exposure.value = r.toneMappingExposure;
  postPass(POST.mats.final, null);
}
