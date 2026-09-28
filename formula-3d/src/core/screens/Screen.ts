import type { UiAction } from '../input/actions';
import type { ScreenId } from './flow';

/**
 * Contrato de una pantalla. El `ScreenManager` llama a los métodos en este orden:
 *
 *   enter(params) → reveal() → [update(dt) / onAction() / onCovered() / onUncovered()]*
 *   → hide() (sólo al hacer `pop`) → exit()
 *
 * Los métodos opcionales sólo se implementan si la pantalla los necesita.
 */
export interface Screen<P = unknown> {
  readonly id: ScreenId;
  /** Elemento raíz; el manager lo agrega y lo quita del DOM. */
  readonly root: HTMLElement;

  /**
   * Construye la pantalla (DOM, escena 3D, recursos). Durante un `goTo` se llama
   * con la pantalla tapada por la transición, así que puede tardar (cargar).
   */
  enter(params: P): void | Promise<void>;

  /** Arranca las animaciones de entrada (se llama al destapar). */
  reveal?(): void;

  /** Se llama cada fotograma mientras la pantalla está en la pila. */
  update?(dt: number): void;

  /** Acción de interfaz (teclado / gamepad). Sólo la recibe la pantalla de arriba. */
  onAction?(action: UiAction): void;

  /** Otra pantalla se apiló encima. */
  onCovered?(): void;

  /** La pantalla de encima se cerró y ésta vuelve a estar arriba. */
  onUncovered?(): void;

  /** Animación de salida antes de un `pop`. */
  hide?(): Promise<void>;

  /** Libera todo lo que creó la pantalla. */
  exit(): void | Promise<void>;
}
