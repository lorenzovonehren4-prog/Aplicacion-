/**
 * Piloto bot (PLAN.md §5.5). Maneja un `Vehicle` con la misma física que el
 * jugador, sólo que los mandos los decide él:
 *
 * - Sigue la trazada ideal con un desplazamiento lateral propio ("carril")
 *   que usa para adelantar, defender y esquivar.
 * - Planea las frenadas: la velocidad objetivo es la más baja que exige
 *   cualquier punto de adelante, sabiendo cuánto puede frenar hasta ahí.
 * - Tráfico: si alguien va delante en su carril y no lo puede pasar, lo sigue
 *   a una distancia prudente (no lo embiste). Si es más rápido, elige un lado
 *   (el interior de la próxima curva si hay lugar) y lo intenta. Nunca se
 *   cierra sobre un auto que tiene al lado.
 * - La dificultad fija su ritmo, su velocidad máxima, cuánto apura las
 *   frenadas, su agresividad y cada cuánto se equivoca.
 */

import type { Track } from '../../tracks/Track';
import type { PerformanceModel } from '../physics/CarSpec';
import type { DriverInput, Vehicle } from '../physics/Vehicle';
import type { BotParams } from './difficulty';

/** Largo de un auto (m): separación mínima de trompa a cola. */
export const CAR_LENGTH = 5.7;
/** Separación lateral (m, centro a centro) para ir lado a lado sin tocarse. */
const SIDE_CLEARANCE = 2.5;
/** Separación lateral por debajo de la cual el de adelante "tapa" el camino. */
const BLOCKING_WIDTH = 2.05;
/** Margen del borde del asfalto para el carril (m, desde el centro del auto). */
const EDGE_MARGIN = 1.15;
/** El acelerador sube como un pie: de 0 a 1 en este tiempo (s). */
const THROTTLE_RISE = 0.22;
/** Rapidez del pie en el freno (1/s): sube casi de golpe y suelta más suave. */
const BRAKE_RISE = 7;
const BRAKE_FALL = 5;
/** Ángulo de deriva (rad) desde el que el bot considera que el auto desliza. */
const SLIDE_ANGLE = 0.12;
/** Rapidez con la que el bot cambia de carril (m/s). */
const LANE_RATE = 2.2;
/** Tiempo mínimo que sostiene la decisión de adelantar por un lado (s). */
const PASS_HOLD_TIME = 1.6;
/** Tiempo detenido lejos de la largada tras el cual el bot pide volver a pista (s). */
const STUCK_TIME = 5;
/** Duración de un error (frenada pasada o salida ancha) (s). */
const MISTAKE_TIME = 2.2;
/** Prudencia de la primera vuelta: segundos tras la largada con frenadas más largas y sin maniobras al frenar. */
const START_CAUTION = 30;
/** Ritmo en curva durante la largada (fracción del propio). */
const START_PACE = 0.94;
/** Por debajo de esta velocidad (m/s) nadie cede el paso a nadie. */
const YIELD_MIN_SPEED = 12;
/** Bandera azul: desde qué distancia (m) detrás se corre, a cuánto del centro (m) y cuánto levanta. */
const BLUE_YIELD_RANGE = 70;
const BLUE_YIELD_OFFSET = 3;
const BLUE_YIELD_PACE = 0.97;
/** Anticipación del movimiento lateral de los demás (s). */
const LATERAL_LOOKAHEAD = 0.45;
/**
 * Se está quedando sin pista: pasado de su trayectoria hacia el borde (m) con
 * menos de esto de asfalto (m) y yéndose hacia afuera (m/s). Levanta el pie
 * (pasa peso adelante y recupera agarre), como un piloto a la salida de una
 * curva rápida.
 */
const RUNOUT_OVERSHOOT = 0.45;
const RUNOUT_ROOM = 2.4;
const RUNOUT_DRIFT = 0.4;
/** Fuera del asfalto (más de 1,5 m) tanto tiempo (s): vuelve a la trazada como uno trabado. */
const OFF_TRACK_TIME = 4;
/**
 * Memoria de la pista: largo de cada tramo (m), cuánto antes del problema se
 * va con más cuidado (m), cuánto ritmo se resigna por cada susto, el mínimo y
 * cada cuánto puede aprender un mismo bot (s).
 */
const LESSON_BIN = 20;
const LESSON_REACH = 140;
const LESSON_STEP = 0.025;
const LESSON_MIN = 0.86;
const LESSON_COOLDOWN = 2.5;
/** Ángulo de deriva (rad) que ya es un trompo: también enseña. */
const SPIN_ANGLE = 0.32;

/**
 * Lo que los bots aprendieron de cada pista cargada: un factor de ritmo por
 * tramo (1 = al ritmo de su nivel). Lo comparten todos los bots de la sesión:
 * si uno se abre en una curva, el resto llega a ella con un poco más de
 * margen, como pilotos que aprenden el circuito. Una pista nueva empieza de cero.
 */
const lessons = new WeakMap<Track, Float32Array>();

function lessonsFor(track: Track): Float32Array {
  let table = lessons.get(track);
  if (!table) {
    table = new Float32Array(Math.ceil(track.geometry.length / LESSON_BIN)).fill(1);
    lessons.set(track, table);
  }
  return table;
}

export class BotDriver {
  /** Pide volver a pista (quedó detenido o atascado). */
  needsReset = false;
  /** Bandera azul: el auto que lo va a doblar (se corre de la trazada y lo deja pasar). */
  blueFlag: Vehicle | null = null;
  /**
   * Agarre que le queda al auto respecto de uno nuevo (neumáticos gastados,
   * daño): las curvas se toman más despacio (la velocidad va con su raíz).
   */
  grip = 1;
  /** Carril actual y deseado (m, respecto de la trazada; + derecha). */
  private lane = 0;
  private laneTarget = 0;
  /** Lado del adelantamiento en curso (−1 izquierda, 1 derecha, 0 ninguno) y hasta cuándo sostenerlo. */
  private passSide = 0;
  private passHold = 0;
  /** Tiempo siguiendo a alguien sin poder pasar (s). */
  private stuckBehind = 0;
  /** Ya cerró la puerta a quien lo ataca (una sola maniobra por ataque). */
  private defended = false;
  private throttle = 0;
  private brake = 0;
  private launchWait: number;
  private stuckTime = 0;
  private offTrackTime = 0;
  private mistake = 0;
  private wasBraking = false;
  /** Segundos desde la largada. */
  private sinceStart = 0;
  private readonly brakingZones: number;
  private readonly target = { x: 0, z: 0 };
  /** Factor de ritmo aprendido por tramo (compartido con los otros bots de la pista). */
  private readonly caution: Float32Array;
  private lessonCooldown = 0;

  /**
   * @param random generador 0–1 (inyectable para que las pruebas sean repetibles)
   */
  constructor(
    private readonly track: Track,
    private readonly model: PerformanceModel,
    readonly params: BotParams,
    private readonly random: () => number = Math.random,
  ) {
    this.launchWait = params.reaction;
    // Cantidad de frenadas por vuelta: reparte los errores por vuelta entre ellas.
    const braking = track.racingLine.braking;
    let zones = 0;
    for (let k = 0; k < braking.length; k++) {
      if ((braking[k] ?? 0) > 0 && (braking[(k - 1 + braking.length) % braking.length] ?? 0) === 0) zones++;
    }
    this.brakingZones = Math.max(1, zones);
    this.caution = lessonsFor(track);
  }

  /** Todavía espera su reacción a la largada (el auto sigue retenido). */
  get holding(): boolean {
    return this.launchWait > 0;
  }

  /**
   * Vuelve al estado inicial. Con `car` (ya ubicado en su casillero) larga
   * desde la parrilla: arranca en su carril y con su tiempo de reacción.
   */
  reset(car: Vehicle | null): void {
    const onGrid = car !== null;
    this.lane = car ? car.projection.d - this.track.racingLine.offsetAt(car.projection.s) : 0;
    this.laneTarget = this.lane;
    this.passSide = 0;
    this.passHold = 0;
    this.stuckBehind = 0;
    this.defended = false;
    this.throttle = 0;
    this.brake = 0;
    this.launchWait = onGrid ? this.params.reaction : 0;
    this.stuckTime = 0;
    this.offTrackTime = 0;
    this.mistake = 0;
    this.wasBraking = false;
    this.sinceStart = onGrid ? 0 : START_CAUTION;
    this.needsReset = false;
    this.blueFlag = null;
  }

  /**
   * Vuelve a la pista después de una parada en boxes: sigue en el carril en
   * que quedó (sin volantazos hacia la trazada) y sin esperar ninguna largada.
   */
  rejoin(car: Vehicle): void {
    this.reset(null);
    this.lane = car.projection.d - this.track.racingLine.offsetAt(car.projection.s);
    this.laneTarget = this.lane;
  }

  /** En la parrilla: acelera en vacío para tener vueltas al apagarse las luces. */
  grid(out: DriverInput): DriverInput {
    out.throttle = 0.55;
    out.brake = 0;
    out.steer = 0;
    out.drs = false;
    return out;
  }

  /**
   * Mandos para este paso.
   * @param others el resto de los autos en pista (incluido el jugador)
   * @param speedCap tope de velocidad (m/s), p. ej. en la vuelta de enfriamiento
   */
  drive(car: Vehicle, dt: number, others: readonly Vehicle[], out: DriverInput, speedCap = Infinity): DriverInput {
    const g = this.track.geometry;
    const line = this.track.racingLine;
    const p = this.params;
    const s = car.projection.s;
    const d = car.projection.d;
    const speed = Math.max(0, car.vx);
    out.drs = true;

    // Reacción a la largada.
    if (this.launchWait > 0) {
      this.launchWait -= dt;
      return this.grid(out);
    }

    this.sinceStart += dt;
    const cautious = this.sinceStart < START_CAUTION;

    // ─── Errores: al llegar a una frenada, a veces se la pasa ───
    const braking = (line.braking[line.indexAt(s + 30)] ?? 0) > 0;
    if (braking && !this.wasBraking && !cautious && this.random() < p.mistakesPerLap / this.brakingZones) {
      this.mistake = MISTAKE_TIME;
    }
    this.wasBraking = braking;
    this.mistake = Math.max(0, this.mistake - dt);
    const erring = this.mistake > 0;
    // En la largada (autos de a dos y de a tres) se llega a las primeras curvas con margen.
    const pace = erring ? Math.min(1.02, p.pace * 1.025) : p.pace * (cautious ? START_PACE : 1);
    const brakingFraction = erring ? Math.min(1.05, p.braking * 1.12) : p.braking * (cautious ? 0.88 : 1);
    // Curva que viene (la más cerrada de los próximos 120 m; + = derecha).
    let corner = 0;
    for (let ahead = 10; ahead <= 120; ahead += 10) {
      const k = line.curvature[line.indexAt(s + ahead)] ?? 0;
      if (Math.abs(k) > Math.abs(corner)) corner = k;
    }
    const cornerSide = Math.abs(corner) > 1 / 300 ? Math.sign(corner) : 0;

    // ─── Velocidad planeada sin tráfico ───
    const offLine = Math.min(1, Math.abs(this.lane) / 3);
    let targetSpeed = Math.min(speedCap, this.plannedSpeed(s, speed, pace * (1 - 0.05 * offLine) * Math.sqrt(this.grip), brakingFraction * this.grip));

    // ─── Tráfico ───
    const halfWidth = g.halfWidth;
    let minD = -halfWidth + EDGE_MARGIN;
    let maxD = halfWidth - EDGE_MARGIN;
    let blocker: Vehicle | null = null;
    let blockerGap = Infinity;
    let attacker: Vehicle | null = null;
    let attackerGap = Infinity;
    const lineHere = line.offsetAt(s);
    // Auto al lado y un poco adelante que no deja lugar (hay que ceder).
    let alongsideAhead: Vehicle | null = null;
    // Auto por dentro de la próxima curva con el que voy a la par: se le deja el lugar.
    let outsideOf: Vehicle | null = null;
    // Hay un auto en el carril al que pensaba volver (pero no en el actual).
    let mergeBlocked = false;
    // Los autos que más lugar me quitan a cada lado.
    let leftSqueezer: Vehicle | null = null;
    let rightSqueezer: Vehicle | null = null;
    for (const other of others) {
      if (other === car) continue;
      const ds = g.deltaS(s, other.projection.s);
      const od = other.projection.d;
      // Lado a lado (o a punto de estarlo): no cerrarse sobre él. Un auto justo
      // delante o detrás en la misma línea no cuenta (a ése se lo sigue).
      const overlap = Math.abs(ds) < CAR_LENGTH + 0.5;
      // Un auto que viene detrás (sin llegar a la mitad de mi auto) no me quita
      // lugar: es él quien debe esquivarme. Antes el puntero le cedía la trazada
      // al que lo seguía y se abría en la primera curva.
      const near = ds > -CAR_LENGTH * 0.75 && ds < CAR_LENGTH + 3;
      if (near && (overlap || Math.abs(od - d) > 1.4)) {
        // Con su movimiento lateral: si viene hacia mí, se le deja lugar antes.
        const drift = lateralSpeed(other, g) * LATERAL_LOOKAHEAD;
        if (od >= d) {
          const limit = Math.min(od, od + drift) - SIDE_CLEARANCE;
          if (limit < maxD) {
            maxD = limit;
            rightSqueezer = other;
          }
        } else {
          const limit = Math.max(od, od + drift) + SIDE_CLEARANCE;
          if (limit > minD) {
            minD = limit;
            leftSqueezer = other;
          }
        }
        // Al costado y a la par o adelante: si no queda lugar, el que cede soy yo.
        if (ds > -2 && Math.abs(od - d) >= BLOCKING_WIDTH * 0.8 && (!alongsideAhead || ds > g.deltaS(s, alongsideAhead.projection.s))) {
          alongsideAhead = other;
        }
        // Por fuera de la curva que viene y sin ir claramente adelante: cede.
        const outside = cornerSide !== 0 && Math.sign(od - d) === cornerSide;
        if (overlap && outside && ds > -3) outsideOf = other;
      }
      if (ds > 0 && ds < 90) {
        // ¿Está (o va a estar, según hacia dónde se mueve) en el camino que hago
        // ahora o en el que planeo hasta él?
        const gap = ds - CAR_LENGTH;
        const reach = Math.min(1, gap / Math.max(1, speed - Math.max(0, other.vx)));
        const theirs = od + lateralSpeed(other, g) * Math.max(0, reach);
        const lineThere = line.offsetAt(other.projection.s);
        const now = Math.min(Math.abs(od - (lineThere + this.lane)), Math.abs(theirs - (lineThere + this.lane)));
        const planned = Math.min(Math.abs(od - (lineThere + this.laneTarget)), Math.abs(theirs - (lineThere + this.laneTarget)));
        if (now < BLOCKING_WIDTH && gap < blockerGap) {
          blocker = other;
          blockerGap = gap;
        } else if (planned < BLOCKING_WIDTH && gap < 40) {
          // Sólo estorba en el carril al que iba a volver: se queda en el suyo
          // (frenar a fondo por él, doblando rápido, lo hacía trompear).
          mergeBlocked = true;
        }
      } else if (ds < 0 && ds > -30 && -ds < attackerGap) {
        attacker = other;
        attackerGap = -ds - CAR_LENGTH;
      }
    }
    // Sin lugar entre el auto de al lado y el borde: el que va detrás cede.
    // Ceder sólo en ritmo de carrera: con autos detenidos o muy lentos no hay a quién
    // dejarle lugar (y dos que se ceden el paso se quedarían parados).
    if (minD > maxD && alongsideAhead && alongsideAhead.vx > YIELD_MIN_SPEED && speed > YIELD_MIN_SPEED) {
      targetSpeed = Math.min(targetSpeed, Math.max(0, alongsideAhead.vx - 3));
    }
    if (outsideOf && outsideOf.vx > YIELD_MIN_SPEED && speed > YIELD_MIN_SPEED && (braking || cautious || p.aggression < 0.6)) {
      targetSpeed = Math.min(targetSpeed, Math.max(0, outsideOf.vx - 2));
    }

    this.passHold = Math.max(0, this.passHold - dt);
    if (blocker) {
      const theirSpeed = Math.max(0, blocker.vx);
      const closing = speed - theirSpeed;
      // Distancia de seguimiento: más corta cuanto más agresivo.
      const followGap = 1.5 + speed * (0.3 - 0.14 * p.aggression);
      if (blockerGap < 45) this.stuckBehind += dt;
      const wantsPass =
        blockerGap < 40 && (closing > 1.5 || (this.stuckBehind > 2.5 - 1.5 * p.aggression && targetSpeed > theirSpeed + 0.5));
      if (wantsPass && this.passSide === 0 && !(cautious && braking)) this.passSide = this.chooseSide(s, blocker, minD, maxD);
      if (this.passSide !== 0) this.passHold = Math.max(this.passHold, wantsPass ? PASS_HOLD_TIME : 0);
      const lateral = Math.abs(blocker.projection.d - d);
      // Mientras no esté al costado, no lo toca: velocidad para frenar detrás si hace falta.
      if (this.passSide === 0 || lateral < BLOCKING_WIDTH) {
        // Frenada prudente: el de adelante puede frenar más fuerte que yo.
        const decel = 0.7 * brakingFraction * this.decelAt(theirSpeed);
        const room = Math.max(0, blockerGap - (this.passSide === 0 ? followGap : 1.5));
        const safe = Math.sqrt(theirSpeed * theirSpeed + 2 * decel * room);
        const follow = theirSpeed + (blockerGap - followGap) * 0.6;
        targetSpeed = Math.min(targetSpeed, this.passSide === 0 ? Math.min(safe, Math.max(0, follow)) : safe);
      }
    } else {
      this.stuckBehind = 0;
    }
    if (this.passHold <= 0 && (!blocker || blockerGap > 45)) this.passSide = 0;

    // ─── Carril deseado ───
    const lapper = this.blueFlag;
    const lapperGap = lapper ? -g.deltaS(s, lapper.projection.s) : Infinity;
    if (this.passSide !== 0 && blocker) {
      const want = blocker.projection.d + this.passSide * (SIDE_CLEARANCE + 0.2) - lineHere;
      this.laneTarget = want;
    } else if (lapper && lapperGap > 0 && lapperGap < BLUE_YIELD_RANGE && !braking) {
      // Bandera azul: se corre al lado contrario del que viene y levanta un poco.
      const away = -(Math.sign(lapper.projection.d - d) || Math.sign(lineHere) || 1);
      this.laneTarget = away * BLUE_YIELD_OFFSET - lineHere;
      targetSpeed *= BLUE_YIELD_PACE;
      this.defended = true;
    } else if (
      attacker &&
      attackerGap < 12 &&
      Math.max(0, attacker.vx) > speed + 0.5 &&
      p.aggression > 0.45 &&
      !this.defended &&
      !braking &&
      Math.abs(line.curvature[line.indexAt(s)] ?? 0) < 1 / 600
    ) {
      // Sólo en recta y fuera de las frenadas: nada de movimientos al frenar.
      // Cerrar la puerta: un movimiento hacia el lado del atacante, antes de que llegue.
      const side = Math.sign(attacker.projection.d - d) || 1;
      this.laneTarget = this.lane + side * 1.4;
      this.defended = true;
    } else if (mergeBlocked && this.passSide === 0) {
      this.laneTarget = this.lane;
    } else if (!attacker || attackerGap > 25) {
      this.defended = false;
      // Sin nadie cerca, de vuelta a la trazada de a poco.
      this.laneTarget *= Math.max(0, 1 - dt * 0.6);
    }
    // Límites: el asfalto y los autos que tiene al lado. Apretado entre dos
    // autos (o un auto y el borde), el medio, pero nunca fuera del asfalto: en
    // la largada el de afuera se iba de la pista empujado por el resto.
    const edgeLow = -halfWidth + EDGE_MARGIN - lineHere;
    const edgeHigh = halfWidth - EDGE_MARGIN - lineHere;
    const clampLane = (value: number): number => {
      const low = minD - lineHere;
      const high = maxD - lineHere;
      const lane = low > high ? (low + high) / 2 : Math.max(low, Math.min(high, value));
      return Math.max(edgeLow, Math.min(edgeHigh, lane));
    };
    this.laneTarget = clampLane(this.laneTarget);
    const step = LANE_RATE * dt;
    this.lane += Math.max(-step, Math.min(step, this.laneTarget - this.lane));
    this.lane = clampLane(this.lane);

    // ─── Dirección: persecución pura hacia la trazada + carril ───
    // Con un auto al lado se mira más cerca: corrige la trayectoria más rápido.
    const squeezed = minD > -halfWidth + EDGE_MARGIN || maxD < halfWidth - EDGE_MARGIN;
    const lookahead = squeezed ? 5 + speed * 0.24 : 6 + speed * 0.38;
    const aheadLine = line.offsetAt(s + lookahead);
    // El punto al que apunta respeta el borde y a los autos de al lado.
    const lateralLimit = halfWidth - EDGE_MARGIN * 0.6;
    const low = Math.max(-lateralLimit, minD);
    const high = Math.min(lateralLimit, maxD);
    const wantedAim = Math.max(-lateralLimit, Math.min(lateralLimit, aheadLine + this.lane));
    const aim = Math.max(-lateralLimit, Math.min(lateralLimit, low > high ? (low + high) / 2 : Math.max(low, Math.min(high, wantedAim))));
    // Encajonado: un auto a la par o adelante no lo deja ir por donde la curva
    // pide. En vez de abrirse (y salirse), levanta y se acomoda detrás de él.
    const boxer = wantedAim > aim + 2 ? rightSqueezer : wantedAim < aim - 2 ? leftSqueezer : null;
    if (boxer && g.deltaS(s, boxer.projection.s) > -2 && boxer.vx > YIELD_MIN_SPEED && speed > YIELD_MIN_SPEED) {
      targetSpeed = Math.min(targetSpeed, Math.max(0, boxer.vx - 2));
    }
    g.pointAt(s + lookahead, aim, this.target);
    const dx = this.target.x - car.x;
    const dz = this.target.z - car.z;
    // Si la cola se sale, la persecución pasa a medirse respecto de hacia dónde
    // VA el auto (no hacia dónde apunta): las ruedas quedan alineadas con la
    // marcha y el bot contravolantea, como un piloto. Doblando normal, la
    // deriva es chica y no se toca (sumarla haría oscilar al auto en recta).
    const slip = speed > 5 ? Math.atan2(car.vy, Math.max(1, car.vx)) : 0;
    const counter = Math.min(1, Math.max(0, (Math.abs(slip) - SLIDE_ANGLE * 0.5) / (SLIDE_ANGLE * 0.5))) * slip;
    const course = car.heading + counter;
    const sinC = Math.sin(course);
    const cosC = Math.cos(course);
    const forward = dx * -sinC + dz * -cosC;
    const left = dx * -cosC + dz * sinC;
    const curvature = (2 * left) / Math.max(1, forward * forward + left * left);
    const spec = car.spec;
    const wheelAngle = Math.atan(curvature * (spec.cgToFront + spec.cgToRear)) + counter;
    const maxSteer = spec.maxSteerHigh + (spec.maxSteerLow - spec.maxSteerHigh) / (1 + (speed / spec.steerSpeedFalloff) ** 2);
    out.steer = Math.max(-1, Math.min(1, -wheelAngle / maxSteer));

    // ─── Se queda sin pista: levanta (y si se pasó mucho, frena apenas) ───
    const room = halfWidth - Math.abs(d);
    const edgeSide = Math.sign(d) || 1;
    const overshoot = edgeSide * (d - (lineHere + this.lane));
    const drift = edgeSide * lateralSpeed(car, g);
    if (speed > 15 && room < RUNOUT_ROOM && overshoot > RUNOUT_OVERSHOOT && drift > RUNOUT_DRIFT) {
      targetSpeed = Math.min(targetSpeed, speed - (overshoot > 1.2 ? 1.2 : 0.5));
    }
    // Un susto (afuera del asfalto o muy pasado hacia el borde) sin haberlo
    // buscado: la próxima vez se llega a este tramo con más margen.
    this.lessonCooldown = Math.max(0, this.lessonCooldown - dt);
    const slipNow = speed > 5 ? Math.atan2(car.vy, Math.max(1, car.vx)) : 0;
    const spinning = speed > 10 && Math.abs(slipNow) > SPIN_ANGLE;
    const scare = spinning || room < -0.5 || (overshoot > 1.2 && room < 0.8 && drift > RUNOUT_DRIFT);
    if (scare && !erring && !cautious && speed > 10 && this.lessonCooldown === 0) {
      this.learn(s);
      this.lessonCooldown = LESSON_COOLDOWN;
    }

    // ─── Pedales ───
    const error = targetSpeed - speed;
    // Deslizando: se levanta el pie (acelerar en pleno trompo lo empeora).
    // Casi detenido (en el pasto, después de un trompo) no hay deslizamiento que
    // cuidar: con el acelerador limitado no salía nunca del pasto.
    const sliding = speed > 5 && (Math.abs(slip) > SLIDE_ANGLE || car.telemetry.slide > 0.5);
    const throttleCap = sliding ? 0.25 : p.topThrottle;
    const wanted = error > 0 ? Math.min(throttleCap, error * 0.6) : 0;
    this.throttle = Math.min(wanted, this.throttle + dt / THROTTLE_RISE);
    out.throttle = this.throttle;
    // Freno progresivo, y sólo con el agarre que deja la curva (elipse de
    // fricción): frenar a fondo doblando rápido hace trompear, y en el tráfico
    // de la largada varios se iban así en la primera curva.
    const bend = Math.abs(line.curvature[line.indexAt(s)] ?? 0);
    const lateralUse = Math.min(1, (speed * speed * bend) / this.lateralGripAt(speed));
    const brakeRoom = Math.sqrt(Math.max(0.2, 1 - lateralUse * lateralUse));
    const brakeWanted = error < -0.6 ? Math.min(1, -error / 5) * Math.min(1 - 0.45 * Math.abs(out.steer), brakeRoom) : 0;
    const brakeStep = dt * (brakeWanted > this.brake ? BRAKE_RISE : BRAKE_FALL);
    this.brake += Math.max(-brakeStep, Math.min(brakeStep, brakeWanted - this.brake));
    out.brake = sliding ? Math.min(this.brake, 0.3) : this.brake;

    // ─── ¿Atascado? (contra un muro, en la grava o sin poder volver al asfalto) ───
    this.stuckTime = speed < 2 ? this.stuckTime + dt : 0;
    this.offTrackTime = room < -1.5 ? this.offTrackTime + dt : Math.max(0, this.offTrackTime - dt * 2);
    if (!this.needsReset && (this.stuckTime > STUCK_TIME || this.offTrackTime > OFF_TRACK_TIME)) {
      this.needsReset = true;
      // Lo que lo dejó afuera pasó un poco antes: ahí se aprende el doble.
      if (!erring) for (let back = 0; back <= LESSON_BIN * 4; back += LESSON_BIN * 2) this.learn(s - back);
    }
    return out;
  }

  /** Vuelve a pista tras un reinicio: sin carril ni decisiones pendientes. */
  recovered(): void {
    this.needsReset = false;
    this.stuckTime = 0;
    this.offTrackTime = 0;
    this.lane = 0;
    this.laneTarget = 0;
    this.passSide = 0;
    this.passHold = 0;
    this.throttle = 0;
    this.brake = 0;
  }

  /**
   * Velocidad objetivo ahora: la menor que exige cualquier punto de adelante,
   * contando lo que se puede frenar hasta llegar a él.
   */
  private plannedSpeed(s: number, speed: number, pace: number, brakingFraction: number): number {
    const line = this.track.racingLine;
    const windowLength = 30 + (speed * speed) / (2 * 22);
    let target = Infinity;
    for (let ahead = 0; ahead <= windowLength; ahead += 5) {
      const reference = line.speedAt(s + ahead) * pace * this.cautionAt(s + ahead);
      const decel = brakingFraction * this.decelAt(Math.sqrt((reference * reference + speed * speed) / 2));
      const allowed = Math.sqrt(reference * reference + 2 * decel * ahead);
      if (allowed < target) target = allowed;
    }
    return target;
  }

  /** Factor aprendido en la posición s. */
  private cautionAt(s: number): number {
    const bins = this.caution.length;
    const bin = Math.floor(this.track.geometry.wrapS(s) / LESSON_BIN) % bins;
    return this.caution[bin] ?? 1;
  }

  /** Resigna un poco de ritmo en los tramos que llevan hasta s (más cerca del problema, más). */
  private learn(s: number): void {
    const bins = this.caution.length;
    for (let back = 0; back <= LESSON_REACH; back += LESSON_BIN) {
      const bin = (((Math.floor(this.track.geometry.wrapS(s - back) / LESSON_BIN)) % bins) + bins) % bins;
      const weight = 1 - (0.5 * back) / LESSON_REACH;
      this.caution[bin] = Math.max(LESSON_MIN, (this.caution[bin] ?? 1) - LESSON_STEP * weight);
    }
  }

  /** Aceleración lateral disponible (m/s²) a una velocidad (con la carga aerodinámica). */
  private lateralGripAt(speed: number): number {
    const m = this.model;
    return Math.max(1, m.grip * (m.gravity + m.downforcePerMass * speed * speed));
  }

  /** Frenada disponible (m/s²) a una velocidad: el agarre crece con la carga aerodinámica. */
  private decelAt(speed: number): number {
    const m = this.model;
    return m.longitudinalGrip * (m.gravity + m.downforcePerMass * speed * speed) + m.dragPerMass * speed * speed;
  }

  /**
   * Lado para adelantar: el interior de la próxima curva si hay lugar; si no,
   * el lado con más espacio. 0 si no entra por ninguno.
   */
  private chooseSide(s: number, blocker: Vehicle, minD: number, maxD: number): number {
    const od = blocker.projection.d;
    const roomRight = maxD - od;
    const roomLeft = od - minD;
    const needed = SIDE_CLEARANCE + 0.1;
    const fitsRight = roomRight >= needed;
    const fitsLeft = roomLeft >= needed;
    if (!fitsRight && !fitsLeft) return 0;
    if (fitsRight !== fitsLeft) return fitsRight ? 1 : -1;
    // Curva más cerrada de los próximos 250 m: su interior (curvatura + = derecha).
    const line = this.track.racingLine;
    let strongest = 0;
    for (let ahead = 20; ahead <= 250; ahead += 10) {
      const k = line.curvature[line.indexAt(s + ahead)] ?? 0;
      if (Math.abs(k) > Math.abs(strongest)) strongest = k;
    }
    if (Math.abs(strongest) > 1 / 400 && this.params.aggression > 0.3) return strongest > 0 ? 1 : -1;
    return roomRight >= roomLeft ? 1 : -1;
  }
}

/** Velocidad lateral de un auto respecto de la pista (m/s, + hacia la derecha). */
function lateralSpeed(car: Vehicle, geometry: Track['geometry']): number {
  const i = geometry.wrapIndex(car.projection.index);
  const tx = geometry.tx[i] ?? 0;
  const tz = geometry.tz[i] ?? 1;
  const sinH = Math.sin(car.heading);
  const cosH = Math.cos(car.heading);
  const vx = -sinH * car.vx - cosH * car.vy;
  const vz = -cosH * car.vx + sinH * car.vy;
  // Derecha = (−tz, tx).
  return vx * -tz + vz * tx;
}
