/**
 * Mapa de pantallas del juego y transiciones permitidas entre ellas.
 *
 * Es la "máquina de estados" del documento de diseño:
 *   Splash → Tutorial (sólo la 1.ª vez) → Menú → Garaje / Pase / Perfil / Ajustes /
 *   Manual de ayudas / Selección de carrera → Presentación del circuito → Carrera →
 *   Resultados → Podio → Menú
 *
 * `goTo` reemplaza toda la pila de pantallas; `push` apila una pantalla encima de
 * otra que sigue viva (Ajustes sobre la carrera en pausa, por ejemplo).
 */

export const SCREEN_IDS = [
  'splash',
  'tutorial',
  'menu',
  'garage',
  'pass',
  'profile',
  'settings',
  'assistsManual',
  'raceSelect',
  'championship',
  'trackIntro',
  'race',
  'results',
  'podium',
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

export interface FlowTable {
  /** Pantallas con las que puede arrancar el juego (pila vacía). */
  readonly entry: readonly ScreenId[];
  /** Destinos de `goTo` permitidos desde cada pantalla. */
  readonly goTo: Readonly<Record<ScreenId, readonly ScreenId[]>>;
  /** Pantallas que se pueden apilar encima de cada pantalla. */
  readonly push: Readonly<Partial<Record<ScreenId, readonly ScreenId[]>>>;
}

export const SCREEN_FLOW: FlowTable = {
  entry: ['splash'],
  goTo: {
    splash: ['tutorial', 'menu'],
    tutorial: ['menu'],
    menu: ['garage', 'pass', 'profile', 'raceSelect', 'championship', 'race'],
    garage: ['menu'],
    pass: ['menu'],
    profile: ['menu'],
    // Ajustes y el Manual siempre se apilan y vuelven con `pop`.
    settings: [],
    assistsManual: [],
    // La presentación del circuito está dentro de la pantalla de carrera.
    raceSelect: ['race', 'trackIntro', 'menu'],
    championship: ['race', 'menu'],
    trackIntro: ['race'],
    // Reiniciar es ir de la carrera a una carrera nueva.
    race: ['results', 'race', 'menu', 'championship'],
    // Desde resultados: podio, menú o la siguiente carrera del campeonato.
    results: ['podium', 'menu', 'raceSelect'],
    podium: ['menu', 'raceSelect'],
  },
  push: {
    menu: ['settings', 'assistsManual'],
    settings: ['assistsManual'],
    raceSelect: ['assistsManual'],
    race: ['settings'],
  },
};

/** ¿Se puede ir con `goTo` desde `from` (null = pila vacía) hasta `to`? */
export function canGoTo(flow: FlowTable, from: ScreenId | null, to: ScreenId): boolean {
  if (from === null) return flow.entry.includes(to);
  return flow.goTo[from].includes(to);
}

/** ¿Se puede apilar `to` encima de `from`? */
export function canPush(flow: FlowTable, from: ScreenId | null, to: ScreenId): boolean {
  if (from === null) return false;
  return flow.push[from]?.includes(to) ?? false;
}
