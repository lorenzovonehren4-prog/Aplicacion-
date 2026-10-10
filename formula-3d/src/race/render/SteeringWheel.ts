/**
 * Volante del monoplaza para la cámara cockpit, con las manos del piloto:
 * - cuerpo de carbono con empuñaduras de goma y el frente con el tejido de
 *   carbono y los rótulos de cada botón y perilla;
 * - seis botones de colores, cuatro perillas, levas de cambio y de embrague;
 * - 15 LEDs de cambio (5 verdes, 5 rojos, 5 azules) que se encienden con las
 *   rpm (con el corte de inyección, todos parpadean) y dos luces de bandera
 *   (amarilla o azul); con el limitador de boxes los LEDs parpadean en azul
 *   por mitades, como en los autos reales;
 * - pantalla con posición, vuelta, marcha, velocidad, delta, DRS, gomas,
 *   alerón y el pedido de boxes; con el limitador, una página propia.
 *
 * Los guantes van en las empuñaduras y giran con el volante; los antebrazos
 * salen del cockpit hasta las muñecas (se recalculan en cada cuadro).
 */

import {
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Disposer } from '../../core/utils/Disposer';
import { clamp } from '../../core/utils/math';

/** Intervalo mínimo entre redibujos de la pantalla del volante (ms). */
const DISPLAY_INTERVAL = 100;
const LED_COUNT = 15;
/** Las dos luces de bandera van al final de la malla de los LEDs. */
const FLAG_LEDS = 2;
const LED_COLORS = ['#19ff5a', '#ff1f33', '#3d7dff'] as const;
const LED_OFF = new Color('#15171b');
const FLAG_COLORS = { yellow: new Color('#ffd21f'), blue: new Color('#2f7dff') } as const;
/** Radio de giro visual del volante respecto de las ruedas. */
const WHEEL_TURN_RATIO = 4.2;
/** Medio ancho y alto del cuerpo (m). */
const BODY_W = 0.15;
const BODY_TOP = 0.07;
const BODY_BOTTOM = -0.075;
/** Frente del cuerpo (z, m) y centro de las empuñaduras. */
const FACE_Z = 0.0213;
const GRIP_X = 0.155;
/**
 * Codos del piloto (sistema del volante): adentro del cockpit, debajo del
 * reborde; desde los ojos sólo se ven la muñeca y el antebrazo que sale de
 * la abertura hacia las empuñaduras.
 */
const ELBOW = new Vector3(0.17, -0.35, 0.2);
/** Muñeca (sistema del volante sin girar): debajo de la empuñadura y hacia el piloto. */
const WRIST = new Vector3(0.168, -0.068, 0.036);

export type WheelFlag = 'yellow' | 'blue' | null;

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
  /** Limitador de boxes puesto (página propia). */
  pitLimiter: boolean;
  /** Bandera para el jugador (franja de color arriba). */
  flag: WheelFlag;
  /** Gomas que quedan (%) y daño del alerón (%), o null si no hay desgaste. */
  tyres: number | null;
  wing: number | null;
  /** Boxes pedido. */
  box: boolean;
}

/** Colores de las manos del piloto (los del auto). */
export interface DriverColors {
  /** Mono (las mangas) y la franja de las mangas. */
  suit: string;
  stripe: string;
  /** Detalle de los guantes. */
  accent: string;
}

/** Tamaño de la pantalla en píxeles (2:1, como la malla). */
const DISPLAY_W = 512;
const DISPLAY_H = 256;
const DISPLAY_FONT = 'Orbitron, system-ui, sans-serif';
/** Frente del volante en píxeles (el mismo rectángulo que el cuerpo). */
const FACE_W = 512;
const FACE_H = 248;

/** Botones: posición (m), color y rótulo. */
const BUTTONS: ReadonlyArray<{ x: number; y: number; color: string; label: string }> = [
  { x: -0.085, y: -0.03, color: '#e8e8e8', label: 'N' },
  { x: -0.105, y: -0.002, color: '#ffcc00', label: 'PIT' },
  { x: -0.085, y: 0.026, color: '#2f7bff', label: 'RAD' },
  { x: 0.085, y: -0.03, color: '#ff3040', label: 'BOX' },
  { x: 0.105, y: -0.002, color: '#1bd760', label: 'OK' },
  { x: 0.085, y: 0.026, color: '#e8e8e8', label: 'DRS' },
];
/** Perillas: posición (m) y rótulo. */
const ROTARIES: ReadonlyArray<{ x: number; y: number; label: string }> = [
  { x: -0.04, y: -0.052, label: 'BB' },
  { x: 0.04, y: -0.052, label: 'ERS' },
  { x: -0.118, y: -0.048, label: 'DIF' },
  { x: 0.118, y: -0.048, label: 'MOT' },
];

/** Contorno del cuerpo: rectángulo redondeado con cintura arriba. */
function bodyShape(): Shape {
  const shape = new Shape();
  const w = BODY_W;
  shape.moveTo(-w + 0.03, BODY_BOTTOM);
  shape.lineTo(w - 0.03, BODY_BOTTOM);
  shape.quadraticCurveTo(w, BODY_BOTTOM, w, BODY_BOTTOM + 0.035);
  shape.lineTo(w, BODY_TOP - 0.02);
  shape.quadraticCurveTo(w, BODY_TOP, w - 0.03, BODY_TOP);
  shape.quadraticCurveTo(0, BODY_TOP - 0.012, -w + 0.03, BODY_TOP);
  shape.quadraticCurveTo(-w, BODY_TOP, -w, BODY_TOP - 0.02);
  shape.lineTo(-w, BODY_BOTTOM + 0.035);
  shape.quadraticCurveTo(-w, BODY_BOTTOM, -w + 0.03, BODY_BOTTOM);
  return shape;
}

/** Leva (cambio o embrague): placa redondeada, un poco más ancha afuera (hacia `side`). */
function paddleShape(width: number, height: number, side: 1 | -1): Shape {
  const shape = new Shape();
  const r = 0.01;
  const x = (value: number): number => value * side;
  shape.moveTo(0, -height / 2 + r);
  shape.quadraticCurveTo(0, -height / 2, x(r), -height / 2);
  shape.lineTo(x(width - r), -height / 2 - 0.006);
  shape.quadraticCurveTo(x(width), -height / 2 - 0.006, x(width), -height / 2 + r);
  shape.lineTo(x(width), height / 2 - r);
  shape.quadraticCurveTo(x(width), height / 2 + 0.006, x(width - r), height / 2 + 0.006);
  shape.lineTo(x(r), height / 2);
  shape.quadraticCurveTo(0, height / 2, 0, height / 2 - r);
  shape.closePath();
  return shape;
}

/** Una pieza ubicada: la geometría con su posición, giro (XYZ) y escala ya aplicados. */
function placed(geometry: BufferGeometry, x: number, y: number, z: number, rotation: readonly [number, number, number] = [0, 0, 0]): BufferGeometry {
  PLACE_MATRIX.compose(PLACE_POSITION.set(x, y, z), PLACE_ROTATION.setFromEuler(PLACE_EULER.set(...rotation)), PLACE_SCALE);
  return geometry.applyMatrix4(PLACE_MATRIX);
}

/** Pinta una pieza con un color por vértice (para juntar piezas de distinto color en una malla). */
function tinted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const color = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const values = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) values.set([color.r, color.g, color.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
  return geometry;
}

/** Junta piezas en una sola geometría (todas con índices o todas sin) y libera las originales. */
function fuse(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  for (const part of parts) if (!flat.includes(part)) part.dispose();
  const merged = mergeGeometries(flat, false);
  for (const part of flat) part.dispose();
  if (!merged) throw new Error('No se pudo armar el volante.');
  return merged;
}

const PLACE_MATRIX = new Matrix4();
const PLACE_POSITION = new Vector3();
const PLACE_ROTATION = new Quaternion();
const PLACE_EULER = new Euler();
const PLACE_SCALE = new Vector3(1, 1, 1);

/** Del sistema del volante (m) a píxeles del frente. */
const faceX = (x: number): number => ((x + BODY_W) / (BODY_W * 2)) * FACE_W;
const faceY = (y: number): number => ((BODY_TOP - y) / (BODY_TOP - BODY_BOTTOM)) * FACE_H;

export class SteeringWheel {
  readonly root = new Group();
  private readonly pivot = new Group();
  private readonly leds: InstancedMesh;
  private readonly ledColors: Color[];
  private readonly display: CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly own = new Disposer();
  private readonly arms: Array<{ side: 1 | -1; sleeve: Mesh; cuff: Mesh }> = [];
  private lastDisplayKey = '';
  private lastDisplayUrgent = '';
  private lastDisplayTime = -Infinity;
  private pitLimiter = false;
  private flag: WheelFlag = null;
  private readonly color = new Color();
  private readonly wrist = new Vector3();
  private readonly toElbow = new Vector3();
  private readonly elbow = new Vector3();

  constructor(colors: DriverColors = { suit: '#e10600', stripe: '#ffffff', accent: '#ffffff' }) {
    this.root.name = 'volante';
    // Delante del piloto, inclinado hacia él.
    // Asoma por encima del borde del cockpit (a ~0,62 m); la parte baja queda oculta, como en la realidad.
    this.root.position.set(0, 0.645, -0.48);
    this.root.rotation.x = -0.45;
    this.root.add(this.pivot);

    const carbon = this.own.own(new MeshStandardMaterial({ color: '#16181c', roughness: 0.35, metalness: 0.3 }));
    const rubber = this.own.own(new MeshStandardMaterial({ color: '#0b0c0e', roughness: 0.92 }));
    const metal = this.own.own(new MeshStandardMaterial({ color: '#8a8f98', roughness: 0.3, metalness: 0.9 }));

    // Cuerpo (con los apoyos del pulgar y las levas de embrague) y, encima, el frente con el tejido y los rótulos.
    const body = new ExtrudeGeometry(bodyShape(), { depth: 0.03, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
    body.translate(0, 0, -0.015);
    const carbonParts: BufferGeometry[] = [body];
    const rubberParts: BufferGeometry[] = [];
    const metalParts: BufferGeometry[] = [];
    for (const side of [-1, 1] as const) {
      // Empuñaduras de goma, con un apoyo para el pulgar arriba.
      rubberParts.push(placed(new CylinderGeometry(0.023, 0.026, 0.135, 18), side * GRIP_X, -0.005, 0.005, [0, 0, side * 0.18]));
      carbonParts.push(placed(new BoxGeometry(0.03, 0.012, 0.03), side * 0.132, 0.045, 0.012));
      // Levas: de cambio (arriba, de metal) y de embrague (abajo, de carbono), detrás del cuerpo.
      metalParts.push(placed(new ExtrudeGeometry(paddleShape(0.075, 0.085, side), { depth: 0.004, bevelEnabled: false }), side * 0.085, 0.012, -0.032));
      carbonParts.push(placed(new ExtrudeGeometry(paddleShape(0.055, 0.04, side), { depth: 0.004, bevelEnabled: false }), side * 0.065, -0.05, -0.03));
    }
    this.pivot.add(new Mesh(this.own.own(fuse(carbonParts)), carbon));
    this.pivot.add(new Mesh(this.own.own(fuse(rubberParts)), rubber));
    this.pivot.add(new Mesh(this.own.own(fuse(metalParts)), metal));
    const faceGeometry = this.own.own(new ShapeGeometry(bodyShape(), 12));
    normalizeUv(faceGeometry);
    faceGeometry.translate(0, 0, FACE_Z);
    const faceTexture = this.own.own(new CanvasTexture(drawFace()));
    faceTexture.colorSpace = SRGBColorSpace;
    faceTexture.anisotropy = 4;
    const face = new Mesh(faceGeometry, this.own.own(new MeshStandardMaterial({ map: faceTexture, roughness: 0.38, metalness: 0.25, polygonOffset: true, polygonOffsetFactor: -1 })));
    this.pivot.add(face);

    // Botones de colores y perillas con su marca blanca (color por vértice: una malla cada uno).
    const buttons = BUTTONS.map((spec) => tinted(placed(new CylinderGeometry(0.009, 0.009, 0.008, 14), spec.x, spec.y, 0.02, [Math.PI / 2, 0, 0]), spec.color));
    this.pivot.add(new Mesh(this.own.own(fuse(buttons)), this.own.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }))));
    const knobs = ROTARIES.flatMap((spec, i) => {
      const turn = (i - 1.5) * 0.7;
      const notch = new BoxGeometry(0.0022, 0.0075, 0.002).translate(0, 0.0058, 0.0072).rotateZ(turn);
      return [
        tinted(placed(new CylinderGeometry(0.0105, 0.0118, 0.014, 20), spec.x, spec.y, 0.025, [Math.PI / 2, 0, 0]), '#2a2d33'),
        tinted(notch.translate(spec.x, spec.y, 0.025), '#f2f4f7'),
      ];
    });
    this.pivot.add(new Mesh(this.own.own(fuse(knobs)), this.own.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }))));

    // Pantalla.
    this.canvas = document.createElement('canvas');
    this.canvas.width = DISPLAY_W;
    this.canvas.height = DISPLAY_H;
    this.display = this.own.own(new CanvasTexture(this.canvas));
    this.display.colorSpace = SRGBColorSpace;
    const screen = new Mesh(this.own.own(new PlaneGeometry(0.128, 0.064)), this.own.own(new MeshBasicMaterial({ map: this.display, toneMapped: false })));
    screen.position.set(0, 0.005, 0.0218);
    this.pivot.add(screen);

    // LEDs de cambio y las dos luces de bandera (al final).
    const led = this.own.own(new BoxGeometry(0.0085, 0.0065, 0.004));
    this.leds = new InstancedMesh(led, this.own.own(new MeshBasicMaterial({ toneMapped: false })), LED_COUNT + FLAG_LEDS);
    const matrix = new Matrix4();
    for (let i = 0; i < LED_COUNT; i++) {
      matrix.makeTranslation((i - (LED_COUNT - 1) / 2) * 0.0105, 0.052, 0.02);
      this.leds.setMatrixAt(i, matrix);
      this.leds.setColorAt(i, LED_OFF);
    }
    for (let k = 0; k < FLAG_LEDS; k++) {
      matrix.makeScale(1.25, 1.6, 1).setPosition((k === 0 ? -1 : 1) * 0.106, 0.05, 0.02);
      this.leds.setMatrixAt(LED_COUNT + k, matrix);
      this.leds.setColorAt(LED_COUNT + k, LED_OFF);
    }
    this.ledColors = Array.from({ length: LED_COUNT }, (_, i) => new Color(LED_COLORS[Math.floor(i / 5)] ?? '#ffffff'));
    this.pivot.add(this.leds);

    this.buildHands(colors);

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
      pitLimiter: false,
      flag: null,
      tyres: null,
      wing: null,
      box: false,
    });
  }

  /**
   * @param steer ángulo de las ruedas (rad, + izquierda)
   * @param shiftFraction 0–1: rpm entre el inicio de los LEDs y el punto de cambio
   * @param limiter corte de inyección activo (parpadeo)
   */
  update(steer: number, shiftFraction: number, limiter: boolean, time: number): void {
    const angle = steer * WHEEL_TURN_RATIO;
    this.pivot.rotation.z = angle;
    const lit = Math.round(clamp(shiftFraction, 0, 1) * LED_COUNT);
    const blinkOn = Math.floor(time * 14) % 2 === 0;
    // Limitador de boxes: las dos mitades se alternan en azul.
    const pitPhase = Math.floor(time * 4) % 2 === 0;
    for (let i = 0; i < LED_COUNT; i++) {
      let color: Color = LED_OFF;
      if (this.pitLimiter) {
        if (i < LED_COUNT / 2 === pitPhase) color = this.color.set('#3d7dff');
      } else if (limiter) {
        if (blinkOn) color = this.color.set('#3d7dff');
      } else if (i < lit) {
        color = this.ledColors[i] ?? LED_OFF;
      }
      this.leds.setColorAt(i, color);
    }
    // Luces de bandera: parpadean con su color; en boxes, azules fijas.
    const flagOn = Math.floor(time * 2.5) % 2 === 0;
    const flag = this.pitLimiter ? FLAG_COLORS.blue : this.flag && flagOn ? FLAG_COLORS[this.flag] : LED_OFF;
    for (let k = 0; k < FLAG_LEDS; k++) this.leds.setColorAt(LED_COUNT + k, flag);
    if (this.leds.instanceColor) this.leds.instanceColor.needsUpdate = true;
    this.updateArms(angle);
  }

  /**
   * Redibuja la pantalla sólo si cambió algo de lo que muestra. La marcha, el
   * DRS, el limitador y las banderas se ven al instante; velocidad y delta,
   * como mucho a 10 Hz (como una pantalla real: y subir la textura a la GPU
   * en cada cuadro cuesta).
   */
  setDisplay(state: WheelDisplayState): void {
    this.pitLimiter = state.pitLimiter;
    this.flag = state.flag;
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
      String(state.pitLimiter),
      String(state.flag),
      String(state.tyres),
      String(state.wing),
      String(state.box),
    ].join('|');
    if (key === this.lastDisplayKey) return;
    const urgent = `${state.gear}|${String(state.drs)}|${String(state.pitLimiter)}|${String(state.flag)}|${String(state.box)}`;
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

  /** Guantes en las empuñaduras (giran con el volante) y antebrazos (se acomodan en cada cuadro). */
  private buildHands(colors: DriverColors): void {
    const glove = this.own.own(new MeshStandardMaterial({ color: '#17191d', roughness: 0.78 }));
    const accent = this.own.own(new MeshStandardMaterial({ color: colors.accent, roughness: 0.6 }));
    const sleeveTexture = this.own.own(new CanvasTexture(drawSleeve(colors)));
    sleeveTexture.colorSpace = SRGBColorSpace;
    const sleeve = this.own.own(new MeshStandardMaterial({ map: sleeveTexture, roughness: 0.78 }));
    const cuffMaterial = this.own.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
    // Las dos manos: la palma envuelve la empuñadura, los nudillos asoman hacia el piloto y el pulgar va al frente.
    const gloveParts: BufferGeometry[] = [];
    const strapParts: BufferGeometry[] = [];
    const hand = new Matrix4();
    const local = new Matrix4();
    for (const side of [-1, 1] as const) {
      hand.compose(PLACE_POSITION.set(side * GRIP_X, -0.004, 0.006), PLACE_ROTATION.setFromEuler(PLACE_EULER.set(0, 0, side * 0.18)), PLACE_SCALE);
      const inHand = (geometry: BufferGeometry, x: number, y: number, z: number, rz = 0): BufferGeometry => {
        local.compose(PLACE_POSITION.set(x, y, z), PLACE_ROTATION.setFromEuler(PLACE_EULER.set(0, 0, rz)), PLACE_SCALE);
        return geometry.applyMatrix4(local.premultiply(hand));
      };
      gloveParts.push(inHand(new CapsuleGeometry(0.031, 0.07, 4, 12).scale(1, 1, 0.82), side * 0.004, 0, 0.006));
      gloveParts.push(inHand(new CapsuleGeometry(0.018, 0.05, 3, 10), side * 0.012, 0.004, 0.028));
      gloveParts.push(inHand(new CapsuleGeometry(0.0125, 0.03, 3, 8), -side * 0.022, 0.03, 0.022, side * 1.05));
      strapParts.push(inHand(new CylinderGeometry(0.033, 0.033, 0.012, 14, 1, true), side * 0.004, -0.035, 0.006));
    }
    this.pivot.add(new Mesh(this.own.own(fuse(gloveParts)), glove));
    this.pivot.add(new Mesh(this.own.own(fuse(strapParts)), accent));
    // Manga: cono abierto de largo 1 desde la muñeca (y = 0) hacia el codo (se estira por instancia).
    const arm = this.own.own(new CylinderGeometry(0.032, 0.042, 1, 16, 1, true));
    arm.translate(0, 0.5, 0);
    // Puño del guante con su franja.
    const cuff = this.own.own(
      fuse([
        tinted(new CylinderGeometry(0.036, 0.033, 0.05, 14).translate(0, 0.02, 0), '#17191d'),
        tinted(new CylinderGeometry(0.0365, 0.0365, 0.01, 14, 1, true).translate(0, 0.036, 0), colors.accent),
      ]),
    );
    for (const side of [-1, 1] as const) {
      const sleeveMesh = new Mesh(arm, sleeve);
      const cuffMesh = new Mesh(cuff, cuffMaterial);
      this.root.add(sleeveMesh, cuffMesh);
      this.arms.push({ side, sleeve: sleeveMesh, cuff: cuffMesh });
    }
    this.updateArms(0);
  }

  /** Antebrazos: de la muñeca (gira con el volante) al codo (fijo adentro del cockpit). */
  private updateArms(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const { side, sleeve, cuff } of this.arms) {
      const x = WRIST.x * side;
      this.wrist.set(x * cos - WRIST.y * sin, x * sin + WRIST.y * cos, WRIST.z);
      this.elbow.set(ELBOW.x * side, ELBOW.y, ELBOW.z);
      this.toElbow.subVectors(this.elbow, this.wrist);
      const length = this.toElbow.length();
      ARM_ROTATION.setFromUnitVectors(UP, this.toElbow.normalize());
      sleeve.position.copy(this.wrist);
      sleeve.quaternion.copy(ARM_ROTATION);
      sleeve.scale.set(1, length, 1);
      cuff.position.copy(this.wrist);
      cuff.quaternion.copy(ARM_ROTATION);
    }
  }

  /**
   * Pantalla como la de un volante real. En carrera: posición y vuelta a la
   * izquierda, marcha grande con la velocidad al centro, delta y DRS a la
   * derecha y una franja abajo con gomas, alerón y el pedido de boxes; la
   * franja de arriba toma el color de la bandera. Con el limitador de boxes,
   * una página azul con la velocidad grande.
   */
  private drawDisplay(state: WheelDisplayState): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const w = DISPLAY_W;
    const h = DISPLAY_H;
    const font = (weight: number, size: number): string => `${weight} ${size}px ${DISPLAY_FONT}`;
    ctx.textBaseline = 'middle';
    if (state.pitLimiter) {
      ctx.fillStyle = '#061632';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2f7dff';
      ctx.fillRect(0, 0, w, 10);
      ctx.fillRect(0, h - 10, w, 10);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9cc2ff';
      ctx.font = font(800, 34);
      ctx.fillText('PIT LIMITER', w / 2, 46);
      ctx.fillStyle = '#ffffff';
      ctx.font = font(800, 112);
      ctx.fillText(state.speed, w / 2, 140);
      ctx.font = font(600, 22);
      ctx.fillStyle = '#9cc2ff';
      ctx.fillText(`${state.unit} · MARCHA ${state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : state.gear}`, w / 2, 218);
      this.display.needsUpdate = true;
      return;
    }
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, w, h);
    // Franja de arriba (color de la bandera si hay una), abajo y divisiones de los paneles.
    ctx.fillStyle = state.flag === 'yellow' ? '#ffd21f' : state.flag === 'blue' ? '#2f7dff' : '#e10600';
    ctx.fillRect(0, 0, w, state.flag ? 12 : 6);
    ctx.fillStyle = '#1b2230';
    ctx.fillRect(150, 18, 3, 180);
    ctx.fillRect(w - 153, 18, 3, 180);
    ctx.fillRect(10, 204, w - 20, 2);

    // Izquierda: posición y vuelta (el total, chico junto a la etiqueta).
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a95a8';
    ctx.font = font(600, 20);
    ctx.fillText('POS', 18, 34);
    ctx.fillText('VTA', 18, 124);
    ctx.textAlign = 'right';
    if (state.position !== null) ctx.fillText(`/${state.cars}`, 138, 34);
    if (state.totalLaps !== null) ctx.fillText(`/${state.totalLaps}`, 138, 124);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = font(800, 42);
    ctx.fillText(state.position === null ? '—' : `P${state.position}`, 16, 78);
    ctx.fillText(String(state.lap), 16, 168);

    // Centro: marcha y velocidad.
    ctx.textAlign = 'center';
    ctx.fillStyle = state.gear === 0 ? '#f5c542' : '#ffffff';
    ctx.font = font(800, 128);
    ctx.fillText(state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : String(state.gear), w / 2, 92);
    ctx.font = font(700, 38);
    ctx.fillStyle = '#e8edf5';
    ctx.fillText(state.speed, w / 2 - 14, 178);
    ctx.font = font(600, 16);
    ctx.fillStyle = '#8a95a8';
    ctx.textAlign = 'left';
    ctx.fillText(state.unit, w / 2 + 6 + ctx.measureText(state.speed).width * 1.2, 184);

    // Derecha: delta (verde si es más rápido) y DRS.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8a95a8';
    ctx.font = font(600, 20);
    ctx.fillText('DELTA', w - 18, 34);
    ctx.font = font(700, 30);
    ctx.fillStyle = state.deltaPositive === null ? '#cfd6e0' : state.deltaPositive ? '#ff3b4a' : '#27e06b';
    ctx.fillText(state.delta || '—', w - 16, 78);
    const box = { x: w - 136, y: 128, w: 120, h: 58 };
    if (state.drs) {
      ctx.fillStyle = '#27e06b';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    } else {
      ctx.strokeStyle = '#3a4456';
      ctx.lineWidth = 4;
      ctx.strokeRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
    }
    ctx.fillStyle = state.drs ? '#04060a' : '#56617a';
    ctx.font = font(800, 30);
    ctx.textAlign = 'center';
    ctx.fillText('DRS', box.x + box.w / 2, box.y + box.h / 2 + 2);

    // Abajo: gomas (con su barra), alerón y el pedido de boxes.
    ctx.font = font(600, 18);
    ctx.textAlign = 'left';
    if (state.tyres !== null) {
      const left = clamp(state.tyres / 100, 0, 1);
      ctx.fillStyle = '#8a95a8';
      ctx.fillText('GOMAS', 18, 230);
      ctx.fillStyle = '#1b2230';
      ctx.fillRect(98, 222, 90, 16);
      ctx.fillStyle = left > 0.5 ? '#27e06b' : left > 0.25 ? '#ffc04d' : '#ff3b4a';
      ctx.fillRect(98, 222, 90 * left, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${Math.round(state.tyres)}%`, 196, 230);
    }
    if (state.wing !== null) {
      ctx.fillStyle = '#8a95a8';
      ctx.fillText('ALERÓN', 268, 230);
      ctx.fillStyle = state.wing > 30 ? '#ff3b4a' : state.wing > 2 ? '#ffc04d' : '#27e06b';
      ctx.fillText(state.wing > 2 ? `${Math.round(state.wing)}%` : 'OK', 358, 230);
    }
    if (state.box) {
      ctx.fillStyle = '#2f7dff';
      ctx.fillRect(w - 98, 214, 82, 32);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = font(800, 20);
      ctx.fillText('BOX', w - 57, 231);
    }
    this.display.needsUpdate = true;
  }
}

const UP = new Vector3(0, 1, 0);
const ARM_ROTATION = new Quaternion();

/** Lleva las UV de una `ShapeGeometry` (coordenadas del contorno) a 0–1 sobre el cuerpo. */
function normalizeUv(geometry: BufferGeometry): void {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) + BODY_W) / (BODY_W * 2), (uv.getY(i) - BODY_BOTTOM) / (BODY_TOP - BODY_BOTTOM));
  }
  uv.needsUpdate = true;
}

/** Frente del volante: tejido de carbono, rótulos de botones y perillas, marcas de las perillas y el logo. */
function drawFace(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FACE_W;
  canvas.height = FACE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, FACE_W, FACE_H);
  // Sarga de carbono: celdas de 8 px que se corren una por fila.
  const cell = 8;
  for (let y = 0; y < FACE_H / cell; y++) {
    for (let x = 0; x < FACE_W / cell; x++) {
      const horizontal = Math.floor((x + y) / 2) % 2 === 0;
      ctx.fillStyle = horizontal ? '#1d2025' : '#131418';
      ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
    }
  }
  // Marco de la pantalla y franja de los LEDs.
  ctx.fillStyle = '#07080a';
  ctx.fillRect(faceX(-0.072), faceY(0.042), faceX(0.072) - faceX(-0.072), faceY(-0.032) - faceY(0.042));
  ctx.fillRect(faceX(-0.084), faceY(0.058), faceX(0.084) - faceX(-0.084), faceY(0.046) - faceY(0.058));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 15px ${DISPLAY_FONT}`;
  ctx.fillStyle = '#e8ecf2';
  for (const spec of BUTTONS) ctx.fillText(spec.label, faceX(spec.x), faceY(spec.y - 0.0145));
  // Perillas: rótulo arriba y marcas alrededor.
  for (const spec of ROTARIES) {
    const cx = faceX(spec.x);
    const cy = faceY(spec.y);
    ctx.fillStyle = '#e8ecf2';
    ctx.font = `700 12px ${DISPLAY_FONT}`;
    ctx.fillText(spec.label, cx, cy - 30);
    ctx.strokeStyle = '#8f98a6';
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI * 0.75 + (k / 8) * Math.PI * 1.5 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
      ctx.lineTo(cx + Math.cos(a) * 27, cy + Math.sin(a) * 27);
      ctx.stroke();
    }
  }
  // Logo del equipo abajo al centro.
  ctx.fillStyle = '#e10600';
  ctx.font = `800 italic 16px ${DISPLAY_FONT}`;
  ctx.fillText('ÁPICE', faceX(0), faceY(-0.068));
  return canvas;
}

/** Manga del mono: el color del equipo con sombreado de tela, costuras y una franja a lo largo. */
function drawSleeve(colors: DriverColors): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = colors.suit;
  ctx.fillRect(0, 0, 128, 64);
  // Alrededor (U): más oscuro del lado de abajo de la manga.
  const shadow = ctx.createLinearGradient(0, 0, 128, 0);
  shadow.addColorStop(0, 'rgba(0,0,0,0.28)');
  shadow.addColorStop(0.35, 'rgba(0,0,0,0)');
  shadow.addColorStop(0.65, 'rgba(0,0,0,0)');
  shadow.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, 128, 64);
  // Franja a lo largo (V), del lado de afuera, con sus costuras.
  ctx.fillStyle = colors.stripe;
  ctx.fillRect(52, 0, 14, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (const x of [50, 67]) ctx.fillRect(x, 0, 1.5, 64);
  return canvas;
}
