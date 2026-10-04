/**
 * Equipos de boxes animados, como en la transmisión. Por auto, unos 18
 * mecánicos con el mono del color del equipo:
 * - en cada rueda, uno con la pistola (arrodillado), uno que saca la rueda
 *   vieja y uno que pone la nueva;
 * - los de los gatos (adelante y atrás), dos que sostienen el auto a los
 *   costados y, si hay que cambiar el alerón, dos más en la trompa.
 *
 * Salen del garaje cuando su auto viene llegando y lo esperan en sus lugares;
 * con el auto parado trabajan según la coreografía de `PitService` (suben los
 * gatos, aflojan las pistolas, sale la rueda vieja, entra la nueva, ajustan,
 * bajan los gatos); con el semáforo en verde levantan los brazos, el del gato
 * delantero se corre y todos vuelven al garaje con las ruedas viejas.
 *
 * Todo instanciado: una malla por postura (de pie, agachado, arrodillado,
 * tirando del gato, festejando y dos pasos de caminata), ruedas sueltas,
 * pistolas, gatos y las luces del semáforo de cada box. Sólo se dibuja lo que
 * está en uso.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from '../../core/utils/math';
import { CAR_DIMENSIONS } from '../../garage/CarModel';
import { PIT_LIGHT, type PitLane } from '../../tracks/PitLane';
import type { Track } from '../../tracks/Track';
import { liftAt, TYRES_DONE, wheelWork, type WheelWork } from '../session/PitService';

/** Lo que el equipo necesita saber de una parada en curso. */
export interface CrewStop {
  /** Box (índice) y color del equipo. */
  box: number;
  color: string;
  /** 'in': el auto viene llegando; 'stop': parado, con el equipo trabajando; 'out': ya salió. */
  phase: 'in' | 'stop' | 'out';
  /** Metros que le faltan al auto para llegar al box (negativo: ya lo pasó). */
  toBox: number;
  /** Segundos desde que paró ('stop') o desde que salió ('out'). */
  time: number;
  /** Segundos de servicio. */
  duration: number;
  /** También cambian el alerón (auto dañado). */
  repair: boolean;
}

// ─── Medidas (m, en el sistema del auto parado: adelante y hacia el garaje) ─

/** El origen del modelo está 0,2 m delante del centro de gravedad (ver `CarRig`). */
const MODEL_OFFSET = 0.2;
const FRONT_HUB = -CAR_DIMENSIONS.frontAxleZ + MODEL_OFFSET;
const REAR_HUB = -CAR_DIMENSIONS.rearAxleZ + MODEL_OFFSET;
const HUB_HEIGHT = CAR_DIMENSIONS.wheelRadius;
/** Las cuatro ruedas: adelante/atrás y lado (−1 izquierda, +1 derecha del auto). */
const WHEEL_SLOTS: ReadonlyArray<{ f: number; right: number; front: boolean }> = [
  { f: FRONT_HUB, right: -CAR_DIMENSIONS.frontTrackHalf, front: true },
  { f: FRONT_HUB, right: CAR_DIMENSIONS.frontTrackHalf, front: true },
  { f: REAR_HUB, right: -CAR_DIMENSIONS.rearTrackHalf, front: false },
  { f: REAR_HUB, right: CAR_DIMENSIONS.rearTrackHalf, front: false },
];
/** El equipo sale del garaje cuando el auto está a esta distancia (m) y llega a su lugar en este tramo. */
const SHOW_FROM = 150;
const WALK_OUT = 45;
/** Adentro del garaje, detrás de la puerta (m desde la puerta). */
const GARAGE_DEPTH = 1.6;
/** Velocidad al volver caminando al garaje (m/s). */
const WALK_SPEED = 1.7;
/** Lo que tarda cada uno en pasar de su lugar de espera al de trabajo cuando el auto para (s). */
const STEP_IN = 0.18;
/** El semáforo queda en verde este tiempo después de la salida (s). */
const GREEN_FOR = 1.5;
/**
 * Pintura de cada pieza: un color por vértice y si lo multiplica el color del
 * equipo (mono y casco) o queda fijo (visor, guantes, botas, cinturón, franja).
 */
interface Paint {
  rgb: readonly [number, number, number];
  team: 0 | 1;
}
const fixed = (hex: string): Paint => {
  const c = new Color(hex);
  return { rgb: [c.r, c.g, c.b], team: 0 };
};
const shade = (value: number): Paint => ({ rgb: [value, value, value], team: 1 });
const SUIT = shade(1);
const LEGS = shade(0.62);
const HELMET = shade(0.9);
const VISOR = fixed('#0b0c10');
const GLOVES = fixed('#15161a');
const BOOTS = fixed('#0d0e11');
const BELT = fixed('#1f2126');
const STRIPE = fixed('#c9ced6');

// ─── Figuras ─────────────────────────────────────────────────────────────

type Vec = readonly [number, number, number];
type Pair = readonly [Vec, Vec];
type Part = [geometry: BufferGeometry, paint: Paint];

/** Articulaciones de una postura (la figura mira a +Z; izquierda en −X). */
interface PoseSpec {
  hips: Pair;
  knees: Pair;
  ankles: Pair;
  pelvis: Vec;
  chest: Vec;
  head: Vec;
  shoulders: Pair;
  elbows: Pair;
  hands: Pair;
}

const UP = new Vector3(0, 1, 0);

/** Un miembro: cápsula de `a` a `b` (achatada en profundidad si `flat` < 1). */
function segment(a: Vec, b: Vec, radius: number, paint: Paint, flat = 1): Part {
  const from = new Vector3(...a);
  const to = new Vector3(...b);
  const direction = to.clone().sub(from);
  const length = Math.max(0.001, direction.length());
  const geometry = new CapsuleGeometry(radius, length, 4, 10);
  if (flat !== 1) geometry.scale(1, 1, flat);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return [geometry, paint];
}

function at(geometry: BufferGeometry, [x, y, z]: Vec, paint: Paint): Part {
  geometry.translate(x, y, z);
  return [geometry, paint];
}

/**
 * Junta las piezas en una sola geometría: color por vértice y `aTeam` (1 si
 * lo tiñe el color del equipo). Cada pieza conserva sus normales suaves.
 */
function merge(parts: Part[]): BufferGeometry {
  const painted = parts.map(([geometry, paint]) => {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const count = flat.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set(paint.rgb, i * 3);
    flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
    flat.setAttribute('aTeam', new Float32BufferAttribute(new Float32Array(count).fill(paint.team), 1));
    flat.deleteAttribute('uv');
    return flat;
  });
  const merged = mergeGeometries(painted, false);
  for (const geometry of painted) geometry.dispose();
  if (!merged) throw new Error('No se pudo armar el equipo de boxes.');
  merged.computeBoundingSphere();
  return merged;
}

/** Material del equipo: el color de la instancia (el del equipo) sólo tiñe las piezas con `aTeam` = 1. */
function crewMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <color_pars_vertex>', '#include <color_pars_vertex>\nattribute float aTeam;')
      .replace(
        '#include <color_vertex>',
        `vColor = vec4( 1.0 );
        vColor.rgb *= color;
        #ifdef USE_INSTANCING_COLOR
          vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, aTeam );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'equipo-de-boxes';
  return material;
}

/**
 * Un mecánico en una postura: mono del equipo (más oscuro en las piernas),
 * cinturón, franja reflectante en el pecho, guantes, botas y casco con visor.
 */
function figure(p: PoseSpec): BufferGeometry {
  const parts: Part[] = [];
  for (let side = 0; side < 2; side++) {
    const hip = p.hips[side] as Vec;
    const knee = p.knees[side] as Vec;
    const ankle = p.ankles[side] as Vec;
    const shoulder = p.shoulders[side] as Vec;
    const elbow = p.elbows[side] as Vec;
    const hand = p.hands[side] as Vec;
    parts.push(segment(hip, knee, 0.088, LEGS), segment(knee, ankle, 0.072, LEGS));
    parts.push(at(new BoxGeometry(0.12, 0.09, 0.27), [ankle[0], Math.max(0.045, ankle[1] - 0.045), ankle[2] + 0.05], BOOTS));
    parts.push(segment(shoulder, elbow, 0.058, SUIT), segment(elbow, hand, 0.05, SUIT));
    parts.push(at(new SphereGeometry(0.058, 10, 8), hand, GLOVES));
  }
  parts.push(segment(p.hips[0], p.hips[1], 0.108, BELT));
  parts.push(segment(p.pelvis, p.chest, 0.17, SUIT, 0.7));
  // Franja reflectante alrededor del pecho, inclinada como el torso.
  const chest: Vec = [
    p.pelvis[0] + (p.chest[0] - p.pelvis[0]) * 0.72,
    p.pelvis[1] + (p.chest[1] - p.pelvis[1]) * 0.72,
    p.pelvis[2] + (p.chest[2] - p.pelvis[2]) * 0.72,
  ];
  const torso = new Vector3(p.chest[0] - p.pelvis[0], p.chest[1] - p.pelvis[1], p.chest[2] - p.pelvis[2]).normalize();
  const band = new CylinderGeometry(0.176, 0.176, 0.05, 16, 1, true);
  band.scale(1, 1, 0.72);
  band.applyQuaternion(new Quaternion().setFromUnitVectors(UP, torso));
  parts.push(at(band, chest, STRIPE));
  parts.push(segment(p.shoulders[0], p.shoulders[1], 0.082, SUIT));
  parts.push(segment(p.chest, p.head, 0.055, BELT));
  parts.push(at(new SphereGeometry(0.15, 18, 12), p.head, HELMET));
  parts.push(at(new SphereGeometry(0.152, 14, 8, Math.PI / 2 - 0.75, 1.5, 1.05, 0.62), p.head, VISOR));
  return merge(parts);
}

const pair = (x: number, y: number, z: number): Pair => [
  [-x, y, z],
  [x, y, z],
];

const STAND: PoseSpec = {
  hips: pair(0.1, 0.92, 0),
  knees: pair(0.11, 0.5, 0.03),
  ankles: pair(0.11, 0.09, 0),
  pelvis: [0, 0.95, 0],
  chest: [0, 1.36, 0],
  head: [0, 1.62, 0.02],
  shoulders: pair(0.2, 1.4, 0),
  elbows: pair(0.25, 1.13, 0.06),
  hands: pair(0.2, 0.92, 0.2),
};

/** Agachado y listo (o cargando algo adelante). */
const CROUCH: PoseSpec = {
  hips: pair(0.11, 0.74, -0.06),
  knees: pair(0.13, 0.44, 0.2),
  ankles: pair(0.13, 0.09, 0.02),
  pelvis: [0, 0.77, -0.06],
  chest: [0, 1.14, 0.12],
  head: [0, 1.38, 0.2],
  shoulders: pair(0.2, 1.17, 0.12),
  elbows: pair(0.24, 0.95, 0.3),
  hands: pair(0.17, 0.8, 0.48),
};

/** Una rodilla en el piso, con las manos a la altura del eje (el de la pistola). */
const KNEEL: PoseSpec = {
  hips: [
    [-0.11, 0.56, 0.02],
    [0.11, 0.56, 0],
  ],
  knees: [
    [-0.12, 0.5, 0.4],
    [0.12, 0.1, 0.1],
  ],
  ankles: [
    [-0.12, 0.09, 0.38],
    [0.12, 0.12, -0.3],
  ],
  pelvis: [0, 0.58, 0.01],
  chest: [0, 0.96, 0.14],
  head: [0, 1.2, 0.22],
  shoulders: pair(0.2, 0.99, 0.15),
  elbows: pair(0.23, 0.74, 0.33),
  hands: pair(0.09, 0.52, 0.5),
};

/** Tirando de la palanca del gato: piernas abiertas y el cuerpo hacia atrás. */
const LEAN: PoseSpec = {
  hips: [
    [-0.11, 0.9, 0.06],
    [0.11, 0.9, -0.06],
  ],
  knees: [
    [-0.12, 0.5, 0.24],
    [0.12, 0.49, -0.2],
  ],
  ankles: [
    [-0.12, 0.09, 0.34],
    [0.12, 0.09, -0.42],
  ],
  pelvis: [0, 0.93, 0],
  chest: [0, 1.33, -0.13],
  head: [0, 1.57, -0.15],
  shoulders: pair(0.2, 1.37, -0.13),
  elbows: pair(0.22, 1.13, 0.07),
  hands: pair(0.1, 1.0, 0.3),
};

/** Brazos arriba: "¡listo!". */
const CHEER: PoseSpec = { ...STAND, elbows: pair(0.33, 1.6, 0.03), hands: pair(0.37, 1.88, 0.06) };

/** Un paso (pierna izquierda adelante) con los brazos adelante, llevando algo. */
const WALK: PoseSpec = {
  hips: [
    [-0.1, 0.91, 0.04],
    [0.1, 0.91, -0.04],
  ],
  knees: [
    [-0.11, 0.52, 0.17],
    [0.11, 0.49, -0.08],
  ],
  ankles: [
    [-0.11, 0.09, 0.24],
    [0.11, 0.12, -0.28],
  ],
  pelvis: [0, 0.94, 0],
  chest: [0, 1.35, 0.04],
  head: [0, 1.61, 0.06],
  shoulders: pair(0.2, 1.39, 0.04),
  elbows: pair(0.24, 1.13, 0.16),
  hands: pair(0.18, 0.96, 0.36),
};

/** El otro paso: la misma postura espejada. */
function mirror(p: PoseSpec): PoseSpec {
  const flip = (v: Vec): Vec => [-v[0], v[1], v[2]];
  const swap = (pairOf: Pair): Pair => [flip(pairOf[1]), flip(pairOf[0])];
  return {
    hips: swap(p.hips),
    knees: swap(p.knees),
    ankles: swap(p.ankles),
    pelvis: flip(p.pelvis),
    chest: flip(p.chest),
    head: flip(p.head),
    shoulders: swap(p.shoulders),
    elbows: swap(p.elbows),
    hands: swap(p.hands),
  };
}

const POSES = { stand: STAND, crouch: CROUCH, kneel: KNEEL, lean: LEAN, cheer: CHEER, walkA: WALK, walkB: mirror(WALK) } as const;
type Pose = keyof typeof POSES;
const POSE_NAMES = Object.keys(POSES) as Pose[];
type CountKey = Pose | 'tyres' | 'guns' | 'jacks' | 'lamps';

/** Dónde está y qué hace un mecánico en un instante (sistema del box). */
interface Spot {
  f: number;
  o: number;
  pose: Pose;
  faceF: number;
  faceO: number;
}

// ─── Herramientas ────────────────────────────────────────────────────────

const colored = (geometry: BufferGeometry, color: string): BufferGeometry => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const c = new Color(color);
  const count = flat.getAttribute('position').count;
  const values = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) values.set([c.r, c.g, c.b], i * 3);
  flat.setAttribute('color', new Float32BufferAttribute(values, 3));
  flat.deleteAttribute('uv');
  return flat;
};

function mergeColored(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const geometry of parts) geometry.dispose();
  if (!merged) throw new Error('No se pudieron armar las herramientas de boxes.');
  merged.computeBoundingSphere();
  return merged;
}

/** Rueda suelta (eje en X, ancho 1: se escala por instancia): banda, flancos con la línea del compuesto y llanta. */
function tyreGeometry(): BufferGeometry {
  const r = CAR_DIMENSIONS.wheelRadius;
  const rim = CAR_DIMENSIONS.rimRadius;
  const parts: BufferGeometry[] = [colored(new CylinderGeometry(r, r, 1, 26, 1, true).rotateZ(Math.PI / 2), '#151619')];
  for (const side of [-1, 1]) {
    const face = (geometry: BufferGeometry, x: number): BufferGeometry => geometry.rotateY((side * Math.PI) / 2).translate(side * x, 0, 0);
    parts.push(colored(face(new RingGeometry(rim, r, 26), 0.5), '#1b1c20'));
    parts.push(colored(face(new RingGeometry(r * 0.83, r * 0.87, 26), 0.502), '#d8262f'));
    parts.push(colored(face(new CircleGeometry(rim, 16), 0.42), '#8c939c'));
  }
  return mergeColored(parts);
}

/** Pistola neumática (apunta a +Z): cuerpo, empuñadura y el tubo de la llave. */
function gunGeometry(): BufferGeometry {
  return mergeColored([
    colored(new BoxGeometry(0.1, 0.13, 0.24).translate(0, 0, -0.06), '#2a2d33'),
    colored(new BoxGeometry(0.05, 0.15, 0.06).translate(0, -0.12, -0.1), '#111214'),
    colored(new CylinderGeometry(0.038, 0.038, 0.14, 12).rotateX(Math.PI / 2).translate(0, 0, 0.13), '#c3c8cf'),
  ]);
}

/** Gato (barra de largo 1 sobre +Z: se escala por instancia): manija en 0 y apoyo en 1. */
function jackGeometry(): BufferGeometry {
  return mergeColored([
    colored(new BoxGeometry(0.06, 0.06, 1).translate(0, 0, 0.5), '#b7bcc4'),
    colored(new BoxGeometry(0.46, 0.05, 0.05), '#16171a'),
    colored(new BoxGeometry(0.34, 0.06, 0.1).translate(0, 0, 1), '#e2b100'),
  ]);
}

// ─── Equipo ──────────────────────────────────────────────────────────────

export class PitCrew {
  /** Todo el equipo y sus herramientas (va a la escena). */
  readonly root = new Group();
  private readonly people: Record<Pose, InstancedMesh>;
  private readonly tyres: InstancedMesh;
  private readonly guns: InstancedMesh;
  private readonly jacks: InstancedMesh;
  private readonly lamps: InstancedMesh;
  private readonly counts: Record<CountKey, number>;
  private readonly materials: Material[] = [];
  private readonly pit: PitLane;
  private time = 0;
  // Sistema del box en curso: punto del CG parado, adelante (tangente) y hacia el garaje.
  private ox = 0;
  private oz = 0;
  private fx = 0;
  private fz = 0;
  private gx = 0;
  private gz = 0;
  private readonly color = new Color();
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly tilt = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly direction = new Vector3();
  private readonly point = { x: 0, z: 0 };
  private readonly tangent = { x: 0, z: 0 };
  private readonly work: WheelWork = { gun: false, off: 0, on: 0, attached: true, done: false };
  private readonly red = new Color(4, 0.18, 0.12);
  private readonly green = new Color(0.25, 4, 0.6);

  constructor(private readonly track: Track) {
    this.pit = track.pitLane;
    const boxes = this.pit.boxes.length;
    const suit = this.own(crewMaterial());
    const tools = this.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.35 }));
    const rubber = this.own(new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    const lamp = this.own(new MeshBasicMaterial({ color: '#ffffff' }));
    const people = {} as Record<Pose, InstancedMesh>;
    for (const name of POSE_NAMES) people[name] = this.instanced(figure(POSES[name]), suit, boxes * 20, `boxes-equipo-${name}`, true, true);
    this.people = people;
    this.tyres = this.instanced(tyreGeometry(), rubber, boxes * 8, 'boxes-ruedas', true, false);
    this.guns = this.instanced(gunGeometry(), tools, boxes * 4, 'boxes-pistolas', false, false);
    this.jacks = this.instanced(jackGeometry(), tools, boxes * 2, 'boxes-gatos', true, false);
    this.lamps = this.instanced(new BoxGeometry(0.62, 0.2, 0.08), lamp, boxes, 'boxes-semaforos', false, true);
    this.counts = { stand: 0, crouch: 0, kneel: 0, lean: 0, cheer: 0, walkA: 0, walkB: 0, tyres: 0, guns: 0, jacks: 0, lamps: 0 };
  }

  /** Ubica a los equipos de las paradas en curso (los demás no se dibujan). */
  update(stops: readonly CrewStop[], dt = 0): void {
    this.time += dt;
    for (const key of Object.keys(this.counts) as CountKey[]) this.counts[key] = 0;
    for (const stop of stops) {
      if (stop.phase === 'in' && stop.toBox > SHOW_FROM) continue;
      this.placeBox(stop.box);
      this.color.set(stop.color);
      this.drawStop(stop);
    }
    for (const name of POSE_NAMES) this.flush(this.people[name], this.counts[name]);
    this.flush(this.tyres, this.counts.tyres);
    this.flush(this.guns, this.counts.guns);
    this.flush(this.jacks, this.counts.jacks);
    this.flush(this.lamps, this.counts.lamps);
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const mesh of [...Object.values(this.people), this.tyres, this.guns, this.jacks, this.lamps]) {
      mesh.geometry.dispose();
      mesh.dispose();
    }
    for (const material of this.materials) material.dispose();
  }

  // ─── Coreografía ────────────────────────────────────────────────────────

  private drawStop(stop: CrewStop): void {
    const sign = this.pit.sign;
    // Segundos desde que paró (sigue corriendo después de la salida; negativo: todavía no llegó).
    const t = stop.phase === 'stop' ? stop.time : stop.phase === 'out' ? stop.duration + stop.time : -1;
    const released = stop.phase === 'out' ? stop.time : -1;
    // Del garaje a su lugar mientras el auto se acerca (0 → 1).
    const arrive = stop.phase === 'in' ? clamp((SHOW_FROM - stop.toBox) / WALK_OUT, 0, 1) : 1;
    const garage = this.pit.outer + 0.5 - this.pit.box + GARAGE_DEPTH;
    let member = 0;
    /**
     * Un mecánico: sale del garaje hasta `ready` mientras el auto llega, ahí
     * espera; con el auto parado pasa a `spot` (dónde trabaja en cada momento)
     * y, después de la salida, vuelve caminando al garaje. `carry` dibuja lo
     * que lleva en las manos, en el lugar donde quedó.
     */
    const crew = (ready: readonly [number, number], spot: Spot, carry?: (f: number, o: number, faceF: number, faceO: number) => void): void => {
      const index = member++;
      const door: readonly [number, number] = [clamp(ready[0], -3.6, 3.6), garage];
      let { f, o, pose, faceF, faceO } = spot;
      if (stop.phase === 'in') {
        f = ready[0];
        o = ready[1];
        if (arrive < 1) {
          const k = arrive * arrive * (3 - 2 * arrive);
          f = door[0] + (ready[0] - door[0]) * k;
          o = door[1] + (ready[1] - door[1]) * k;
          faceF = ready[0] - door[0];
          faceO = ready[1] - door[1];
          pose = this.stride(index);
        }
      } else if (released < 0 && t < STEP_IN) {
        const k = t / STEP_IN;
        f = ready[0] + (spot.f - ready[0]) * k;
        o = ready[1] + (spot.o - ready[1]) * k;
      } else if (released >= 0) {
        const start = 0.5 + (index % 5) * 0.12;
        const distance = Math.hypot(door[0] - spot.f, door[1] - spot.o);
        const k = clamp(((released - start) * WALK_SPEED) / Math.max(0.1, distance), 0, 1);
        if (k >= 1) return;
        if (k > 0) {
          f = spot.f + (door[0] - spot.f) * k;
          o = spot.o + (door[1] - spot.o) * k;
          faceF = door[0] - spot.f;
          faceO = door[1] - spot.o;
          pose = this.stride(index);
        }
      }
      const walking = pose === 'walkA' || pose === 'walkB';
      const bob = walking ? 0.025 * Math.abs(Math.sin(this.time * 9 + index)) : 0;
      this.person(pose, f, o, faceF, faceO, bob, pose === 'lean' ? 0.06 : 0);
      carry?.(f, o, faceF, faceO);
    };

    // Ruedas: el de la pistola, el que saca la vieja y el que pone la nueva.
    WHEEL_SLOTS.forEach((slot, wheel) => {
      const oh = slot.right * sign;
      const d = Math.sign(oh);
      const fh = slot.f;
      const hub = HUB_HEIGHT + liftAt(t, stop.duration, slot.front);
      const width = slot.front ? CAR_DIMENSIONS.frontTireWidth : CAR_DIMENSIONS.rearTireWidth;
      const work = t >= 0 ? wheelWork(t, wheel, this.work) : null;
      const off = work?.off ?? 0;
      const on = work?.on ?? 0;

      // La pistola: arrodillado en la rueda; se echa un poco atrás mientras cambian la rueda.
      const kneeling = t >= 0.1 && t <= TYRES_DONE + 0.05;
      const cheering = !kneeling && t > TYRES_DONE && released < 0.45;
      const back = clamp(off / 0.3, 0, 1) * (1 - clamp((on - 0.7) / 0.3, 0, 1));
      crew(
        [fh, oh + d * 1.15],
        kneeling
          ? { f: fh, o: oh + d * (0.8 + 0.2 * back), pose: 'kneel', faceF: 0, faceO: -d }
          : t > TYRES_DONE
            ? { f: fh, o: oh + d * 1.05, pose: cheering ? 'cheer' : 'stand', faceF: 0, faceO: -d }
            : { f: fh, o: oh + d * 1.15, pose: 'crouch', faceF: 0, faceO: -d },
        (f, o, faceF, faceO) => {
          if (kneeling) {
            const shake = work?.gun ? 0.006 * Math.sin(this.time * 90) : 0;
            this.gun(fh + shake, oh + d * (0.4 + 0.22 * back), hub + 0.06 * back, 0, -d, work?.gun ? this.time * 40 : 0);
          } else if (!cheering) {
            this.carried(f, o, faceF, faceO, 0.86, 0.36, (gf, go, gy) => this.gun(gf, go, gy, faceF, faceO, 0));
          }
        },
      );

      // La rueda vieja: sale hacia afuera, va hacia atrás y se la llevan al garaje.
      const out1 = clamp(off / 0.4, 0, 1);
      const out2 = clamp((off - 0.4) / 0.6, 0, 1);
      const oldF = fh - 0.72 * out2;
      const oldO = oh + d * (0.42 * out1 + 0.1 * out2);
      const oldY = hub + (0.46 - hub) * out2;
      crew(
        [fh - 1.2, oh + d * 0.95],
        off <= 0
          ? { f: fh - 0.78, o: oh + d * 0.62, pose: 'crouch', faceF: 1, faceO: -d * 0.4 }
          : { f: oldF - 0.5, o: oldO + d * 0.12, pose: 'crouch', faceF: 1, faceO: -d * 0.2 },
        (f, o, faceF, faceO) => {
          if (off <= 0) return;
          if (released >= 0) this.carried(f, o, faceF, faceO, 0.62, 0.48, (tf, to, ty) => this.tyre(tf, to, ty, width, faceF, faceO));
          else this.tyre(oldF, oldO, oldY, width, 0, d);
        },
      );

      // La rueda nueva: la trae desde adelante y la mete en el eje.
      const in1 = clamp(on / 0.6, 0, 1);
      const in2 = clamp((on - 0.6) / 0.4, 0, 1);
      const newF = fh + 0.7 * (1 - in1);
      const newO = oh + d * (0.55 - 0.13 * in1) * (1 - in2);
      const newY = 0.46 + (hub - 0.46) * in1;
      const fitted = on >= 1;
      crew(
        [fh + 1.2, oh + d * 0.95],
        fitted
          ? { f: fh + 1.2, o: oh + d * 0.9, pose: 'stand', faceF: -1, faceO: -d * 0.3 }
          : { f: newF + 0.5, o: newO + d * 0.12, pose: 'crouch', faceF: -1, faceO: -d * 0.2 },
        (f, o, faceF, faceO) => {
          if (fitted) return;
          if (t < 0) this.carried(f, o, faceF, faceO, 0.46, 0.5, (tf, to, ty) => this.tyre(tf, to, ty, width, faceF, faceO));
          else this.tyre(newF, newO, newY, width, 0, d);
        },
      );
    });

    // Gato delantero: espera en la calle, levanta la trompa y se corre para dejar salir el auto.
    const liftFront = liftAt(t, stop.duration, true);
    const aside = t >= 0 ? clamp((t - (stop.duration - 0.14)) / 0.25, 0, 1) : 0;
    const frontWorking = t >= 0.04 && aside <= 0;
    crew(
      [5.5, 0],
      frontWorking
        ? { f: 4.75, o: 0, pose: 'lean', faceF: -1, faceO: 0 }
        : { f: 4.75 - 0.05 * aside, o: 2.2 * aside, pose: 'stand', faceF: -1, faceO: 0 },
      (f, o) => {
        if (frontWorking) this.bar(f - 0.3, o, 0.98, 3.05, 0, 0.1 + liftFront);
        else this.bar(f - 0.28, o, 0.95, f - 1.15, o, 0.06);
      },
    );

    // Gato trasero: espera al costado y entra por detrás cuando el auto para.
    const liftRear = liftAt(t, stop.duration, false);
    const rearWorking = t >= STEP_IN && released < 0;
    crew(
      [-3.75, 1.5],
      rearWorking
        ? { f: -3.95, o: 0, pose: 'lean', faceF: 1, faceO: 0 }
        : released >= 0
          ? { f: -4.15, o: 0.3, pose: 'stand', faceF: 1, faceO: 0 }
          : { f: -3.95, o: 0, pose: 'stand', faceF: 1, faceO: 0 },
      (f, o, faceF, faceO) => {
        if (rearWorking) this.bar(f + 0.3, o, 0.98, -2.42, 0, 0.2 + liftRear);
        else this.bar(f + faceF * 0.28, o + faceO * 0.28, 0.95, f + faceF * 1.15, o + faceO * 1.15, 0.06);
      },
    );

    // Los que sostienen el auto a los costados.
    for (const d of [-1, 1]) crew([0.35, d * 1.6], { f: 0.35, o: d * 1.2, pose: 'crouch', faceF: 0, faceO: -d });

    // Alerón nuevo: dos más en la trompa.
    if (stop.repair) {
      const working = t >= 0.2 && t < stop.duration - 0.5;
      for (const d of [-1, 1]) {
        crew([3.05, d * 1.7], working ? { f: 3.05, o: d * 1.28, pose: 'kneel', faceF: 0, faceO: -d } : { f: 3.05, o: d * 1.7, pose: 'stand', faceF: 0, faceO: -d });
      }
    }

    // Semáforo del box: rojo hasta la salida y verde un momento después.
    if (released < 0) this.lamp(this.red);
    else if (released < GREEN_FOR) this.lamp(this.green);
  }

  /** Paso de caminata (alterna las dos posturas). */
  private stride(index: number): Pose {
    return Math.floor(this.time * 3.6 + index * 0.37) % 2 === 0 ? 'walkA' : 'walkB';
  }

  // ─── Instancias ─────────────────────────────────────────────────────────

  /** Sistema del box `box`: el punto donde para el CG, adelante y hacia el garaje. */
  private placeBox(box: number): void {
    const pit = this.pit;
    const s = pit.boxes[box] ?? pit.boxes[0] ?? 0;
    this.track.geometry.pointAt(s, pit.sign * pit.box, this.point, this.tangent);
    this.ox = this.point.x;
    this.oz = this.point.z;
    this.fx = this.tangent.x;
    this.fz = this.tangent.z;
    // Derecha de la pista = (−tz, tx); hacia el garaje = lado de boxes.
    this.gx = -this.tangent.z * pit.sign;
    this.gz = this.tangent.x * pit.sign;
  }

  private world(f: number, o: number, y: number): Vector3 {
    return this.position.set(this.ox + this.fx * f + this.gx * o, y, this.oz + this.fz * f + this.gz * o);
  }

  /** Giro para mirar hacia (faceF, faceO) en el sistema del box. */
  private facing(faceF: number, faceO: number): Quaternion {
    const x = this.fx * faceF + this.gx * faceO;
    const z = this.fz * faceF + this.gz * faceO;
    return this.rotation.setFromAxisAngle(UP, Math.atan2(x, z));
  }

  private person(pose: Pose, f: number, o: number, faceF: number, faceO: number, y = 0, lean = 0): void {
    const mesh = this.people[pose];
    const n = this.counts[pose];
    if (n >= mesh.instanceMatrix.count) return;
    this.facing(faceF, faceO);
    if (lean !== 0) this.rotation.multiply(this.tilt.setFromAxisAngle(AXIS_X, -lean));
    this.matrix.compose(this.world(f, o, y), this.rotation, this.scale.set(1, 1, 1));
    mesh.setMatrixAt(n, this.matrix);
    mesh.setColorAt(n, this.color);
    this.counts[pose] = n + 1;
  }

  /** Algo que lleva un mecánico adelante, a la altura `y` y `ahead` m delante suyo. */
  private carried(f: number, o: number, faceF: number, faceO: number, y: number, ahead: number, draw: (f: number, o: number, y: number) => void): void {
    const length = Math.hypot(faceF, faceO) || 1;
    draw(f + (faceF / length) * ahead, o + (faceO / length) * ahead, y);
  }

  /** Rueda suelta con el eje hacia (axisF, axisO) en el sistema del box. */
  private tyre(f: number, o: number, y: number, width: number, axisF: number, axisO: number): void {
    const n = this.counts.tyres;
    if (n >= this.tyres.instanceMatrix.count) return;
    // La geometría tiene el eje en X: girar θ en Y lleva X a (cos θ, −sin θ).
    const ax = this.fx * axisF + this.gx * axisO;
    const az = this.fz * axisF + this.gz * axisO;
    this.rotation.setFromAxisAngle(UP, Math.atan2(-az, ax));
    this.matrix.compose(this.world(f, o, y), this.rotation, this.scale.set(width, 1, 1));
    this.tyres.setMatrixAt(n, this.matrix);
    this.counts.tyres = n + 1;
  }

  /** Pistola apuntando hacia (faceF, faceO), con el tubo girando `spin` rad. */
  private gun(f: number, o: number, y: number, faceF: number, faceO: number, spin: number): void {
    const n = this.counts.guns;
    if (n >= this.guns.instanceMatrix.count) return;
    this.facing(faceF, faceO);
    if (spin !== 0) this.rotation.multiply(this.tilt.setFromAxisAngle(AXIS_Z, spin));
    this.matrix.compose(this.world(f, o, y), this.rotation, this.scale.set(1, 1, 1));
    this.guns.setMatrixAt(n, this.matrix);
    this.counts.guns = n + 1;
  }

  /** Gato: barra de la manija (f0, o0, y0) al apoyo (f1, o1, y1). */
  private bar(f0: number, o0: number, y0: number, f1: number, o1: number, y1: number): void {
    const n = this.counts.jacks;
    if (n >= this.jacks.instanceMatrix.count) return;
    const start = this.world(f0, o0, y0).clone();
    const end = this.world(f1, o1, y1);
    this.direction.subVectors(end, start);
    const length = this.direction.length();
    this.rotation.setFromUnitVectors(AXIS_Z, this.direction.normalize());
    this.matrix.compose(start, this.rotation, this.scale.set(1, 1, length));
    this.jacks.setMatrixAt(n, this.matrix);
    this.counts.jacks = n + 1;
  }

  /** Luz del semáforo del box (cuelga del pórtico, mirando al piloto). */
  private lamp(color: Color): void {
    const n = this.counts.lamps;
    if (n >= this.lamps.instanceMatrix.count) return;
    this.facing(-1, 0);
    this.matrix.compose(this.world(PIT_LIGHT.ahead - 0.06, PIT_LIGHT.out, PIT_LIGHT.height - 0.16), this.rotation, this.scale.set(1, 1, 1));
    this.lamps.setMatrixAt(n, this.matrix);
    this.lamps.setColorAt(n, color);
    this.counts.lamps = n + 1;
  }

  private own<T extends Material>(material: T): T {
    this.materials.push(material);
    return material;
  }

  private instanced(geometry: BufferGeometry, material: Material, capacity: number, name: string, cast: boolean, colors: boolean): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    // Para que el material compile con colores por instancia desde el principio.
    if (colors) for (let i = 0; i < capacity; i++) mesh.setColorAt(i, this.color.set('#ffffff'));
    this.root.add(mesh);
    return mesh;
  }

  private flush(mesh: InstancedMesh, count: number): void {
    mesh.count = count;
    // Vacía no se dibuja (ni en las sombras); el precalentamiento la compila igual.
    mesh.visible = count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
}

const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Z = new Vector3(0, 0, 1);
