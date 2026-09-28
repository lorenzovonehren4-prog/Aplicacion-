import type { InputManager } from '../../src/core/input/InputManager';
import { createDefaultControls } from '../../src/core/save/schema';
import { DrivingInput } from '../../src/race/input/DrivingInput';
import type { DriverInput } from '../../src/race/physics/Vehicle';

/**
 * Piloto "de teclado": decide qué flechas mantener pulsadas a partir de lo que
 * haría un piloto ideal y pasa por el mismo `DrivingInput` que el juego (con
 * sus rampas). Sirve para comprobar que el auto se puede manejar con mandos
 * digitales, que es el caso más difícil.
 */
export class KeyboardPilot {
  private readonly keys = new Set<string>();
  readonly input: DrivingInput;

  constructor() {
    const fake = {
      isKeyDown: (code: string) => this.keys.has(code),
      get gamepad() {
        return null;
      },
      onKey: () => () => undefined,
    } as unknown as InputManager;
    this.input = new DrivingInput(fake, createDefaultControls);
  }

  /** Traduce el mando ideal a teclas y devuelve lo que llega al auto. */
  drive(ideal: DriverInput, dt: number, speed: number): DriverInput {
    this.keys.clear();
    if (ideal.throttle > 0.5) this.keys.add('ArrowUp');
    if (ideal.brake > 0.25) this.keys.add('ArrowDown');
    // Con teclado se "tocan" las flechas: se pulsa sólo si el volante está lejos de lo pedido.
    const current = this.input.controls.steer;
    if (ideal.steer - current > 0.08) this.keys.add('ArrowRight');
    else if (ideal.steer - current < -0.08) this.keys.add('ArrowLeft');
    this.input.update(dt, speed);
    const c = this.input.controls;
    return { throttle: c.throttle, brake: c.brake, steer: c.steer, drs: false };
  }
}
