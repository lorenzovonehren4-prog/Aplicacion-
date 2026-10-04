/** Datos generales del juego y textos del menú principal. */

import type { IconName } from '../ui/icons';

export const GAME_NAME = 'ÁPICE GP';
export const GAME_VERSION = '2.7.0';

export type MenuItemId =
  | 'practice'
  | 'quickRace'
  | 'timeTrial'
  | 'championship'
  | 'circuits'
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
        description: 'Elige uno de los 24 circuitos, vueltas, rivales y clima, y larga con semáforo contra hasta 19 autos.',
        phase: 3,
      },
      {
        id: 'timeTrial',
        label: 'Contrarreloj',
        icon: 'stopwatch',
        description: 'Una vuelta perfecta contra tu propio fantasma: gana el bronce, la plata, el oro y el platino de cada circuito.',
        phase: 5,
      },
      {
        id: 'championship',
        label: 'Campeonato',
        icon: 'trophy',
        description: 'Cinco campeonatos (Fácil, Media, Difícil, Total y la Gran Gira) con puntos y tabla de pilotos.',
        phase: 5,
      },
      {
        id: 'circuits',
        label: 'Circuitos',
        icon: 'circuit',
        description: 'Las 24 pistas a fondo: ficha técnica, guía curva por curva, tus tiempos y la tabla de récords de todos los que juegan con el link.',
        phase: 10,
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
        description: 'Mejora el motor, la aerodinámica, los frenos, la caja y el chasis; pinta tu monoplaza y cambia alerones, llantas y casco.',
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
