/**
 * Piloto 3D del estudio: figura procedural (sin modelos ni imágenes externas)
 * con el traje en los colores del auto y el casco elegido en el garaje.
 *
 * Esqueleto de grupos (cadera, columna, cuello, cabeza, hombros, codos,
 * manos, caderas, rodillas y tobillos) animado por poses: cada articulación
 * se acerca suave a la pose pedida y encima van la respiración, el cambio de
 * peso y la mirada (sigue a la cámara, mira el auto o mira alrededor).
 *
 * Poses de base: apoyado en la rueda, manos en la cintura y brazos cruzados
 * (cambia solo cada tanto). Gestos de una vez: saludo, pulgar arriba, señalar
 * el auto y mano en el casco.
 *
 * Convenciones: el piloto mira hacia −Z; un brazo colgando apunta a −Y, con
 * `x` positivo va hacia adelante y `z` lo abre hacia su lado.
 */

import {
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { Disposer } from '../core/utils/Disposer';
import { damp } from '../core/utils/math';
import { createHelmetTexture, createSuitLimbTexture, createSuitTexture, shade } from './carTextures';
import type { LiveryConfig } from './livery';

const JOINTS = [
  'hips',
  'spine',
  'neck',
  'head',
  'shoulderL',
  'elbowL',
  'handL',
  'shoulderR',
  'elbowR',
  'handR',
  'hipL',
  'kneeL',
  'ankleL',
  'hipR',
  'kneeR',
  'ankleR',
] as const;
type JointName = (typeof JOINTS)[number];
type Euler3 = readonly [number, number, number];
type PoseJoints = Partial<Record<JointName, Euler3>>;

export type DriverPose = 'lean' | 'hips' | 'crossed';
export type DriverGesture = 'wave' | 'thumbsUp' | 'point' | 'helmet';

/** Pies un poco abiertos y planos (los tobillos compensan la apertura). */
const LEGS_OPEN: PoseJoints = {
  hipL: [0, 0, -0.07],
  hipR: [0, 0, 0.07],
  ankleL: [0, 0, 0.07],
  ankleR: [0, 0, -0.07],
};

/** Manos en la cintura: codos afuera, antebrazos hacia la cadera. */
const HAND_ON_HIP_R: PoseJoints = { shoulderR: [-0.18, 0, 0.78], elbowR: [0, 0, -1.55], handR: [0, 0, 0.3] };
const HAND_ON_HIP_L: PoseJoints = { shoulderL: [-0.18, 0, -0.78], elbowL: [0, 0, 1.55], handL: [0, 0, -0.3] };

const POSES: Readonly<Record<DriverPose, { joints: PoseJoints; hips: Euler3 }>> = {
  // La mano izquierda sobre el neumático delantero, la derecha en la cintura y el peso en la pierna derecha.
  lean: {
    joints: {
      spine: [0.04, 0.12, 0.16],
      shoulderL: [0.22, 0, -0.42],
      elbowL: [0.12, 0, 0],
      handL: [0, 0, -0.45],
      ...HAND_ON_HIP_R,
      hipL: [0.12, 0, -0.16],
      kneeL: [-0.22, 0, 0],
      ankleL: [0.1, 0, 0.12],
      hipR: [0, 0, 0.02],
      ankleR: [0, 0, -0.02],
      neck: [0, 0, -0.1],
    },
    hips: [0.04, -0.012, 0],
  },
  hips: {
    joints: { ...LEGS_OPEN, ...HAND_ON_HIP_R, ...HAND_ON_HIP_L, spine: [-0.03, 0, 0] },
    hips: [0, -0.008, 0],
  },
  crossed: {
    joints: {
      ...LEGS_OPEN,
      shoulderR: [0.28, 0.95, 0.18],
      elbowR: [1.88, 0, 0],
      shoulderL: [0.36, -1.0, -0.18],
      elbowL: [1.8, 0, 0],
      handR: [0, 0, 0.2],
      handL: [0, 0, -0.2],
    },
    hips: [0, -0.008, 0],
  },
};

interface GestureDef {
  duration: number;
  joints: PoseJoints;
  /** A dónde mira mientras dura. */
  look: 'camera' | 'car';
}

const GESTURES: Readonly<Record<DriverGesture, GestureDef>> = {
  // Brazo derecho arriba, antebrazo vertical que va y viene.
  wave: { duration: 2.6, joints: { shoulderR: [-0.12, 0, 2.0], elbowR: [0, 0, 1.1], handR: [0, 0, 0] }, look: 'camera' },
  thumbsUp: {
    duration: 2.2,
    joints: { shoulderR: [0.95, 0.3, 0.22], elbowR: [1.4, 0, 0], handR: [0, 0.4, 0] },
    look: 'camera',
  },
  // Gira el torso hacia el auto y lo señala con la izquierda.
  point: {
    duration: 2.6,
    joints: { spine: [0, 0.35, 0.06], shoulderL: [0.12, 0, -1.12], elbowL: [0.08, 0, 0], handL: [0, 0, 0] },
    look: 'car',
  },
  // La mano derecha al costado de la visera, con dos toques.
  helmet: { duration: 2.0, joints: { shoulderR: [1.25, 0.55, 0.42], elbowR: [2.3, 0, 0], handR: [0, 0, 0.2] }, look: 'camera' },
};

/** Punto del auto que mira el piloto (en el espacio del podio): la cabina. */
const CAR_POINT = new Vector3(0, 0.9, -0.3);
const TMP = new Vector3();

/**
 * Sólido de revolución para brazos y piernas: va de y = 0 (articulación de
 * arriba) a y = −length, con los radios repartidos de arriba a abajo y los
 * extremos redondeados. La costura queda atrás (u = 0) y los costados en
 * u = 0.25 y 0.75, como esperan las texturas del traje.
 */
function limbGeometry(length: number, radii: readonly number[], segments = 14): LatheGeometry {
  const top = radii[0] ?? 0.05;
  const bottom = radii[radii.length - 1] ?? top;
  const points: Vector2[] = [];
  // De abajo hacia arriba (v = 0 abajo).
  for (const [r, y] of [
    [0, -length - bottom * 0.95],
    [bottom * 0.62, -length - bottom * 0.78],
    [bottom * 0.93, -length - bottom * 0.38],
  ] as const) {
    points.push(new Vector2(r, y));
  }
  for (let i = radii.length - 1; i >= 0; i--) points.push(new Vector2(radii[i] ?? top, -length * (i / Math.max(1, radii.length - 1))));
  for (const [r, y] of [
    [top * 0.93, top * 0.38],
    [top * 0.62, top * 0.78],
    [0, top * 0.95],
  ] as const) {
    points.push(new Vector2(r, y));
  }
  return heightMappedV(new LatheGeometry(points, segments));
}

/** La coordenada `v` de la textura según la altura (la del torno la reparte por punto del perfil). */
function heightMappedV(geometry: LatheGeometry): LatheGeometry {
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < position.count; i++) {
    min = Math.min(min, position.getY(i));
    max = Math.max(max, position.getY(i));
  }
  for (let i = 0; i < uv.count; i++) uv.setY(i, (position.getY(i) - min) / Math.max(1e-6, max - min));
  uv.needsUpdate = true;
  return geometry;
}

/** Torso del traje (desde la cintura hasta la base del cuello): pecho ancho, cintura angosta. */
function torsoGeometry(): LatheGeometry {
  const profile: Array<[number, number]> = [
    [0, -0.1],
    [0.11, -0.095],
    [0.138, -0.06],
    [0.134, 0.02],
    [0.132, 0.1],
    [0.15, 0.2],
    [0.168, 0.29],
    [0.176, 0.36],
    [0.168, 0.42],
    [0.13, 0.475],
    [0.075, 0.505],
    [0, 0.51],
  ];
  return heightMappedV(
    new LatheGeometry(
      profile.map(([r, y]) => new Vector2(r, y)),
      22,
    ),
  );
}

/** Pelvis: corta y ancha; abajo se cierra rápido para que las piernas la tapen. */
function pelvisGeometry(): LatheGeometry {
  const profile: Array<[number, number]> = [
    [0, -0.11],
    [0.07, -0.105],
    [0.125, -0.08],
    [0.146, -0.035],
    [0.146, 0.02],
    [0.13, 0.07],
    [0, 0.075],
  ];
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    20,
  );
}

/** Sombra de contacto redonda y difusa bajo los pies. */
function createFootShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la sombra del piloto.');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class DriverModel {
  readonly root = new Group();

  private readonly own = new Disposer();
  private liveryOwn = new Disposer();
  private readonly joints = {} as Record<JointName, Group>;
  /** Rotación actual de cada articulación (x, y, z). */
  private readonly current = new Map<JointName, [number, number, number]>();
  private readonly target = new Map<JointName, [number, number, number]>();
  /** Posición de reposo de la cadera y de los hombros (la respiración los mueve). */
  private readonly hipsRest = new Vector3();
  private readonly hipsOffset = new Vector3();
  private shoulderRestY = 0;
  private readonly torso: Mesh;
  private readonly torsoScale = new Vector3(1.16, 1, 0.72);

  private readonly suit: MeshPhysicalMaterial;
  private readonly limbs: MeshPhysicalMaterial;
  private readonly plain: MeshPhysicalMaterial;
  private readonly gloves: MeshStandardMaterial;
  private readonly helmet: MeshPhysicalMaterial;

  private time = Math.random() * 10;
  private pose: DriverPose = 'lean';
  /** Pose fija pedida desde afuera (null: cambia sola). */
  private fixedPose: DriverPose | null = null;
  private poseTimer = 14;
  private gesture: { def: GestureDef; name: DriverGesture; t: number } | null = null;
  private idleGestureTimer = 9;
  private look = { yaw: 0, pitch: 0, mode: 'camera' as 'camera' | 'car' | 'away', timer: 3, awayYaw: 0, awayPitch: 0 };

  constructor(livery: LiveryConfig, private readonly anisotropy: number) {
    const fabric = { roughness: 0.78, metalness: 0, sheen: 0.35, sheenRoughness: 0.55, sheenColor: new Color('#ffffff') };
    this.suit = this.own.own(new MeshPhysicalMaterial({ ...fabric }));
    this.limbs = this.own.own(new MeshPhysicalMaterial({ ...fabric }));
    this.plain = this.own.own(new MeshPhysicalMaterial({ ...fabric }));
    this.gloves = this.own.own(new MeshStandardMaterial({ roughness: 0.7, metalness: 0 }));
    this.helmet = this.own.own(new MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
    const visor = this.own.own(
      new MeshPhysicalMaterial({ color: '#07080a', roughness: 0.04, metalness: 0.6, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.6 }),
    );
    const dark = this.own.own(new MeshStandardMaterial({ color: '#141519', roughness: 0.85, metalness: 0 }));
    const boot = this.own.own(new MeshStandardMaterial({ color: '#111216', roughness: 0.5, metalness: 0.1 }));
    const sole = this.own.own(new MeshStandardMaterial({ color: '#d9dbe0', roughness: 0.6, metalness: 0 }));

    for (const name of JOINTS) {
      const group = new Group();
      group.name = name;
      this.joints[name] = group;
      this.current.set(name, [0, 0, 0]);
      this.target.set(name, [0, 0, 0]);
    }
    const j = this.joints;
    const geo = <T extends BufferGeometry>(geometry: T): T => this.own.own(geometry);
    const part = (geometry: BufferGeometry, material: Material, parent: Group, x: number, y: number, z: number): Mesh => {
      const mesh = new Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // ─── Cadera y piernas ───
    this.hipsRest.set(0, 0.96, 0);
    j.hips.position.copy(this.hipsRest);
    this.root.add(j.hips);
    part(geo(pelvisGeometry()), this.limbs, j.hips, 0, 0.02, 0).scale.set(1.1, 1, 0.78);
    const thigh = geo(limbGeometry(0.43, [0.096, 0.09, 0.08, 0.068, 0.058]));
    const shin = geo(limbGeometry(0.41, [0.058, 0.067, 0.063, 0.05, 0.04]));
    const bootGeometry = geo(new CapsuleGeometry(0.052, 0.17, 4, 10));
    bootGeometry.rotateX(Math.PI / 2);
    bootGeometry.scale(1.05, 0.85, 1);
    const soleGeometry = geo(new CylinderGeometry(0.055, 0.055, 0.016, 12));
    soleGeometry.scale(1, 1, 2.6);
    for (const [hip, knee, ankle, side] of [
      [j.hipL, j.kneeL, j.ankleL, -1],
      [j.hipR, j.kneeR, j.ankleR, 1],
    ] as const) {
      hip.position.set(0.095 * side, -0.04, 0);
      j.hips.add(hip);
      part(thigh, this.limbs, hip, 0, 0, 0);
      knee.position.set(0, -0.43, 0);
      hip.add(knee);
      part(shin, this.limbs, knee, 0, 0, 0);
      ankle.position.set(0, -0.41, 0);
      knee.add(ankle);
      part(bootGeometry, boot, ankle, 0, -0.035, -0.05);
      part(soleGeometry, sole, ankle, 0, -0.082, -0.05);
    }

    // ─── Torso, cuello y casco ───
    j.spine.position.set(0, 0.06, 0);
    j.hips.add(j.spine);
    this.torso = part(geo(torsoGeometry()), this.suit, j.spine, 0, 0, 0);
    this.torso.scale.copy(this.torsoScale);
    const collar = part(geo(new TorusGeometry(0.075, 0.032, 8, 20)), dark, j.spine, 0, 0.5, 0.005);
    collar.rotation.x = Math.PI / 2;
    j.neck.position.set(0, 0.5, 0);
    j.spine.add(j.neck);
    part(geo(new CylinderGeometry(0.056, 0.06, 0.12, 14)), dark, j.neck, 0, 0.04, 0);
    j.head.position.set(0, 0.1, 0);
    j.neck.add(j.head);
    const shell = geo(new SphereGeometry(0.15, 36, 24));
    shell.scale(0.95, 0.97, 1.08);
    part(shell, this.helmet, j.head, 0, 0.04, 0);
    // Visera: franja de la esfera mirando hacia adelante (igual que el casco del auto).
    const visorGeometry = geo(new SphereGeometry(0.152, 36, 10, Math.PI * 1.17, Math.PI * 0.66, Math.PI * 0.36, Math.PI * 0.18));
    visorGeometry.scale(0.95, 0.97, 1.08);
    part(visorGeometry, visor, j.head, 0, 0.04, 0);

    // ─── Brazos ───
    const upperArm = geo(limbGeometry(0.28, [0.064, 0.06, 0.054, 0.048]));
    const forearm = geo(limbGeometry(0.25, [0.048, 0.05, 0.044, 0.036]));
    const glove = geo(new CapsuleGeometry(0.04, 0.05, 4, 10));
    glove.scale(1, 1, 0.68);
    const thumb = geo(new CapsuleGeometry(0.015, 0.035, 3, 8));
    const cuff = geo(new CylinderGeometry(0.05, 0.05, 0.035, 12));
    const deltoid = geo(new SphereGeometry(0.066, 14, 10));
    this.shoulderRestY = 0.39;
    for (const [shoulder, elbow, hand, side] of [
      [j.shoulderL, j.elbowL, j.handL, -1],
      [j.shoulderR, j.elbowR, j.handR, 1],
    ] as const) {
      shoulder.position.set(0.2 * side, this.shoulderRestY, 0);
      j.spine.add(shoulder);
      part(deltoid, this.plain, shoulder, 0, -0.005, 0).scale.set(1, 0.9, 0.95);
      part(upperArm, this.limbs, shoulder, 0, 0, 0);
      elbow.position.set(0, -0.28, 0);
      shoulder.add(elbow);
      part(forearm, this.limbs, elbow, 0, 0, 0);
      part(cuff, this.gloves, elbow, 0, -0.245, 0);
      hand.position.set(0, -0.27, 0);
      elbow.add(hand);
      part(glove, this.gloves, hand, 0, -0.05, 0);
      const t = part(thumb, this.gloves, hand, 0.012 * -side, -0.04, -0.03);
      t.rotation.x = 0.6;
    }

    // Sombra de contacto (siempre, aunque no haya mapas de sombras).
    const shadowTexture = this.own.own(createFootShadowTexture());
    const shadowGeometry = geo(new PlaneGeometry(0.95, 0.8));
    shadowGeometry.rotateX(-Math.PI / 2);
    const contact = new Mesh(
      shadowGeometry,
      this.own.own(new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.8 })),
    );
    contact.position.set(0, 0.004, -0.04);
    contact.renderOrder = 1;
    this.root.add(contact);

    this.setLivery(livery);
    this.applyPose(1, true);
  }

  /** Traje y casco con los colores y el diseño de la livery. */
  setLivery(livery: LiveryConfig): void {
    const previous = this.liveryOwn;
    this.liveryOwn = new Disposer();
    this.suit.map = this.liveryOwn.own(createSuitTexture(livery, this.anisotropy));
    this.limbs.map = this.liveryOwn.own(createSuitLimbTexture(livery, this.anisotropy));
    this.plain.color.set(livery.primary);
    this.gloves.color.set(shade(livery.secondary, 0.04));
    this.helmet.map = this.liveryOwn.own(createHelmetTexture(livery, this.anisotropy));
    for (const material of [this.suit, this.limbs, this.helmet]) material.needsUpdate = true;
    previous.dispose();
  }

  /** Fija una pose de base, o `null` para que cambie sola cada tanto. */
  setPose(pose: DriverPose | null): void {
    this.fixedPose = pose;
    if (pose) this.pose = pose;
  }

  /** Hace un gesto (reemplaza al que estaba en curso). */
  play(gesture: DriverGesture): void {
    this.gesture = { def: GESTURES[gesture], name: gesture, t: 0 };
    this.idleGestureTimer = 10 + Math.random() * 6;
  }

  /** `camera`: posición de la cámara en el mundo (el piloto la busca con la mirada). */
  update(dt: number, camera: Vector3): void {
    this.time += dt;
    this.updateBehavior(dt);
    this.updateLook(dt, camera);
    this.applyPose(dt, false);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.liveryOwn.dispose();
    this.own.dispose();
  }

  // ─── Interno ───────────────────────────────────────────────────────────

  /** Cambios de pose de base y gestos sueltos cuando nadie pide nada. */
  private updateBehavior(dt: number): void {
    if (this.gesture) {
      this.gesture.t += dt;
      if (this.gesture.t >= this.gesture.def.duration) this.gesture = null;
    }
    if (this.fixedPose === null) {
      this.poseTimer -= dt;
      if (this.poseTimer <= 0 && !this.gesture) {
        const options = (Object.keys(POSES) as DriverPose[]).filter((p) => p !== this.pose);
        this.pose = options[Math.floor(Math.random() * options.length)] ?? 'lean';
        this.poseTimer = 12 + Math.random() * 8;
      }
    }
    this.idleGestureTimer -= dt;
    if (this.idleGestureTimer <= 0 && !this.gesture) {
      // Algo chico cada tanto: acomodarse el casco o un pulgar arriba a la cámara.
      this.play(Math.random() < 0.6 ? 'helmet' : 'thumbsUp');
      this.idleGestureTimer = 11 + Math.random() * 9;
    }
  }

  /** Mirada: a la cámara, al auto o a un punto cualquiera; cambia cada pocos segundos. */
  private updateLook(dt: number, camera: Vector3): void {
    const look = this.look;
    look.timer -= dt;
    if (look.timer <= 0) {
      const r = Math.random();
      look.mode = r < 0.55 ? 'camera' : r < 0.75 ? 'car' : 'away';
      look.awayYaw = (Math.random() * 2 - 1) * 0.9;
      look.awayPitch = Math.random() * 0.25 - 0.15;
      look.timer = 2.5 + Math.random() * 3.5;
    }
    const mode = this.gesture ? this.gesture.def.look : look.mode;
    let yaw = look.awayYaw;
    let pitch = look.awayPitch;
    if (mode !== 'away' && this.root.parent) {
      if (mode === 'camera') TMP.copy(camera);
      else this.root.parent.localToWorld(TMP.copy(CAR_POINT));
      this.root.worldToLocal(TMP);
      // Desde la altura de los ojos (~1.65 m).
      TMP.y -= 1.65;
      yaw = Math.atan2(-TMP.x, -TMP.z);
      pitch = Math.atan2(TMP.y, Math.hypot(TMP.x, TMP.z));
      // Detrás de él no se da vuelta del todo: gira lo que puede.
      if (Math.abs(yaw) > 1.9) yaw = look.awayYaw;
    }
    const speed = this.gesture ? 5 : 3;
    look.yaw = damp(look.yaw, Math.max(-1.2, Math.min(1.2, yaw)), speed, dt);
    look.pitch = damp(look.pitch, Math.max(-0.45, Math.min(0.35, pitch)), speed, dt);
  }

  /** Lleva cada articulación hacia la pose (con `instant` salta directo). */
  private applyPose(dt: number, instant: boolean): void {
    const base = POSES[this.pose];
    for (const name of JOINTS) {
      const value = base.joints[name] ?? [0, 0, 0];
      const target = this.target.get(name);
      if (target) {
        target[0] = value[0];
        target[1] = value[1];
        target[2] = value[2];
      }
    }
    const t = this.time;
    const gesture = this.gesture;
    if (gesture) {
      for (const [name, value] of Object.entries(gesture.def.joints) as Array<[JointName, Euler3]>) {
        const target = this.target.get(name);
        if (!target) continue;
        target[0] = value[0];
        target[1] = value[1];
        target[2] = value[2];
      }
      const g = gesture.t;
      const elbowR = this.target.get('elbowR');
      const neck = this.target.get('neck');
      if (gesture.name === 'wave' && elbowR && g > 0.35) elbowR[2] += 0.38 * Math.sin((g - 0.35) * 9);
      if (gesture.name === 'helmet' && elbowR && g > 0.6 && g < 1.5) elbowR[0] += 0.12 * Math.max(0, Math.sin((g - 0.6) * 14));
      if (gesture.name === 'thumbsUp' && neck && g > 0.4 && g < 1.4) neck[0] -= 0.14 * Math.sin((g - 0.4) * Math.PI * 2);
    }
    // Mirada: la mayor parte en el cuello, un poco en la columna.
    const spine = this.target.get('spine');
    const neck = this.target.get('neck');
    const head = this.target.get('head');
    if (spine) spine[1] += this.look.yaw * 0.25;
    if (neck) neck[1] += this.look.yaw * 0.75;
    if (head) head[0] += this.look.pitch;
    // Cambio de peso lento: la cadera va y viene y la columna compensa.
    const sway = Math.sin(t * 0.45);
    const hips = this.target.get('hips');
    if (hips) hips[2] += 0.02 * sway;
    if (spine) spine[2] -= 0.026 * sway;

    const lambda = gesture ? 7 : 4.5;
    for (const name of JOINTS) {
      const current = this.current.get(name);
      const target = this.target.get(name);
      if (!current || !target) continue;
      for (let i = 0; i < 3; i++) current[i] = instant ? (target[i] ?? 0) : damp(current[i] ?? 0, target[i] ?? 0, lambda, dt);
      this.joints[name].rotation.set(current[0], current[1], current[2]);
    }
    // Cadera: corrimiento de la pose y del vaivén.
    this.hipsOffset.set(base.hips[0] + 0.012 * sway, base.hips[1], base.hips[2]);
    const hipsGroup = this.joints.hips;
    if (instant) hipsGroup.position.copy(this.hipsRest).add(this.hipsOffset);
    else {
      hipsGroup.position.x = damp(hipsGroup.position.x, this.hipsRest.x + this.hipsOffset.x, 4, dt);
      hipsGroup.position.y = damp(hipsGroup.position.y, this.hipsRest.y + this.hipsOffset.y, 4, dt);
      hipsGroup.position.z = damp(hipsGroup.position.z, this.hipsRest.z + this.hipsOffset.z, 4, dt);
    }
    // Respiración: el pecho se infla apenas y los hombros suben.
    const breath = Math.sin(t * 1.7);
    this.torso.scale.set(this.torsoScale.x * (1 + 0.008 * breath), this.torsoScale.y * (1 + 0.006 * breath), this.torsoScale.z * (1 + 0.018 * breath));
    this.joints.shoulderL.position.y = this.shoulderRestY + 0.004 * breath;
    this.joints.shoulderR.position.y = this.shoulderRestY + 0.004 * breath;
  }
}
