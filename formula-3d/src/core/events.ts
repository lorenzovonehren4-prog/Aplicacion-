/** Catálogo de eventos globales del juego (ver `EventBus`). */

import type { InputDevice } from './input/actions';
import type { Settings } from './save/schema';
import type { ScreenChange } from './screens/ScreenManager';
import type { DeepReadonly } from './utils/types';

export interface GameEvents {
  /** Cambió la pantalla activa (goTo, push o pop). */
  'screen:changed': ScreenChange;
  /** Cambiaron los ajustes (ya aplicados al render, audio y bucle). */
  'settings:changed': { settings: DeepReadonly<Settings> };
  /** El jugador pasó a usar otro dispositivo (teclado, ratón o gamepad). */
  'input:device': { device: InputDevice };
}
