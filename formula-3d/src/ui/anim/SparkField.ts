/**
 * Chispas en un canvas 2D encima de una pantalla de interfaz: la punta de la
 * barra de XP que se llena, la ráfaga al subir de nivel o al dar vuelta una
 * carta de recompensa. Las partículas salen de un arreglo fijo (sin crear
 * objetos por cuadro) y el bucle se detiene solo cuando no queda ninguna.
 */

const MAX_PARTICLES = 420;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alive: boolean;
}

export interface EmitOptions {
  color: string;
  /** Rapidez inicial (px/s), con ±40 % al azar. */
  speed: number;
  /** Dirección central (rad; 0 = derecha, −π/2 = arriba) y apertura total. */
  angle?: number;
  spread?: number;
  /** Aceleración hacia abajo (px/s²). */
  gravity?: number;
  /** Vida (s), con ±30 % al azar. */
  life?: number;
  size?: number;
}

export class SparkField {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly particles: Particle[] = [];
  private readonly gravity = new Float32Array(MAX_PARTICLES);
  private raf = 0;
  private last = 0;
  private width = 0;
  private height = 0;
  private readonly observer: ResizeObserver;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sparks';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d');
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', alive: false });
    }
    host.append(this.canvas);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  /** Suelta `count` chispas en (x, y), en píxeles relativos al contenedor. */
  emit(x: number, y: number, count: number, options: EmitOptions): void {
    const angle = options.angle ?? -Math.PI / 2;
    const spread = options.spread ?? Math.PI * 2;
    const life = options.life ?? 0.8;
    let emitted = 0;
    for (let i = 0; i < MAX_PARTICLES && emitted < count; i++) {
      const p = this.particles[i];
      if (!p || p.alive) continue;
      const direction = angle + (Math.random() - 0.5) * spread;
      const speed = options.speed * (0.6 + Math.random() * 0.8);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(direction) * speed;
      p.vy = Math.sin(direction) * speed;
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.size = (options.size ?? 2.2) * (0.6 + Math.random() * 0.8);
      p.color = options.color;
      p.alive = true;
      this.gravity[i] = options.gravity ?? 260;
      emitted++;
    }
    if (emitted > 0 && this.raf === 0) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((time) => this.frame(time));
    }
  }

  /** Posición de un elemento (su centro, o un punto relativo) en coordenadas del contenedor. */
  pointOf(element: Element, fx = 0.5, fy = 0.5): { x: number; y: number } {
    const box = element.getBoundingClientRect();
    const origin = this.host.getBoundingClientRect();
    return { x: box.left - origin.left + box.width * fx, y: box.top - origin.top + box.height * fy };
  }

  /** Borra todas las chispas. */
  clear(): void {
    for (const p of this.particles) p.alive = false;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  dispose(): void {
    if (this.raf !== 0) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.observer.disconnect();
    this.canvas.remove();
  }

  private resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.canvas.width = Math.max(1, Math.round(this.width * dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * dpr));
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private frame(time: number): void {
    const dt = Math.min(0.05, (time - this.last) / 1000);
    this.last = time;
    const ctx = this.ctx;
    if (!ctx) {
      this.raf = 0;
      return;
    }
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    let alive = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p?.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      alive++;
      p.vy += (this.gravity[i] ?? 0) * dt;
      p.vx *= 1 - 1.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = p.color;
      // Chispa alargada en la dirección del movimiento.
      const length = Math.min(10, Math.hypot(p.vx, p.vy) * 0.02 + p.size);
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillRect(-length / 2, -p.size / 2, length, p.size * t + 0.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.raf = alive > 0 ? requestAnimationFrame((next) => this.frame(next)) : 0;
  }
}
