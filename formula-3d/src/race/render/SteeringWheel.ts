/**
 * Volante del monoplaza para la cámara cockpit: cuerpo de carbono con
 * empuñaduras, pantalla con marcha, velocidad y delta, y 15 LEDs de cambio
 * (5 verdes, 5 rojos, 5 azules) que se encienden con las rpm. Con el
 * limitador, todos parpadean.
 */

import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
} from 'three';
import { Disposer } from '../../core/utils/Disposer';
import { clamp } from '../../core/utils/math';

const LED_COUNT = 15;
const LED_COLORS = ['#19ff5a', '#ff1f33', '#3d7dff'] as const;
const LED_OFF = new Color('#15171b');
/** Radio de giro visual del volante respecto de las ruedas. */
const WHEEL_TURN_RATIO = 4.2;

export interface WheelDisplayState {
  gear: number;
  speed: string;
  delta: string;
  deltaPositive: boolean | null;
  drs: boolean;
}

export class SteeringWheel {
  readonly root = new Group();
  private readonly pivot = new Group();
  private readonly leds: InstancedMesh;
  private readonly ledColors: Color[];
  private readonly display: CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly own = new Disposer();
  private lastDisplayKey = '';
  private readonly color = new Color();

  constructor() {
    this.root.name = 'volante';
    // Delante del piloto, inclinado hacia él.
    // Asoma por encima del borde del cockpit (a ~0,62 m); la parte baja queda oculta, como en la realidad.
    this.root.position.set(0, 0.64, -0.55);
    this.root.rotation.x = -0.45;
    this.root.add(this.pivot);

    const carbon = this.own.own(new MeshStandardMaterial({ color: '#16181c', roughness: 0.35, metalness: 0.3 }));
    const rubber = this.own.own(new MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.9 }));
    const metal = this.own.own(new MeshStandardMaterial({ color: '#8a8f98', roughness: 0.3, metalness: 0.9 }));

    // Cuerpo: rectángulo redondeado con cintura arriba y abajo.
    const shape = new Shape();
    const w = 0.15;
    const hTop = 0.07;
    const hBottom = -0.075;
    shape.moveTo(-w + 0.03, hBottom);
    shape.lineTo(w - 0.03, hBottom);
    shape.quadraticCurveTo(w, hBottom, w, hBottom + 0.035);
    shape.lineTo(w, hTop - 0.02);
    shape.quadraticCurveTo(w, hTop, w - 0.03, hTop);
    shape.quadraticCurveTo(0, hTop - 0.012, -w + 0.03, hTop);
    shape.quadraticCurveTo(-w, hTop, -w, hTop - 0.02);
    shape.lineTo(-w, hBottom + 0.035);
    shape.quadraticCurveTo(-w, hBottom, -w + 0.03, hBottom);
    const body = this.own.own(new ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }));
    body.translate(0, 0, -0.015);
    this.pivot.add(new Mesh(body, carbon));

    // Empuñaduras.
    const grip = this.own.own(new CylinderGeometry(0.022, 0.024, 0.13, 16));
    for (const side of [-1, 1]) {
      const mesh = new Mesh(grip, rubber);
      mesh.position.set(side * 0.155, -0.005, 0.005);
      mesh.rotation.z = side * 0.18;
      this.pivot.add(mesh);
    }

    // Botones y levas.
    const button = this.own.own(new CylinderGeometry(0.009, 0.009, 0.008, 12));
    button.rotateX(Math.PI / 2);
    const buttonColors = ['#e8e8e8', '#ffcc00', '#2f7bff', '#ff3040', '#1bd760', '#e8e8e8'];
    buttonColors.forEach((hex, i) => {
      const material = this.own.own(new MeshStandardMaterial({ color: hex, roughness: 0.4 }));
      const mesh = new Mesh(button, material);
      const side = i < 3 ? -1 : 1;
      mesh.position.set(side * (0.085 + (i % 3 === 1 ? 0.02 : 0)), -0.03 + (i % 3) * 0.028, 0.02);
      this.pivot.add(mesh);
    });
    const paddle = this.own.own(new BoxGeometry(0.06, 0.08, 0.004));
    for (const side of [-1, 1]) {
      const mesh = new Mesh(paddle, metal);
      mesh.position.set(side * 0.1, 0.01, -0.03);
      this.pivot.add(mesh);
    }

    // Pantalla.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.display = this.own.own(new CanvasTexture(this.canvas));
    this.display.colorSpace = SRGBColorSpace;
    const screen = new Mesh(
      this.own.own(new PlaneGeometry(0.11, 0.055)),
      this.own.own(new MeshBasicMaterial({ map: this.display, toneMapped: false })),
    );
    screen.position.set(0, 0.005, 0.0215);
    this.pivot.add(screen);

    // LEDs de cambio.
    const led = this.own.own(new BoxGeometry(0.0085, 0.0065, 0.004));
    this.leds = new InstancedMesh(led, this.own.own(new MeshBasicMaterial({ toneMapped: false })), LED_COUNT);
    const matrix = new Matrix4();
    for (let i = 0; i < LED_COUNT; i++) {
      matrix.makeTranslation((i - (LED_COUNT - 1) / 2) * 0.0105, 0.052, 0.02);
      this.leds.setMatrixAt(i, matrix);
      this.leds.setColorAt(i, LED_OFF);
    }
    this.ledColors = Array.from({ length: LED_COUNT }, (_, i) => new Color(LED_COLORS[Math.floor(i / 5)] ?? '#ffffff'));
    this.pivot.add(this.leds);

    this.root.traverse((object) => {
      if (object instanceof Mesh) object.castShadow = false;
    });
    this.drawDisplay({ gear: 1, speed: '0', delta: '', deltaPositive: null, drs: false });
  }

  /**
   * @param steer ángulo de las ruedas (rad, + izquierda)
   * @param shiftFraction 0–1: rpm entre el inicio de los LEDs y el punto de cambio
   * @param limiter corte de inyección activo (parpadeo)
   */
  update(steer: number, shiftFraction: number, limiter: boolean, time: number): void {
    this.pivot.rotation.z = steer * WHEEL_TURN_RATIO;
    const lit = Math.round(clamp(shiftFraction, 0, 1) * LED_COUNT);
    const blinkOn = Math.floor(time * 14) % 2 === 0;
    for (let i = 0; i < LED_COUNT; i++) {
      const on = limiter ? blinkOn : i < lit;
      const base = this.ledColors[i];
      this.leds.setColorAt(i, on && base ? (limiter ? this.color.set('#3d7dff') : base) : LED_OFF);
    }
    if (this.leds.instanceColor) this.leds.instanceColor.needsUpdate = true;
  }

  /** Redibuja la pantalla sólo si cambió algo de lo que muestra. */
  setDisplay(state: WheelDisplayState): void {
    const key = `${state.gear}|${state.speed}|${state.delta}|${String(state.deltaPositive)}|${String(state.drs)}`;
    if (key === this.lastDisplayKey) return;
    this.lastDisplayKey = key;
    this.drawDisplay(state);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.own.dispose();
  }

  private drawDisplay(state: WheelDisplayState): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 84px Orbitron, system-ui, sans-serif';
    ctx.fillText(state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : String(state.gear), 128, 66);
    ctx.font = '700 30px Orbitron, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cfd6e0';
    ctx.fillText(state.speed, 10, 30);
    if (state.delta) {
      ctx.textAlign = 'right';
      ctx.fillStyle = state.deltaPositive === null ? '#cfd6e0' : state.deltaPositive ? '#ff3b4a' : '#27e06b';
      ctx.fillText(state.delta, 248, 30);
    }
    if (state.drs) {
      ctx.fillStyle = '#27e06b';
      ctx.fillRect(10, 96, 60, 24);
      ctx.fillStyle = '#05070a';
      ctx.font = '700 18px Orbitron, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DRS', 40, 109);
    }
    this.display.needsUpdate = true;
  }
}
