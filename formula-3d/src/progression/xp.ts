/**
 * XP de cada sesión y cómo se suma al piloto (ver PLAN.md §5.7).
 *
 * Carrera: base por posición (más larga, más XP) + 50 por adelantamiento +
 * 150 por la vuelta rápida + 200 por una carrera limpia (+ récord personal y,
 * en el campeonato, 20 por punto y un premio al terminar la temporada), todo
 * × dificultad × ayudas. Práctica y contrarreloj: XP por vuelta válida y por
 * récord, × ayudas (sin rivales no hay dificultad).
 */

import type { Progression } from '../core/save/schema';
import type { DeepReadonly } from '../core/utils/types';
import type { SessionMode } from '../core/screens/params';
import { MAX_LEVEL, xpToNextLevel } from './levels';
import { passRewardsBetween, PASS_MAX_XP } from './seasonPass';

/** Base por posición (P1…P10); del 11.º en adelante, `BASE_REST`. */
const BASE_BY_POSITION = [1000, 850, 750, 650, 600, 550, 500, 450, 400, 350] as const;
const BASE_REST = 300;
const PER_OVERTAKE = 50;
/** Adelantamientos que cuentan como máximo (evita "farmear" perdiendo y recuperando puestos). */
const MAX_OVERTAKES = 12;
const FASTEST_LAP = 150;
const CLEAN_RACE = 200;
const PERSONAL_BEST = 150;
const PER_CHAMPIONSHIP_POINT = 20;
/** XP por vuelta válida sin rivales. */
const PER_LAP: Readonly<Record<Exclude<SessionMode, 'race'>, number>> = { practice: 60, timeTrial: 80 };
/** Vueltas que cuentan como máximo en una sesión sin rivales. */
const MAX_SOLO_LAPS = 20;
/** Premio al terminar una temporada del campeonato, según la posición final. */
const SEASON_BONUS = [2000, 1200, 800] as const;
const SEASON_BONUS_REST = 400;

/** Multiplicador por dificultad de los rivales: ×0,8 (0) … ×1,0 (38) … ×1,5 (95+). */
const DIFFICULTY_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0.8],
  [38, 1],
  [68, 1.25],
  [95, 1.5],
];

export function difficultyMultiplier(difficulty: number): number {
  const first = DIFFICULTY_POINTS[0];
  const last = DIFFICULTY_POINTS[DIFFICULTY_POINTS.length - 1];
  if (!first || !last) return 1;
  if (difficulty <= first[0]) return first[1];
  if (difficulty >= last[0]) return last[1];
  for (let i = 1; i < DIFFICULTY_POINTS.length; i++) {
    const a = DIFFICULTY_POINTS[i - 1];
    const b = DIFFICULTY_POINTS[i];
    if (a && b && difficulty <= b[0]) {
      const t = (difficulty - a[0]) / (b[0] - a[0]);
      return Math.round((a[1] + (b[1] - a[1]) * t) * 100) / 100;
    }
  }
  return 1;
}

/** Base por posición, escalada por el largo de la carrera (3 vueltas = ×1). */
export function positionBase(position: number, laps: number): number {
  const base = BASE_BY_POSITION[position - 1] ?? BASE_REST;
  const length = 0.6 + (0.4 * Math.max(1, laps)) / 3;
  return Math.round((base * length) / 10) * 10;
}

export interface XpInput {
  mode: SessionMode;
  /** Posición final y autos en carrera (sólo carrera). */
  position: number;
  starters: number;
  /** Vueltas de la carrera, o vueltas válidas en práctica y contrarreloj. */
  laps: number;
  overtakes: number;
  fastestLap: boolean;
  /** Sin choques con otros autos ni vueltas invalidadas. */
  clean: boolean;
  personalBest: boolean;
  /** Dificultad de los rivales (0–100). */
  difficulty: number;
  /** Multiplicador de las ayudas (`assists/presets.ts`). */
  assistMultiplier: number;
  /** Puntos del campeonato ganados en esta carrera (null fuera del campeonato). */
  championshipPoints: number | null;
  /** Posición final en el campeonato si esta carrera cerró la temporada. */
  seasonPosition: number | null;
}

export interface XpLine {
  label: string;
  /** Detalle chico a la derecha de la etiqueta ("×4", "P3"…). */
  detail: string;
  xp: number;
  /** Color de la marca de la línea (premios: el de la medalla, el del desafío). */
  color?: string;
}

export interface XpMultiplier {
  label: string;
  value: number;
}

export interface XpAward {
  lines: XpLine[];
  multipliers: XpMultiplier[];
  /** Suma de las líneas antes de multiplicar. */
  subtotal: number;
  /** Premios fijos (medallas, desafío del día): se suman después de multiplicar. */
  bonuses: XpLine[];
  total: number;
}

/**
 * XP de una sesión, con el detalle línea por línea para la pantalla de resultados.
 * @param bonuses premios fijos que no dependen de la dificultad ni de las ayudas
 */
export function computeXp(input: XpInput, labels: { difficulty: string; assists: string }, bonuses: XpLine[] = []): XpAward {
  const lines: XpLine[] = [];
  const multipliers: XpMultiplier[] = [];
  if (input.mode === 'race') {
    lines.push({ label: 'Posición final', detail: `P${input.position} de ${input.starters}`, xp: positionBase(input.position, input.laps) });
    const overtakes = Math.min(MAX_OVERTAKES, Math.max(0, Math.floor(input.overtakes)));
    if (overtakes > 0) lines.push({ label: 'Adelantamientos', detail: `×${overtakes}`, xp: overtakes * PER_OVERTAKE });
    if (input.fastestLap) lines.push({ label: 'Vuelta rápida', detail: '', xp: FASTEST_LAP });
    if (input.clean) lines.push({ label: 'Carrera limpia', detail: 'sin choques', xp: CLEAN_RACE });
    if (input.personalBest) lines.push({ label: 'Récord personal', detail: '', xp: PERSONAL_BEST });
    if (input.championshipPoints !== null && input.championshipPoints > 0) {
      lines.push({ label: 'Puntos del campeonato', detail: `${input.championshipPoints} pts`, xp: input.championshipPoints * PER_CHAMPIONSHIP_POINT });
    }
    if (input.seasonPosition !== null) {
      const place = input.seasonPosition;
      lines.push({
        label: place === 1 ? '¡Campeón de la temporada!' : 'Temporada completa',
        detail: `${place}.º`,
        xp: SEASON_BONUS[place - 1] ?? SEASON_BONUS_REST,
      });
    }
    multipliers.push({ label: `Dificultad ${labels.difficulty}`, value: difficultyMultiplier(input.difficulty) });
  } else {
    const laps = Math.min(MAX_SOLO_LAPS, Math.max(0, Math.floor(input.laps)));
    if (laps > 0) lines.push({ label: 'Vueltas válidas', detail: `×${laps}`, xp: laps * PER_LAP[input.mode] });
    if (input.personalBest) lines.push({ label: 'Récord personal', detail: '', xp: PERSONAL_BEST });
  }
  multipliers.push({ label: `Ayudas ${labels.assists}`, value: input.assistMultiplier });
  const subtotal = lines.reduce((sum, line) => sum + line.xp, 0);
  const factor = multipliers.reduce((product, m) => product * m.value, 1);
  const extra = bonuses.reduce((sum, line) => sum + line.xp, 0);
  return { lines, multipliers, subtotal, bonuses, total: Math.round((subtotal * factor) / 10) * 10 + extra };
}

/** Estado del piloto antes o después de sumar XP (para animar las barras). */
export interface ProgressSnapshot {
  level: number;
  xp: number;
  passXp: number;
}

export function snapshotOf(progression: DeepReadonly<Progression>): ProgressSnapshot {
  return { level: progression.level, xp: progression.xp, passXp: progression.pass.xp };
}

export interface XpGain {
  progression: Progression;
  /** Niveles de piloto subidos. */
  levelsGained: number;
  /** Ítems nuevos del pase (en orden de nivel). */
  rewards: string[];
}

/** Suma XP al piloto: niveles (1–100), XP total, pase de temporada y recompensas. */
export function applyXp(current: DeepReadonly<Progression>, amount: number): XpGain {
  const gain = Math.max(0, Math.floor(amount));
  let level = current.level;
  let xp = current.xp + gain;
  let levelsGained = 0;
  while (level < MAX_LEVEL) {
    const needed = xpToNextLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level++;
    levelsGained++;
  }
  if (level >= MAX_LEVEL) xp = 0;
  const passXp = Math.min(PASS_MAX_XP, current.pass.xp + gain);
  const rewards = passRewardsBetween(current.pass.xp, passXp).filter((id) => !current.unlocked.includes(id));
  return {
    progression: {
      level,
      xp,
      totalXp: current.totalXp + gain,
      pass: { season: current.pass.season, xp: passXp },
      unlocked: [...current.unlocked, ...rewards],
    },
    levelsGained,
    rewards,
  };
}
