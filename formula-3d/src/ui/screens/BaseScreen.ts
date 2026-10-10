import type { Game } from '../../core/Game';
import type { UiAction } from '../../core/input/actions';
import type { ScreenId } from '../../core/screens/flow';
import type { Screen } from '../../core/screens/Screen';
import { Disposer } from '../../core/utils/Disposer';
import { h } from '../dom';
import { FocusNavigator } from '../nav/FocusNavigator';

/**
 * Base de las pantallas de interfaz: raíz del DOM, `Disposer` para liberar todo
 * al salir y un `FocusNavigator` con sonidos de navegación ya conectados.
 */
export abstract class BaseScreen<P = undefined> implements Screen<P> {
  abstract readonly id: ScreenId;
  readonly root: HTMLElement;
  protected readonly own = new Disposer();
  protected readonly nav: FocusNavigator;

  constructor(
    protected readonly game: Game,
    className: string,
  ) {
    this.root = h('section', { class: `screen ${className}` });
    this.nav = new FocusNavigator({ onMove: () => game.playUi('move') });
    this.own.add(() => this.nav.dispose());
  }

  abstract enter(params: P): void | Promise<void>;

  /** Por defecto las acciones van al navegador; "volver" la resuelve cada pantalla. */
  onAction(action: UiAction): void {
    if (action === 'back') {
      this.onBack();
      return;
    }
    this.nav.handle(action);
  }

  /** Qué hace "volver" en esta pantalla. */
  protected abstract onBack(): void;

  exit(): void {
    this.own.dispose();
  }
}
