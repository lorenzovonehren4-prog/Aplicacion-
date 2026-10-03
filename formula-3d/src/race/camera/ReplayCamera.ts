/**
 * Cámaras de la repetición, como en una transmisión:
 * - TV: torres al costado de la pista cada ~160 m; toma la que el auto tiene
 *   delante, lo sigue con zoom (más cerrado cuanto más lejos) y corta a la
 *   siguiente cuando el auto la pasa.
 * - Helicóptero: alto, detrás y al costado, con un paneo suave.
 * - Persecución y a bordo (sobre la toma de aire).
 * - Director: va cortando entre las otras (sobre todo TV), unos segundos cada una.
 */

import { MathUtils, Vector3, type PerspectiveCamera } from 'three';
import { clamp, damp } from '../../core/utils/math';
import type { Track } from '../../tracks/Track';

export type ReplayCameraMode = 'auto' | 'tv' | 'heli' | 'chase' | 'onboard';
type Shot = Exclude<ReplayCameraMode, 'auto'>;

export const REPLAY_CAMERA_ORDER: readonly ReplayCameraMode[] = ['auto', 'tv', 'heli', 'chase', 'onboard'];
export const REPLAY_CAMERA_LABELS: Readonly<Record<ReplayCameraMode, string>> = {
  auto: 'Director',
  tv: 'Cámaras de TV',
  heli: 'Helicóptero',
  chase: 'Persecución',
  onboard: 'A bordo',
};

/** Separación de las torres de TV a lo largo de la pista (m) y su altura (m). */
const SPOT_SPACING = 160;
const SPOT_HEIGHT = 5;
/** La torre se usa desde que el auto está a esta distancia (m) y hasta que la pasó por esta otra. */
const SPOT_AHEAD = 230;
const SPOT_BEHIND = 35;
/** Tomas del director: cuánto dura cada una (s) y con qué frecuencia sale cada cámara. */
const SHOT_MIN = 4.5;
const SHOT_MAX = 8;
const DIRECTOR: ReadonlyArray<readonly [Shot, number]> = [
  ['tv', 0.55],
  ['onboard', 0.17],
  ['heli', 0.15],
  ['chase', 0.13],
];

/** Lo que la cámara necesita del auto que sigue. */
export interface ReplayTarget {
  x: number;
  z: number;
  heading: number;
  speed: number;
  /** Posición a lo largo de la pista (s). */
  s: number;
}

export class ReplayCamera {
  mode: ReplayCameraMode = 'auto';
  private readonly spots: Array<{ s: number; x: number; z: number }> = [];
  private spot = -1;
  private shot: Shot = 'tv';
  private shotLeft = 0;
  private time = 0;
  /** La próxima actualización corta (sin suavizado): al cambiar de auto o de lugar en la repetición. */
  private cut = true;
  private readonly position = new Vector3();
  private readonly look = new Vector3();
  private readonly smoothLook = new Vector3();
  private fov = 45;
  private readonly point = { x: 0, z: 0 };

  constructor(
    private readonly track: Track,
    private readonly camera: PerspectiveCamera,
    private readonly random: () => number = Math.random,
  ) {
    const g = track.geometry;
    const t = track.trackside;
    for (let k = 0, s = 40; s < g.length - 40; k++, s += SPOT_SPACING) {
      const i = g.indexAt(s);
      // Del lado de afuera de la curva más cerrada cerca (desde ahí se ve mejor el auto); si no, alternando.
      let bend = 0;
      for (let a = -60; a <= 60; a += 10) {
        const c = g.curvatureAt(s + a);
        if (Math.abs(c) > Math.abs(bend)) bend = c;
      }
      const side = Math.abs(bend) > 1 / 400 ? -Math.sign(bend) || 1 : k % 2 === 0 ? 1 : -1;
      const wall = (side > 0 ? t.wallRight : t.wallLeft)[i] ?? g.halfWidth + 8;
      g.pointAt(s, side * Math.max(g.halfWidth + 2.5, wall - 1), this.point);
      this.spots.push({ s, x: this.point.x, z: this.point.z });
    }
  }

  /** Nombre de la toma que se ve (para el cartel). */
  get currentShot(): Shot {
    return this.mode === 'auto' ? this.shot : this.mode;
  }

  /** Cambia el modo (y corta). */
  setMode(mode: ReplayCameraMode): void {
    this.mode = mode;
    this.shotLeft = 0;
    this.cut = true;
  }

  /** La próxima toma empieza sin suavizado (cambio de auto, salto en el tiempo). */
  snap(): void {
    this.cut = true;
    this.spot = -1;
  }

  update(dt: number, target: ReplayTarget): void {
    this.time += dt;
    if (this.mode === 'auto') {
      this.shotLeft -= dt;
      if (this.shotLeft <= 0) this.nextShot();
    }
    const shot = this.currentShot;
    const sin = Math.sin(target.heading);
    const cos = Math.cos(target.heading);
    // Adelante = (−sin, −cos); derecha = (cos, −sin).
    const lead = Math.min(6, target.speed * 0.12);
    this.look.set(target.x - sin * lead, 0.6, target.z - cos * lead);
    let fov = 45;
    let follow = 10;
    switch (shot) {
      case 'tv': {
        const spot = this.pickSpot(target.s);
        const place = this.spots[spot];
        if (!place) break;
        this.position.set(place.x, SPOT_HEIGHT, place.z);
        const distance = Math.hypot(target.x - place.x, target.z - place.z);
        // Zoom: el auto ocupa más o menos lo mismo en la imagen.
        fov = clamp(MathUtils.radToDeg(2 * Math.atan(7 / Math.max(1, distance))), 7, 55);
        follow = 14;
        break;
      }
      case 'heli': {
        // Detrás y un poco al costado, girando despacio alrededor del auto.
        const angle = target.heading + 0.5 + Math.sin(this.time * 0.15) * 0.6;
        this.position.set(target.x + Math.sin(angle) * 32, 26, target.z + Math.cos(angle) * 32);
        fov = 34;
        follow = 3;
        break;
      }
      case 'chase':
        this.position.set(target.x + sin * 7.5, 2.4, target.z + cos * 7.5);
        this.look.set(target.x - sin * 12, 0.9, target.z - cos * 12);
        fov = 58;
        follow = 7;
        break;
      case 'onboard':
        this.position.set(target.x - sin * 0.15, 1.28, target.z - cos * 0.15);
        this.look.set(target.x - sin * 40, 0.7, target.z - cos * 40);
        fov = 66;
        follow = 30;
        break;
    }
    if (this.cut) {
      this.smoothLook.copy(this.look);
      this.fov = fov;
      this.cut = false;
    } else {
      this.smoothLook.x = damp(this.smoothLook.x, this.look.x, follow, dt);
      this.smoothLook.y = damp(this.smoothLook.y, this.look.y, follow, dt);
      this.smoothLook.z = damp(this.smoothLook.z, this.look.z, follow, dt);
      this.fov = damp(this.fov, fov, 6, dt);
    }
    const camera = this.camera;
    camera.position.copy(this.position);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.smoothLook);
    const near = shot === 'onboard' ? 0.1 : 0.3;
    if (Math.abs(camera.fov - this.fov) > 0.01 || camera.near !== near) {
      camera.fov = this.fov;
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  }

  /** Torre de TV para un auto en `s`: la que tiene delante (o la que acaba de pasar). */
  private pickSpot(s: number): number {
    const g = this.track.geometry;
    const current = this.spots[this.spot];
    if (current) {
      const ahead = g.deltaS(s, current.s);
      if (ahead > -SPOT_BEHIND && ahead < SPOT_AHEAD) return this.spot;
    }
    let best = -1;
    let bestAhead = Infinity;
    this.spots.forEach((spot, i) => {
      const ahead = g.deltaS(s, spot.s);
      if (ahead > -SPOT_BEHIND * 0.5 && ahead < bestAhead) {
        best = i;
        bestAhead = ahead;
      }
    });
    if (best !== this.spot) this.cut = true;
    this.spot = best;
    return best;
  }

  private nextShot(): void {
    let roll = this.random();
    let next: Shot = 'tv';
    for (const [shot, weight] of DIRECTOR) {
      if (roll < weight) {
        next = shot;
        break;
      }
      roll -= weight;
    }
    // Nunca dos veces la misma que no sea TV (que ya cambia de torre sola).
    if (next === this.shot && next !== 'tv') next = 'tv';
    this.shot = next;
    this.shotLeft = SHOT_MIN + (SHOT_MAX - SHOT_MIN) * this.random();
    this.cut = true;
  }
}
