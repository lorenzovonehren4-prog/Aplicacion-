/**
 * Mapas de entorno (reflejos e iluminación basada en imagen).
 *
 * El del estudio se genera renderizando una sala oscura con paneles de luz
 * (softboxes): así la pintura del auto refleja franjas de luz largas y limpias,
 * como en una sesión de fotos, en vez de un cielo genérico.
 */

import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';

export interface EnvironmentMap {
  texture: Texture;
  dispose(): void;
}

interface Softbox {
  width: number;
  height: number;
  position: [number, number, number];
  /** Hacia dónde mira el panel. */
  lookAt: [number, number, number];
  color: Color;
}

export function createStudioEnvironment(renderer: WebGLRenderer): EnvironmentMap {
  const scene = new Scene();
  const disposables: Array<{ dispose(): void }> = [];

  // Sala: paredes casi negras con un leve tono frío.
  const roomGeometry = new BoxGeometry(18, 9, 18);
  const roomMaterial = new MeshBasicMaterial({ color: new Color(0.012, 0.013, 0.016), side: BackSide });
  const room = new Mesh(roomGeometry, roomMaterial);
  room.position.y = 4;
  scene.add(room);
  disposables.push(roomGeometry, roomMaterial);

  const softboxes: Softbox[] = [
    // Panel cenital grande: la franja principal sobre el capó y los pontones.
    { width: 7, height: 2.2, position: [0, 6, 0], lookAt: [0, 0, 0], color: new Color(1, 1, 1).multiplyScalar(2.6) },
    // Tiras verticales a los lados: líneas de luz en los flancos.
    { width: 0.6, height: 5, position: [7, 2.5, -2], lookAt: [0, 1, 0], color: new Color(0.9, 0.95, 1).multiplyScalar(3.2) },
    { width: 0.6, height: 5, position: [-7, 2.5, 2], lookAt: [0, 1, 0], color: new Color(0.9, 0.95, 1).multiplyScalar(3.2) },
    // Contraluz rojo de la marca, bajo y detrás.
    { width: 8, height: 0.5, position: [0, 0.8, 8], lookAt: [0, 0.5, 0], color: new Color(1, 0.08, 0.12).multiplyScalar(2.2) },
    // Relleno frontal suave.
    { width: 5, height: 1.5, position: [0, 2.5, -8], lookAt: [0, 0.5, 0], color: new Color(0.8, 0.85, 1).multiplyScalar(0.9) },
  ];
  for (const box of softboxes) {
    const geometry = new PlaneGeometry(box.width, box.height);
    const material = new MeshBasicMaterial({ color: box.color });
    const panel = new Mesh(geometry, material);
    panel.position.set(...box.position);
    // La cara del plano (+Z) queda mirando al auto.
    panel.lookAt(...box.lookAt);
    scene.add(panel);
    disposables.push(geometry, material);
  }

  // Piso gris muy oscuro (lo que refleja la parte baja del auto).
  const floorGeometry = new PlaneGeometry(18, 18);
  const floorMaterial = new MeshBasicMaterial({ color: new Color(0.03, 0.03, 0.035) });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);
  disposables.push(floorGeometry, floorMaterial);

  const pmrem = new PMREMGenerator(renderer);
  const target: WebGLRenderTarget = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  for (const item of disposables) item.dispose();

  return {
    texture: target.texture,
    dispose: () => target.dispose(),
  };
}
