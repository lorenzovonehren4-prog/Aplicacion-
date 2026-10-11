'use strict';
// Último Disparo: personas en 3D armadas con piezas simples y animadas por articulaciones.
// Miran hacia +Z local. kind: 'enemy' (secuestrador), 'hostage' (rehén) o 'civil'.

const PG = (() => {
  const cap = (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 3, s);
  const head = new THREE.SphereGeometry(0.115, 16, 12); head.scale(1, 1.12, 1.02);
  const torso = cap(0.16, 0.26, 12); torso.scale(1.22, 1, 0.7);
  return {
    head, torso,
    pelvis: new THREE.BoxGeometry(0.33, 0.17, 0.2),
    upper: cap(0.054, 0.2), fore: cap(0.046, 0.2), hand: new THREE.SphereGeometry(0.047, 8, 6),
    thigh: cap(0.073, 0.3), shin: cap(0.06, 0.3), shoe: new THREE.BoxGeometry(0.11, 0.07, 0.25),
    eye: new THREE.BoxGeometry(0.03, 0.022, 0.02),
    hair: new THREE.SphereGeometry(0.122, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    longHair: new THREE.BoxGeometry(0.22, 0.26, 0.08),
    beanie: new THREE.SphereGeometry(0.125, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    cap: new THREE.CylinderGeometry(0.125, 0.125, 0.06, 14), visor: new THREE.BoxGeometry(0.2, 0.015, 0.12),
    band: new THREE.BoxGeometry(0.2, 0.05, 0.1),
    gunBody: new THREE.BoxGeometry(0.035, 0.05, 0.17), gunGrip: new THREE.BoxGeometry(0.03, 0.09, 0.04),
    bag: new THREE.BoxGeometry(0.26, 0.3, 0.12),
  };
})();

const SKINS = [0xf1c7a1, 0xd9a57b, 0xb97f55, 0x8d5a3b, 0x64412b, 0xe8b88f];
const SHIRTS = [0x2f6fde, 0xe2443b, 0x2eaa6a, 0xf2b632, 0x9b59d0, 0xf07a2b, 0x27b5c2, 0xe9e4da, 0xd94f8a, 0x6c8a3a, 0x3a4f8f, 0xc9c2b4];
const PANTS = [0x2c3e64, 0x3d3d44, 0x5a4632, 0x1f2a36, 0x6d6a60, 0x24324d];
const HAIRS = [0x1e140e, 0x3b2616, 0x6a4523, 0xb98b4e, 0x111111, 0x8a8a8a];
const pick = a => a[Math.floor(Math.random() * a.length)];

class Person {
  constructor(kind, o = {}) {
    this.kind = kind;
    this.mats = [];
    this.meshes = [];
    const M = (c, r = 0.85) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }); m.userData.base = c; this.mats.push(m); return m; };
    const skin = M(o.skin || pick(SKINS), 0.7);
    let shirt, pants, sleeves;
    if (kind === 'enemy') { shirt = M(0x1d1f24, 0.95); pants = M(0x26282c, 0.95); sleeves = shirt; }
    else { shirt = M(o.shirt || pick(SHIRTS)); pants = M(o.pants || pick(PANTS)); sleeves = Math.random() < 0.5 ? shirt : skin; }
    const shoeM = M(kind === 'enemy' ? 0x111111 : pick([0x222222, 0x5a3a22, 0xeeeeee, 0x7a1f1f]), 0.6);
    this.skinMat = skin;

    const root = this.root = new THREE.Group();
    const body = this.body = new THREE.Group(); root.add(body);
    const add = (parent, geo, mat, x, y, z, part) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true;
      m.userData.person = this; m.userData.part = part; parent.add(m); this.meshes.push(m); return m;
    };
    const G = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const j = this.j = {};
    j.hips = G(body, 0, 0.95, 0);
    add(j.hips, PG.pelvis, pants, 0, 0, 0, 'body');
    j.spine = G(j.hips, 0, 0.05, 0);
    this.torso = add(j.spine, PG.torso, shirt, 0, 0.27, 0, 'body');
    j.neck = G(j.spine, 0, 0.52, 0);
    j.head = G(j.neck, 0, 0.14, 0);
    const headMat = kind === 'enemy' ? M(0x141416, 0.95) : skin;
    this.headMesh = add(j.head, PG.head, headMat, 0, 0, 0, 'head');
    // cara: ojos (y en el secuestrador, la abertura del pasamontañas)
    const eyeM = M(0x161616, 0.4);
    if (kind === 'enemy') add(j.head, PG.band, skin, 0, 0.025, 0.065, 'head');
    add(j.head, PG.eye, eyeM, 0.042, 0.025, 0.112, 'head');
    add(j.head, PG.eye, eyeM, -0.042, 0.025, 0.112, 'head');
    // pelo, gorro o gorra
    if (kind === 'enemy') {
      this.hat = add(j.head, PG.beanie, M(o.hat || 0x2a2a2e, 0.95), 0, 0.03, -0.005, 'head');
      this.hat.scale.set(1.04, 1.1, 1.04);
    } else {
      const hc = M(pick(HAIRS), 0.9), r = Math.random();
      add(j.head, PG.hair, hc, 0, 0.012, -0.012, 'head').scale.set(1.02, 1.06, 1.04);
      if (r < 0.35) add(j.head, PG.longHair, hc, 0, -0.1, -0.08, 'head');
      else if (r < 0.55) {
        const cm = M(pick(SHIRTS), 0.8);
        add(j.head, PG.cap, cm, 0, 0.085, -0.005, 'head');
        add(j.head, PG.visor, cm, 0, 0.07, 0.1, 'head');
      }
    }
    const arm = (side) => {
      const sh = G(j.spine, side * 0.215, 0.45, 0);
      add(sh, PG.upper, sleeves === skin ? shirt : sleeves, 0, -0.14, 0, 'limb');
      const el = G(sh, 0, -0.28, 0);
      add(el, PG.fore, sleeves, 0, -0.13, 0, 'limb');
      const hd = G(el, 0, -0.27, 0);
      add(hd, PG.hand, skin, 0, 0, 0, 'limb');
      return [sh, el, hd];
    };
    [j.lSh, j.lEl, j.lHand] = arm(1);
    [j.rSh, j.rEl, j.rHand] = arm(-1);
    const leg = (side) => {
      const hp = G(j.hips, side * 0.1, -0.03, 0);
      add(hp, PG.thigh, pants, 0, -0.21, 0, 'limb');
      const kn = G(hp, 0, -0.43, 0);
      add(kn, PG.shin, pants, 0, -0.21, 0, 'limb');
      add(kn, PG.shoe, shoeM, 0, -0.43, 0.05, 'limb');
      return [hp, kn];
    };
    [j.lHip, j.lKn] = leg(1);
    [j.rHip, j.rKn] = leg(-1);
    if (kind === 'enemy') {
      const gm = M(0x0d0d0f, 0.4); gm.metalness = 0.6;
      const gun = this.gun = new THREE.Group();
      const b = new THREE.Mesh(PG.gunBody, gm); b.position.set(0, 0.02, 0.05); gun.add(b);
      const g2 = new THREE.Mesh(PG.gunGrip, gm); g2.position.set(0, -0.025, -0.01); g2.rotation.x = 0.25; gun.add(g2);
      gun.rotation.x = -Math.PI / 2;
      j.rHand.add(gun);
    }
    if (kind === 'civil' && Math.random() < 0.3) add(j.spine, PG.bag, M(pick([0x6b3a1e, 0x222222, 0x8b1e3f])), 0, 0.28, -0.16, 'body');
    const sc = o.scale || (kind === 'enemy' ? 1.05 : kind === 'hostage' ? 0.95 : 0.92 + Math.random() * 0.12);
    root.scale.setScalar(sc);
    this.scale = sc;

    this.state = 'idle';
    this.t = Math.random() * 10;
    this.phase = Math.random() * 6;
    this.fallT = 0;
    this.peek = 0;   // -1..1 (secuestrador asomándose)
    this.crouch = 0; // 0..1
    this.dead = false;
    this.vel = new THREE.Vector3();
  }
  get pos() { return this.root.position; }
  set heading(h) { this.root.rotation.y = h; }
  get heading() { return this.root.rotation.y; }
  headWorld(v = new THREE.Vector3()) { return this.headMesh.getWorldPosition(v); }
  chestWorld(v = new THREE.Vector3()) { return this.torso.getWorldPosition(v); }

  thermal(on) {
    for (const m of this.mats) {
      m.emissive.setHex(on ? 0xffffff : 0x000000);
      m.emissiveIntensity = on ? (this.kind === 'enemy' ? 0.85 : 0.75) : 0;
    }
  }

  // Pone todas las articulaciones a partir de un objeto de ángulos.
  pose(p) {
    const j = this.j;
    j.hips.position.y = 0.95 - (p.drop || 0);
    j.hips.rotation.set(0, p.hipsY || 0, 0);
    j.spine.rotation.set(p.spX || 0, p.spY || 0, p.spZ || 0);
    j.neck.rotation.set(p.nX || 0, p.nY || 0, p.nZ || 0);
    j.lSh.rotation.set(p.lSx || 0, p.lSy || 0, p.lSz || 0.08);
    j.rSh.rotation.set(p.rSx || 0, p.rSy || 0, p.rSz || -0.08);
    j.lEl.rotation.set(p.lEx || 0, 0, p.lEz || 0);
    j.rEl.rotation.set(p.rEx || 0, 0, p.rEz || 0);
    j.lHip.rotation.set(p.lHx || 0, 0, p.lHz || 0);
    j.rHip.rotation.set(p.rHx || 0, 0, p.rHz || 0);
    j.lKn.rotation.set(p.lKx || 0, 0, 0);
    j.rKn.rotation.set(p.rKx || 0, 0, 0);
  }

  update(dt) {
    this.t += dt;
    const t = this.t, s = Math.sin, c = Math.cos;
    const st = this.state;
    if (st === 'walk' || st === 'run') {
      const run = st === 'run';
      const spd = this.animSpeed || this.vel.length();
      this.phase += dt * (run ? 2.1 : 2.6) * Math.max(0.6, spd) ;
      const ph = this.phase, a = run ? 0.9 : 0.5;
      this.pose({
        drop: Math.abs(s(ph)) * (run ? 0.05 : 0.025) - (run ? 0.02 : 0),
        spX: run ? 0.25 : 0.04, spY: s(ph) * 0.12,
        lHx: -s(ph) * a, rHx: s(ph) * a,
        lKx: Math.max(0, s(ph + 1.2)) * a * 1.4 + 0.05, rKx: Math.max(0, -s(ph + 1.2)) * a * 1.4 + 0.05,
        lSx: s(ph) * a * (this.panic ? 0.4 : 0.8) - (this.panic ? 2.6 : 0), rSx: -s(ph) * a * (this.panic ? 0.4 : 0.8) - (this.panic ? 2.6 : 0),
        lEx: run ? -1.4 : -0.25, rEx: run ? -1.4 : -0.25,
        lSz: this.panic ? 0.5 : 0.1, rSz: this.panic ? -0.5 : -0.1,
      });
      this.pos.addScaledVector(this.vel, dt);
    } else if (st === 'idle') {
      this.pose({ drop: s(t * 1.6) * 0.004, spX: s(t * 1.6) * 0.015, nY: s(t * 0.4) * 0.4, lSz: 0.1, rSz: -0.1, lEx: -0.15, rEx: -0.15 });
    } else if (st === 'hold') {
      // secuestrador: brazo izquierdo al cuello del rehén, pistola en la sien
      const side = this.side || 0; // paso lateral (-1, 0, 1)
      const ph = (this.phase += dt * 5.5 * Math.abs(side));
      const step = side ? s(ph) * 0.32 : 0;
      const cr = this.crouch, pk = this.peek;
      this.pose({
        drop: cr * 0.22 + (side ? Math.abs(s(ph)) * 0.02 : 0) + s(t * 2) * 0.006,
        spZ: -pk * 0.32, spX: 0.12 + cr * 0.12, nZ: -pk * 0.25, nY: s(t * 0.9) * 0.15,
        lSx: -1.45, lSz: -0.3, lEz: -1.35,
        rSx: -1.55 + s(t * 3) * 0.04, rSz: 0.32, rEx: -0.35,
        lHx: -cr * 0.7, rHx: -cr * 0.7, lKx: cr * 1.2, rKx: cr * 1.2,
        lHz: step > 0 ? step : 0, rHz: step < 0 ? step : 0,
      });
    } else if (st === 'held') {
      const side = this.side || 0;
      const ph = (this.phase += dt * 5.5 * Math.abs(side));
      const step = side ? s(ph) * 0.3 : 0;
      this.pose({
        drop: side ? Math.abs(s(ph)) * 0.02 : 0,
        spZ: s(t * 2.6) * 0.06, spX: -0.08 + s(t * 3.3) * 0.03, nY: s(t * 1.7) * 0.25, nX: -0.12,
        lSx: -1.05, lSz: -0.35, lEx: -1.55, rSx: -1.05, rSz: 0.35, rEx: -1.55,
        lHz: step > 0 ? step : 0.03, rHz: step < 0 ? step : -0.03,
        lKx: 0.08 + s(t * 2.6) * 0.06, rKx: 0.08 - s(t * 2.6) * 0.06,
      });
    } else if (st === 'fall') {
      // cae de espaldas: el cuerpo gira sobre los pies, las rodillas ceden y los brazos se abren
      this.fallT += dt;
      const k = Math.min(1, this.fallT / 0.75), e = k * k;
      this.body.rotation.x = -e * Math.PI * 0.5;
      this.body.position.y = e * 0.12;
      this.body.position.z = -e * 0.25;
      this.pose({
        drop: s(k * Math.PI) * 0.15, spX: -0.3 * k, nX: -0.5 * k,
        lSx: -1.2 * k - 0.4, lSz: 1.1 * k, rSx: -1.3 * k - 0.4, rSz: -1.2 * k, lEx: -0.6 * k, rEx: -0.4 * k,
        lHx: -0.5 * k, rHx: -0.2 * k, lKx: 0.9 * k, rKx: 0.5 * k,
      });
      if (k >= 1) { this.state = 'down'; }
    } else if (st === 'down') {
      this.body.rotation.x = -Math.PI * 0.5;
    } else if (st === 'cheer') {
      // rescatado: salta y saluda con los brazos arriba
      const w = s(t * 9);
      this.pose({ drop: -Math.max(0, s(t * 4.5)) * 0.04, nX: -0.2, lSz: 2.7 + w * 0.25, rSz: -2.7 - w * 0.25, lEx: -0.3, rEx: -0.3, lKx: 0.1, rKx: 0.1 });
    } else if (st === 'cower') {
      // agachado cubriéndose la cabeza
      this.pose({ drop: 0.42, spX: 0.7, nX: 0.4, lHx: -1.6, rHx: -1.6, lKx: 2.2, rKx: 2.2, lSx: -2.6, rSx: -2.6, lSz: -0.2, rSz: 0.2, lEx: -2, rEx: -2 });
    }
  }

  dispose() { for (const m of this.mats) m.dispose(); }
}
