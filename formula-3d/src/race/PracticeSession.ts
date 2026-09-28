/**
 * Práctica libre: un auto solo en pista. Reúne la física, el cronómetro y
 * las reglas (zonas de DRS, límites de pista, volver a pista con R).
 * No sabe nada del DOM ni del 3D: la pantalla de carrera la dibuja.
 */

import type { CarSpec } from './physics/CarSpec';
import { Vehicle, type DriverInput } from './physics/Vehicle';
import { LapTimer, type LapEvent } from './session/LapTimer';
import type { DrivingControls } from './input/DrivingInput';
import type { Track } from '../tracks/Track';

export type DrsState = 'off' | 'available' | 'open';

export type SessionEvent = LapEvent | { kind: 'drsZone'; entered: boolean };

/** Velocidad mínima para avisar "sentido contrario" (m/s). */
const WRONG_WAY_SPEED = 4;
/** Distancia hacia atrás a la que se reaparece al volver a pista (m). */
const RESET_BACK = 15;

export class PracticeSession {
  readonly vehicle: Vehicle;
  timer: LapTimer;
  /** Choque más fuerte desde la última lectura (m/s). */
  private impactPeak = 0;
  private inDrsZone = false;
  private readonly driverInput: DriverInput = { throttle: 0, brake: 0, steer: 0, drs: false };
  private readonly point = { x: 0, z: 0 };
  private readonly tangent = { x: 0, z: 0 };

  constructor(
    readonly track: Track,
    spec: CarSpec,
    private readonly personalBest: number | null,
  ) {
    this.vehicle = new Vehicle(spec, track);
    this.timer = this.createTimer(personalBest);
    this.placeOnGrid();
  }

  /** Metros recorridos desde la línea de meta (0 … longitud). */
  get distance(): number {
    return this.track.geometry.wrapS(this.vehicle.projection.s - this.track.startS);
  }

  get drsState(): DrsState {
    if (this.vehicle.drs > 0.5) return 'open';
    return this.vehicle.drsAllowed ? 'available' : 'off';
  }

  /** ¿El auto va en sentido contrario a la pista? */
  get wrongWay(): boolean {
    const v = this.vehicle;
    if (v.speed < WRONG_WAY_SPEED || v.vx < 0) return false;
    const g = this.track.geometry;
    const i = g.wrapIndex(v.projection.index);
    const dot = -Math.sin(v.heading) * (g.tx[i] ?? 0) - Math.cos(v.heading) * (g.tz[i] ?? 0);
    return dot < -0.3;
  }

  /** Devuelve y reinicia el pico de impacto acumulado. */
  takeImpact(): number {
    const peak = this.impactPeak;
    this.impactPeak = 0;
    return peak;
  }

  /**
   * Avanza un paso fijo de simulación.
   * @param controls mandos del piloto
   * @param drsRequested el piloto pidió el DRS (se abre si está permitido)
   */
  step(dt: number, controls: DrivingControls, drsRequested: boolean): SessionEvent[] {
    const events: SessionEvent[] = [];
    const v = this.vehicle;

    // DRS: en práctica libre se puede usar en cualquier zona.
    const distanceBefore = this.distance;
    const inZone = this.track.drsZones.some((zone) => this.track.inRange(v.projection.s, zone.start, zone.end));
    if (inZone !== this.inDrsZone) {
      this.inDrsZone = inZone;
      events.push({ kind: 'drsZone', entered: inZone });
    }
    v.drsAllowed = inZone;

    this.driverInput.throttle = controls.throttle;
    this.driverInput.brake = controls.brake;
    this.driverInput.steer = controls.steer;
    this.driverInput.drs = drsRequested;
    v.step(dt, this.driverInput);
    this.impactPeak = Math.max(this.impactPeak, v.telemetry.impact);

    events.push(...this.timer.step(this.distance, dt));

    // Límites de pista: las cuatro ruedas fuera anulan la vuelta.
    if (v.telemetry.wheelsOff >= 4) {
      const event = this.timer.invalidate('trackLimits');
      if (event) events.push(event);
    }
    // Evita avisos falsos si el auto quedó en otro punto (distancia imposible).
    if (Math.abs(this.distance - distanceBefore) > 100 && Math.abs(this.distance - distanceBefore) < this.track.length - 100) {
      this.timer.teleported();
    }
    return events;
  }

  /** Vuelve a la pista (tecla R): sobre el centro, un poco atrás, detenido. */
  resetToTrack(): SessionEvent[] {
    const events: SessionEvent[] = [];
    const invalidated = this.timer.invalidate('reset');
    if (invalidated) events.push(invalidated);
    const g = this.track.geometry;
    const s = g.wrapS(this.vehicle.projection.s - RESET_BACK);
    this.vehicle.placeAt(s, 0);
    this.timer.teleported();
    this.impactPeak = 0;
    return events;
  }

  /** Reinicia la sesión: auto en la parrilla y cronómetro a cero. */
  restart(): void {
    this.timer = this.createTimer(this.timer.personalBest ?? this.personalBest);
    this.placeOnGrid();
  }

  /** Punto y tangente de la pista en la posición del auto (para la cámara de presentación). */
  trackFrame(): { x: number; z: number; tx: number; tz: number } {
    this.track.geometry.pointAt(this.vehicle.projection.s, 0, this.point, this.tangent);
    return { x: this.point.x, z: this.point.z, tx: this.tangent.x, tz: this.tangent.z };
  }

  private placeOnGrid(): void {
    const slot = this.track.gridSlot(0);
    this.vehicle.placeAt(slot.s, slot.d);
    this.inDrsZone = false;
    this.impactPeak = 0;
  }

  private createTimer(personalBest: number | null): LapTimer {
    const g = this.track.geometry;
    return new LapTimer({
      length: this.track.length,
      sectorEnds: [
        g.wrapS(this.track.sectorEnds[0] - this.track.startS),
        g.wrapS(this.track.sectorEnds[1] - this.track.startS),
      ],
      personalBest,
    });
  }
}
