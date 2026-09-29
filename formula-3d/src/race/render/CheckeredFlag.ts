/**
 * Bandera a cuadros que flamea junto a la línea de meta cuando el jugador
 * termina. La tela es un plano subdividido que ondula en el sombreador de
 * vértices (ondas que viajan desde el mástil, más amplias en el borde libre),
 * con las normales recalculadas para que la luz marque los pliegues.
 */

import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type IUniform,
} from 'three';

const WIDTH = 3.2;
const HEIGHT = 2.1;
const POLE = 6.2;

function createCheckerTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 168;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cols = 8;
    const rows = 5;
    const w = canvas.width / cols;
    const hh = canvas.height / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f4f4f4' : '#111';
        ctx.fillRect(x * w, y * hh, w + 1, hh + 1);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class CheckeredFlag {
  readonly root = new Group();
  private readonly time: IUniform<number> = { value: 0 };
  private readonly strength: IUniform<number> = { value: 0 };
  private readonly cloth: Mesh;
  private readonly clothMaterial: MeshStandardMaterial;
  private readonly poleMesh: Mesh;
  private waving = false;

  constructor() {
    const geometry = new PlaneGeometry(WIDTH, HEIGHT, 28, 14);
    // El mástil queda en x = 0: la tela se extiende hacia +x.
    geometry.translate(WIDTH / 2, 0, 0);
    this.clothMaterial = new MeshStandardMaterial({ map: createCheckerTexture(), roughness: 0.8, side: DoubleSide });
    this.clothMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.flagTime = this.time;
      shader.uniforms.flagStrength = this.strength;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float flagTime;
          uniform float flagStrength;
          // Desplazamiento de la tela (z) en un punto: ondas que viajan desde el mástil.
          float flagWave(vec2 p) {
            float free = p.x / ${WIDTH.toFixed(1)};
            float a = (0.08 + 0.34 * free) * flagStrength;
            return a * (sin(p.x * 2.6 - flagTime * 7.5 + p.y * 0.6) + 0.35 * sin(p.x * 5.1 - flagTime * 11.0 - p.y * 1.3));
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `// Normal a partir de las derivadas del desplazamiento.
          float e = 0.05;
          float z0 = flagWave(position.xy);
          float dzx = (flagWave(position.xy + vec2(e, 0.0)) - z0) / e;
          float dzy = (flagWave(position.xy + vec2(0.0, e)) - z0) / e;
          vec3 objectNormal = normalize(vec3(-dzx, -dzy, 1.0));
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif`,
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position.x, position.y - 0.12 * flagStrength * pow(position.x / ${WIDTH.toFixed(1)}, 2.0), z0);`,
        );
    };
    this.cloth = new Mesh(geometry, this.clothMaterial);
    this.cloth.position.y = POLE - HEIGHT / 2 - 0.1;
    this.cloth.castShadow = true;
    const pole = new CylinderGeometry(0.045, 0.06, POLE, 8);
    pole.translate(0, POLE / 2, 0);
    this.poleMesh = new Mesh(pole, new MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.8, roughness: 0.35 }));
    this.root.add(this.cloth, this.poleMesh);
    this.root.visible = false;
  }

  /** Sale la bandera: aparece y empieza a flamear fuerte. */
  show(): void {
    this.root.visible = true;
    this.waving = true;
  }

  hide(): void {
    this.root.visible = false;
    this.waving = false;
    this.strength.value = 0;
  }

  update(dt: number, time: number): void {
    if (!this.root.visible) return;
    this.time.value = time;
    // Crece hasta flamear del todo en ~0.6 s.
    this.strength.value = Math.min(1, this.strength.value + dt * (this.waving ? 1.6 : -1.6));
  }

  dispose(): void {
    this.cloth.geometry.dispose();
    this.clothMaterial.map?.dispose();
    this.clothMaterial.dispose();
    this.poleMesh.geometry.dispose();
    (this.poleMesh.material as MeshStandardMaterial).dispose();
  }
}
