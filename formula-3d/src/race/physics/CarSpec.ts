/**
 * Parámetros del monoplaza (valores de un F1 moderno, ajustados para que el
 * manejo sea divertido con teclado y gamepad). Ver PLAN.md §5.2.
 *
 * Objetivos: 0–100 km/h ≈ 2,6 s, punta ≈ 330 km/h (≈ 350 con DRS), frenada de
 * 300 a 80 km/h en ≈ 110 m, curvas lentas a ~1,7 g y rápidas a más de 4 g.
 */

export interface CarSpec {
  /** Masa con piloto (kg). */
  mass: number;
  /** Distancia del centro de gravedad al eje delantero y al trasero (m). */
  cgToFront: number;
  cgToRear: number;
  /** Altura del centro de gravedad (m): transferencia de carga. */
  cgHeight: number;
  /** Trocha (m): separación entre ruedas de un mismo eje. */
  track: number;
  /** Momento de inercia en guiñada (kg·m²). */
  yawInertia: number;
  wheelRadius: number;

  airDensity: number;
  /** Área frontal × coeficiente de arrastre (m²). */
  dragArea: number;
  /** Área × coeficiente de sustentación negativa (m²). */
  downforceArea: number;
  /** Fracción de la carga aerodinámica sobre el eje delantero. */
  aeroBalanceFront: number;
  /** Cuánto arrastre y carga quita el DRS abierto (fracciones). */
  drsDragCut: number;
  drsDownforceCut: number;

  /** Coeficiente de agarre de los neumáticos sobre asfalto. */
  grip: number;
  /** Agarre longitudinal (tracción y frenada) relativo al lateral. */
  longitudinalGrip: number;
  /** Ángulo de deriva del pico de fuerza lateral (rad). */
  peakSlipAngle: number;
  /** Cuánto cae la fuerza después del pico (0 = nada, 1 = mucho). */
  slipFalloff: number;
  /** Agarre delantero relativo al trasero (< 1 = subviraje suave y estable). */
  frontGripBias: number;
  /** Resistencia a la rodadura (N por N de peso). */
  rollingResistance: number;

  /** Potencia máxima (W) y rendimiento de la transmisión. */
  maxPower: number;
  drivetrainEfficiency: number;
  idleRpm: number;
  /** Régimen al que sube de marcha la caja automática. */
  shiftRpm: number;
  /** Corte de inyección. */
  limiterRpm: number;
  /** Relaciones totales (caja × diferencial) de 1.ª a 8.ª. */
  gearRatios: readonly number[];
  /**
   * Mapa de par por marcha (fracción del par disponible): como en los autos
   * reales, las marchas cortas entregan menos para no hacer patinar el auto.
   */
  gearTorqueMap: readonly number[];
  /** Corte de potencia en cada cambio (s). */
  shiftTime: number;
  /** Relación total de la marcha atrás y velocidad máxima marcha atrás (m/s). */
  reverseRatio: number;
  reverseMaxSpeed: number;

  /** Reparto de frenada adelante (0–1). */
  brakeBias: number;
  /** Fuerza de frenado máxima que pide el pedal (N); la limita el agarre. */
  maxBrakeForce: number;

  /** Ángulo máximo de las ruedas a baja velocidad y a velocidad punta (rad). */
  maxSteerLow: number;
  maxSteerHigh: number;
  /** Velocidad a la que el ángulo máximo cae a la mitad del recorrido (m/s). */
  steerSpeedFalloff: number;
}

export const F1_SPEC: Readonly<CarSpec> = {
  mass: 798,
  cgToFront: 1.98,
  cgToRear: 1.62,
  cgHeight: 0.3,
  track: 1.58,
  yawInertia: 2350,
  wheelRadius: 0.36,

  airDensity: 1.225,
  dragArea: 1.42,
  downforceArea: 4.4,
  aeroBalanceFront: 0.44,
  drsDragCut: 0.16,
  drsDownforceCut: 0.12,

  grip: 1.55,
  longitudinalGrip: 1.22,
  peakSlipAngle: 0.13,
  slipFalloff: 0.25,
  frontGripBias: 0.96,
  rollingResistance: 0.015,

  maxPower: 745_000,
  drivetrainEfficiency: 0.92,
  idleRpm: 4000,
  shiftRpm: 11_900,
  limiterRpm: 12_500,
  gearRatios: [19.17, 13.79, 10.85, 8.94, 7.58, 6.52, 5.61, 4.72],
  gearTorqueMap: [0.6, 0.72, 0.84, 0.93, 1, 1, 1, 1],
  shiftTime: 0.06,
  reverseRatio: 18,
  reverseMaxSpeed: 7,

  brakeBias: 0.57,
  maxBrakeForce: 42_000,

  maxSteerLow: 0.36,
  maxSteerHigh: 0.07,
  steerSpeedFalloff: 38,
};

/**
 * Potencia disponible (0–1) según las rpm: sube desde el ralentí, pico cerca de
 * 11 000 rpm y cae un poco al llegar al corte.
 */
const POWER_RPM = [3000, 4000, 6000, 8000, 10000, 11000, 12000, 12500] as const;
const POWER_LEVEL = [0.2, 0.3, 0.56, 0.79, 0.95, 1, 0.97, 0.9] as const;

export function powerCurve(rpm: number): number {
  // Tablas fijas a nivel de módulo: se llama en cada paso de cada auto y no debe crear basura.
  if (rpm <= POWER_RPM[0]) return POWER_LEVEL[0];
  for (let i = 1; i < POWER_RPM.length; i++) {
    const r1 = POWER_RPM[i] ?? 0;
    if (rpm <= r1) {
      const r0 = POWER_RPM[i - 1] ?? 0;
      const p0 = POWER_LEVEL[i - 1] ?? 0;
      const p1 = POWER_LEVEL[i] ?? 0;
      return p0 + ((p1 - p0) * (rpm - r0)) / (r1 - r0);
    }
  }
  return POWER_LEVEL[POWER_LEVEL.length - 1] ?? 0;
}

/** Modelo simplificado de prestaciones (para el análisis de curvas y los bots). */
export interface PerformanceModel {
  /** Agarre lateral usable (lo limita el eje delantero, algo menos adherente). */
  grip: number;
  /** Agarre longitudinal (tracción y frenada). */
  longitudinalGrip: number;
  gravity: number;
  /** Carga aerodinámica por unidad de masa y v² (1/m). */
  downforcePerMass: number;
  /** Arrastre por unidad de masa y v² (1/m). */
  dragPerMass: number;
  /** Potencia útil por unidad de masa (W/kg). */
  powerPerMass: number;
  /** Velocidad máxima (m/s). */
  topSpeed: number;
}

export function performanceModel(spec: CarSpec): PerformanceModel {
  const half = 0.5 * spec.airDensity;
  const dragPerMass = (half * spec.dragArea) / spec.mass;
  const powerPerMass = (spec.maxPower * spec.drivetrainEfficiency) / spec.mass;
  // Velocidad punta: potencia = arrastre × v (se ignora la rodadura, es pequeña).
  const topSpeed = Math.cbrt(powerPerMass / dragPerMass);
  return {
    grip: spec.grip * Math.min(1, spec.frontGripBias) * 0.97,
    longitudinalGrip: spec.grip * spec.longitudinalGrip,
    gravity: 9.81,
    downforcePerMass: (half * spec.downforceArea) / spec.mass,
    dragPerMass,
    powerPerMass,
    topSpeed,
  };
}
