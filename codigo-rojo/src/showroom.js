'use strict';
// Código Rojo: el garaje es una vitrina aparte. Plataforma giratoria, piso brillante que refleja,
// luces de estudio desde arriba, tiras de neón rojas y azules y el letrero en la pared.

const SHOW = { rot: 0 };
function neonTex(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.font = '700 150px Fredoka, Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff2a3a'; g.shadowBlur = 40; g.fillStyle = '#ff5a66';
  g.fillText(text, 512, 135); g.shadowBlur = 0; g.fillStyle = '#ffd9dc'; g.fillText(text, 512, 135);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function initShowroom() {
  if (SHOW.scene) return;
  const s = new THREE.Scene(); SHOW.scene = s;
  s.background = new THREE.Color(0x06070b);
  s.fog = new THREE.Fog(0x06070b, 16, 38);
  // entorno para los reflejos: un cuarto oscuro con paneles de luz en el techo y neones a los lados
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), new THREE.MeshBasicMaterial({ color: 0x16181e, side: THREE.BackSide })));
  const panel = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.3) });
  for (const x of [-6, 0, 6]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 14), panel); p.rotation.x = Math.PI / 2; p.position.set(x, 7.9, 0); es.add(p); }
  for (const [x, col] of [[-19.9, 0xff2030], [19.9, 0x2050ff]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(30, 0.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.5) })); p.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; p.position.set(x, 2, 0); es.add(p); }
  SHOW.env = W.pmrem.fromScene(es, 0.02).texture;
  s.environment = SHOW.env;
  // piso brillante
  const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x14161b, roughness: 0.22, metalness: 0.6 }));
  floor.receiveShadow = true; s.add(floor);
  // plataforma giratoria con anillo luminoso
  SHOW.table = new THREE.Group(); s.add(SHOW.table);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.2, 72), new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.35, metalness: 0.8 }));
  top.position.y = 0.1; top.receiveShadow = true; SHOW.table.add(top);
  for (let i = 0; i < 24; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 3.2), new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.5 })); l.position.y = 0.203; l.rotation.y = i / 24 * Math.PI; SHOW.table.add(l); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.035, 8, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3040).multiplyScalar(3), toneMapped: false }));
  ring.position.y = 0.19; s.add(ring);
  // pared curva del fondo con tiras de neón
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 11, 64, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: 0x101217, roughness: 0.8, side: THREE.BackSide }));
  wall.position.y = 5.5; s.add(wall);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.6 + i / 8 * Math.PI * 0.8, col = i % 2 ? 0x2a5bff : 0xff2a3a;
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.12, 7, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(3), toneMapped: false }));
    n.position.set(Math.sin(a) * 14.8, 4.5, Math.cos(a) * 14.8); s.add(n);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.25), new THREE.MeshBasicMaterial({ map: neonTex('CÓDIGO ROJO'), transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  sign.position.set(0, 7.2, -14.6); s.add(sign);
  // luces
  s.add(new THREE.HemisphereLight(0x9aa6c0, 0x101014, 0.5));
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.9); fill.position.set(0, 3, 10); s.add(fill);
  const key = new THREE.SpotLight(0xffffff, 70, 30, 0.6, 0.7, 1.2);
  key.position.set(2, 10, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004;
  s.add(key, key.target);
  for (const [x, col] of [[-7, 0xff2a3a], [7, 0x2a5bff]]) { const l = new THREE.PointLight(col, 60, 16, 1.5); l.position.set(x, 2.5, -3); s.add(l); }
  SHOW.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
}
function showroomCar(spec) {
  initShowroom();
  if (SHOW.car) SHOW.table.remove(SHOW.car.root);
  SHOW.car = makeCar(spec, {});
  SHOW.car.root.position.y = 0.2;
  SHOW.car.headMat.emissiveIntensity = 0.35; SHOW.car.tailMat.emissiveIntensity = 0.6;
  SHOW.table.add(SHOW.car.root);
  SHOW.pop = 0;
}
function renderShowroom(dt) {
  SHOW.rot += dt * 0.32; SHOW.pop = Math.min(1, SHOW.pop + dt * 2.5);
  SHOW.table.rotation.y = SHOW.rot;
  SHOW.car.root.position.y = 0.2 + (1 - SHOW.pop) * (1 - SHOW.pop) * 1.2;
  const wide = window.innerWidth > 760, cam = SHOW.cam;
  const asp = window.innerWidth / window.innerHeight;
  if (cam.aspect !== asp) { cam.aspect = asp; cam.fov = asp < 1 ? 58 : 36; cam.updateProjectionMatrix(); }
  const a = Math.sin(G.t * 0.15) * 0.25;
  cam.position.set(Math.sin(a) * 10.5, 2.7, Math.cos(a) * 10.5);
  // en pantallas anchas el carro queda a la izquierda (a la derecha va la lista)
  cam.lookAt(wide ? 2.1 : 0, wide ? 0.9 : 0.2, 0);
  const r = W.renderer, ex = r.toneMappingExposure;
  r.toneMappingExposure = 1.05;
  renderFrame(SHOW.scene, cam);
  r.toneMappingExposure = ex;
}
