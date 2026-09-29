/**
 * Mandos de manejo a partir del teclado y el gamepad. Ver PLAN.md §4.7.
 *
 * Teclado: los mandos son digitales, así que se suavizan con rampas (el
 * acelerador sube en ~0,17 s; la dirección gira más despacio a alta velocidad
 * y vuelve al centro más rápido de lo que gira), para que el auto sea
 * predecible sin pedal ni volante.
 * Gamepad: gatillos analógicos y stick con zona muerta y curva de respuesta.
 *
 * Teclas (reasignables en Ajustes → Controles, `core/input/bindings.ts`): por
 * defecto ↑ acelerar · ↓ frenar · ←/→ doblar · D DRS · C cámara · R volver a
 * pista · P pausa (Esc pausa siempre). Gamepad: RT/LT, stick izquierdo, X DRS,
 * Y cámara, Select volver a pista, Start pausa.
 */

import type { InputManager } from '../../core/input/InputManager';
import type { ControlSettings } from '../../core/save/schema';
import { clamp, damp } from '../../core/utils/math';

export interface DrivingControls {
  throttle: number;
  brake: number;
  /** −1 izquierda … 1 derecha. */
  steer: number;
}

export type DrivingEvent = 'camera' | 'drs' | 'reset' | 'pause';

/** Acciones de un toque (las teclas vienen de los ajustes; Esc llega como "volver" y también pausa). */
const KEY_EVENTS: ReadonlyArray<DrivingEvent> = ['camera', 'drs', 'reset', 'pause'];

/** Botones del gamepad (mapeo estándar) → evento. */
const PAD_EVENTS: ReadonlyArray<readonly [number, DrivingEvent]> = [
  [2, 'drs'], // X / Cuadrado
  [3, 'camera'], // Y / Triángulo
  [8, 'reset'], // Select / Share
  [9, 'pause'], // Start / Options
];

const THROTTLE_UP = 6;
const THROTTLE_DOWN = 9;
const BRAKE_UP = 7;
const BRAKE_DOWN = 10;
const STEER_RETURN = 5.5;

export class DrivingInput {
  readonly controls: DrivingControls = { throttle: 0, brake: 0, steer: 0 };
  private readonly handlers = new Set<(event: DrivingEvent) => void>();
  private readonly padPressed = new Set<number>();
  private readonly offKey: () => void;
  /** El DRS se mantiene pedido hasta que se vuelve a pulsar o se frena. */
  drsRequested = false;
  /** El último mando usado para manejar fue el gamepad. */
  private padInUse = false;

  /**
   * @param assisted devuelve true con la dirección asistida (Principiante):
   *   el volante gira más despacio y el stick se suaviza más.
   */
  constructor(
    private readonly input: InputManager,
    private readonly settings: () => ControlSettings,
    private readonly assisted: () => boolean = () => false,
  ) {
    this.offKey = input.onKey((code) => {
      const keys = this.settings().keys;
      const event = KEY_EVENTS.find((name) => keys[name] === code);
      if (event) this.emit(event);
    });
  }

  onEvent(handler: (event: DrivingEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /** Suelta todo (al pausar o reiniciar). */
  release(): void {
    this.controls.throttle = 0;
    this.controls.brake = 0;
    this.controls.steer = 0;
    this.drsRequested = false;
  }

  /** Actualiza los mandos. `speed` (m/s) ajusta la rapidez de la dirección con teclado. */
  update(dt: number, speed: number): void {
    const settings = this.settings();
    const pad = this.input.gamepad;
    this.pollPadEvents(pad);

    const keys = settings.keys;
    const keyThrottle = this.input.isKeyDown(keys.throttle);
    const keyBrake = this.input.isKeyDown(keys.brake);
    const keyLeft = this.input.isKeyDown(keys.left);
    const keyRight = this.input.isKeyDown(keys.right);

    // Gatillos y stick del gamepad.
    const padThrottle = pad?.buttons[7]?.value ?? 0;
    const padBrake = pad?.buttons[6]?.value ?? 0;
    const padSteer = shapeStick(pad?.axes[0] ?? 0, settings);
    if (keyThrottle || keyBrake || keyLeft || keyRight) this.padInUse = false;
    else if (padSteer !== 0 || padThrottle > 0.1 || padBrake > 0.1) this.padInUse = true;

    const c = this.controls;
    c.throttle = Math.max(ramp(c.throttle, keyThrottle ? 1 : 0, THROTTLE_UP, THROTTLE_DOWN, dt), padThrottle > 0.02 ? padThrottle : 0);
    c.brake = Math.max(ramp(c.brake, keyBrake ? 1 : 0, BRAKE_UP, BRAKE_DOWN, dt), padBrake > 0.02 ? padBrake : 0);

    const assisted = this.assisted();
    if (this.padInUse && pad) {
      c.steer = damp(c.steer, padSteer, assisted ? 11 : 20, dt);
    } else {
      const target = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
      // Más rápido a baja velocidad (maniobrar) y más suave a alta (estabilidad).
      const rate = (3.8 - 2.1 * clamp(speed / 80, 0, 1)) * settings.steeringSensitivity * (assisted ? 0.8 : 1);
      if (target === 0) {
        c.steer = moveTowards(c.steer, 0, STEER_RETURN * dt);
      } else {
        // Cambiar de lado usa la vuelta al centro + el giro.
        const opposite = Math.sign(c.steer) !== 0 && Math.sign(c.steer) !== target;
        c.steer = moveTowards(c.steer, target, (opposite ? rate + STEER_RETURN : rate) * dt);
      }
    }

    // Frenar cierra el DRS (como en la realidad).
    if (c.brake > 0.1) this.drsRequested = false;
  }

  dispose(): void {
    this.offKey();
    this.handlers.clear();
  }

  private pollPadEvents(pad: Gamepad | null): void {
    if (!pad) {
      this.padPressed.clear();
      return;
    }
    for (const [index, event] of PAD_EVENTS) {
      const pressed = pad.buttons[index]?.pressed ?? false;
      if (pressed && !this.padPressed.has(index)) this.emit(event);
      if (pressed) this.padPressed.add(index);
      else this.padPressed.delete(index);
    }
  }

  private emit(event: DrivingEvent): void {
    if (event === 'drs') this.drsRequested = !this.drsRequested;
    for (const handler of [...this.handlers]) handler(event);
  }
}

/** Stick → dirección: zona muerta, curva de respuesta según la sensibilidad. */
export function shapeStick(raw: number, settings: ControlSettings): number {
  const deadzone = settings.steeringDeadzone;
  const magnitude = Math.abs(raw);
  if (magnitude <= deadzone) return 0;
  const normalized = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  // Sensibilidad 0,5 → curva suave (exponente 1,85); 1,5 → casi lineal (1,15).
  const exponent = 2.2 - 0.7 * settings.steeringSensitivity;
  return Math.sign(raw) * Math.pow(normalized, exponent);
}

function ramp(current: number, target: number, up: number, down: number, dt: number): number {
  return target > current ? Math.min(target, current + up * dt) : Math.max(target, current - down * dt);
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
