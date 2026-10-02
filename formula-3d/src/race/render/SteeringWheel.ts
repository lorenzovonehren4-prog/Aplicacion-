/**
 * Volante del monoplaza para la cámara cockpit: cuerpo de carbono con
 * empuñaduras, pantalla con posición, vuelta, marcha, velocidad, delta y DRS,
 * y 15 LEDs de cambio
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

/** Intervalo mínimo entre redibujos de la pantalla del volante (ms). */
const DISPLAY_INTERVAL = 100;
const LED_COUNT = 15;
const LED_COLORS = ['#19ff5a', '#ff1f33', '#3d7dff'] as const;
const LED_OFF = new Color('#15171b');
/** Radio de giro visual del volante respecto de las ruedas. */
const WHEEL_TURN_RATIO = 4.2;

export interface WheelDisplayState {
  gear: number;
  speed: string;
  /** Unidad de la velocidad ('KM/H' o 'MPH'). */
  unit: string;
  delta: string;
  deltaPositive: boolean | null;
  drs: boolean;
  /** Posición en carrera (null sin rivales) y cantidad de autos. */
  position: number | null;
  cars: number;
  lap: number;
  /** Vueltas de la carrera (null si no hay un total, como en práctica). */
  totalLaps: number | null;
}

/** Tamaño de la pantalla en píxeles (2:1, como la malla). */
const DISPLAY_W = 512;
const DISPLAY_H = 256;
const DISPLAY_FONT = 'Orbitron, system-ui, sans-serif';

export class SteeringWheel {
  readonly root = new Group();
  private readonly pivot = new Group();
  private readonly leds: InstancedMesh;
  private readonly ledColors: Color[];
  private readonly display: CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly own = new Disposer();
  private lastDisplayKey = '';
  private lastDisplayUrgent = '';
  private lastDisplayTime = -Infinity;
  private readonly color = new Color();

  constructor() {
    this.root.name = 'volante';
    // Delante del piloto, inclinado hacia él.
    // Asoma por encima del borde del cockpit (a ~0,62 m); la parte baja queda oculta, como en la realidad.
    this.root.position.set(0, 0.645, -0.48);
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
    this.canvas.width = DISPLAY_W;
    this.canvas.height = DISPLAY_H;
    this.display = this.own.own(new CanvasTexture(this.canvas));
    this.display.colorSpace = SRGBColorSpace;
    const screen = new Mesh(
      this.own.own(new PlaneGeometry(0.128, 0.064)),
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
    this.drawDisplay({
      gear: 1,
      speed: '0',
      unit: 'KM/H',
      delta: '',
      deltaPositive: null,
      drs: false,
      position: null,
      cars: 1,
      lap: 1,
      totalLaps: null,
    });
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

  /**
   * Redibuja la pantalla sólo si cambió algo de lo que muestra. La marcha y el
   * DRS se ven al instante; velocidad y delta, como mucho a 10 Hz (como una
   * pantalla real: y subir la textura a la GPU en cada cuadro cuesta).
   */
  setDisplay(state: WheelDisplayState): void {
    const key = [
      state.gear,
      state.speed,
      state.unit,
      state.delta,
      String(state.deltaPositive),
      String(state.drs),
      String(state.position),
      state.cars,
      state.lap,
      String(state.totalLaps),
    ].join('|');
    if (key === this.lastDisplayKey) return;
    const urgent = `${state.gear}|${String(state.drs)}`;
    const now = performance.now();
    if (urgent === this.lastDisplayUrgent && now - this.lastDisplayTime < DISPLAY_INTERVAL) return;
    this.lastDisplayKey = key;
    this.lastDisplayUrgent = urgent;
    this.lastDisplayTime = now;
    this.drawDisplay(state);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.own.dispose();
  }

  /**
   * Pantalla como la de un volante real: marcha grande al centro con la
   * velocidad debajo, posición y vuelta a la izquierda, delta y DRS a la
   * derecha, separados por líneas finas.
   */
  private drawDisplay(state: WheelDisplayState): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const w = DISPLAY_W;
    const h = DISPLAY_H;
    const font = (weight: number, size: number): string => `${weight} ${size}px ${DISPLAY_FONT}`;
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);
    // Franjas de color arriba y abajo, y divisiones de los tres paneles.
    ctx.fillStyle = '#e10600';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = '#1b2230';
    ctx.fillRect(0, h - 6, w, 6);
    ctx.fillRect(150, 18, 3, h - 36);
    ctx.fillRect(w - 153, 18, 3, h - 36);
    ctx.textBaseline = 'middle';

    // Izquierda: posición y vuelta (el total, chico junto a la etiqueta: el número grande no choca con la marcha).
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a95a8';
    ctx.font = font(600, 22);
    ctx.fillText('POS', 18, 40);
    ctx.fillText('VTA', 18, 150);
    ctx.textAlign = 'right';
    if (state.position !== null) ctx.fillText(`/${state.cars}`, 138, 40);
    if (state.totalLaps !== null) ctx.fillText(`/${state.totalLaps}`, 138, 150);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 46);
    ctx.fillText(state.position === null ? '—' : `P${state.position}`, 16, 92);
    ctx.fillText(String(state.lap), 16, 202);

    // Centro: marcha y velocidad.
    ctx.textAlign = 'center';
    ctx.fillStyle = state.gear === 0 ? '#f5c542' : '#ffffff';
    ctx.font = font(800, 150);
    ctx.fillText(state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : String(state.gear), w / 2, 108);
    ctx.font = font(700, 44);
    ctx.fillStyle = '#e8edf5';
    ctx.fillText(state.speed, w / 2 - 14, 214);
    ctx.font = font(600, 18);
    ctx.fillStyle = '#8a95a8';
    ctx.textAlign = 'left';
    ctx.fillText(state.unit, w / 2 + 6 + ctx.measureText(state.speed).width * 1.2, 220);

    // Derecha: delta (verde si es más rápido) y DRS.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8a95a8';
    ctx.font = font(600, 22);
    ctx.fillText('DELTA', w - 18, 40);
    ctx.font = font(700, 32);
    ctx.fillStyle = state.deltaPositive === null ? '#cfd6e0' : state.deltaPositive ? '#ff3b4a' : '#27e06b';
    ctx.fillText(state.delta || '—', w - 16, 92);
    const box = { x: w - 136, y: 158, w: 120, h: 62 };
    if (state.drs) {
      ctx.fillStyle = '#27e06b';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    } else {
      ctx.strokeStyle = '#3a4456';
      ctx.lineWidth = 4;
      ctx.strokeRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
    }
    ctx.fillStyle = state.drs ? '#04060a' : '#56617a';
    ctx.font = font(800, 32);
    ctx.textAlign = 'center';
    ctx.fillText('DRS', box.x + box.w / 2, box.y + box.h / 2 + 2);
    this.display.needsUpdate = true;
  }
}
