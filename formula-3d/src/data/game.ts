/** Datos generales del juego y textos del menú principal. */

import type { IconName } from '../ui/icons';

export const GAME_NAME = 'ÁPICE GP';
export const GAME_VERSION = '1.1.0';
/** Fase de desarrollo actual (se muestra junto a la versión). */
export const DEV_PHASE = 9;

export type MenuItemId =
  | 'practice'
  | 'quickRace'
  | 'timeTrial'
  | 'championship'
  | 'garage'
  | 'pass'
  | 'profile'
  | 'manual'
  | 'settings';

export interface MenuItem {
  id: MenuItemId;
  label: string;
  icon: IconName;
  description: string;
  /** Fase en la que se habilita (si todavía no existe). */
  phase: number;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const MAIN_MENU: readonly MenuGroup[] = [
  {
    title: 'Competir',
    items: [
      {
        id: 'practice',
        label: 'Práctica libre',
        icon: 'helmet',
        description: 'Sal solo a la pista que elijas, aprende el circuito y marca tu mejor vuelta.',
        phase: 2,
      },
      {
        id: 'quickRace',
        label: 'Carrera rápida',
        icon: 'flag',
        description: 'Elige circuito, vueltas, rivales y clima, y larga con semáforo contra hasta 19 autos.',
        phase: 3,
      },
      {
        id: 'timeTrial',
        label: 'Contrarreloj',
        icon: 'stopwatch',
        description: 'Una vuelta perfecta contra tu propio fantasma.',
        phase: 5,
      },
      {
        id: 'championship',
        label: 'Campeonato',
        icon: 'trophy',
        description: 'Temporada completa con puntos y tabla de clasificación.',
        phase: 5,
      },
    ],
  },
  {
    title: 'Tu equipo',
    items: [
      {
        id: 'garage',
        label: 'Garaje',
        icon: 'wrench',
        description: 'Pinta tu monoplaza y cambia alerones, llantas y casco.',
        phase: 7,
      },
      {
        id: 'pass',
        label: 'Pase de temporada',
        icon: 'pass',
        description: '50 niveles de recompensas que se ganan corriendo.',
        phase: 6,
      },
      {
        id: 'profile',
        label: 'Perfil',
        icon: 'user',
        description: 'Tus estadísticas, récords por circuito y trofeos.',
        phase: 8,
      },
    ],
  },
  {
    title: 'Opciones',
    items: [
      {
        id: 'manual',
        label: 'Manual de ayudas',
        icon: 'book',
        description: 'Qué hace cada ayuda y cómo leer la línea de trazada.',
        phase: 8,
      },
      {
        id: 'settings',
        label: 'Ajustes',
        icon: 'gear',
        description: 'Gráficos, sonido, controles, nivel de ayudas y opciones de juego.',
        phase: 1,
      },
    ],
  },
];
