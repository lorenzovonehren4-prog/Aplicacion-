'use strict';
// Último Disparo: personas en 3D. Cuerpo torneado (torso, cadera y extremidades que se afinan),
// cara dibujada en canvas (ojos, cejas, nariz, boca), orejas, pelo variado y ropa con textura
// de tela. El secuestrador lleva pasamontañas, chaleco táctico, guantes y botas.
// Se animan por articulaciones; miran hacia +Z local. kind: 'enemy', 'hostage' o 'civil'.

const pick = a => a[Math.floor(Math.random() * a.length)];
const SKINS = [0xf3cfb0, 0xe6b48e, 0xc98e63, 0xa86e48, 0x7d4f33, 0x5a3825, 0xeec1a0];
const SHIRTS = [0x2f6fde, 0xd8433a, 0x2e9a62, 0xf0b432, 0x8e5bc9, 0xe8742b, 0x25a9b8, 0xeeeae2, 0xd34f86, 0x6c8a3a, 0x34508f, 0xb9b2a4, 0x8a2e3b, 0x2b2f36];
const JACKETS = [0x3a3f47, 0x6b4a2e, 0x24324d, 0x5b5f3a, 0x7a1f2a, 0x1f1f22, 0x8f8a80];
const PANTS = [0x2c4a7a, 0x3a5f94, 0x2a2c33, 0x5a4632, 0x1f2a36, 0x6d6a60, 0x857a63];
const HAIRS = [0x1a120c, 0x2e1d12, 0x5a3a1e, 0x9a6b3a, 0xc9a368, 0x0e0e0e, 0x8f8f8f, 0x6b2a16];
const EYES = ['#3b2414', '#5a3a1e', '#2d5a7a', '#3c6a3a', '#1c1c1c'];

// ---------------------------------------------------------------- geometrías compartidas
const PG = (() => {
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // extremidad torneada: radio rT arriba, rB abajo, largo len (hacia -y), con puntas redondas
  const limb = (rT, rB, len, seg = 12) => {
    const p = [V2(0, rT * 0.95)];
    for (let i = 1; i <= 4; i++) { const a = i / 4 * Math.PI / 2; p.push(V2(Math.sin(a) * rT, Math.cos(a) * rT * 0.95)); }
    for (let i = 1; i < 8; i++) { const k = i / 8, bulge = Math.sin(k * Math.PI) * 0.12; p.push(V2((rT + (rB - rT) * k) * (1 + bulge * (rT > rB ? 1 : 0.4)), -len * k)); }
    for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; p.push(V2(Math.cos(a) * rB, -len - Math.sin(a) * rB * 0.95)); }
    p.push(V2(0, -len - rB * 0.95));
    const g = new THREE.LatheGeometry(p, seg);
    g.computeVertexNormals();
    return g;
  };
  // torso: de la cintura (y=0) al cuello (y=0.54), sección ovalada
  const torsoProfile = (f) => [
    V2(0.0, -0.02), V2(0.128, 0.0), V2(0.132, 0.06), V2(f ? 0.122 : 0.13, 0.13), V2(f ? 0.13 : 0.142, 0.22),
    V2(f ? 0.152 : 0.158, 0.31), V2(f ? 0.155 : 0.168, 0.39), V2(f ? 0.15 : 0.172, 0.45), V2(0.15, 0.495), V2(0.1, 0.53), V2(0.055, 0.545), V2(0.0, 0.55),
  ];
  const torso = f => { const g = new THREE.LatheGeometry(torsoProfile(f), 20); g.scale(1.18, 1, 0.7); g.computeVertexNormals(); return g; };
  const pelvisG = f => { const g = new THREE.LatheGeometry([V2(0, 0.03), V2(f ? 0.145 : 0.132, 0.03), V2(f ? 0.158 : 0.14, -0.04), V2(f ? 0.15 : 0.135, -0.1), V2(0.1, -0.15), V2(0, -0.16)], 18); g.scale(1.15, 1, 0.72); g.computeVertexNormals(); return g; };
  const head = new THREE.SphereGeometry(0.1, 28, 20); head.scale(0.9, 1.1, 1.0);
  const skirt = new THREE.CylinderGeometry(0.17, 0.27, 0.42, 20, 1, true); skirt.translate(0, -0.21, 0);
  const hood = new THREE.SphereGeometry(0.128, 20, 14, Math.PI * 0.68, Math.PI * 1.64, 0, Math.PI * 0.75);
  return {
    torsoM: torso(false), torsoF: torso(true), pelvisM: pelvisG(false), pelvisF: pelvisG(true),
    head, skirt, hood,
    neck: new THREE.CylinderGeometry(0.045, 0.052, 0.1, 12),
    upper: limb(0.056, 0.046, 0.25), fore: limb(0.045, 0.036, 0.23),
    thigh: limb(0.082, 0.058, 0.39), shin: limb(0.056, 0.042, 0.38),
    joint: new THREE.SphereGeometry(1, 12, 8),
    palm: new THREE.SphereGeometry(0.042, 12, 8), thumb: new THREE.CapsuleGeometry(0.013, 0.035, 3, 6),
    shoe: (() => { const g = new THREE.CapsuleGeometry(0.048, 0.15, 4, 10); g.rotateX(Math.PI / 2); g.scale(1, 0.72, 1); return g; })(),
    sole: new THREE.BoxGeometry(0.1, 0.022, 0.25),
    ear: new THREE.SphereGeometry(0.024, 10, 8), nose: new THREE.SphereGeometry(0.016, 10, 8),
    hairCap: (() => { const g = new THREE.SphereGeometry(0.106, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5); g.rotateX(-0.5); return g; })(),
    hairBack: new THREE.SphereGeometry(0.104, 20, 14, Math.PI * 1.05, Math.PI * 0.9, Math.PI * 0.3, Math.PI * 0.45),
    bun: new THREE.SphereGeometry(0.045, 12, 10), curl: new THREE.IcosahedronGeometry(0.04, 1),
    ponytail: new THREE.CapsuleGeometry(0.035, 0.14, 4, 8),
    beanie: new THREE.SphereGeometry(0.112, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), beanieRim: new THREE.TorusGeometry(0.104, 0.016, 8, 24),
    cap: new THREE.SphereGeometry(0.11, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), visor: new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20, 1, false, -Math.PI * 0.5, Math.PI),
    collar: new THREE.TorusGeometry(0.062, 0.014, 6, 16, Math.PI * 1.4),
    belt: new THREE.TorusGeometry(0.146, 0.012, 6, 28), buckle: new THREE.BoxGeometry(0.04, 0.03, 0.01),
    vest: new THREE.BoxGeometry(0.34, 0.3, 0.06), pouch: new THREE.BoxGeometry(0.07, 0.07, 0.04),
    placket: new THREE.BoxGeometry(0.06, 0.4, 0.01),
    bag: new THREE.BoxGeometry(0.26, 0.32, 0.12), strap: new THREE.BoxGeometry(0.03, 0.5, 0.01),
    gunSlide: new THREE.BoxGeometry(0.03, 0.035, 0.19), gunFrame: new THREE.BoxGeometry(0.028, 0.025, 0.15), gunGrip: new THREE.BoxGeometry(0.028, 0.1, 0.045),
    gunBarrel: new THREE.CylinderGeometry(0.007, 0.007, 0.02, 8), trigger: new THREE.TorusGeometry(0.018, 0.004, 4, 10, Math.PI),
    glasses: new THREE.TorusGeometry(0.022, 0.004, 6, 14), beard: new THREE.SphereGeometry(0.098, 18, 10, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.55, Math.PI * 0.3),
  };
})();

// ---------------------------------------------------------------- texturas
const PTEX = { faces: {} };
function fabricTex(kind) {
  if (PTEX[kind]) return PTEX[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, 128, 128);
  if (kind === 'jeans') {
    for (let i = -128; i < 256; i += 3) { x.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.1})`; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke(); }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.18})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 2); }
  } else if (kind === 'knit') {
    for (let yy = 0; yy < 128; yy += 4) for (let xx = 0; xx < 128; xx += 4) { x.fillStyle = `rgba(0,0,0,${0.05 + ((xx + yy) % 8 ? 0.06 : 0.12)})`; x.fillRect(xx, yy, 2, 3); }
  } else {
    for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.04})`; x.fillRect(0, i, 128, 1); x.fillRect(i, 0, 1, 128); }
    for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.08})`; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace;
  return (PTEX[kind] = t);
}
const hex = n => '#' + n.toString(16).padStart(6, '0');
// Cara en una textura que envuelve la cabeza (el frente está en u = 0.25).
function faceTex(skin, o) {
  const key = [skin, o.eye, o.fem, o.mask, o.lip, o.brow].join('|');
  if (PTEX.faces[key]) return PTEX.faces[key];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const S = new THREE.Color(skin);
  const sk = (k, a = 1) => `rgba(${Math.round(S.r * 255 * k)},${Math.round(S.g * 255 * k)},${Math.round(S.b * 255 * k)},${a})`;
  x.fillStyle = sk(1); x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 1500; i++) { x.fillStyle = sk(0.9 + Math.random() * 0.15, 0.25); x.fillRect(Math.random() * 512, Math.random() * 256, 2, 2); }
  const cx = 128; // frente
  if (o.mask) {
    // pasamontañas: tejido negro con una abertura para los ojos
    x.fillStyle = '#121214'; x.fillRect(0, 0, 512, 256);
    for (let yy = 0; yy < 256; yy += 3) for (let xx = 0; xx < 512; xx += 3) { x.fillStyle = `rgba(255,255,255,${(xx + yy) % 6 ? 0.025 : 0.06})`; x.fillRect(xx, yy, 2, 2); }
    x.fillStyle = sk(0.95);
    x.beginPath(); x.ellipse(cx, 124, 46, 13, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#0a0a0a'; x.lineWidth = 3; x.stroke();
  } else {
    // sombras suaves: mejillas, sienes y bajo la barbilla
    const g = x.createRadialGradient(cx, 140, 30, cx, 140, 150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, sk(0.8, 0.12));
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    if (o.fem) { x.fillStyle = 'rgba(220,90,90,.16)'; [cx - 34, cx + 34].forEach(px => { x.beginPath(); x.ellipse(px, 150, 16, 10, 0, 0, 7); x.fill(); }); }
    // nariz
    x.fillStyle = sk(0.82, 0.6); x.beginPath(); x.ellipse(cx - 6, 150, 4, 3, 0, 0, 7); x.ellipse(cx + 6, 150, 4, 3, 0, 0, 7); x.fill();
    x.strokeStyle = sk(0.8, 0.5); x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 4, 120); x.quadraticCurveTo(cx - 8, 140, cx - 9, 148); x.stroke();
    // boca
    x.fillStyle = o.lip; x.beginPath(); x.moveTo(cx - 15, 172); x.quadraticCurveTo(cx, 166, cx + 15, 172); x.quadraticCurveTo(cx, 181, cx - 15, 172); x.fill();
    x.strokeStyle = 'rgba(60,20,20,.6)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx - 15, 172); x.quadraticCurveTo(cx, 174, cx + 15, 172); x.stroke();
  }
  // ojos
  for (const s of [-1, 1]) {
    const ex = cx + s * 24, ey = 124;
    x.fillStyle = '#f4efe8'; x.beginPath(); x.ellipse(ex, ey, 11, 6, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = o.eye; x.beginPath(); x.arc(ex + s * -1, ey, 5.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#080808'; x.beginPath(); x.arc(ex + s * -1, ey, 2.4, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(ex + s * -1 + 1.6, ey - 1.8, 1.2, 0, Math.PI * 2); x.fill();
    x.strokeStyle = o.mask ? '#111' : 'rgba(40,20,10,.85)'; x.lineWidth = o.fem ? 2.6 : 1.8;
    x.beginPath(); x.ellipse(ex, ey, 11, 6, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    if (!o.mask) { x.fillStyle = o.brow; x.beginPath(); x.moveTo(ex - 12, ey - 11 + (s > 0 ? 0 : 0)); x.quadraticCurveTo(ex, ey - (o.fem ? 17 : 15), ex + 12, ey - 11); x.lineTo(ex + 12, ey - (o.fem ? 9 : 8)); x.quadraticCurveTo(ex, ey - (o.fem ? 14 : 11), ex - 12, ey - 8); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (PTEX.faces[key] = t);
}

// ---------------------------------------------------------------- la persona
class Person {
  constructor(kind, o = {}) {
    this.kind = kind;
    this.mats = [];
    this.meshes = [];
    const fem = this.fem = kind === 'enemy' ? false : (o.fem !== undefined ? o.fem : Math.random() < 0.5);
    const M = (c, r = 0.85, map = null, extra) => {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0, map }, extra));
      this.mats.push(m); return m;
    };
    const skinC = o.skin || pick(SKINS);
    const skin = M(skinC, 0.62);
    const enemy = kind === 'enemy';
    // ropa
    const style = enemy ? 'enemy' : pick(fem ? ['t', 'long', 'jacket', 'dress', 't'] : ['t', 'long', 'jacket', 'hoodie', 'shirt']);
    const topC = enemy ? 0x1c1d21 : (o.shirt || pick(SHIRTS));
    const top = M(topC, 0.9, fabricTex(style === 'hoodie' ? 'knit' : 'cloth'));
    const jacket = style === 'jacket' ? M(pick(JACKETS), 0.75, fabricTex('cloth')) : null;
    const jeans = !enemy && Math.random() < 0.6;
    const pants = M(enemy ? 0x2a2b2e : (o.pants || pick(PANTS)), 0.9, fabricTex(jeans ? 'jeans' : 'cloth'));
    const shoeM = M(enemy ? 0x121212 : pick([0x1d1d1f, 0x5a3a22, 0xf2f2f2, 0x7a1f1f, 0x2a3a5a]), 0.5);
    const soleM = M(enemy ? 0x0a0a0a : 0xe8e4dc, 0.8);
    const sleeveLong = enemy || style === 'long' || style === 'jacket' || style === 'hoodie' || style === 'shirt';
    const torsoMat = jacket || top;
    const glove = enemy ? M(0x151515, 0.7) : skin;

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group(); root.add(body);
    const add = (parent, geo, mat, x, y, z, part, sx, sy, sz) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
      if (sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      m.userData.person = this; m.userData.part = part; parent.add(m); this.meshes.push(m); return m;
    };
    const G = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const j = this.j = {};
    j.hips = G(body, 0, 0.94, 0);
    add(j.hips, fem ? PG.pelvisF : PG.pelvisM, style === 'dress' ? top : pants, 0, 0.0, 0, 'body');
    if (style === 'dress') { const sk = add(j.hips, PG.skirt, top, 0, 0.02, 0, 'body'); sk.material = top; }
    j.spine = G(j.hips, 0, 0.03, 0);
    this.torso = add(j.spine, fem ? PG.torsoF : PG.torsoM, torsoMat, 0, 0, 0, 'body');
    if (style !== 'dress' && style !== 'enemy') add(j.spine, PG.belt, M(0x2a1d14, 0.5), 0, 0.005, 0, 'body', 1.18, 0.66, 1).rotation.x = Math.PI / 2;
    if (jacket) { add(j.spine, PG.placket, top, 0, 0.28, 0.115, 'body'); add(j.spine, PG.collar, jacket, 0, 0.505, 0.0, 'body', 1.25, 1, 1).rotation.set(Math.PI / 2, 0, Math.PI * 0.8); }
    if (style === 'shirt' || style === 'long') add(j.spine, PG.collar, top, 0, 0.515, 0.0, 'body', 1.1, 1, 1).rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
    if (style === 'hoodie') add(j.spine, PG.hood, top, 0, 0.5, -0.06, 'body', 1, 0.6, 0.8).rotation.x = 0.5;
    if (enemy) {
      const vm = M(0x2c3326, 0.8, fabricTex('cloth'));
      add(j.spine, PG.vest, vm, 0, 0.3, 0.07, 'body');
      add(j.spine, PG.vest, vm, 0, 0.3, -0.075, 'body');
      for (const px of [-0.1, 0, 0.1]) add(j.spine, PG.pouch, vm, px, 0.2, 0.115, 'body');
      add(j.spine, PG.belt, M(0x151515, 0.5), 0, 0.02, 0, 'body', 1.04, 0.62, 1).rotation.x = Math.PI / 2;
    }
    if (kind === 'civil' && Math.random() < 0.3) {
      const bm = M(pick([0x6b3a1e, 0x222222, 0x8b1e3f, 0x2a4a6a]), 0.6);
      add(j.spine, PG.bag, bm, 0, 0.3, -0.15, 'body');
      add(j.spine, PG.strap, bm, 0.1, 0.32, 0.105, 'body').rotation.z = 0.35;
    }
    j.neck = G(j.spine, 0, 0.53, 0);
    add(j.neck, PG.neck, enemy ? M(0x121214, 0.95) : skin, 0, 0.04, 0, 'head');
    j.head = G(j.neck, 0, 0.15, 0.005);
    const faceMat = M(0xffffff, 0.6, faceTex(skinC, {
      eye: pick(EYES), fem, mask: enemy, lip: fem ? pick(['#b5485a', '#c0605a', '#9a4048']) : hex(new THREE.Color(skinC).multiplyScalar(0.72).getHex()), brow: hex(pick(HAIRS)),
    }));
    this.headMesh = add(j.head, PG.head, faceMat, 0, 0, 0, 'head');
    this.headMesh.rotation.y = 0;
    const earM = enemy ? M(0x121214, 0.95) : skin;
    if (!enemy) { add(j.head, PG.ear, earM, 0.09, 0.0, -0.005, 'head', 0.45, 1, 0.75); add(j.head, PG.ear, earM, -0.09, 0.0, -0.005, 'head', 0.45, 1, 0.75); }
    add(j.head, PG.nose, enemy ? M(0x121214, 0.95) : skin, 0, -0.014, 0.093, 'head', 0.6, 0.95, 0.75);
    // pelo, gorros y accesorios
    if (enemy) {
      this.hat = add(j.head, PG.beanie, M(o.hat || 0x2a2a2e, 0.95, fabricTex('knit')), 0, 0.02, -0.004, 'head', 1.06, 1.12, 1.06);
      const rim = new THREE.Mesh(PG.beanieRim, this.hat.material); rim.rotation.x = Math.PI / 2; rim.position.y = 0.0; rim.scale.set(1, 1.05, 1); this.hat.add(rim);
    } else {
      const hc = M(pick(HAIRS), 0.75);
      const r = Math.random();
      if (fem) {
        add(j.head, PG.hairCap, hc, 0, 0.008, -0.006, 'head', 1.05, 1.08, 1.1);
        if (r < 0.4) add(j.head, PG.hairBack, hc, 0, -0.06, -0.012, 'head', 1.08, 1.6, 1.1);
        else if (r < 0.7) add(j.head, PG.ponytail, hc, 0, -0.03, -0.12, 'head').rotation.x = 0.5;
        else add(j.head, PG.bun, hc, 0, 0.09, -0.07, 'head');
      } else if (r < 0.15) {
        add(j.head, PG.curl, hc, 0, 0.07, 0, 'head', 1);
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; add(j.head, PG.curl, hc, Math.cos(a) * 0.07, 0.05 + Math.random() * 0.03, Math.sin(a) * 0.06 - 0.01, 'head', 0.9); }
      } else if (r < 0.35) {
        const cm = M(pick(SHIRTS), 0.8);
        add(j.head, PG.cap, cm, 0, 0.02, -0.004, 'head', 1.04, 1.05, 1.04);
        add(j.head, PG.visor, cm, 0, 0.045, 0.1, 'head', 1, 1, 1.2);
      } else if (r < 0.9) add(j.head, PG.hairCap, hc, 0, 0.01, -0.008, 'head', 1.04, r < 0.6 ? 1.02 : 1.08, 1.08);
      if (!fem && Math.random() < 0.22) add(j.head, PG.beard, hc, 0, -0.012, 0.006, 'head', 1.04, 1.05, 1.06);
      if (Math.random() < 0.2) {
        const gm = M(0x111111, 0.3);
        for (const s of [-1, 1]) add(j.head, PG.glasses, gm, s * 0.035, 0.012, 0.1, 'head');
      }
    }
    // brazos: hombro, codo, mano (con articulaciones redondas para que no se vean cortes)
    const arm = (side) => {
      const sh = G(j.spine, side * 0.178, 0.45, 0);
      add(sh, PG.joint, sleeveLong || jacket ? torsoMat : top, 0, -0.01, 0, 'limb', 0.058, 0.05, 0.05);
      add(sh, PG.upper, sleeveLong || jacket ? torsoMat : top, 0, 0, 0, 'limb');
      const el = G(sh, 0, -0.27, 0);
      add(el, PG.fore, sleeveLong ? torsoMat : skin, 0, 0, 0, 'limb');
      const hd = G(el, 0, -0.26, 0);
      add(hd, PG.palm, glove, 0, -0.03, 0.004, 'limb', 0.85, 1.15, 0.5);
      add(hd, PG.thumb, glove, side * -0.028, -0.025, 0.02, 'limb').rotation.z = side * 0.5;
      return [sh, el, hd];
    };
    [j.lSh, j.lEl, j.lHand] = arm(1);
    [j.rSh, j.rEl, j.rHand] = arm(-1);
    const legSkin = style === 'dress';
    const leg = (side) => {
      const hp = G(j.hips, side * 0.088, -0.05, 0);
      add(hp, PG.thigh, legSkin ? skin : pants, 0, 0, 0, 'limb');
      const kn = G(hp, 0, -0.41, 0);
      add(kn, PG.shin, legSkin ? skin : pants, 0, 0, 0, 'limb');
      const ft = G(kn, 0, -0.42, 0);
      add(ft, PG.shoe, shoeM, 0, -0.035, 0.045, 'limb', enemy ? 1.1 : 1, enemy ? 1.25 : 1, 1);
      add(ft, PG.sole, soleM, 0, -0.068, 0.045, 'limb');
      return [hp, kn, ft];
    };
    [j.lHip, j.lKn, j.lFoot] = leg(1);
    [j.rHip, j.rKn, j.rFoot] = leg(-1);
    if (enemy) {
      const gm = M(0x18191b, 0.35, null, { metalness: 0.7 });
      const gun = this.gun = new THREE.Group();
      const parts = [[PG.gunSlide, 0, 0.03, 0.05], [PG.gunFrame, 0, 0.005, 0.03], [PG.gunGrip, 0, -0.045, -0.025]];
      for (const [g, x, y, z] of parts) { const m = new THREE.Mesh(g, gm); m.position.set(x, y, z); gun.add(m); }
      gun.children[2].rotation.x = 0.28;
      const br = new THREE.Mesh(PG.gunBarrel, gm); br.rotation.x = Math.PI / 2; br.position.set(0, 0.03, 0.15); gun.add(br);
      const tg = new THREE.Mesh(PG.trigger, gm); tg.rotation.y = Math.PI / 2; tg.position.set(0, -0.005, 0.02); gun.add(tg);
      gun.rotation.x = -Math.PI / 2; gun.position.set(0, -0.05, 0.02);
      j.rHand.add(gun);
    }
    const sc = o.scale || (enemy ? 1.06 : kind === 'hostage' ? (fem ? 0.95 : 0.98) : (fem ? 0.93 : 1) + (Math.random() - 0.5) * 0.08);
    root.scale.setScalar(sc);
    this.scale = sc;

    this.state = 'idle';
    this.t = Math.random() * 10;
    this.phase = Math.random() * 6;
    this.fallT = 0;
    this.peek = 0;
    this.crouch = 0;
    this.dead = false;
    this.vel = new THREE.Vector3();
    this.fall = null;
    this.blend = null; // pose anterior para suavizar los cambios de estado
  }
  get pos() { return this.root.position; }
  set heading(h) { this.root.rotation.y = h; }
  get heading() { return this.root.rotation.y; }
  headWorld(v = new THREE.Vector3()) { return this.headMesh.getWorldPosition(v); }
  chestWorld(v = new THREE.Vector3()) { return this.torso.localToWorld(v.set(0, 0.3, 0)); }

  thermal(on) {
    for (const m of this.mats) {
      if (on) { if (m.userData.map === undefined) { m.userData.map = m.map; } m.map = null; }
      else if (m.userData.map !== undefined) { m.map = m.userData.map; delete m.userData.map; }
      m.emissive.setHex(on ? 0xffffff : 0x000000);
      m.emissiveIntensity = on ? (this.kind === 'enemy' ? 2.6 : 2.0) : 0;
      m.needsUpdate = true;
    }
  }
  // impacto: el cuerpo recibe el golpe desde la dirección de la bala (en el mundo)
  hit(dirWorld, head) {
    const inv = -this.heading;
    const lx = dirWorld.x * Math.cos(inv) + dirWorld.z * Math.sin(inv);
    const lz = -dirWorld.x * Math.sin(inv) + dirWorld.z * Math.cos(inv);
    this.fall = { lx, lz, head, side: lx > 0 ? 1 : -1, back: lz < 0.2, k: Math.random() };
    this.state = 'fall'; this.fallT = 0;
  }

  // Pone todas las articulaciones a partir de un objeto de ángulos.
  pose(p) {
    const j = this.j;
    j.hips.position.set(p.hipsX || 0, 0.94 - (p.drop || 0), p.hipsZ || 0);
    j.hips.rotation.set(p.hipsP || 0, p.hipsY || 0, p.hipsR || 0);
    j.spine.rotation.set(p.spX || 0, p.spY || 0, p.spZ || 0);
    j.neck.rotation.set(p.nX || 0, p.nY || 0, p.nZ || 0);
    j.lSh.rotation.set(p.lSx || 0, p.lSy || 0, p.lSz === undefined ? 0.1 : p.lSz);
    j.rSh.rotation.set(p.rSx || 0, p.rSy || 0, p.rSz === undefined ? -0.1 : p.rSz);
    j.lEl.rotation.set(p.lEx === undefined ? -0.12 : p.lEx, 0, p.lEz || 0);
    j.rEl.rotation.set(p.rEx === undefined ? -0.12 : p.rEx, 0, p.rEz || 0);
    j.lHand.rotation.set(p.lWx || 0, 0, 0); j.rHand.rotation.set(p.rWx || 0, 0, 0);
    j.lHip.rotation.set(p.lHx || 0, p.lHy || 0, p.lHz || 0);
    j.rHip.rotation.set(p.rHx || 0, p.rHy || 0, p.rHz || 0);
    j.lKn.rotation.set(p.lKx || 0, 0, 0);
    j.rKn.rotation.set(p.rKx || 0, 0, 0);
    j.lFoot.rotation.set(p.lFx || 0, 0, 0);
    j.rFoot.rotation.set(p.rFx || 0, 0, 0);
  }

  update(dt) {
    this.t += dt;
    const t = this.t, s = Math.sin, c = Math.cos;
    const st = this.state;
    if (st !== this.lastState) { this.lastState = st; this.blendT = 0; this.snap = this.snapshot(); }
    if (st === 'walk' || st === 'run') {
      const run = st === 'run';
      const spd = this.animSpeed || this.vel.length();
      this.phase += dt * (run ? 1.55 : 2.15) * Math.max(0.7, spd) * Math.PI / 2.6;
      const ph = this.phase, a = run ? 0.85 : 0.42, pn = this.panic;
      const sw = s(ph), cw = c(ph);
      // pierna: adelante con la rodilla estirada al apoyar y doblada al levantar; el pie rueda
      const lift = k => Math.max(0, s(k)) ;
      this.pose({
        drop: (run ? 0.06 : 0.025) * Math.abs(c(ph)) + (run ? 0.04 : 0),
        hipsY: sw * (run ? 0.12 : 0.09), hipsR: cw * 0.035,
        spX: run ? 0.32 : 0.05, spY: -sw * (run ? 0.18 : 0.12), spZ: -cw * 0.02,
        nX: run ? -0.2 : -0.03, nY: sw * 0.05,
        lHx: -sw * a, rHx: sw * a,
        lKx: lift(ph + Math.PI * 0.9) * a * (run ? 2.1 : 1.6) + 0.06, rKx: lift(ph - Math.PI * 0.1) * a * (run ? 2.1 : 1.6) + 0.06,
        lFx: sw * 0.25 - 0.05, rFx: -sw * 0.25 - 0.05,
        lSx: pn ? -2.6 + sw * 0.3 : sw * a * 0.9, rSx: pn ? -2.6 - sw * 0.3 : -sw * a * 0.9,
        lSz: pn ? 0.4 : 0.12, rSz: pn ? -0.4 : -0.12,
        lEx: run ? -1.5 : -0.3 - Math.max(0, sw) * 0.35, rEx: run ? -1.5 : -0.3 - Math.max(0, -sw) * 0.35,
      });
      this.pos.addScaledVector(this.vel, dt);
    } else if (st === 'idle') {
      const fid = s(t * 0.37 + this.phase) * 0.5 + 0.5;
      this.pose({
        drop: s(t * 1.6) * 0.003, hipsR: 0.03 + fid * 0.02, hipsX: fid * 0.02,
        spX: s(t * 1.6) * 0.012, spZ: -0.03 - fid * 0.02, nY: s(t * 0.4 + this.phase) * 0.45, nX: -0.03,
        lSz: 0.12, rSz: -0.12, lEx: -0.2, rEx: -0.25,
        lHz: 0.06, rHz: -0.02, lKx: 0.08 + fid * 0.1, rKx: 0.04,
      });
    } else if (st === 'hold') {
      // secuestrador: brazo izquierdo rodea el cuello del rehén, la pistola apunta a su sien
      const side = this.side || 0;
      const ph = (this.phase += dt * 5 * Math.abs(side));
      const step = side ? s(ph) * 0.28 : 0;
      const cr = this.crouch, pk = this.peek, nerv = s(t * 2.3) * 0.5 + s(t * 5.1) * 0.2;
      this.pose({
        drop: cr * 0.24 + (side ? Math.abs(s(ph)) * 0.02 : 0) + s(t * 2) * 0.006,
        hipsX: pk * 0.04, hipsR: -pk * 0.05,
        spZ: -pk * 0.34, spX: 0.1 + cr * 0.14, spY: nerv * 0.03, nZ: -pk * 0.28, nY: s(t * 0.9) * 0.22 + nerv * 0.05, nX: -0.06,
        lSx: -1.35, lSz: -0.42, lSy: -0.2, lEz: -1.55, lEx: -0.25,
        rSx: -1.5 + s(t * 3) * 0.03, rSz: 0.38, rEx: -0.45, rWx: 0.2,
        lHx: -cr * 0.75 - 0.05, rHx: -cr * 0.75 + 0.05, lKx: cr * 1.3 + 0.08, rKx: cr * 1.3 + 0.08, lFx: -cr * 0.5, rFx: -cr * 0.5,
        lHz: step > 0 ? step : 0.05, rHz: step < 0 ? step : -0.05,
      });
    } else if (st === 'held') {
      const side = this.side || 0;
      const ph = (this.phase += dt * 5 * Math.abs(side));
      const step = side ? s(ph) * 0.26 : 0, str = s(t * 2.6) * 0.5 + s(t * 6.3) * 0.2;
      this.pose({
        drop: (side ? Math.abs(s(ph)) * 0.02 : 0) + 0.02,
        spZ: str * 0.08, spX: -0.12 + s(t * 3.3) * 0.03, spY: str * 0.06, nY: s(t * 1.7) * 0.3, nX: -0.18, nZ: str * 0.1,
        lSx: -1.15, lSz: -0.4, lEx: -1.6 + str * 0.1, rSx: -1.15, rSz: 0.4, rEx: -1.6 - str * 0.1,
        lHz: step > 0 ? step : 0.04, rHz: step < 0 ? step : -0.04,
        lKx: 0.12 + str * 0.06, rKx: 0.12 - str * 0.06, lHx: -0.05, rHx: -0.05,
      });
    } else if (st === 'fall') {
      this.updateFall(dt);
    } else if (st === 'down') {
      // quieto en el suelo
    } else if (st === 'cheer') {
      const w = s(t * 8), jump = Math.max(0, s(t * 4.5));
      this.pose({ drop: -jump * 0.05, nX: -0.25, spX: -0.08, lSz: 2.65 + w * 0.25, rSz: -2.65 - w * 0.25, lEx: -0.35, rEx: -0.35, lKx: 0.12 + jump * 0.2, rKx: 0.12 + jump * 0.2, lHx: -jump * 0.1, rHx: -jump * 0.1 });
    } else if (st === 'cower') {
      // agachado, cubriéndose la cabeza y temblando
      const tr = s(t * 22) * 0.015;
      this.pose({ drop: 0.45, spX: 0.75 + tr, nX: 0.45, lHx: -1.7, rHx: -1.7, lKx: 2.3, rKx: 2.3, lFx: -0.6, rFx: -0.6, lSx: -2.5, rSx: -2.5, lSz: -0.25, rSz: 0.25, lEx: -2.1, rEx: -2.1 });
    }
    // transición suave entre estados (0.18 s)
    if (this.snap && st !== 'fall' && st !== 'down') {
      this.blendT += dt;
      const k = Math.min(1, this.blendT / 0.18);
      if (k < 1) this.applyBlend(this.snap, 1 - k * k * (3 - 2 * k)); else this.snap = null;
    }
  }

  snapshot() {
    const out = [];
    for (const k in this.j) { const o = this.j[k]; out.push([o, o.rotation.x, o.rotation.y, o.rotation.z, o.position.y]); }
    return out;
  }
  applyBlend(snap, w) {
    for (const [o, x, y, z, py] of snap) {
      o.rotation.x += (x - o.rotation.x) * w; o.rotation.y += (y - o.rotation.y) * w; o.rotation.z += (z - o.rotation.z) * w;
      if (o === this.j.hips) o.position.y += (py - o.position.y) * w;
    }
  }

  // Caída con física simple: sacudón por el impacto, las rodillas ceden, el cuerpo cae hacia
  // atrás (o de lado) acelerando, rebota un poco contra el suelo y los brazos quedan flojos.
  updateFall(dt) {
    const f = this.fall || (this.fall = { lx: 0, lz: -1, head: false, side: 1, back: true, k: 0.5 });
    if (!f.init) {
      f.init = true; f.ang = 0; f.vel = 0; f.bounced = false;
      f.arms = { l: 0, r: 0, lv: 0, rv: 0 };
      f.twist = f.side * (0.25 + f.k * 0.35);
    }
    this.fallT += dt;
    const t = this.fallT, s = Math.sin;
    // 0-0.12 s: el golpe empuja (la cabeza se va atrás si fue en la cabeza)
    const jolt = Math.exp(-t * 14) * Math.min(1, t * 40);
    // ángulo de caída: arranca después del sacudón, como un péndulo que se vence
    if (t > 0.08) {
      const target = Math.PI * 0.5;
      if (f.ang < target) { f.vel += (2.2 + 9.5 * Math.sin(Math.max(0.05, f.ang))) * dt; f.ang += f.vel * dt; }
      if (f.ang >= target) {
        f.ang = target;
        if (!f.bounced) { f.bounced = true; f.vel = -f.vel * 0.18; f.arms.lv += 9; f.arms.rv -= 9; }
        else f.vel = 0;
      }
      if (f.bounced && f.vel < 0) { f.ang += f.vel * dt; f.vel += 9 * dt; if (f.ang > target) f.ang = target; }
    }
    const k = f.ang / (Math.PI * 0.5), e = k;
    // brazos: resorte amortiguado que los deja ir hacia arriba al caer y rebotar contra el suelo
    const A = f.arms, kick = f.vel * 0.12;
    A.lv += ((1.6 * e + kick) - A.l) * 40 * dt; A.lv *= Math.exp(-dt * 6); A.l += A.lv * dt;
    A.rv += ((-1.6 * e - kick) - A.r) * 40 * dt; A.rv *= Math.exp(-dt * 6); A.r += A.rv * dt;
    // el cuerpo gira sobre los pies: hacia atrás y un poco de lado
    this.body.rotation.set(-e * Math.PI * 0.5 * (f.back ? 1 : 0.85), 0, f.twist * e * (f.back ? 0.3 : 1));
    this.body.position.set(0, e * 0.1, -e * 0.35);
    const buckle = Math.min(1, t / 0.35);
    this.pose({
      drop: s(Math.min(1, t / 0.6) * Math.PI) * 0.28 * (1 - e * 0.6) + buckle * 0.06,
      spX: -0.25 * e - jolt * 0.3 + buckle * 0.25 * (1 - e),
      spZ: f.side * jolt * 0.2,
      nX: -0.55 * e - (f.head ? jolt * 0.9 : jolt * 0.3), nZ: f.side * 0.3 * e, nY: f.side * 0.4 * e,
      lSx: -0.4 - e * 0.9, lSz: 0.15 + Math.max(0, A.l), lEx: -0.3 - e * 0.5,
      rSx: -0.5 - e * 0.8, rSz: -0.15 + Math.min(0, A.r), rEx: -0.2 - e * 0.6,
      lHx: -0.35 * buckle + e * 0.1, rHx: -0.15 * buckle - e * 0.25, lHz: 0.08 * e, rHz: -0.12 * e,
      lKx: buckle * 1.1 * (1 - e * 0.5), rKx: buckle * 0.6 * (1 - e * 0.3), lFx: 0.3 * e, rFx: 0.4 * e,
    });
    if (t > 2.6) this.state = 'down';
  }

  dispose() { for (const m of this.mats) m.dispose(); }
}
