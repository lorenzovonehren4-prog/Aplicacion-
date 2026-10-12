'use strict';
// Código Rojo: peatones. Caminan por las veredas dando la vuelta a la manzana, aparecen cerca
// de la cámara y se reciclan cuando quedan lejos. Si viene un carro hacia ellos, saltan a un
// lado (nadie sale herido) y después vuelven a la vereda.

const PEDS = { list: [], on: false, t: 0, max: 14 };
const PED_FACE = 35, PED_FAR = 95;     // más lejos que PED_FACE sin cara; más lejos que PED_FAR no se dibuja

// rectángulo por el que se camina en una manzana (al medio de la vereda)
function pedRect(ci, cj) {
  const x0 = GRID[ci] + ROAD_W / 2 + 1.5, x1 = GRID[ci + 1] - ROAD_W / 2 - 1.5;
  const z0 = GRID[cj] + ROAD_W / 2 + 1.5, z1 = GRID[cj + 1] - ROAD_W / 2 - 1.5;
  return { x0, x1, z0, z1, w: x1 - x0, d: z1 - z0, P: 2 * (x1 - x0 + z1 - z0) };
}
// punto y rumbo a la distancia s del perímetro (en sentido horario visto desde arriba)
function rectAt(r, s) {
  s = ((s % r.P) + r.P) % r.P;
  if (s < r.w) return [r.x0 + s, r.z0, 0];
  s -= r.w; if (s < r.d) return [r.x1, r.z0 + s, 1];
  s -= r.d; if (s < r.w) return [r.x1 - s, r.z1, 2];
  s -= r.w; return [r.x0, r.z1 - s, 3];
}
const SIDE_DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Se arman 14 y se usan según los gráficos (PEDS.max: 14 en altos, 10 en medios y 6 en bajos).
function initPeds() {
  PEDS.on = true;
  for (let i = 0; i < 14; i++) {
    const p = new Person('civil', { lite: true });
    p.root.visible = false;
    W.scene.add(p.root);
    PEDS.list.push({ p, rect: null, s: 0, dir: 1, speed: 1.2, off: new THREE.Vector3(), dodge: 0 });
  }
}

function placePed(k, cx, cz) {
  // una manzana (que no sea el canal) entre 35 y 110 m de la cámara
  for (let tries = 0; tries < 30; tries++) {
    const ci = Math.floor(Math.random() * (GRID.length - 1)), cj = Math.floor(Math.random() * (GRID.length - 1));
    if (cellKind(ci, cj) === 'canal') continue;
    const r = pedRect(ci, cj), s = Math.random() * r.P, [x, z] = rectAt(r, s);
    const d = Math.hypot(x - cx, z - cz);
    if (d < 35 || d > 110) continue;
    if (x > HILL.x0 - 4 && x < HILL.x1 + 4 && z > HILL.z0 - 4 && z < HILL.z1 + 4) continue;
    Object.assign(k, { rect: r, s, dir: Math.random() < 0.5 ? 1 : -1, speed: 1.0 + Math.random() * 0.5, dodge: 0 });
    k.off.set(0, 0, 0);
    k.p.state = 'walk'; k.p.panic = false; k.p.root.visible = true;
    k.p.pos.set(x, 0.16, z);
    return true;
  }
  k.p.root.visible = false; k.rect = null;
  return false;
}

function updatePeds(dt, cam) {
  if (!PEDS.on) return;
  const cars = G.all.map(a => a.body);
  for (let i = 0; i < PEDS.list.length; i++) {
    const k = PEDS.list[i], p = k.p;
    if (i >= PEDS.max) { if (k.rect) { k.rect = null; p.root.visible = false; } continue; }
    if (!k.rect) { if (Math.random() < dt * 2) placePed(k, cam.x, cam.z); continue; }
    if (Math.hypot(p.pos.x - cam.x, p.pos.z - cam.z) > 140) { placePed(k, cam.x, cam.z); continue; }
    // ¿viene un carro?
    let threat = null;
    for (const b of cars) {
      const sp = Math.hypot(b.vx, b.vz);
      if (sp < 3) continue;
      const rx = p.pos.x - b.x, rz = p.pos.z - b.z, d = Math.hypot(rx, rz);
      if (d > 9 + sp * 0.35) continue;
      const ux = b.vx / sp, uz = b.vz / sp, ahead = rx * ux + rz * uz, lat = rx * uz - rz * ux;
      if (ahead > -1 && Math.abs(lat) < 2.6) { threat = { ux, uz, lat, d, b }; break; }
    }
    if (threat && k.dodge <= 0) {
      // salto al costado, alejándose del camino del carro
      const side = threat.lat >= 0 ? 1 : -1;
      k.vx = threat.uz * side * 5.5; k.vz = -threat.ux * side * 5.5;
      k.dodge = 0.75; p.state = 'run'; p.panic = true;
      p.heading = Math.atan2(k.vx, k.vz);
      if (Math.random() < 0.3) SFX.yelp && SFX.yelp();
    }
    if (k.dodge > 0) {
      k.dodge -= dt;
      k.off.x += k.vx * dt; k.off.z += k.vz * dt;
      p.animSpeed = 4;
      if (k.dodge <= 0) { p.state = 'walk'; p.panic = false; }
    } else {
      k.s += k.dir * k.speed * dt;
      k.off.multiplyScalar(Math.exp(-dt * 1.5));
      p.animSpeed = k.speed;
    }
    // nunca dentro de un carro: si está muy cerca, se lo empuja afuera
    for (const b of cars) {
      const rx = p.pos.x - b.x, rz = p.pos.z - b.z, d = Math.hypot(rx, rz);
      if (d < 2.2 && d > 0.01) { k.off.x += rx / d * (2.2 - d); k.off.z += rz / d * (2.2 - d); }
    }
    const [x, z, side] = rectAt(k.rect, k.s);
    const px = x + k.off.x, pz = z + k.off.z;
    p.pos.set(px, onRoad(px, pz) ? groundH(px, pz) : 0.16, pz);
    if (k.dodge <= 0) { const sd = SIDE_DIR[side]; p.heading = Math.atan2(sd[0] * k.dir, sd[1] * k.dir); }
    p.vel.set(0, 0, 0);
    p.update(dt);
  }
}

// Nivel de detalle según la distancia a la cámara (también con la partida en pausa).
function updatePedLods(cp) {
  if (!PEDS.on) return;
  for (const k of PEDS.list) {
    if (!k.rect) continue;
    const d = Math.hypot(k.p.pos.x - cp.x, k.p.pos.z - cp.z);
    k.p.root.visible = d < PED_FAR;
    k.p.setLod(d > PED_FACE);
  }
}
W.lodHooks.push(updatePedLods);
