'use strict';
// Código Rojo: el clima, encima de la hora del día (setTimeOfDay en world.js): despejado,
// nublado, garúa, lluvia, tormenta (con relámpagos y truenos) y neblina.
//  - Cielo y luz: nubes dibujadas en el shader del cielo (W.skyMat, cobertura según el clima),
//    luz, niebla y entorno de reflejos más grises (atmos), sol tapado (sin sombras si casi no
//    hay sol: así la lluvia sale más barata que el día despejado) y color del posprocesado.
//  - Lluvia en la GPU: una sola malla de gotas (cuadros delgados instanciados) en una caja que sigue
//    a la cámara. El shader las hace caer, las inclina con el viento, las estira con la velocidad de
//    la cámara y las apaga con la distancia: la CPU no toca ninguna gota. Salpicaduras en el piso
//    (otra malla, también animada en el shader). Las gotas brillan delante de los faros.
//  - Calle mojada: el asfalto pasa a MeshStandardMaterial con charcos (roughnessMap dibujado en
//    canvas) y se oscurece; veredas, pasto, techos y paredes se oscurecen (wetMat). Reflejos de
//    postes, semáforos, faros, luces traseras y circulinas: cuadros aditivos estirados hacia la
//    cámara (sin luces reales). En Bajos sólo se oscurece la calle.
//  - Agua que levantan las llantas (wetSpray → fxSpray), limpiaparabrisas y gotas en el vidrio de
//    la cabina (makeWipers / updateWipers), y menos agarre (W.gripMul en stepBody y cornerSpeed).
//  - Tormenta: destellos del cielo y de la luz, a veces un rayo visible, y el trueno después.
// Uso: setWeather(id) después de setTimeOfDay (startGame lo hace con cfg.weather); updateWeather(dt)
// corre en cada cuadro desde updateWorld.

// cover: nubes (0-1); gray: cuánto se agrisa la luz; sun: cuánto sol pasa; fog: multiplica la
// distancia de la niebla; wet: calle mojada; rain: lluvia; dark: cuánto oscurece (prende postes,
// ventanas y faros); grip: agarre de las llantas; wind: viento [x, z] en m/s.
const WEATHER = {
  despejado: { name: 'Despejado', icon: '☀️', cover: 0, gray: 0, sun: 1, fog: 1, wet: 0, rain: 0, dark: 0, grip: 1 },
  nublado: { name: 'Nublado', icon: '☁️', cover: 0.68, gray: 0.55, sun: 0.45, fog: 0.8, wet: 0, rain: 0, dark: 0.15, grip: 1 },
  garua: { name: 'Garúa', icon: '🌦️', cover: 0.97, gray: 0.8, sun: 0.22, fog: 0.42, wet: 0.6, rain: 0.4, drizzle: true, dark: 0.4, grip: 0.96, wind: [0.5, 0.2] },
  lluvia: { name: 'Lluvia', icon: '🌧️', cover: 1, gray: 0.9, sun: 0.15, fog: 0.34, wet: 1, rain: 0.8, dark: 0.6, grip: 0.92, wind: [1.4, 0.5] },
  tormenta: { name: 'Tormenta', icon: '⛈️', cover: 1, gray: 1, sun: 0.1, fog: 0.27, wet: 1, rain: 1, dark: 0.85, grip: 0.92, bolts: true, wind: [3.4, 1.2] },
  neblina: { name: 'Neblina', icon: '🌫️', cover: 0.9, gray: 1, sun: 0.26, mist: true, wet: 0.3, rain: 0, dark: 0.6, grip: 1 },
};
const WX_LIST = Object.keys(WEATHER);
const wxOf = id => WEATHER[id] || WEATHER.despejado;
// Colores del cielo cubierto y de la neblina para cada hora (se mezclan con TIMES según gray).
// cLit / cDark: nubes iluminadas y panza oscura (el gris "panza de burro" de Lima).
const WX_SKY = {
  nubes: {
    dia: { top: 0x7f8994, bot: 0xb3bac2, fog: 0xadb5bd, hemiSky: 0xc4ccd6, hemiGround: 0x5c5c55, sun: 0xe4e8ee, cLit: 0xd2d7dd, cDark: 0x6a717a },
    tarde: { top: 0x4c4a58, bot: 0x9e8b88, fog: 0x958482, hemiSky: 0xb6a8a8, hemiGround: 0x4a4448, sun: 0xe8bc98, cLit: 0xc0a49a, cDark: 0x4a4550 },
    noche: { top: 0x07090e, bot: 0x1d1c21, fog: 0x15161b, hemiSky: 0x464c60, hemiGround: 0x141418, sun: 0x8a96b8, cLit: 0x2c2829, cDark: 0x0b0c10 },
  },
  neblina: {
    dia: { top: 0xc4c9ce, bot: 0xd0d4d7, fog: 0xccd0d3, hemiSky: 0xdde2e8, hemiGround: 0x6a6a64, sun: 0xf0f0ea, cLit: 0xd6dadd, cDark: 0xaeb4ba },
    tarde: { top: 0xa49594, bot: 0xbfaaa2, fog: 0xb8a39c, hemiSky: 0xd2c0b8, hemiGround: 0x5a5050, sun: 0xf0c8a8, cLit: 0xc8b2aa, cDark: 0x8f8080 },
    noche: { top: 0x1c2027, bot: 0x363b43, fog: 0x363b43, hemiSky: 0x4f5668, hemiGround: 0x18181c, sun: 0x8a96b8, cLit: 0x3a3e46, cDark: 0x22252b },
  },
};
// Color de las gotas según la hora
const RAIN_COL = { dia: 0xc3ccd6, tarde: 0xcbbdb6, noche: 0x707c8c };

// La hora mezclada con el clima: todo lo que usa setTimeOfDay (y makeEnv).
function atmos(time, wid) {
  const T = TIMES[time] || TIMES.dia, w = wxOf(wid), O = WX_SKY[w.mist ? 'neblina' : 'nubes'][time] || WX_SKY.nubes.dia, k = w.gray;
  const C = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), k), night = time === 'noche';
  return {
    w, k, night,
    skyTop: C(T.skyTop, O.top), skyBot: C(T.skyBot, O.bot), fog: C(T.fog, O.fog), sun: C(T.sun, O.sun),
    hemiSky: C(T.hemiSky, O.hemiSky), hemiGround: C(T.hemiGround, O.hemiGround),
    sunI: T.sunI * w.sun, hemiI: T.hemiI * (1 + (night ? 0.1 : 0.25) * k),
    near: w.mist ? 1 : T.near * w.fog, far: w.mist ? (night ? 62 : 80) : T.far * w.fog,
    exp: T.exp * (night ? 1 : 1 + 0.12 * k),
    win: Math.max(T.win, (night ? 1 : time === 'tarde' ? 0.7 : 0.35) * w.dark), lamps: Math.max(T.lamps, w.dark),
    lights: Math.max(night ? 1 : time === 'tarde' ? 0.4 : 0, w.dark),     // faros de los carros
    cLit: new THREE.Color(O.cLit), cDark: new THREE.Color(O.cDark),
  };
}
// Ajustes del posprocesado: la lluvia es fría y menos saturada, la neblina lechosa y con más brillo.
function weatherLook(time, wid) {
  const L = Object.assign({}, POST_LOOK[time] || POST_LOOK.dia), w = wxOf(wid), k = w.gray;
  const tint = w.mist ? [1.0, 1.0, 1.02] : [0.95, 0.99, 1.06];
  L.sat *= 1 - 0.2 * k;
  L.tint = L.tint.map((v, i) => v + (tint[i] - v) * k * 0.75);
  L.vignette += 0.05 * k;
  if (w.mist) { L.bloom += 0.2; L.threshold *= 0.8; }
  if (w.wet && time !== 'dia') L.bloom *= 1.15;
  return L;
}

// Cambia el clima (vuelve a poner la hora para mezclar los colores).
function setWeather(id) {
  W.weather = WEATHER[id] ? id : 'despejado';
  setTimeOfDay(W.time || 'dia');
}

const WX = {
  cam: new THREE.Vector3(), camPrev: new THREE.Vector3(), camVel: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1),
  inside: 1, next: 9, flashT: 9, thunderIn: -1, thunderD: 0.5, strikes: 0, boltOn: false, uWet: { value: 0 }, wipe: null, wPhase: 0,
};
const REFL_DYN = 160;

// Materiales que se oscurecen con la calle mojada (k: cuánto, con wet = 1).
function wetMat(m, k) {
  (W.wetMats = W.wetMats || []).push({ m, k, base: m.color.clone() });
  return m;
}

// Charcos para el asfalto mojado (canal verde: 1 = charco; rojo: grano para el brillo). La textura
// cubre el ancho de la calle (12 m) y 32 m de largo: más charcos junto a la cuneta.
function puddleTex() {
  const t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    const r = rng(91);
    // (un metro de ancho son 43 px y uno de largo 16 px: las elipses se estiran a lo ancho)
    const blob = (x, y, rx, ry, a) => {
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        g.save(); g.translate(x + ox, y + oy); g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, `rgba(0,255,0,${a})`); gr.addColorStop(0.55, `rgba(0,255,0,${a * 0.8})`); gr.addColorStop(1, 'rgba(0,255,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
      }
    };
    for (let i = 0; i < 46; i++) { const side = r() < 0.5 ? 0 : w; blob(side + (r() - 0.5) * 70, r() * h, 16 + r() * 30, 22 + r() * 46, 0.5 + r() * 0.5); }
    for (let i = 0; i < 22; i++) blob(60 + r() * (w - 120), r() * h, 18 + r() * 50, 8 + r() * 20, 0.35 + r() * 0.5);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${40 + r() * 140 | 0},0,0,1)`; g.fillRect(r() * w, r() * h, 2, 2); }
  }, true);
  t.colorSpace = THREE.NoColorSpace;
  t.repeat.set(1 / 1.5, 1 / 4);                     // uv de la calle: 8 m por unidad
  return t;
}

function initWeather() {
  // ---- gotas ----
  const N = GFX.alta.rain, g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  const r = rng(17), seed = new Float32Array(N * 4);
  for (let i = 0; i < N * 4; i++) seed[i] = r();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  g.instanceCount = 0;
  const U = WX.u = {
    uT: { value: 0 }, uSpeed: { value: 9 }, uLen: { value: 0.022 }, uWidth: { value: 0.011 }, uAlpha: { value: 0.4 }, uPx: { value: 0.0017 },
    uNear: { value: 0.6 }, uIn: { value: 1 }, uHeadOn: { value: 0 }, uBox: { value: new THREE.Vector3(40, 20, 40) }, uCenter: { value: new THREE.Vector3() },
    uCamVel: { value: new THREE.Vector3() }, uHead: { value: new THREE.Vector3() }, uHeadDir: { value: new THREE.Vector3(0, 0, 1) }, uWind: { value: new THREE.Vector2() },
    uCol: { value: new THREE.Color() },
  };
  WX.rain = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    vertexShader: `attribute vec4 aSeed;
      uniform float uT, uSpeed, uLen, uWidth, uAlpha, uPx, uNear, uIn, uHeadOn;
      uniform vec3 uBox, uCenter, uCamVel, uHead, uHeadDir; uniform vec2 uWind;
      varying vec2 vUv; varying float vA; varying float vLit;
      void main() {
        // cada gota cae siempre por la misma línea del mundo y se envuelve en la caja que sigue a la cámara
        vec3 vel = vec3(uWind.x, -uSpeed * (0.75 + 0.5 * aSeed.w), uWind.y);
        vec3 p = aSeed.xyz * uBox + vel * uT;
        p = mod(p - uCenter + 0.5 * uBox, uBox) - 0.5 * uBox + uCenter;
        // la estela va hacia atrás según la velocidad relativa a la cámara (a toda velocidad, rayas largas)
        vec3 rel = vel - uCamVel;
        vec3 tail = p - rel * min(uLen, 2.5 / max(length(rel), 0.001));
        vec4 a = viewMatrix * vec4(p, 1.0), b = viewMatrix * vec4(tail, 1.0);
        float d = length(a.xyz);
        // nunca más delgada que un píxel (las lejanas se ensanchan y se aclaran en vez de titilar)
        float w = max(uWidth, d * uPx * 1.2);
        vec3 cr = cross(b.xyz - a.xyz, a.xyz);
        float cl = length(cr);
        vec3 side = cl > 1e-6 ? cr / cl : vec3(1.0, 0.0, 0.0);
        vec4 v = mix(a, b, position.x);
        v.xyz += side * position.y * w;
        gl_Position = projectionMatrix * v;
        vUv = position.xy;
        vA = uAlpha * uIn * (uWidth / w) * smoothstep(uNear, uNear + 2.5, d) * (1.0 - smoothstep(17.0, 27.0, d)) * (0.55 + 0.45 * aSeed.w);
        vec3 hp = p - uHead; float hd = length(hp);
        vLit = uHeadOn * smoothstep(0.8, 0.95, dot(hp / max(hd, 0.001), uHeadDir)) * (1.0 - smoothstep(3.0, 26.0, hd));
      }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vA; varying float vLit;
      void main() {
        float a = vA * (1.0 - abs(vUv.y)) * (0.35 + 0.65 * (1.0 - vUv.x)) * (1.0 + vLit * 1.5);
        gl_FragColor = vec4(uCol * (1.0 + vLit * 5.0) * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  WX.rain.frustumCulled = false; WX.rain.renderOrder = 4; WX.rain.visible = false;
  W.scene.add(WX.rain);

  // ---- salpicaduras: una onda en el piso y una coronita que salta ----
  const SN = GFX.alta.splash, sg = new THREE.InstancedBufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1], 3));
  sg.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
  const ss = new Float32Array(SN * 4);
  for (let i = 0; i < SN * 4; i++) ss[i] = r();
  sg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(ss, 4));
  sg.instanceCount = 0;
  WX.su = { uT: U.uT, uIn: U.uIn, uCol: { value: new THREE.Color() }, uRate: { value: 2.2 }, uAlpha: { value: 0.5 }, uCrown: { value: 1 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector2(26, 26) } };
  WX.splash = new THREE.Mesh(sg, new THREE.ShaderMaterial({
    uniforms: WX.su, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    vertexShader: `attribute vec4 aSeed;
      uniform float uT, uRate, uAlpha, uCrown, uIn; uniform vec3 uCenter; uniform vec2 uBox;
      varying vec2 vUv; varying float vKind; varying float vA;
      float hs(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        // cada salpicadura vive un ciclo y renace en otro lugar al azar cerca de la cámara
        float cyc = uT * uRate * (0.8 + 0.4 * aSeed.w) + aSeed.z, k = fract(cyc), id = floor(cyc);
        vec2 xz = uCenter.xz + (vec2(hs(id * 12.9898 + aSeed.x * 78.233), hs(id * 39.346 + aSeed.y * 11.135)) - 0.5) * uBox;
        // calle (las calles van cada 90 m) o vereda (16 cm más alta); en el pasto no se ven
        vec2 gd = abs(mod(xz + 270.0, 90.0) - 45.0);
        float m = min(gd.x, gd.y), y = uCenter.y + (m < 6.0 ? 0.045 : 0.2), vis = m < 9.0 ? 1.0 : 0.0;
        float s = 0.07 + 0.09 * aSeed.w;
        vec3 wp;
        if (position.z < 0.5) {
          float rad = s * (0.3 + k * 1.3);
          wp = vec3(xz.x + position.x * rad, y, xz.y + position.y * rad);
          vA = uAlpha * (1.0 - k) * vis;
        } else {
          vec2 tc = normalize(cameraPosition.xz - xz + 0.001);
          float hgt = s * 1.3 * sin(min(k * 2.8, 1.0) * 3.14159);
          wp = vec3(xz.x, y, xz.y) + vec3(tc.y, 0.0, -tc.x) * position.x * s * 1.3 + vec3(0.0, (position.y * 0.5 + 0.5) * hgt, 0.0);
          vA = uAlpha * uCrown * (1.0 - smoothstep(0.2, 0.36, k)) * vis;
        }
        vUv = position.xy; vKind = position.z; vA *= uIn;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv; varying float vKind; varying float vA;
      void main() {
        float a;
        if (vKind < 0.5) { float r = length(vUv); a = smoothstep(0.62, 0.86, r) * (1.0 - smoothstep(0.86, 1.0, r)) + 0.5 * smoothstep(0.25, 0.4, r) * (1.0 - smoothstep(0.4, 0.52, r)); }
        else { float y = vUv.y * 0.5 + 0.5; a = pow(abs(sin(vUv.x * 4.7)), 5.0) * (1.0 - y) * (1.0 - smoothstep(0.6, 1.0, abs(vUv.x))); }
        a *= vA;
        gl_FragColor = vec4(uCol * a, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  WX.splash.frustumCulled = false; WX.splash.renderOrder = 4; WX.splash.visible = false;
  W.scene.add(WX.splash);

  // ---- reflejos de luces en la calle mojada ----
  // iPos: dónde está la luz sobre el piso; iCol: color e intensidad (a: medio ancho);
  // iTl: (desfase del semáforo, eje, tipo: 0 carro, 1 semáforo, 2 poste, altura de la luz)
  WX.ru = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), { uT: { value: 0 }, uStr: { value: 1 }, uLamp: { value: 1 } });
  const rmat = new THREE.ShaderMaterial({
    uniforms: WX.ru, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 iPos; attribute vec4 iCol; attribute vec4 iTl;
      uniform float uT, uStr, uLamp;
      varying vec2 vUv; varying vec3 vCol; varying vec2 vW;
      #include <fog_pars_vertex>
      void main() {
        vec3 col = iCol.rgb;
        if (iTl.z > 0.5 && iTl.z < 1.5) {
          // semáforo: el mismo ciclo de 14 s que lightState (city.js)
          float p = mod(uT + iTl.x, 14.0);
          vec3 G = vec3(0.19, 1.0, 0.42), A = vec3(1.0, 0.62, 0.1), R = vec3(1.0, 0.12, 0.08);
          if (iTl.y < 0.5) col = p < 6.0 ? G : p < 7.0 ? A : R; else col = p < 7.0 ? R : p < 13.0 ? G : A;
          col *= 1.3;
        }
        if (iTl.z > 1.5) col *= uLamp;
        // un cuadro en el piso, estirado desde la luz hacia la cámara hasta un poco más allá de donde
        // se ve la imagen reflejada de la luz (depende de su altura y de la altura de la cámara)
        vec2 toCam = cameraPosition.xz - iPos.xz;
        float L = length(toCam), cy = max(cameraPosition.y - iPos.y, 0.3);
        vec2 dir = toCam / max(L, 0.001), perp = vec2(-dir.y, dir.x);
        float len = clamp(L * iTl.w / (cy + iTl.w) * 1.5, 0.6, min(L - 4.0, 26.0));   // (nunca hasta los pies de la cámara)
        vec2 xz = iPos.xz + dir * (position.y * len) + perp * (position.x * iCol.a * (1.0 + L * 0.015));
        vec4 mvPosition = viewMatrix * vec4(xz.x, iPos.y, xz.y, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vUv = position.xy; vCol = col * uStr * smoothstep(5.0, 11.0, L); vW = xz;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vCol; varying vec2 vW;
      #include <fog_pars_fragment>
      float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        float across = exp(-vUv.x * vUv.x * 5.0);
        float along = smoothstep(-0.15, 0.2, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        // el reflejo se corta en el agua que se mueve (más quieto lejos de la luz)
        float brk = 0.25 + 1.0 * vn(vW * 2.6 + vec2(uT * 0.9, -uT * 0.6));
        vec3 c = vCol * across * along * brk;
        #ifdef USE_FOG
          c *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const reflGeo = n => {
    const q = new THREE.InstancedBufferGeometry();
    q.setAttribute('position', new THREE.Float32BufferAttribute([-1, -0.15, 0, 1, -0.15, 0, -1, 1, 0, 1, 1, 0], 3));
    q.setIndex([0, 2, 1, 1, 2, 3]);
    for (const [k, s] of [['iPos', 3], ['iCol', 4], ['iTl', 4]]) q.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(n * s), s));
    return q;
  };
  // fijos: postes de luz (sobre el borde de la calle) y semáforos (en la esquina, un poco hacia la calle)
  const lamps = W.lampHeads || [], heads = CITY.lightHeads.filter(h => h.col === 'rojo');
  const sg2 = reflGeo(lamps.length + heads.length), P = sg2.attributes.iPos.array, C = sg2.attributes.iCol.array, T = sg2.attributes.iTl.array;
  let i = 0;
  for (const [x, z] of lamps) { P.set([x, groundH(x, z) + 0.06, z], i * 3); C.set([1.0, 0.7, 0.38, 0.5], i * 4); T.set([0, 0, 2, 6.9], i * 4); i++; }
  for (const h of heads) {
    const n = h.node, cx = Math.sign(h.x - n.x), cz = Math.sign(h.z - n.z), x = n.x + cx * (ROAD_W / 2 - 1.2) + (h.axis === 'x' ? cx * 1.6 : 0), z = n.z + cz * (ROAD_W / 2 - 1.2) + (h.axis === 'z' ? cz * 1.6 : 0);
    P.set([x, 0.07, z], i * 3); C.set([1, 1, 1, 0.3], i * 4); T.set([n.off, h.axis === 'x' ? 1 : 0, 1, 3.8], i * 4); i++;
  }
  sg2.instanceCount = i;
  WX.reflFix = new THREE.Mesh(sg2, rmat);
  WX.reflDyn = new THREE.Mesh(reflGeo(REFL_DYN), rmat);
  for (const m of [WX.reflFix, WX.reflDyn]) { m.frustumCulled = false; m.renderOrder = 2; m.visible = false; W.scene.add(m); }
  WX.reflDyn.geometry.instanceCount = 0;
  for (const k of ['iPos', 'iCol', 'iTl']) WX.reflDyn.geometry.attributes[k].setUsage(THREE.DynamicDrawUsage);

  // ---- asfalto mojado: más oscuro, brilla y refleja el cielo; charcos casi espejo ----
  const wet = WX.asphaltWet = new THREE.MeshStandardMaterial({ map: W.asphalt.map, roughnessMap: puddleTex(), roughness: 1, metalness: 0, side: THREE.DoubleSide });
  wet.onBeforeCompile = sh => {
    sh.uniforms.uWet = WX.uWet;
    sh.fragmentShader = 'uniform float uWet;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', `
      vec4 texelRoughness = texture2D(roughnessMap, vRoughnessMapUv);
      float puddle = smoothstep(0.58 - uWet * 0.36, 0.86 - uWet * 0.36, texelRoughness.g);
      diffuseColor.rgb *= mix(1.0, 0.5 - 0.22 * puddle, uWet);
      float roughnessFactor = mix(0.95, mix(0.3 + 0.16 * texelRoughness.r, 0.035, puddle), uWet);`);
  };
  wet.customProgramCacheKey = () => 'asfaltoMojado';

  // ---- haces de luz de los faros del jugador (se ven con neblina o lluvia de noche) ----
  // dos conos abiertos de 22 m; brillan más donde la vista atraviesa más "aire" (el centro del cono)
  // y se apagan a lo largo y en los bordes. Sólo sumar luz: 1 llamada de dibujo.
  const cone = sd => new THREE.CylinderGeometry(0.1, 3.4, 22, 18, 1, true).translate(0, -11, 0).rotateX(-Math.PI / 2 - 0.045).translate(sd * 0.55, 0, 0);
  WX.bu = Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), { uI: { value: 0 }, uCol: { value: new THREE.Color(1, 0.93, 0.8) } });
  WX.beam = new THREE.Mesh(mergeGeos([{ geo: cone(-1), c: 0xffffff }, { geo: cone(1), c: 0xffffff }]), new THREE.ShaderMaterial({
    uniforms: WX.bu, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uI; varying float vAl; varying float vF;
      #include <fog_pars_vertex>
      void main() {
        vAl = clamp(position.z / 22.0, 0.0, 1.0);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vF = abs(dot(normalize(normalMatrix * normal), normalize(-mvPosition.xyz)));
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uI; uniform vec3 uCol; varying float vAl; varying float vF;
      #include <fog_pars_fragment>
      void main() {
        float a = uI * pow(vF, 1.6) * pow(1.0 - vAl, 1.7) * smoothstep(0.0, 0.06, vAl);
        #ifdef USE_FOG
          a *= 1.0 - 0.6 * smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor = vec4(uCol * a, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  WX.beam.matrixAutoUpdate = false; WX.beam.frustumCulled = false; WX.beam.renderOrder = 5; WX.beam.visible = false;
  W.scene.add(WX.beam);

  // ---- relámpagos: 3 rayos armados de antemano (cintas en un plano que mira a la cámara) ----
  WX.boltGeos = [3, 8, 21].map(boltGeo);
  WX.bolt = new THREE.Mesh(WX.boltGeos[0], new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.86, 1).multiplyScalar(7), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
  WX.bolt.visible = false; WX.bolt.frustumCulled = false; WX.bolt.renderOrder = -1;
  W.scene.add(WX.bolt);
}

// Un rayo: zigzag de arriba (y = 1) al piso (y = 0) con ramas, en el plano XY.
function boltGeo(seed) {
  const r = rng(seed), pos = [], idx = [];
  const ribbon = (pts, w) => {
    const base = pos.length / 3;
    pts.forEach(([x, y], i) => {
      const p = pts[Math.max(0, i - 1)], q = pts[Math.min(pts.length - 1, i + 1)];
      let dx = q[0] - p[0], dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const ww = w * (1 - i / pts.length * 0.6);
      pos.push(x - dy * ww, y + dx * ww, 0, x + dy * ww, y - dx * ww, 0);
      if (i) { const a = base + (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
  };
  const main = [];
  let x = 0, y = 1;
  while (y > 0) { main.push([x, y]); y -= 0.025 + r() * 0.05; x += (r() - 0.5) * 0.08; }
  main.push([x, 0]);
  ribbon(main, 0.008);
  for (let b = 0; b < 3; b++) {
    const s = main[2 + Math.floor(r() * main.length * 0.5)], br = [], dir = r() < 0.5 ? -1 : 1;
    let bx = s[0], by = s[1];
    for (let k = 0, n = 5 + Math.floor(r() * 7); k < n; k++) { br.push([bx, by]); by -= 0.02 + r() * 0.04; bx += dir * (0.01 + r() * 0.035); }
    ribbon(br, 0.004);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

// Aplica el clima actual a lo que depende del nivel de gráficos (lo llaman setTimeOfDay y applyQuality).
function applyWeather() {
  const A = W.atmos;
  if (!A || !WX.rain) return;
  const w = A.w, Q = GFX[W.gfx] || GFX.alta, time = W.time;
  W.wet = w.wet; W.rainAmt = w.rain; W.gripMul = w.grip; W.carLights = A.lights;
  // con el cielo tapado casi no hay sombras: no se dibuja el mapa de sombras
  W.sun.castShadow = !!Q.shadows && w.sun >= 0.3;
  const oct = Q.post ? 5 : 3;
  if (W.skyMat.defines.OCT !== oct) { W.skyMat.defines.OCT = oct; W.skyMat.needsUpdate = true; }
  // gotas
  const U = WX.u;
  WX.rain.visible = w.rain > 0;
  WX.rain.geometry.instanceCount = w.rain > 0 ? Math.round(Q.rain * (w.drizzle ? 1 : 0.4 + 0.6 * w.rain)) : 0;
  if (w.drizzle) { U.uSpeed.value = 3.2; U.uLen.value = 0.07; U.uWidth.value = 0.008; U.uAlpha.value = 0.5; }
  else { U.uSpeed.value = 8.5 + 3 * w.rain; U.uLen.value = 0.024; U.uWidth.value = 0.011; U.uAlpha.value = 0.3 + 0.14 * w.rain; }
  if (!Q.post) U.uAlpha.value *= 1.35;            // (en Bajos hay menos gotas)
  U.uWind.value.set(...(w.wind || [0, 0]));
  U.uCol.value.set(RAIN_COL[time] || RAIN_COL.dia);
  // salpicaduras
  WX.splash.visible = w.rain > 0 && Q.splash > 0;
  WX.splash.geometry.instanceCount = Math.round(Q.splash * (w.drizzle ? 0.45 : w.rain));
  WX.su.uCrown.value = w.drizzle ? 0 : 1; WX.su.uRate.value = w.drizzle ? 1.5 : 2.8;
  WX.su.uAlpha.value = (w.drizzle ? 0.3 : 0.42) * (time === 'noche' ? 0.45 : 1);
  WX.su.uCol.value.set(RAIN_COL[time] || RAIN_COL.dia).multiplyScalar(1.25);
  // calle mojada
  const wetRoad = w.wet > 0 && Q.wetRoad;
  for (const m of W.roadMeshes) m.material = wetRoad ? WX.asphaltWet : W.asphalt;
  WX.uWet.value = w.wet;
  W.asphalt.color.setScalar(1 - (wetRoad ? 0 : (time === 'noche' ? 0.15 : 0.3) * w.wet));
  for (const o of W.wetMats || []) o.m.color.copy(o.base).multiplyScalar(1 + (o.k - 1) * w.wet);
  // reflejos de luces: fuertes de noche, suaves de tarde y apenas de día con tormenta
  const str = w.wet * (A.night ? 1 : time === 'tarde' ? 0.55 : 0.4 * w.dark);
  WX.reflOn = Q.wetRoad && w.wet > 0.2 && str > 0.05;
  WX.reflFix.visible = WX.reflDyn.visible = WX.reflOn;
  WX.ru.uStr.value = str; WX.ru.uLamp.value = A.lamps > 0.3 ? A.lamps : 0;
  // limpiaparabrisas: con garúa de a ratos, con lluvia seguido, con tormenta rápido
  WX.wipe = !w.rain ? null : w.drizzle ? { P: 4.2, sw: 0.3 } : { P: w.bolts ? 0.95 : 1.25, sw: 1 };
  // haces de los faros: con neblina y con lluvia cuando está oscuro
  WX.beamI = (w.mist ? 0.55 : 0.14 * w.rain) * (A.night ? 1 : time === 'tarde' ? 0.6 : 0.35 * w.dark) * (Q.post ? 1 : 0.7);
  // tormenta
  WX.bolt.visible = false;
  if (w.bolts) WX.next = 4 + Math.random() * 6;
}

const _wc = new THREE.Vector3(), _wv = new THREE.Vector3(), _we = new THREE.Euler(), _wm = new THREE.Matrix4();
// Cada cuadro: la caja de gotas y las salpicaduras siguen a la cámara, las gotas se estiran con su
// velocidad, no llueve dentro del túnel, los faros iluminan las gotas, reflejos de los carros y
// relámpagos.
function updateWeather(dt) {
  if (!WX.rain || !W.atmos) return;
  const A = W.atmos, w = A.w, cam = W.camera, P = G.player;
  cam.getWorldPosition(_wc);
  if (dt > 0) {
    _wv.subVectors(_wc, WX.camPrev).divideScalar(dt);
    if (_wv.lengthSq() > 4900) _wv.set(0, 0, 0);             // corte de cámara
    WX.camVel.lerp(_wv, Math.min(1, dt * 10));
  }
  WX.camPrev.copy(_wc); WX.cam.copy(_wc);
  cam.getWorldDirection(WX.dir); WX.dir.y = 0;
  if (WX.dir.lengthSq() < 1e-4) WX.dir.set(0, 0, 1); else WX.dir.normalize();
  const inT = _wc.x > HILL.x0 - 1 && _wc.x < HILL.x1 + 1 && Math.abs(_wc.z - 135) < ROAD_W / 2 + 1.5 && _wc.y < 8;
  WX.inside += ((inT ? 0 : 1) - WX.inside) * Math.min(1, dt * 4);
  const U = WX.u, tt = W.t % 600;
  U.uT.value = tt; U.uIn.value = WX.inside;
  if (WX.rain.visible) {
    U.uCamVel.value.copy(WX.camVel);
    U.uCenter.value.set(_wc.x + WX.dir.x * 11, _wc.y + 3, _wc.z + WX.dir.z * 11);
    U.uPx.value = 2 * Math.tan(cam.fov * Math.PI / 360) / Math.max(1, W.renderer.domElement.height);
    U.uNear.value = P && cam.parent === P.car.body ? 2.0 : 0.6;
    if (P && A.lights > 0.3) {
      const b = P.body;
      U.uHead.value.set(b.x + Math.sin(b.h) * 2.2, b.y + 0.7, b.z + Math.cos(b.h) * 2.2); U.uHeadDir.value.set(Math.sin(b.h), -0.04, Math.cos(b.h)).normalize();
      U.uHeadOn.value = A.lights;
    } else U.uHeadOn.value = 0;
  }
  // haces de los faros del jugador (calculados de la física, sin esperar a la matriz del carro)
  const beamOn = WX.beamI > 0.01 && P && G.head && !P.body.dead;
  WX.beam.visible = !!beamOn;
  if (beamOn) {
    const b = P.body, B = P.car.B;
    _we.set(b.pitch, b.h, b.roll, 'YXZ');
    WX.beam.matrix.makeRotationFromEuler(_we).setPosition(b.x, b.y, b.z).multiply(_wm.makeTranslation(0, B.belt - 0.28, B.L / 2 - 0.1));
    WX.bu.uI.value = WX.beamI * WX.inside;
  }
  if (WX.splash.visible) { const cx = _wc.x + WX.dir.x * 9, cz = _wc.z + WX.dir.z * 9; WX.su.uCenter.value.set(cx, groundH(cx, cz), cz); }
  if (WX.reflOn) { WX.ru.uT.value = W.t % 1400; writeCarRefl(A); }
  if (w.bolts) lightning(dt, A);
}

// Reflejos de los carros cercanos: faros si el carro mira a la cámara, luces traseras si le da la
// espalda (más con el freno) y la circulina de los patrulleros.
const HEAD_REFL = [1.0, 0.92, 0.78], TAIL_REFL = [1.0, 0.07, 0.04], SIREN_R = [1.0, 0.1, 0.12], SIREN_B = [0.15, 0.3, 1.0];
function writeCarRefl(A) {
  const g = WX.reflDyn.geometry, P = g.attributes.iPos.array, C = g.attributes.iCol.array, T = g.attributes.iTl.array;
  const cx = WX.cam.x, cz = WX.cam.z, lights = A.lights, inCab = G.player && W.camera.parent === G.player.car.body;
  let n = 0;
  const add = (x, y, z, c, k, wd, hl) => { if (n >= REFL_DYN) return; P[n * 3] = x; P[n * 3 + 1] = y; P[n * 3 + 2] = z; C[n * 4] = c[0] * k; C[n * 4 + 1] = c[1] * k; C[n * 4 + 2] = c[2] * k; C[n * 4 + 3] = wd; T[n * 4] = 0; T[n * 4 + 1] = 0; T[n * 4 + 2] = 0; T[n * 4 + 3] = hl; n++; };
  for (const a of G.all) {
    if (inCab && a === G.player) continue;
    const b = a.body, B = a.car.B, dx = cx - b.x, dz = cz - b.z, d = Math.hypot(dx, dz);
    if (d > 120 || d < 0.5 || b.air) continue;
    const fx = Math.sin(b.h), fz = Math.cos(b.h), lx = Math.cos(b.h), lz = -Math.sin(b.h), face = (fx * dx + fz * dz) / d, y = b.y + 0.07;
    if (face > 0 && lights > 0.2) for (const sd of [-1, 1]) add(b.x + fx * (B.L / 2 + 0.3) + lx * sd * B.W * 0.33, y, b.z + fz * (B.L / 2 + 0.3) + lz * sd * B.W * 0.33, HEAD_REFL, lights * face * 1.2, 0.26, B.clr + 0.4);
    const tail = b.braking ? 1.1 : 0.36 * lights;
    if (face < 0 && tail > 0.1) for (const sd of [-1, 1]) add(b.x - fx * (B.L / 2 + 0.2) + lx * sd * B.W * 0.36, y, b.z - fz * (B.L / 2 + 0.2) + lz * sd * B.W * 0.36, TAIL_REFL, tail * -face, 0.17, B.belt - 0.1);
    if (a.car.police && a.car.sirenOn && !b.dead && lights > 0.2) add(b.x, y, b.z, Math.floor(W.t * 8) % 2 ? SIREN_R : SIREN_B, 1.6 * lights, 0.55, B.roof + 0.15);
  }
  g.instanceCount = n; WX.reflDyn.visible = n > 0;
  for (const k of ['iPos', 'iCol', 'iTl']) { const at = g.attributes[k]; at.clearUpdateRanges ? (at.clearUpdateRanges(), at.addUpdateRange(0, n * at.itemSize)) : null; at.needsUpdate = true; }
}

// Relámpagos: cada 7-20 s un destello (el cielo y la luz se prenden en 2-3 golpes), a veces con el
// rayo a la vista, y el trueno llega después según la distancia.
const _fogC = new THREE.Color(), FLASH_C = new THREE.Color(0xc8d2ff);
function lightning(dt, A) {
  WX.next -= dt; WX.flashT += dt;
  if (WX.next <= 0) {
    WX.next = 7 + Math.random() * 13; WX.flashT = 0; WX.strikes++;
    const a = Math.atan2(WX.dir.x, WX.dir.z) + (Math.random() - 0.5) * 2.2, d = 450 + Math.random() * 500;
    W.skyMat.uniforms.flashDir.value.set(Math.sin(a), 0.3, Math.cos(a)).normalize();
    WX.boltOn = Math.random() < 0.65;
    if (WX.boltOn) {
      const m = WX.bolt;
      m.geometry = WX.boltGeos[Math.floor(Math.random() * WX.boltGeos.length)];
      m.position.set(WX.cam.x + Math.sin(a) * d, 0, WX.cam.z + Math.cos(a) * d);
      m.scale.set(Math.random() < 0.5 ? -420 : 420, 420, 1);
      m.lookAt(WX.cam.x, 0, WX.cam.z);
    }
    WX.thunderIn = 0.3 + (d - 400) / 340 * (0.8 + Math.random() * 0.4); WX.thunderD = (d - 450) / 500;
  }
  const t = WX.flashT;
  const f = t < 0.06 ? 1 : t < 0.13 ? 0.2 : t < 0.2 ? 0.8 : t < 0.27 ? 0.25 : Math.max(0, 0.5 * Math.exp(-(t - 0.27) * 7));
  const fi = f * (0.25 + 0.75 * WX.inside);
  W.skyMat.uniforms.flash.value = f;
  W.hemi.intensity = A.hemiI + fi * 2.4;
  W.scene.fog.color.copy(A.fog).lerp(_fogC.copy(FLASH_C).multiplyScalar(A.night ? 0.35 : 0.9), fi * 0.35);
  WX.bolt.visible = WX.boltOn && f > 0.05;
  WX.bolt.material.opacity = Math.min(1, f * 1.4);
  if (WX.thunderIn > 0 && (WX.thunderIn -= dt) <= 0) SFX.thunder(clamp(WX.thunderD, 0, 1));
}

// Agua que levantan las llantas traseras de los carros rápidos cerca de la cámara (desde carFx).
function wetSpray(a, dt) {
  const b = a.body, sp = Math.abs(b.f);
  if (sp < 6 || b.air || FX.max.spray <= 0) return;
  const dx = b.x - WX.cam.x, dz = b.z - WX.cam.z;
  if (dx * dx + dz * dz > 4900) return;
  const B = a.car.B, fx = Math.sin(b.h), fz = Math.cos(b.h), lx = Math.cos(b.h), lz = -Math.sin(b.h);
  const rate = (sp - 6) * 0.8 * W.wet;
  for (const sd of [-1, 1]) {
    if (Math.random() > rate * dt) continue;
    const wx = b.x + lx * sd * (B.W / 2 - 0.2) - fx * (B.wb / 2 + B.r * 0.7), wz = b.z + lz * sd * (B.W / 2 - 0.2) - fz * (B.wb / 2 + B.r * 0.7);
    fxSpray(wx, b.y + B.r * 0.5, wz, b.vx * 0.45 - fx * 1.5 + lx * sd * 0.7 + (Math.random() - 0.5), 0.5 + Math.random() * 0.9, b.vz * 0.45 - fz * 1.5 + lz * sd * 0.7 + (Math.random() - 0.5), 0.4 + Math.random() * 0.35, 0.5 + Math.random() * 0.35);
  }
}

// ---------- cabina: limpiaparabrisas y gotas en el vidrio ----------
// ws: el plano del parabrisas de la cabina (w de ancho y h de alto a lo largo del vidrio; su x es
// la del carro y su y sube por el vidrio). Las dos plumillas descansan abajo apuntando al lado del
// copiloto y suben hacia el lado del chofer. Las gotas son un shader sobre el mismo plano: cada
// celda tiene una gota que aparece un rato después de que pasó la plumilla (la misma cuenta que
// mueve las plumillas: s = fase del ciclo de P segundos, sw = parte del ciclo en que se mueven).
function makeWipers(car, ck, ws, w, h) {
  const g = new THREE.Group(); g.position.copy(ws.position); g.rotation.copy(ws.rotation);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.45, metalness: 0.5 });
  const y0 = -h / 2 + 0.05;
  const piv = [{ x: w * 0.36, L: Math.min(w * 0.55, h * 0.82), arc: 1.75 }, { x: -w * 0.07, L: Math.min(w * 0.42, h * 0.76), arc: 1.9 }];
  car.wipers = piv.map(p => {
    const pv = new THREE.Group(); pv.position.set(p.x, y0, 0.03); g.add(pv);
    pv.add(new THREE.Mesh(new THREE.BoxGeometry(p.L, 0.009, 0.008).translate(p.L / 2, 0, 0.014), mat));
    pv.add(new THREE.Mesh(new THREE.BoxGeometry(p.L * 0.84, 0.012, 0.016).translate(p.L * 0.56, 0, 0.002), mat));
    pv.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12).rotateX(Math.PI / 2), mat));
    pv.rotation.z = Math.PI;
    return Object.assign({ pv }, p);
  });
  const u = {
    uTime: { value: 0 }, uP: { value: 1.25 }, uSw: { value: 0 }, uRain: { value: 0 }, uWin: { value: 1 }, uSize: { value: new THREE.Vector2(w, h) }, uLit: { value: new THREE.Color(1, 1, 1) },
    uA: { value: new THREE.Vector4(piv[0].x, y0, piv[0].L, piv[0].arc) }, uB: { value: new THREE.Vector4(piv[1].x, y0, piv[1].L, piv[1].arc) },
  };
  const drops = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, defines: { LAYERS: 2 },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime, uP, uSw, uRain, uWin; uniform vec2 uSize; uniform vec3 uLit; uniform vec4 uA, uB;
      varying vec2 vUv;
      float hs(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      // segundos desde que la plumilla pasó por q (99: no llega)
      float since(vec2 q, vec4 pv) {
        vec2 d = q - pv.xy;
        float ang = 3.14159265 - atan(d.y, d.x);
        if (uSw <= 0.0 || length(d) > pv.z || ang > pv.w) return 99.0;
        float s1 = acos(clamp(1.0 - 2.0 * ang / pv.w, -1.0, 1.0)) / 6.2831853 * uSw;
        float s = fract(uTime / uP);
        return min(fract(s - s1), fract(s - (uSw - s1))) * uP;
      }
      // una capa de gotas: x = gota, y = brillo, z = borde
      vec3 layer(vec2 q, float cell, float seed, float dens) {
        vec2 id = floor(q / cell);
        vec2 c = (id + 0.3 + 0.4 * vec2(hs(id + seed), hs(id + seed + 7.1))) * cell;
        float ag = min(since(c, uA), since(c, uB));
        float wv = ag > 90.0 ? 0.0 : fract((uTime - ag) * 0.173) * 91.0;   // otras gotas después de cada pasada
        float vis = step(hs(id + seed + 3.3 + wv), dens) * step(hs(id + seed + 5.7 + wv) * uWin, ag);
        float r = cell * (0.12 + 0.16 * hs(id + seed + 9.9 + wv));
        vec2 dd = q - c; dd.y *= 1.2;
        float d = length(dd);
        float m = (1.0 - smoothstep(r * 0.65, r, d)) * vis;
        float hl = (1.0 - smoothstep(0.0, r * 0.5, length(dd - vec2(-r * 0.2, r * 0.35)))) * vis;
        return vec3(m, hl, smoothstep(r * 0.35, r, d) * m);
      }
      void main() {
        vec2 q = (vUv - 0.5) * uSize;
        vec3 a = layer(q, 0.055, 1.0, 0.15 + 0.5 * uRain);
        #if LAYERS > 1
          vec3 b = layer(q + 0.013, 0.024, 4.0, 0.1 + 0.55 * uRain);
          a = max(a, b);
        #endif
        float film = uRain * 0.1 * clamp(min(since(q, uA), since(q, uB)) / 2.5, 0.0, 1.0);
        vec3 col = uLit * (0.55 + 1.6 * a.y) * (1.0 - 0.55 * a.z);
        float al = max(clamp(a.x * (0.38 + 0.35 * a.y) + a.z * 0.2, 0.0, 0.85), film);
        gl_FragColor = vec4(col, al);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  drops.position.z = 0.014; drops.renderOrder = 3; drops.visible = false;
  g.add(drops);
  ck.add(g);
  car.rainGlass = drops;
}
// Mueve las plumillas y actualiza las gotas (desde poseCockpit, sólo con la cámara adentro).
function updateWipers(car) {
  if (!car.wipers) return;
  const wp = WX.wipe, U = car.rainGlass.material.uniforms, A = W.atmos;
  car.rainGlass.visible = !!wp;
  let sweep = 0;
  const tt = W.t % 1000;
  if (wp) {
    const s = (tt / wp.P) % 1;
    sweep = s < wp.sw ? (1 - Math.cos(2 * Math.PI * s / wp.sw)) / 2 : 0;
    // golpecito de la plumilla al llegar arriba y al volver a su lugar
    const ph = s < wp.sw * 0.5 ? 1 : s < wp.sw ? 2 : 0;
    if (ph !== WX.wPhase && ph !== 1) SFX.wiper();
    WX.wPhase = ph;
    U.uTime.value = tt; U.uP.value = wp.P; U.uSw.value = wp.sw; U.uRain.value = W.rainAmt * WX.inside;
    U.uWin.value = W.rainAmt > 0.9 ? 0.7 : W.rainAmt > 0.6 ? 1.1 : 2.6;
    U.uLit.value.copy(A.hemiSky).multiplyScalar(clamp(A.hemiI * (A.night ? 0.9 : 0.75) + W.skyMat.uniforms.flash.value, 0.12, 1.4));
    const lay = W.gfx === 'baja' ? 1 : 2;
    if (car.rainGlass.material.defines.LAYERS !== lay) { car.rainGlass.material.defines.LAYERS = lay; car.rainGlass.material.needsUpdate = true; }
  }
  for (const p of car.wipers) p.pv.rotation.z = Math.PI - sweep * p.arc;
}
