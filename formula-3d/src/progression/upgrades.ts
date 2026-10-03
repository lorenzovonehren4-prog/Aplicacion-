/**
 * Mejoras del auto (Versión 2.2): el jugador gana puntos de desarrollo en cada
 * sesión y los invierte en cinco áreas con cinco niveles cada una. Cada nivel
 * cambia de verdad la física de su auto (los rivales siguen con el de
 * fábrica). Lógica pura: el guardado sólo lleva los niveles y los puntos.
 *
 * Costos 1-2-3-4-5 por área (75 puntos para tener todo); una carrera da entre
 * 3 y 12 puntos según la posición, el largo y la dificultad, así que el auto
 * completo llega en unas 15 carreras.
 */

import type { SessionMode } from '../core/screens/params';
import type { DeepReadonly } from '../core/utils/types';
import { F1_SPEC, performanceModel, type CarSpec } from '../race/physics/CarSpec';
import type { IconName } from '../ui/icons';

export const UPGRADE_IDS = ['engine', 'aero', 'brakes', 'gearbox', 'chassis'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export const UPGRADE_MAX_LEVEL = 5;

/** Taller del jugador: puntos sin gastar, puntos ganados en total y nivel de cada área. */
export interface Workshop {
  points: number;
  earned: number;
  levels: Record<UpgradeId, number>;
}

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: IconName;
  /** Qué hace (para la ficha). */
  description: string;
  /** El efecto de cada nivel, corto. */
  perLevel: string;
  /** Color del área en la interfaz. */
  color: string;
  /** Nombre de cada nivel (1–5). */
  stages: readonly [string, string, string, string, string];
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'engine',
    name: 'Motor',
    icon: 'bolt',
    color: '#ff5a36',
    description: 'Más potencia: acelera antes en las rectas y llega más rápido al final.',
    perLevel: '+1.6 % de potencia',
    stages: ['Mapa de motor', 'Admisión', 'Turbo', 'Recuperación de energía', 'Especificación de carrera'],
  },
  {
    id: 'aero',
    name: 'Aerodinámica',
    icon: 'wing',
    color: '#29d8ff',
    description: 'Más carga sobre las ruedas: curvas rápidas a más velocidad, con apenas un poco más de arrastre.',
    perLevel: '+2.4 % de carga, +0.4 % de arrastre',
    stages: ['Fondo plano', 'Alerón delantero', 'Pontones', 'Difusor', 'Paquete completo'],
  },
  {
    id: 'brakes',
    name: 'Frenos',
    icon: 'disc',
    color: '#ffb020',
    description: 'Discos y pinzas mejores: frena más tarde y sale de la curva con más tracción.',
    perLevel: '+1.6 % de agarre al frenar y acelerar, +3 % de fuerza de freno',
    stages: ['Pastillas', 'Refrigeración', 'Discos de carbono', 'Pinzas de seis pistones', 'Freno por cable'],
  },
  {
    id: 'gearbox',
    name: 'Caja de cambios',
    icon: 'gears',
    color: '#b47bff',
    description: 'Cambios más rápidos y marchas cortas con más empuje: mejores largadas y salidas de curva lenta.',
    perLevel: '−10 % de tiempo de cambio, +2.5 % de empuje en marchas cortas',
    stages: ['Embrague', 'Relaciones', 'Cambio sin corte', 'Diferencial', 'Caja sin pérdidas'],
  },
  {
    id: 'chassis',
    name: 'Chasis',
    icon: 'chassis',
    color: '#39ff88',
    description: 'Suspensión y peso: más agarre en todas las curvas y un auto más noble al límite.',
    perLevel: '+1.2 % de agarre, −2 kg, más progresivo al límite',
    stages: ['Amortiguadores', 'Barras estabilizadoras', 'Reducción de peso', 'Geometría de suspensión', 'Chasis ligero'],
  },
];

export function getUpgrade(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? (UPGRADES[0] as UpgradeDef);
}

export function createDefaultWorkshop(points = 5): Workshop {
  return { points, earned: points, levels: { engine: 0, aero: 0, brakes: 0, gearbox: 0, chassis: 0 } };
}

/** Puntos para pasar del nivel actual al siguiente (null si ya está al máximo). */
export function upgradeCost(currentLevel: number): number | null {
  return currentLevel >= UPGRADE_MAX_LEVEL ? null : currentLevel + 1;
}

/** Niveles comprados en total (0–25). */
export function totalLevels(levels: DeepReadonly<Record<UpgradeId, number>>): number {
  return UPGRADE_IDS.reduce((sum, id) => sum + (levels[id] ?? 0), 0);
}

/** Compra el siguiente nivel de un área. Devuelve el taller nuevo, o null si no alcanza o ya está al máximo. */
export function buyUpgrade(workshop: DeepReadonly<Workshop>, id: UpgradeId): Workshop | null {
  const level = workshop.levels[id] ?? 0;
  const cost = upgradeCost(level);
  if (cost === null || workshop.points < cost) return null;
  return {
    points: workshop.points - cost,
    earned: workshop.earned,
    levels: { ...workshop.levels, [id]: level + 1 },
  };
}

/** El auto del jugador con sus mejoras aplicadas. */
export function applyUpgrades(base: Readonly<CarSpec>, levels: DeepReadonly<Record<UpgradeId, number>>): CarSpec {
  const lv = (id: UpgradeId): number => Math.max(0, Math.min(UPGRADE_MAX_LEVEL, Math.round(levels[id] ?? 0)));
  const engine = lv('engine');
  const aero = lv('aero');
  const brakes = lv('brakes');
  const gearbox = lv('gearbox');
  const chassis = lv('chassis');
  return {
    ...base,
    maxPower: base.maxPower * (1 + 0.016 * engine),
    downforceArea: base.downforceArea * (1 + 0.024 * aero),
    dragArea: base.dragArea * (1 + 0.004 * aero),
    longitudinalGrip: base.longitudinalGrip * (1 + 0.016 * brakes),
    maxBrakeForce: base.maxBrakeForce * (1 + 0.03 * brakes),
    shiftTime: base.shiftTime * (1 - 0.1 * gearbox),
    gearTorqueMap: base.gearTorqueMap.map((value, gear) => (gear < 4 ? Math.min(1, value * (1 + 0.025 * gearbox)) : value)),
    grip: base.grip * (1 + 0.012 * chassis),
    slipFalloff: Math.max(0.1, base.slipFalloff - 0.02 * chassis),
    mass: base.mass - 2 * chassis,
  };
}

/** Lo que muestra la ficha del auto (en las unidades de un equipo). */
export interface CarStats {
  /** Potencia (CV). */
  power: number;
  /** Velocidad punta sin DRS (km/h). */
  topSpeed: number;
  /** Aceleración lateral a 200 km/h (g). */
  cornering: number;
  /** Desaceleración a 200 km/h (g). */
  braking: number;
  /** Tiempo de cambio (ms). */
  shift: number;
}

const G = 9.81;
const REFERENCE_SPEED = 200 / 3.6;

export function carStats(spec: Readonly<CarSpec>): CarStats {
  const model = performanceModel(spec);
  const v2 = REFERENCE_SPEED * REFERENCE_SPEED;
  return {
    power: Math.round(spec.maxPower / 745.7),
    topSpeed: Math.round(model.topSpeed * 3.6),
    cornering: (model.grip * (model.gravity + model.downforcePerMass * v2)) / G,
    braking: (model.longitudinalGrip * (model.gravity + model.downforcePerMass * v2) + model.dragPerMass * v2) / G,
    shift: Math.round(spec.shiftTime * 1000),
  };
}

/** Ficha de fábrica y con todo al máximo: los extremos de las barras. */
export const STOCK_STATS = carStats(F1_SPEC);
export const MAX_STATS = carStats(
  applyUpgrades(F1_SPEC, { engine: UPGRADE_MAX_LEVEL, aero: UPGRADE_MAX_LEVEL, brakes: UPGRADE_MAX_LEVEL, gearbox: UPGRADE_MAX_LEVEL, chassis: UPGRADE_MAX_LEVEL }),
);

export interface DevPointsInput {
  mode: SessionMode;
  position: number;
  starters: number;
  /** Vueltas de la carrera, o vueltas válidas sin rivales. */
  laps: number;
  personalBest: boolean;
  /** Dificultad de los rivales (0–100). */
  difficulty: number;
  /** Posición final de la temporada si esta carrera la terminó. */
  seasonPosition: number | null;
}

/** Bonus por posición (P1…P10). */
const POSITION_POINTS = [5, 4, 3, 2, 2, 2, 1, 1, 1, 1] as const;
const SEASON_POINTS = [10, 6, 4] as const;

/**
 * Puntos de desarrollo de una sesión. Carrera: 3 por terminar + bonus por
 * posición, × largo (3 vueltas = ×1, 10 = ×1.47) × dificultad (×0.8 … ×1.5);
 * premio al cerrar una temporada. Sin rivales: 1 cada 3 vueltas válidas
 * (hasta 3) y 1 por récord personal.
 */
export function devPointsFor(input: DevPointsInput): number {
  if (input.mode !== 'race' || input.starters <= 1) {
    const laps = Math.min(3, Math.floor(input.laps / 3));
    return laps + (input.personalBest ? 1 : 0);
  }
  const base = 3 + (POSITION_POINTS[input.position - 1] ?? 0);
  const length = 0.8 + (0.2 * Math.max(1, input.laps)) / 3;
  const difficulty = 0.8 + 0.7 * Math.min(1, Math.max(0, input.difficulty) / 95);
  const season = input.seasonPosition === null ? 0 : (SEASON_POINTS[input.seasonPosition - 1] ?? 2);
  return Math.max(1, Math.round(base * length * difficulty)) + season;
}
