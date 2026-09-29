/**
 * Parrilla del campeonato: 10 equipos y sus pilotos. Todo es FICTICIO:
 * nombres, colores y números no representan a equipos ni personas reales.
 *
 * El jugador corre para Ápice con el número de su livery; su compañero de
 * equipo es un bot más.
 */

import { RIVALS_MAX, RIVALS_MIN } from '../core/save/schema';
import { PLAYER_DEFAULT_LIVERY, type LiveryConfig } from '../garage/livery';

export interface TeamDef {
  id: string;
  /** Nombre completo del equipo. */
  name: string;
  /** Colores del auto (el acento va en filetes, números y tapas de llanta). */
  primary: string;
  secondary: string;
  accent: string;
}

export interface DriverDef {
  id: string;
  name: string;
  /** Abreviatura de 3 letras (tabla de posiciones). */
  code: string;
  number: number;
  teamId: string;
  /** Talento (0–1): ajusta el ritmo dentro de la dificultad elegida. */
  skill: number;
  /** Agresividad (0–1): ganas de intentar adelantamientos y de defender. */
  aggression: number;
}

/** Equipo del jugador. */
export const PLAYER_TEAM_ID = 'apice';

export const TEAMS: readonly TeamDef[] = [
  { id: PLAYER_TEAM_ID, name: 'Ápice', primary: PLAYER_DEFAULT_LIVERY.primary, secondary: PLAYER_DEFAULT_LIVERY.secondary, accent: PLAYER_DEFAULT_LIVERY.accent },
  { id: 'vortex', name: 'Vortex Racing', primary: '#1f4fff', secondary: '#0b1230', accent: '#f5c400' },
  { id: 'nordhaven', name: 'Nordhaven', primary: '#00a887', secondary: '#0e1a17', accent: '#ffffff' },
  { id: 'solaris', name: 'Solaris GP', primary: '#ff7a00', secondary: '#1a1a1a', accent: '#1ec8ff' },
  { id: 'kestrel', name: 'Kestrel Motorsport', primary: '#c9ced6', secondary: '#121418', accent: '#00e0c6' },
  { id: 'aurora', name: 'Aurora Velocità', primary: '#7a2cff', secondary: '#140b26', accent: '#ff4fd8' },
  { id: 'titan', name: 'Titan Dynamics', primary: '#0f5d3a', secondary: '#0a0f0c', accent: '#d8b45a' },
  { id: 'rayo', name: 'Rayo Competición', primary: '#ffd400', secondary: '#16161a', accent: '#e3261c' },
  { id: 'ferrum', name: 'Ferrum Works', primary: '#f4f4f2', secondary: '#1c2a4a', accent: '#e02030' },
  { id: 'halcon', name: 'Halcón Andino', primary: '#4fb7ff', secondary: '#0a2540', accent: '#ffffff' },
];

/**
 * Pilotos bot (19): el orden no importa, la parrilla se arma por ritmo.
 * Con menos rivales se eligen primero los de la mitad de la tabla hacia
 * arriba y abajo, para que siempre haya pelea (ver `pickRivals`).
 */
export const DRIVERS: readonly DriverDef[] = [
  { id: 'reyes', name: 'Tomás Reyes', code: 'REY', number: 22, teamId: PLAYER_TEAM_ID, skill: 0.74, aggression: 0.5 },
  { id: 'brenner', name: 'Lukas Brenner', code: 'BRE', number: 3, teamId: 'vortex', skill: 0.96, aggression: 0.7 },
  { id: 'tanabe', name: 'Aiko Tanabe', code: 'TAN', number: 18, teamId: 'vortex', skill: 0.86, aggression: 0.55 },
  { id: 'solvang', name: 'Erik Solvang', code: 'SOL', number: 9, teamId: 'nordhaven', skill: 0.91, aggression: 0.45 },
  { id: 'arriaga', name: 'Mateo Arriaga', code: 'ARR', number: 27, teamId: 'nordhaven', skill: 0.8, aggression: 0.65 },
  { id: 'monteiro', name: 'Rafael Monteiro', code: 'MON', number: 11, teamId: 'solaris', skill: 0.93, aggression: 0.8 },
  { id: 'hartley', name: 'Owen Hartley', code: 'HAR', number: 31, teamId: 'solaris', skill: 0.83, aggression: 0.5 },
  { id: 'kovac', name: 'Nadia Kovač', code: 'KOV', number: 14, teamId: 'kestrel', skill: 0.89, aggression: 0.6 },
  { id: 'moreau', name: 'Julien Moreau', code: 'MOR', number: 6, teamId: 'kestrel', skill: 0.78, aggression: 0.4 },
  { id: 'benedetti', name: 'Chiara Benedetti', code: 'BEN', number: 21, teamId: 'aurora', skill: 0.88, aggression: 0.55 },
  { id: 'volkov', name: 'Dmitri Volkov', code: 'VOL', number: 88, teamId: 'aurora', skill: 0.76, aggression: 0.85 },
  { id: 'okafor', name: 'Samuel Okafor', code: 'OKA', number: 12, teamId: 'titan', skill: 0.85, aggression: 0.6 },
  { id: 'lund', name: 'Henrik Lund', code: 'LUN', number: 40, teamId: 'titan', skill: 0.72, aggression: 0.35 },
  { id: 'valdivia', name: 'Diego Valdivia', code: 'VAL', number: 19, teamId: 'rayo', skill: 0.82, aggression: 0.75 },
  { id: 'rocha', name: 'Isabela Rocha', code: 'ROC', number: 29, teamId: 'rayo', skill: 0.79, aggression: 0.55 },
  { id: 'whitfield', name: 'Marcus Whitfield', code: 'WHI', number: 8, teamId: 'ferrum', skill: 0.81, aggression: 0.45 },
  { id: 'morimoto', name: 'Kenji Morimoto', code: 'MRT', number: 50, teamId: 'ferrum', skill: 0.75, aggression: 0.5 },
  { id: 'quispe', name: 'Santiago Quispe', code: 'QUI', number: 17, teamId: 'halcon', skill: 0.77, aggression: 0.6 },
  { id: 'cardenas', name: 'Valentina Cárdenas', code: 'CAR', number: 25, teamId: 'halcon', skill: 0.84, aggression: 0.65 },
];

const teamsById = new Map(TEAMS.map((team) => [team.id, team]));

export function teamOf(driver: Pick<DriverDef, 'teamId'>): TeamDef {
  const team = teamsById.get(driver.teamId);
  if (!team) throw new Error(`Equipo desconocido: ${driver.teamId}`);
  return team;
}

/** Livery de un piloto bot: los colores de su equipo y su número. */
export function liveryOf(driver: DriverDef): LiveryConfig {
  const team = teamOf(driver);
  return {
    primary: team.primary,
    secondary: team.secondary,
    accent: team.accent,
    number: driver.number,
    tireStripe: PLAYER_DEFAULT_LIVERY.tireStripe,
  };
}

/**
 * Elige `count` rivales. Siempre está el compañero de equipo del jugador; el
 * resto se toma alternando entre los más y los menos talentosos, así una
 * parrilla corta tiene punteros y rezagados.
 */
export function pickRivals(count: number): DriverDef[] {
  const n = Math.max(RIVALS_MIN, Math.min(RIVALS_MAX, DRIVERS.length, Math.round(count)));
  const teammate = DRIVERS.filter((d) => d.teamId === PLAYER_TEAM_ID);
  const others = DRIVERS.filter((d) => d.teamId !== PLAYER_TEAM_ID).sort((a, b) => b.skill - a.skill);
  const picked = [...teammate];
  let top = 0;
  let bottom = others.length - 1;
  while (picked.length < n && top <= bottom) {
    const take = others[picked.length % 2 === 1 ? top++ : bottom--];
    if (take) picked.push(take);
  }
  return picked;
}

/** Abreviatura del jugador a partir de su nombre ("Ana María" → "ANA"). */
export function playerCode(name: string): string {
  const letters = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  return (letters + 'XXX').slice(0, 3);
}
