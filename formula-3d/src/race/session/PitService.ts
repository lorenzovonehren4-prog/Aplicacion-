/**
 * Coreografía de la parada en boxes (lógica pura, para dibujar y para los
 * sonidos): a partir de los segundos desde que el auto paró, cuándo suben y
 * bajan los gatos, cuándo trabajan las pistolas y cuándo sale cada rueda
 * vieja y entra la nueva. La usan el equipo de boxes, los autos (que se
 * levantan y se quedan sin ruedas un momento) y la repetición.
 *
 *   0,00        el auto para sobre la marca: entran los gatos
 *   0,06–0,26   sube la trompa; 0,20–0,40 la cola (el del gato entra por detrás)
 *   0,24–0,48   las pistolas aflojan las tuercas
 *   0,48–0,78   sale la rueda vieja
 *   0,78–1,08   entra la nueva
 *   1,08–1,32   las pistolas ajustan
 *   T−0,30      bajan los gatos (en 0,16 s)
 *   T           semáforo en verde: sale
 *
 * Cada rueda va un poco desfasada (los equipos no son robots). Con el
 * servicio más corto (`SERVICE_BASE`) todo entra antes de bajar los gatos.
 */

import { clamp } from '../../core/utils/math';

/** Altura a la que los gatos levantan el auto (m). */
export const LIFT_HEIGHT = 0.07;
/** Ruedas en el orden de los autos: delantera izquierda, delantera derecha, trasera izquierda, trasera derecha. */
export const WHEELS = 4;
/** Desfase de cada rueda (s). */
const STAGGER: readonly number[] = [0, 0.05, 0.08, 0.03];
const LIFT_FRONT: readonly [number, number] = [0.06, 0.26];
const LIFT_REAR: readonly [number, number] = [0.2, 0.4];
const LOOSEN: readonly [number, number] = [0.24, 0.48];
const OFF: readonly [number, number] = [0.48, 0.78];
const ON: readonly [number, number] = [0.78, 1.08];
const TIGHTEN: readonly [number, number] = [1.08, 1.32];
/** Los gatos bajan desde este tiempo antes de la salida y tardan `DROP` s. */
const DROP_BEFORE = 0.3;
const DROP = 0.16;
/** Las cuatro ruedas listas (s desde que paró). */
export const TYRES_DONE = TIGHTEN[1] + Math.max(...STAGGER);

/** Qué pasa en una rueda en un instante. */
export interface WheelWork {
  /** La pistola está trabajando (aflojando o ajustando). */
  gun: boolean;
  /** Rueda vieja saliendo: 0 puesta, 1 ya afuera (en manos del mecánico). */
  off: number;
  /** Rueda nueva entrando: 0 en manos del mecánico, 1 puesta. */
  on: number;
  /** El auto tiene una rueda puesta (la vieja antes de salir o la nueva después de entrar). */
  attached: boolean;
  /** Terminada (ajustada). */
  done: boolean;
}

/** Lo que el dibujo necesita saber de un auto en boxes. */
export interface ServicePose {
  /** Altura de los gatos adelante y atrás (m). */
  liftFront: number;
  liftRear: number;
  /** Ruedas sacadas: un bit por rueda (1 = delantera izquierda … 8 = trasera derecha). */
  wheelsOff: number;
}

const progress = (t: number, [from, to]: readonly [number, number]): number => clamp((t - from) / (to - from), 0, 1);
const ease = (x: number): number => x * x * (3 - 2 * x);

/**
 * Altura de los gatos a `t` s de que paró, con un servicio de `duration` s.
 * Suben con el auto parado y bajan justo antes de la salida.
 */
export function liftAt(t: number, duration: number, front: boolean): number {
  if (t < 0) return 0;
  const up = ease(progress(t, front ? LIFT_FRONT : LIFT_REAR));
  const dropFrom = duration - DROP_BEFORE + (front ? 0 : 0.04);
  const down = ease(progress(t, [dropFrom, dropFrom + DROP]));
  return LIFT_HEIGHT * up * (1 - down);
}

/** Trabajo en la rueda `wheel` (0–3) a `t` s de que paró. */
export function wheelWork(t: number, wheel: number, out: WheelWork): WheelWork {
  const local = t - (STAGGER[wheel] ?? 0);
  out.gun = (local >= LOOSEN[0] && local < LOOSEN[1]) || (local >= TIGHTEN[0] && local < TIGHTEN[1]);
  out.off = ease(progress(local, OFF));
  out.on = ease(progress(local, ON));
  out.attached = local < OFF[0] || local >= ON[1];
  out.done = local >= TIGHTEN[1];
  return out;
}

/** ¿Alguna pistola empieza a trabajar entre `from` y `to` (s desde que paró)? Para el sonido. */
export function gunStarts(from: number, to: number): boolean {
  if (to <= from) return false;
  return STAGGER.some((offset) => [LOOSEN[0], TIGHTEN[0]].some((start) => from < start + offset && start + offset <= to));
}

/** ¿Los gatos tocan el auto (al subir) o el piso (al bajar) entre `from` y `to`? Para el sonido. */
export function jackHits(from: number, to: number, duration: number): boolean {
  if (to <= from) return false;
  const marks = [LIFT_FRONT[0], LIFT_REAR[0], duration - DROP_BEFORE + DROP];
  return marks.some((mark) => from < mark && mark <= to);
}

const work: WheelWork = { gun: false, off: 0, on: 0, attached: true, done: false };

/**
 * Pose de servicio de un auto a `t` s de que paró (null: no está parado en
 * su box, el auto se ve normal).
 */
export function servicePose(t: number | null, duration: number, out: ServicePose): ServicePose {
  if (t === null) {
    out.liftFront = 0;
    out.liftRear = 0;
    out.wheelsOff = 0;
    return out;
  }
  out.liftFront = liftAt(t, duration, true);
  out.liftRear = liftAt(t, duration, false);
  let mask = 0;
  for (let wheel = 0; wheel < WHEELS; wheel++) {
    if (!wheelWork(t, wheel, work).attached) mask |= 1 << wheel;
  }
  out.wheelsOff = mask;
  return out;
}
