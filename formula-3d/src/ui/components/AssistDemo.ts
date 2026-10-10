/**
 * Demo animada del manual de ayudas: un mini auto en una curva a la derecha,
 * vista desde arriba (canvas 2D). Cada escena tiene dos versiones: sin la
 * ayuda (se sale, patina, bloquea) y con ella. Se repite en bucle.
 *
 * Trazado: recta hacia arriba, curva de 90° a la derecha de radio `R` y recta
 * hacia la derecha. `pointAt(s)` da posición y rumbo sobre la línea central.
 */

export type DemoScene = 'braking' | 'traction' | 'abs' | 'lineFixed' | 'lineDynamic';

const W = 360;
const H = 300;
const R = 92;
const STRAIGHT_X = 92;
const CORNER_Y = 162;
const CENTER = { x: STRAIGHT_X + R, y: CORNER_Y };
const L1 = H + 20 - CORNER_Y;
const ARC = (Math.PI * R) / 2;
const HALF_WIDTH = 20;
const LOOP = 5.2;

interface Pose {
  x: number;
  y: number;
  /** Rumbo (rad; 0 = derecha, −π/2 = arriba). */
  heading: number;
}

interface CarState {
  s: number;
  /** Desplazamiento hacia afuera de la curva (px). */
  offset: number;
  /** Giro extra del auto (derrape). */
  yaw: number;
  brake: boolean;
  /** Ruedas bloqueadas (humo y marcas). */
  locked: boolean;
  /** Ruedas traseras patinando (marcas negras). */
  spinning: boolean;
  /** En la grava (polvo). */
  gravel: boolean;
  /** La ayuda actúa (se ilumina el ícono). */
  assist: boolean;
  /** Si ya no sigue la curva (sigue derecho, ABS sin ayuda). */
  straightFrom: number | null;
  /** Velocidad relativa (0–1) para la línea dinámica. */
  pace: number;
}

function pointAt(s: number, out: Pose): Pose {
  if (s <= L1) {
    out.x = STRAIGHT_X;
    out.y = H + 20 - s;
    out.heading = -Math.PI / 2;
  } else if (s <= L1 + ARC) {
    const theta = Math.PI + (s - L1) / R;
    out.x = CENTER.x + Math.cos(theta) * R;
    out.y = CENTER.y + Math.sin(theta) * R;
    out.heading = Math.atan2(Math.cos(theta), -Math.sin(theta));
  } else {
    out.x = CENTER.x + (s - L1 - ARC);
    out.y = CENTER.y - R;
    out.heading = 0;
  }
  return out;
}

/** Normal hacia afuera de la curva (izquierda del sentido de marcha). */
function outward(pose: Pose): { x: number; y: number } {
  return { x: Math.sin(pose.heading), y: -Math.cos(pose.heading) };
}

const smooth = (t: number): number => t * t * (3 - 2 * t);
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Recorrido (s) para una velocidad que va de v0 a v1 entre t0 y t1 (lineal), integrado. */
function distance(t: number, phases: ReadonlyArray<readonly [number, number]>): number {
  // phases: [tiempo, velocidad] en orden; velocidad lineal entre puntos.
  let s = 0;
  for (let i = 1; i < phases.length; i++) {
    const [t0, v0] = phases[i - 1] ?? [0, 0];
    const [t1, v1] = phases[i] ?? [0, 0];
    if (t <= t0) break;
    const end = Math.min(t, t1);
    const f = (end - t0) / (t1 - t0);
    const vEnd = v0 + (v1 - v0) * f;
    s += ((v0 + vEnd) / 2) * (end - t0);
  }
  return s;
}

function speedAt(t: number, phases: ReadonlyArray<readonly [number, number]>): number {
  for (let i = 1; i < phases.length; i++) {
    const [t0, v0] = phases[i - 1] ?? [0, 0];
    const [t1, v1] = phases[i] ?? [0, 0];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return phases[phases.length - 1]?.[1] ?? 0;
}

/** Estado del auto en el instante `t` de la escena (con o sin ayuda). */
function stateAt(scene: DemoScene, assisted: boolean, t: number): CarState {
  const state: CarState = { s: 0, offset: 0, yaw: 0, brake: false, locked: false, spinning: false, gravel: false, assist: false, straightFrom: null, pace: 0.5 };
  switch (scene) {
    case 'braking': {
      if (assisted) {
        const phases = [[0, 150], [0.62, 150], [1.25, 62], [2.4, 62], [4, 170], [LOOP, 170]] as const;
        state.s = distance(t, phases);
        state.brake = t > 0.62 && t < 1.25;
        state.assist = state.brake;
      } else {
        const phases = [[0, 150], [1.3, 150], [2.5, 20], [3, 0], [LOOP, 0]] as const;
        state.s = distance(t, phases);
        const into = Math.max(0, state.s - L1 + 10);
        state.offset = Math.min(62, 0.012 * into * into);
        state.gravel = state.offset > HALF_WIDTH + 4;
        state.brake = t > 1.3 && t < 3;
      }
      return state;
    }
    case 'traction': {
      // Sale de la curva acelerando a fondo.
      const phases = [[0, 45], [0.8, 45], [2.6, 190], [LOOP, 190]] as const;
      state.s = L1 + 10 + distance(t, phases);
      if (assisted) {
        state.assist = t > 0.9 && t < 2 && Math.floor(t * 8) % 2 === 0;
      } else {
        // La cola se escapa y el piloto corrige.
        const k = clamp01((t - 0.85) / 0.9);
        const back = clamp01((t - 1.9) / 1.1);
        state.yaw = 0.95 * smooth(k) * (1 - smooth(back));
        state.offset = 26 * smooth(k) * (1 - 0.4 * back);
        state.spinning = t > 0.85 && t < 2.3;
      }
      return state;
    }
    case 'abs': {
      if (assisted) {
        const phases = [[0, 170], [0.55, 170], [1.4, 60], [2.5, 60], [4, 160], [LOOP, 160]] as const;
        state.s = distance(t, phases);
        state.brake = t > 0.55 && t < 1.4;
        state.assist = state.brake && Math.floor(t * 12) % 2 === 0;
      } else {
        const phases = [[0, 170], [0.55, 170], [1.9, 0], [LOOP, 0]] as const;
        state.s = distance(t, phases);
        state.brake = t > 0.55 && t < 1.9;
        state.locked = state.brake;
        // Con las ruedas bloqueadas no dobla: sigue derecho desde que frena.
        state.straightFrom = distance(0.55, phases);
      }
      return state;
    }
    case 'lineFixed':
    case 'lineDynamic': {
      // Llega algo pasado, frena y después va justo.
      const phases = [[0, 150], [0.9, 150], [1.5, 70], [2.5, 70], [3.8, 170], [LOOP, 170]] as const;
      state.s = distance(t, phases);
      state.brake = t > 0.9 && t < 1.5;
      // A la salida ya va a fondo detrás de la línea: ritmo justo (verde).
      state.pace = state.s < L1 + ARC ? speedAt(t, phases) / targetSpeed(state.s) : 0.95;
      return state;
    }
  }
}

/** Velocidad ideal en cada punto (lo que pinta la línea fija). */
function targetSpeed(s: number): number {
  if (s < L1 - 70) return 170;
  if (s < L1) return 170 - ((s - (L1 - 70)) / 70) * 100;
  if (s < L1 + ARC) return 70;
  return Math.min(170, 70 + (s - L1 - ARC) * 1.2);
}

/** Color de la línea fija: verde acelera, amarillo levanta, rojo frena. */
function fixedColor(s: number): string {
  if (s < L1 - 95) return '#39d353';
  if (s < L1 - 70) return '#ffd23f';
  if (s < L1 + 8) return '#ff2a3c';
  if (s < L1 + ARC * 0.6) return '#ffd23f';
  return '#39d353';
}

/** Color dinámico según tu ritmo frente al ideal. */
function paceColor(pace: number): string {
  if (pace > 1.12) return '#ff2a3c';
  if (pace > 1.02) return '#ffd23f';
  return '#39d353';
}

export class AssistDemo {
  readonly element: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private start = 0;
  private readonly pose: Pose = { x: 0, y: 0, heading: 0 };
  private readonly marks: Array<{ x: number; y: number; kind: 'skid' | 'spin' }> = [];
  private lastLoop = -1;

  constructor(
    private readonly scene: DemoScene,
    private readonly assisted: boolean,
    private readonly animate: boolean,
  ) {
    this.element = document.createElement('canvas');
    this.element.className = 'demo__canvas';
    this.element.setAttribute('aria-hidden', 'true');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.element.width = W * dpr;
    this.element.height = H * dpr;
    this.ctx = this.element.getContext('2d');
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Arranca el bucle (o, con movimiento reducido, dibuja un cuadro representativo). */
  play(): void {
    if (!this.animate) {
      this.draw(this.scene === 'traction' ? 1.6 : 2.2);
      return;
    }
    this.start = performance.now();
    const frame = (now: number): void => {
      this.draw(((now - this.start) / 1000) % (LOOP + 0.8));
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
  }

  private draw(time: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = Math.min(time, LOOP);
    const loop = Math.floor((performance.now() - this.start) / ((LOOP + 0.8) * 1000));
    if (loop !== this.lastLoop) {
      this.lastLoop = loop;
      this.marks.length = 0;
    }
    this.drawTrack(ctx);
    const state = stateAt(this.scene, this.assisted, t);
    if (this.scene === 'lineFixed' || this.scene === 'lineDynamic') this.drawLine(ctx, state);
    const pose = this.carPose(state);
    this.recordMarks(state, pose);
    this.drawMarks(ctx);
    if (state.gravel) this.drawDust(ctx, pose, t);
    if (state.locked) this.drawSmoke(ctx, pose, t);
    this.drawCar(ctx, pose, state);
    this.drawIndicator(ctx, state);
  }

  private carPose(state: CarState): Pose {
    const pose = this.pose;
    if (state.straightFrom !== null && state.s > state.straightFrom) {
      pointAt(state.straightFrom, pose);
      const run = state.s - state.straightFrom;
      pose.x += Math.cos(pose.heading) * run;
      pose.y += Math.sin(pose.heading) * run;
    } else {
      pointAt(state.s, pose);
      const n = outward(pose);
      pose.x += n.x * state.offset;
      pose.y += n.y * state.offset;
    }
    pose.heading += state.yaw;
    return pose;
  }

  private recordMarks(state: CarState, pose: Pose): void {
    if (!state.locked && !state.spinning) return;
    const back = -8;
    const bx = pose.x + Math.cos(pose.heading) * back;
    const by = pose.y + Math.sin(pose.heading) * back;
    this.marks.push({ x: bx, y: by, kind: state.locked ? 'skid' : 'spin' });
    if (this.marks.length > 400) this.marks.shift();
  }

  private drawTrack(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1f3a24';
    ctx.fillRect(0, 0, W, H);
    // Grava por fuera de la curva.
    ctx.fillStyle = '#8c7a57';
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, R + HALF_WIDTH + 58, Math.PI, Math.PI * 1.5);
    ctx.arc(CENTER.x, CENTER.y, R + HALF_WIDTH + 6, Math.PI * 1.5, Math.PI, true);
    ctx.closePath();
    ctx.fill();
    // Asfalto.
    const path = (): void => {
      ctx.beginPath();
      ctx.moveTo(STRAIGHT_X, H + 30);
      ctx.lineTo(STRAIGHT_X, CORNER_Y);
      ctx.arc(CENTER.x, CENTER.y, R, Math.PI, Math.PI * 1.5);
      ctx.lineTo(W + 30, CENTER.y - R);
    };
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f2f2f0';
    ctx.lineWidth = HALF_WIDTH * 2 + 4;
    path();
    ctx.stroke();
    ctx.strokeStyle = '#3a3d44';
    ctx.lineWidth = HALF_WIDTH * 2;
    path();
    ctx.stroke();
    // Pianos rojo y blanco en la curva.
    for (const radius of [R - HALF_WIDTH + 2, R + HALF_WIDTH - 2]) {
      for (let i = 0; i < 12; i++) {
        const a0 = Math.PI + (i / 12) * (Math.PI / 2);
        ctx.strokeStyle = i % 2 === 0 ? '#ff2a3c' : '#f2f2f0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(CENTER.x, CENTER.y, radius, a0, a0 + Math.PI / 24);
        ctx.stroke();
      }
    }
  }

  private drawLine(ctx: CanvasRenderingContext2D, state: CarState): void {
    const pose: Pose = { x: 0, y: 0, heading: 0 };
    const total = L1 + ARC + (W - CENTER.x) + 20;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let s = 0; s < total; s += 6) {
      pointAt(s, pose);
      const x0 = pose.x;
      const y0 = pose.y;
      pointAt(s + 6, pose);
      let color = fixedColor(s);
      // Dinámica: cerca del auto, el color dice si tu velocidad es la justa.
      if (this.scene === 'lineDynamic' && s > state.s - 10 && s < state.s + 120) color = paceColor(state.pace);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(pose.x, pose.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawMarks(ctx: CanvasRenderingContext2D): void {
    for (const mark of this.marks) {
      ctx.fillStyle = mark.kind === 'skid' ? 'rgba(10,10,12,0.55)' : 'rgba(10,10,12,0.4)';
      ctx.fillRect(mark.x - 1.5, mark.y - 1.5, 3, 3);
    }
  }

  private drawDust(ctx: CanvasRenderingContext2D, pose: Pose, t: number): void {
    for (let i = 0; i < 10; i++) {
      const a = i * 1.7 + t * 3;
      const r = 6 + ((i * 7 + t * 40) % 16);
      ctx.fillStyle = 'rgba(210,190,150,0.35)';
      ctx.beginPath();
      ctx.arc(pose.x - Math.cos(pose.heading) * 10 + Math.cos(a) * r, pose.y - Math.sin(pose.heading) * 10 + Math.sin(a) * r, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSmoke(ctx: CanvasRenderingContext2D, pose: Pose, t: number): void {
    for (let i = 0; i < 8; i++) {
      const a = i * 2.3 + t * 2;
      const r = 4 + ((i * 5 + t * 30) % 12);
      ctx.fillStyle = 'rgba(230,230,235,0.28)';
      ctx.beginPath();
      ctx.arc(pose.x - Math.cos(pose.heading) * 6 + Math.cos(a) * r, pose.y - Math.sin(pose.heading) * 6 + Math.sin(a) * r, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCar(ctx: CanvasRenderingContext2D, pose: Pose, state: CarState): void {
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.heading + Math.PI / 2);
    // Sombra.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-6, -10, 13, 22);
    // Ruedas.
    ctx.fillStyle = '#0c0c0e';
    for (const [x, y] of [[-7, -7], [4, -7], [-7, 5], [4, 5]] as const) ctx.fillRect(x, y, 3, 5);
    // Carrocería, alerones y franja.
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(-3.5, -11, 7, 22);
    ctx.fillRect(-7, -12, 14, 2.5);
    ctx.fillRect(-6, 9, 12, 2.5);
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(-1, -11, 2, 12);
    ctx.fillStyle = '#111317';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Luz de freno.
    if (state.brake) {
      ctx.fillStyle = '#ff2a3c';
      ctx.shadowColor = '#ff2a3c';
      ctx.shadowBlur = 10;
      ctx.fillRect(-2.5, 11.5, 5, 2);
    }
    ctx.restore();
  }

  /** Ícono de la ayuda (se enciende cuando actúa) y la velocidad. */
  private drawIndicator(ctx: CanvasRenderingContext2D, state: CarState): void {
    if (this.scene === 'lineFixed' || this.scene === 'lineDynamic') return;
    const label = this.scene === 'braking' ? 'FRENO' : this.scene === 'traction' ? 'TC' : 'ABS';
    const on = this.assisted && state.assist;
    ctx.font = '700 12px "Titillium Web", system-ui, sans-serif';
    const width = ctx.measureText(label).width + 16;
    ctx.fillStyle = on ? '#39ff88' : 'rgba(10,11,15,0.75)';
    ctx.fillRect(W - width - 10, H - 30, width, 20);
    ctx.fillStyle = on ? '#062b16' : this.assisted ? '#b3b7c2' : '#6f7483';
    ctx.fillText(label, W - width - 2, H - 16);
  }
}
