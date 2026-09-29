/**
 * Festejos del podio. Siempre hay un poco de todo (confeti, serpentinas,
 * champán y algunos fuegos artificiales); el festejo equipado en el garaje
 * es el protagonista: más cantidad, más tiempo y más grande.
 *
 * - Confeti y serpentinas: `InstancedMesh` (una llamada de dibujo cada uno)
 *   con papelitos que caen girando y aleteando, y quedan en el piso.
 * - Champán: chorros desde el auto ganador (y los otros dos, si es el festejo
 *   equipado) con el sistema de puntos de la pista.
 * - Fuegos artificiales: cohetes que suben detrás del podio y estallan.
 *
 * Todo se escala con la calidad gráfica (`amount`).
 */

import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { CelebrationStyle } from '../progression/items';
import { ParticleSystem, type ParticleStyle } from '../race/render/Particles';

const CHAMPAGNE: ParticleStyle = { capacity: 1100, kind: 'soft', blending: NormalBlending, gravity: -8.5, drag: 0.45, growth: 0.06 };
const FIREWORK: ParticleStyle = { capacity: 2600, kind: 'spark', blending: AdditiveBlending, gravity: -2.4, drag: 1.05, growth: -0.03 };

/** Colores de los fuegos artificiales (lineales, se multiplican para que brillen). */
const FIREWORK_COLORS = ['#ff2a3c', '#f5c542', '#3d8bff', '#39ff88', '#ffffff', '#ff4fd8', '#ff9f1c'].map((hex) => new Color(hex));

interface Paper {
  position: Vector3;
  velocity: Vector3;
  /** Giro (rad/s) en cada eje y ángulos actuales. */
  spin: Vector3;
  rotation: Euler;
  /** Fase del aleteo lateral. */
  phase: number;
  /** Segundos que faltan para aparecer. */
  delay: number;
  landed: boolean;
}

/** Papelitos que caen (confeti o serpentinas). */
class PaperRain {
  readonly mesh: InstancedMesh;
  private readonly papers: Paper[] = [];
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly hidden = new Vector3(0, -50, 0);

  constructor(
    count: number,
    width: number,
    height: number,
    colors: readonly Color[],
    /** Velocidad de caída (m/s). */
    private readonly fall: number,
    /** Mientras llueva, lo que toca el piso vuelve a caer desde arriba (s; Infinity = siempre). */
    private rainFor: number,
  ) {
    const geometry = new PlaneGeometry(width, height);
    const material = new MeshBasicMaterial({ side: DoubleSide, toneMapped: true });
    this.mesh = new InstancedMesh(geometry, material, Math.max(1, count));
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    const color = new Color();
    for (let i = 0; i < count; i++) {
      const paper: Paper = {
        position: new Vector3(),
        velocity: new Vector3(),
        spin: new Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 9),
        rotation: new Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        phase: Math.random() * Math.PI * 2,
        delay: Math.random() * 2.5,
        landed: false,
      };
      this.spawn(paper, true);
      this.papers.push(paper);
      color.copy(colors[i % colors.length] ?? colors[0] ?? new Color('#ffffff'));
      this.mesh.setColorAt(i, color);
      this.mesh.setMatrixAt(i, this.matrix.compose(this.hidden, this.quaternion.identity(), this.scale));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    this.rainFor -= dt;
    for (let i = 0; i < this.papers.length; i++) {
      const paper = this.papers[i];
      if (!paper) continue;
      if (paper.delay > 0) {
        paper.delay -= dt;
        continue;
      }
      if (!paper.landed) {
        paper.phase += dt * 3;
        // Aleteo: el papel se mece de lado mientras cae.
        paper.position.x += (paper.velocity.x + Math.sin(paper.phase) * 0.9) * dt;
        paper.position.z += (paper.velocity.z + Math.cos(paper.phase * 0.7) * 0.6) * dt;
        paper.position.y += paper.velocity.y * dt;
        paper.velocity.x *= 1 - 0.8 * dt;
        paper.velocity.z *= 1 - 0.8 * dt;
        paper.velocity.y = Math.max(-this.fall, paper.velocity.y - 9 * dt);
        paper.rotation.x += paper.spin.x * dt;
        paper.rotation.y += paper.spin.y * dt;
        paper.rotation.z += paper.spin.z * dt;
        if (paper.position.y <= 0.01) {
          if (this.rainFor > 0) {
            this.spawn(paper, false);
          } else {
            // Queda en el piso, de plano.
            paper.landed = true;
            paper.position.y = 0.01 + Math.random() * 0.01;
            paper.rotation.set(-Math.PI / 2, 0, Math.random() * 6);
          }
        }
      }
      this.quaternion.setFromEuler(paper.rotation);
      this.mesh.setMatrixAt(i, this.matrix.compose(paper.position, this.quaternion, this.scale));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.mesh.dispose();
  }

  /** Arriba del podio: al principio a distintas alturas; después, desde el techo. */
  private spawn(paper: Paper, first: boolean): void {
    paper.position.set((Math.random() - 0.5) * 20, first ? 8 + Math.random() * 10 : 14 + Math.random() * 3, (Math.random() - 0.5) * 12 + 1);
    paper.velocity.set((Math.random() - 0.5) * 1.5, -Math.random() * this.fall, (Math.random() - 0.5) * 1.5);
    paper.landed = false;
  }
}

interface Rocket {
  x: number;
  y: number;
  z: number;
  vy: number;
  fuse: number;
  big: boolean;
}

export interface CelebrationOptions {
  /** Festejo equipado en el garaje (el que se luce). */
  style: CelebrationStyle;
  /** Colores del auto ganador (para el confeti). */
  colors: readonly string[];
  /** Multiplicador de la calidad gráfica. */
  amount: number;
  /** Desde dónde sale el champán: la cabina de cada auto del podio (1.º primero). */
  sprays: readonly Vector3[];
  /** Cuando estalla un fuego artificial (para el sonido). */
  onFirework?: () => void;
}

export class Celebration {
  private readonly confetti: PaperRain;
  private readonly streamers: PaperRain;
  private readonly champagne: ParticleSystem;
  private readonly fireworks: ParticleSystem;
  private readonly rockets: Rocket[] = [];
  private readonly style: CelebrationStyle;
  private readonly sprays: readonly Vector3[];
  private readonly onFirework: (() => void) | undefined;
  private time = 0;
  private nextRocket = 0.4;
  private started = false;
  private viewHeight = 720;

  constructor(
    scene: Scene,
    options: CelebrationOptions,
  ) {
    this.style = options.style;
    this.sprays = options.sprays;
    this.onFirework = options.onFirework;
    const amount = options.amount;
    const main = (style: CelebrationStyle): boolean => this.style === style;
    const colors = [...options.colors, '#f5c542', '#ffffff'].map((hex) => new Color(hex));
    const gold = [new Color('#f5c542'), new Color('#ffd86b'), new Color('#fff3c4'), new Color('#ffffff')];
    this.confetti = new PaperRain(Math.round((main('confetti') ? 1100 : 260) * amount), 0.07, 0.11, colors, 1.4, main('confetti') ? Infinity : 5);
    this.streamers = new PaperRain(Math.round((main('streamers') ? 220 : 50) * amount), 0.035, 0.6, gold, 1.1, main('streamers') ? Infinity : 4);
    this.champagne = new ParticleSystem(CHAMPAGNE, amount * (main('champagne') ? 1.6 : 0.8));
    this.fireworks = new ParticleSystem(FIREWORK, amount * (main('fireworks') ? 1.4 : 0.7));
    scene.add(this.confetti.mesh, this.streamers.mesh, this.champagne.points, this.fireworks.points);
    // Hasta que arranca el festejo no se ve nada.
    this.confetti.mesh.visible = false;
    this.streamers.mesh.visible = false;
  }

  /** Alto de la imagen en píxeles reales (para el tamaño de las partículas). */
  setViewHeight(pixels: number): void {
    this.viewHeight = Math.max(1, pixels);
  }

  /** Empieza el festejo (cuando el ganador llega a lo alto del podio). */
  start(): void {
    this.started = true;
    this.confetti.mesh.visible = true;
    this.streamers.mesh.visible = true;
  }

  update(dt: number, camera: PerspectiveCamera): void {
    const scale = (this.viewHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
    this.champagne.setViewScale(scale);
    this.fireworks.setViewScale(scale);
    if (this.started) {
      this.time += dt;
      this.confetti.update(dt);
      this.streamers.update(dt);
      this.updateChampagne(dt);
      this.updateFireworks(dt);
    }
    this.champagne.update(dt);
    this.fireworks.update(dt);
  }

  dispose(): void {
    this.confetti.dispose();
    this.streamers.dispose();
    this.champagne.dispose();
    this.fireworks.dispose();
  }

  private updateChampagne(dt: number): void {
    const main = this.style === 'champagne';
    // Chorros: al principio y después cada tanto (siempre, si es el festejo equipado).
    const cycle = main ? 3.2 : 6;
    const onFor = main ? 2.2 : 1.4;
    const t = this.time % cycle;
    if (t > onFor || (!main && this.time > 14)) return;
    const sources = main ? this.sprays : this.sprays.slice(0, 1);
    const rate = (main ? 260 : 140) * dt;
    sources.forEach((origin, index) => {
      // La botella se mueve de lado a lado apuntando hacia arriba y afuera.
      const sweep = Math.sin(this.time * 2.3 + index * 1.7) * 0.9 + (index === 1 ? 0.6 : index === 2 ? -0.6 : 0);
      const count = Math.floor(rate + Math.random());
      for (let i = 0; i < count; i++) {
        const speed = 7 + Math.random() * 4;
        const spread = (Math.random() - 0.5) * 0.35;
        const dirX = Math.sin(sweep + spread);
        const dirZ = -0.35 + (Math.random() - 0.5) * 0.3;
        this.champagne.emit(
          origin.x,
          origin.y,
          origin.z,
          dirX * speed * 0.55,
          speed * (0.75 + Math.random() * 0.2),
          dirZ * speed,
          1 + Math.random() * 0.6,
          0.04 + Math.random() * 0.04,
          0.6,
          1,
          0.95,
          0.78,
        );
      }
    });
  }

  private updateFireworks(dt: number): void {
    const main = this.style === 'fireworks';
    this.nextRocket -= dt;
    if (this.nextRocket <= 0 && this.rockets.length < 12) {
      this.nextRocket = main ? 0.35 + Math.random() * 0.5 : 2.6 + Math.random() * 1.6;
      this.rockets.push({ x: (Math.random() - 0.5) * 30, y: 0.5, z: 13 + Math.random() * 6, vy: 11 + Math.random() * 2.5, fuse: 0.95 + Math.random() * 0.25, big: main && Math.random() < 0.5 });
    }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      if (!rocket) continue;
      rocket.fuse -= dt;
      rocket.vy -= 6 * dt;
      rocket.y += rocket.vy * dt;
      // Estela del cohete.
      this.fireworks.emit(rocket.x, rocket.y, rocket.z, (Math.random() - 0.5) * 0.6, -1, (Math.random() - 0.5) * 0.6, 0.35, 0.16, 0.8, 1, 0.75, 0.45);
      if (rocket.fuse > 0) continue;
      this.rockets.splice(i, 1);
      this.burst(rocket.x, rocket.y, rocket.z, rocket.big);
      this.onFirework?.();
    }
  }

  private burst(x: number, y: number, z: number, big: boolean): void {
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] ?? FIREWORK_COLORS[0];
    const second = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)] ?? color;
    if (!color || !second) return;
    const count = big ? 220 : 120;
    const power = big ? 11 : 8;
    for (let i = 0; i < count; i++) {
      // Dirección al azar sobre una esfera.
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const speed = power * (0.85 + Math.random() * 0.15);
      const c = i % 3 === 0 ? second : color;
      this.fireworks.emit(x, y, z, r * Math.cos(a) * speed, u * speed, r * Math.sin(a) * speed, 1.3 + Math.random() * 0.8, big ? 0.34 : 0.26, 1, c.r * 2.2, c.g * 2.2, c.b * 2.2);
    }
  }
}
