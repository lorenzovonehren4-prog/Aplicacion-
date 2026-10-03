/**
 * Trayectoria del piloto: estadísticas acumuladas (se guardan en
 * `SaveData.stats`) y logros (`SaveData.achievements`, id → fecha). Lógica
 * pura: la pantalla de carrera arma un `SessionSummary` al terminar y el juego
 * revisa los logros después de cada cambio del guardado.
 */

import type { SaveData } from '../core/save/schema';
import type { DeepReadonly } from '../core/utils/types';
import { createDefaultGarage } from '../garage/setup';
import type { SessionMode } from '../core/screens/params';
import { TRACKS } from '../tracks/registry';
import { medalTally, type Medal } from './medals';
import { PASS_MAX_XP } from './seasonPass';

/** Estadísticas de un circuito. */
export interface TrackStats {
  races: number;
  wins: number;
  podiums: number;
}

export interface CareerStats {
  /** Carreras terminadas (con bandera a cuadros). */
  races: number;
  wins: number;
  podiums: number;
  /** Top 10 (zona de puntos) en carreras de 10 autos o más. */
  pointsFinishes: number;
  fastestLaps: number;
  /** Sin choques ni vueltas anuladas. */
  cleanRaces: number;
  overtakes: number;
  /** Vueltas válidas en cualquier modo. */
  laps: number;
  /** Distancia recorrida en sesiones terminadas (km). */
  distanceKm: number;
  /** Victorias en dificultad Leyenda (95+) y con ayudas de nivel Avanzado o menos. */
  legendWins: number;
  unassistedWins: number;
  /** Carreras de 10 vueltas terminadas. */
  longRaces: number;
  seasons: number;
  championships: number;
  tracks: Record<string, TrackStats>;
}

export function createDefaultStats(): CareerStats {
  return {
    races: 0,
    wins: 0,
    podiums: 0,
    pointsFinishes: 0,
    fastestLaps: 0,
    cleanRaces: 0,
    overtakes: 0,
    laps: 0,
    distanceKm: 0,
    legendWins: 0,
    unassistedWins: 0,
    longRaces: 0,
    seasons: 0,
    championships: 0,
    tracks: {},
  };
}

/** Lo que dejó una sesión terminada. */
export interface SessionSummary {
  mode: SessionMode;
  trackId: string;
  /** Posición final y autos (sólo carrera). */
  position: number;
  starters: number;
  /** Vueltas de la carrera (sólo carrera). */
  raceLaps: number;
  validLaps: number;
  distanceKm: number;
  fastestLap: boolean;
  clean: boolean;
  overtakes: number;
  difficulty: number;
  assistMultiplier: number;
  /** Cerró una temporada del campeonato (y en qué puesto quedó). */
  seasonPosition: number | null;
}

/** Suma una sesión a las estadísticas. */
export function recordSession(current: DeepReadonly<CareerStats>, s: SessionSummary): CareerStats {
  const tracks: Record<string, TrackStats> = {};
  for (const [id, t] of Object.entries(current.tracks)) tracks[id] = { ...t };
  const next: CareerStats = { ...current, tracks };
  next.laps += Math.max(0, Math.floor(s.validLaps));
  next.distanceKm += Math.max(0, s.distanceKm);
  if (s.mode !== 'race') return next;
  const track = tracks[s.trackId] ?? { races: 0, wins: 0, podiums: 0 };
  tracks[s.trackId] = track;
  const withRivals = s.starters > 1;
  next.races++;
  track.races++;
  next.overtakes += Math.max(0, Math.floor(s.overtakes));
  if (s.clean) next.cleanRaces++;
  if (s.raceLaps >= 10) next.longRaces++;
  if (withRivals) {
    if (s.position === 1) {
      next.wins++;
      track.wins++;
      if (s.difficulty >= 90) next.legendWins++;
      if (s.assistMultiplier >= 1.5) next.unassistedWins++;
    }
    if (s.position <= 3) {
      next.podiums++;
      track.podiums++;
    }
    if (s.starters >= 10 && s.position <= 10) next.pointsFinishes++;
    if (s.fastestLap) next.fastestLaps++;
  }
  if (s.seasonPosition !== null) {
    next.seasons++;
    if (s.seasonPosition === 1) next.championships++;
  }
  return next;
}

// ─── Logros ──────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementContext {
  stats: DeepReadonly<CareerStats>;
  level: number;
  passXp: number;
  /** ¿El auto ya no es el de fábrica? */
  customized: boolean;
  /** ¿Hay algún fantasma de contrarreloj guardado? */
  hasGhost: boolean;
  /** Pistas con cada medalla de tiempo o mejor (ver `medals.ts`). */
  medals: Record<Medal, number>;
  /** La racha más larga del desafío del día. */
  dailyBest: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  /** Avance (0–1) para mostrar una barra en los que se cuentan. */
  progress(ctx: AchievementContext): number;
}

const count = (value: number, goal: number): number => Math.min(1, value / goal);

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-race', name: 'Bautismo', description: 'Termina tu primera carrera.', tier: 'bronze', progress: (c) => count(c.stats.races, 1) },
  { id: 'first-points', name: 'En los puntos', description: 'Termina entre los diez primeros en una carrera de 10 autos o más.', tier: 'bronze', progress: (c) => count(c.stats.pointsFinishes, 1) },
  { id: 'first-podium', name: 'Champán', description: 'Sube al podio por primera vez.', tier: 'bronze', progress: (c) => count(c.stats.podiums, 1) },
  { id: 'first-win', name: 'Primera victoria', description: 'Gana una carrera.', tier: 'silver', progress: (c) => count(c.stats.wins, 1) },
  { id: 'wins-10', name: 'Dominador', description: 'Gana 10 carreras.', tier: 'gold', progress: (c) => count(c.stats.wins, 10) },
  { id: 'podiums-10', name: 'Habitual del podio', description: 'Consigue 10 podios.', tier: 'silver', progress: (c) => count(c.stats.podiums, 10) },
  { id: 'fastest-lap', name: 'Violeta', description: 'Haz la vuelta rápida de una carrera.', tier: 'bronze', progress: (c) => count(c.stats.fastestLaps, 1) },
  { id: 'clean-5', name: 'Guante blanco', description: 'Termina 5 carreras sin choques ni vueltas anuladas.', tier: 'silver', progress: (c) => count(c.stats.cleanRaces, 5) },
  { id: 'overtakes-50', name: 'Por dentro', description: 'Suma 50 adelantamientos.', tier: 'silver', progress: (c) => count(c.stats.overtakes, 50) },
  { id: 'legend-win', name: 'Cazaleyendas', description: 'Gana en dificultad Leyenda.', tier: 'gold', progress: (c) => count(c.stats.legendWins, 1) },
  { id: 'unassisted-win', name: 'A mano', description: 'Gana con ayudas de nivel Avanzado o menos.', tier: 'gold', progress: (c) => count(c.stats.unassistedWins, 1) },
  { id: 'long-race', name: 'Resistencia', description: 'Termina una carrera de 10 vueltas.', tier: 'silver', progress: (c) => count(c.stats.longRaces, 1) },
  { id: 'season', name: 'Temporada completa', description: 'Termina un campeonato.', tier: 'silver', progress: (c) => count(c.stats.seasons, 1) },
  { id: 'champion', name: 'Campeón del mundo', description: 'Gana un campeonato.', tier: 'gold', progress: (c) => count(c.stats.championships, 1) },
  { id: 'laps-100', name: 'Kilometraje', description: 'Completa 100 vueltas válidas.', tier: 'silver', progress: (c) => count(c.stats.laps, 100) },
  { id: 'distance-1000', name: 'Mil kilómetros', description: 'Recorre 1 000 km.', tier: 'gold', progress: (c) => count(c.stats.distanceKm, 1000) },
  { id: 'ghost', name: 'Contra ti mismo', description: 'Guarda un fantasma en contrarreloj.', tier: 'bronze', progress: (c) => (c.hasGhost ? 1 : 0) },
  { id: 'garage', name: 'Estreno', description: 'Cambia algo de tu auto en el garaje.', tier: 'bronze', progress: (c) => (c.customized ? 1 : 0) },
  { id: 'level-10', name: 'Del paddock', description: 'Llega al nivel 10 de piloto.', tier: 'silver', progress: (c) => count(c.level, 10) },
  { id: 'level-50', name: 'Veterano', description: 'Llega al nivel 50 de piloto.', tier: 'gold', progress: (c) => count(c.level, 50) },
  { id: 'pass-complete', name: 'Ignición completa', description: 'Completa los 50 niveles del pase de temporada.', tier: 'gold', progress: (c) => count(c.passXp, PASS_MAX_XP) },
  { id: 'medal-gold', name: 'Oro puro', description: 'Gana una medalla de oro en un circuito.', tier: 'silver', progress: (c) => count(c.medals.gold, 1) },
  { id: 'medal-platinum', name: 'Platino', description: 'Gana una medalla de platino en un circuito.', tier: 'gold', progress: (c) => count(c.medals.platinum, 1) },
  { id: 'medals-all', name: 'Gira completa', description: 'Gana una medalla en los 24 circuitos.', tier: 'gold', progress: (c) => count(c.medals.bronze, TRACKS.length) },
  { id: 'daily-3', name: 'Constancia', description: 'Cumple el desafío del día 3 días seguidos.', tier: 'bronze', progress: (c) => count(c.dailyBest, 3) },
  { id: 'daily-7', name: 'Imparable', description: 'Cumple el desafío del día 7 días seguidos.', tier: 'gold', progress: (c) => count(c.dailyBest, 7) },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): Achievement | undefined {
  return byId.get(id);
}

/** Logros cumplidos que todavía no estaban en `have`. */
export function newAchievements(ctx: AchievementContext, have: Readonly<Record<string, number>>): string[] {
  return ACHIEVEMENTS.filter((a) => have[a.id] === undefined && a.progress(ctx) >= 1).map((a) => a.id);
}

/** Contexto de los logros a partir del guardado. */
export function achievementContext(data: DeepReadonly<SaveData>): AchievementContext {
  return {
    stats: data.stats,
    level: data.progression.level,
    passXp: data.progression.pass.xp,
    customized: JSON.stringify(data.garage) !== JSON.stringify(createDefaultGarage()),
    hasGhost: Object.values(data.records).some((record) => record.ghost !== undefined),
    medals: medalTally(TRACKS, (id) => data.records[id]?.bestLap),
    dailyBest: data.daily.best,
  };
}
