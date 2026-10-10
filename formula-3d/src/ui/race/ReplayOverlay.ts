/**
 * Interfaz de la repetición, estilo transmisión: arriba a la izquierda el
 * cartel "REPETICIÓN" con la vuelta y el reloj de carrera; debajo, la torre
 * con las posiciones de ese momento; abajo, la barra de control (retroceder,
 * pausa, adelantar, velocidad), la línea de tiempo con las vueltas (se hace
 * clic para saltar), el auto que se sigue, la cámara y salir.
 *
 * Teclas: ENTER pausa · ←/→ auto · ↑/↓ velocidad · Q/E ±10 s · C cámara · ESC salir.
 */

import type { InputDevice, UiAction } from '../../core/input/actions';
import { Disposer } from '../../core/utils/Disposer';
import { formatLapTime } from '../../core/utils/format';
import { h, svg } from '../dom';
import { ControlHints } from '../components/ControlHints';
import { ICONS, type IconName } from '../icons';

export interface ReplayOverlayOptions {
  onTogglePlay(): void;
  /** Salta a una fracción (0–1) de la repetición. */
  onSeek(fraction: number): void;
  /** Salta segundos hacia adelante o atrás. */
  onSkip(seconds: number): void;
  /** Velocidad más rápida (+1) o más lenta (−1). */
  onSpeed(step: number): void;
  /** Auto siguiente (+1) o anterior (−1) en la clasificación. */
  onCar(step: number): void;
  onCamera(): void;
  onExit(): void;
}

/** Una fila de la torre de la repetición. */
export interface ReplayRow {
  position: number;
  code: string;
  color: string;
  isPlayer: boolean;
  focused: boolean;
  inPit: boolean;
}

export interface ReplayState {
  /** Segundos desde el comienzo de la repetición y largo total. */
  time: number;
  duration: number;
  /** Reloj de carrera (s desde la largada; negativo en la parrilla). */
  clock: number;
  playing: boolean;
  speed: number;
  lap: number;
  totalLaps: number | null;
  camera: string;
  car: { position: number; name: string; team: string; color: string };
  rows: readonly ReplayRow[];
}

const TOWER_ROWS = 10;

export class ReplayOverlay {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly lap = h('span', { class: 'replay__lap' });
  private readonly clock = h('span', { class: 'replay__clock' });
  private readonly tower = h('div', { class: 'replay__tower' });
  private readonly towerRows: Array<{ root: HTMLDivElement; pos: HTMLSpanElement; color: HTMLSpanElement; code: HTMLSpanElement; key: string }> = [];
  private readonly playButton: HTMLButtonElement;
  private readonly speedLabel = h('span', { class: 'replay__speed' });
  private readonly fill = h('span', { class: 'replay__fill' });
  private readonly head = h('span', { class: 'replay__head' });
  private readonly ticks = h('div', { class: 'replay__ticks' });
  private readonly timeline: HTMLDivElement;
  private readonly carColor = h('span', { class: 'replay__car-color' });
  private readonly carName = h('span', { class: 'replay__car-name' });
  private readonly carTeam = h('span', { class: 'replay__car-team' });
  private readonly cameraLabel = h('span', { class: 'replay__camera-name' });
  private readonly hints: ControlHints;
  private playing = true;
  private visible = false;
  private dragging = false;

  constructor(
    private readonly options: ReplayOverlayOptions,
    device: InputDevice,
  ) {
    const button = (icon: IconName, label: string, onClick: () => void, className = ''): HTMLButtonElement => {
      const element = h('button', { class: `replay__btn ${className}`, attrs: { type: 'button', 'aria-label': label, title: label } }, svg(ICONS[icon], 'icon'));
      this.own.listen(element, 'click', (event) => {
        event.stopPropagation();
        onClick();
      });
      return element;
    };
    this.playButton = button('pause', 'Pausa', () => options.onTogglePlay(), 'replay__btn--play');
    this.timeline = h('div', { class: 'replay__timeline', attrs: { role: 'slider', 'aria-label': 'Momento de la repetición' } }, h('span', { class: 'replay__track' }, this.fill), this.ticks, this.head);
    // Clic o arrastre en la línea de tiempo: salta a ese momento.
    const seek = (event: PointerEvent): void => {
      const rect = this.timeline.getBoundingClientRect();
      options.onSeek(Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))));
    };
    this.own.listen(this.timeline, 'pointerdown', (event) => {
      this.dragging = true;
      this.timeline.setPointerCapture(event.pointerId);
      seek(event);
    });
    this.own.listen(this.timeline, 'pointermove', (event) => {
      if (this.dragging) seek(event);
    });
    this.own.listen(this.timeline, 'pointerup', () => (this.dragging = false));
    this.own.listen(this.timeline, 'pointercancel', () => (this.dragging = false));

    for (let i = 0; i < TOWER_ROWS; i++) {
      const row = { root: h('div', { class: 'replay__row' }), pos: h('span', { class: 'replay__pos' }), color: h('span', { class: 'replay__team' }), code: h('span', { class: 'replay__code' }), key: '' };
      row.root.append(row.pos, row.color, row.code);
      this.towerRows.push(row);
      this.tower.append(row.root);
    }

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Pausa' },
        { keys: [{ keyboard: '← →', gamepad: '✚' }], label: 'Auto' },
        { keys: [{ keyboard: '↑ ↓', gamepad: '✚' }], label: 'Velocidad' },
        { keys: [{ keyboard: 'Q', gamepad: 'LB' }, { keyboard: 'E', gamepad: 'RB' }], label: '±10 s' },
        { keys: [{ keyboard: 'C', gamepad: 'Y' }], label: 'Cámara' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Salir' },
      ],
      device,
    );
    this.hints.element.classList.add('replay__hints');

    const bar = h(
      'div',
      { class: 'replay__bar' },
      h('div', { class: 'replay__transport' }, button('rewind', 'Atrás 10 s', () => options.onSkip(-10)), this.playButton, button('forward', 'Adelante 10 s', () => options.onSkip(10)), this.speedLabel),
      this.timeline,
      h(
        'div',
        { class: 'replay__car' },
        button('chevronLeft', 'Auto anterior', () => options.onCar(-1)),
        this.carColor,
        h('span', { class: 'replay__car-text' }, this.carName, this.carTeam),
        button('chevronRight', 'Auto siguiente', () => options.onCar(1)),
      ),
      h('div', { class: 'replay__camera' }, button('camera', 'Cambiar cámara', () => options.onCamera()), this.cameraLabel),
      button('exit', 'Salir de la repetición', () => options.onExit(), 'replay__btn--exit'),
    );
    this.root = h(
      'div',
      { class: 'replay', attrs: { 'aria-label': 'Repetición' } },
      h('div', { class: 'replay__badge' }, h('span', { class: 'replay__rec' }), h('span', { class: 'replay__title', text: 'REPETICIÓN' }), this.lap, this.clock),
      this.tower,
      h('div', { class: 'replay__bottom' }, bar, this.hints.element),
    );
  }

  get isVisible(): boolean {
    return this.visible;
  }

  setDevice(device: InputDevice): void {
    this.hints.setDevice(device);
  }

  /** Muestra la interfaz con las marcas de las vueltas (fracciones 0–1 de la línea de tiempo). */
  show(laps: ReadonlyArray<{ at: number; label: string }>): void {
    this.visible = true;
    this.ticks.replaceChildren(
      ...laps.map((lap) => {
        const tick = h('span', { class: 'replay__tick', attrs: { title: lap.label } });
        tick.style.left = `${(lap.at * 100).toFixed(2)}%`;
        return tick;
      }),
    );
    this.root.classList.add('is-visible');
  }

  hide(): void {
    this.visible = false;
    this.dragging = false;
    this.root.classList.remove('is-visible');
  }

  update(state: ReplayState): void {
    const fraction = state.duration > 0 ? Math.max(0, Math.min(1, state.time / state.duration)) : 0;
    this.fill.style.transform = `scaleX(${fraction.toFixed(4)})`;
    this.head.style.left = `${(fraction * 100).toFixed(2)}%`;
    if (state.playing !== this.playing) {
      this.playing = state.playing;
      this.playButton.replaceChildren(svg(ICONS[state.playing ? 'pause' : 'play'], 'icon'));
      this.playButton.setAttribute('aria-label', state.playing ? 'Pausa' : 'Seguir');
    }
    setText(this.speedLabel, `${state.speed.toString().replace('.', ',')}×`);
    setText(this.lap, state.clock < 0 ? 'LARGADA' : state.totalLaps === null ? `VUELTA ${state.lap}` : `VUELTA ${Math.min(state.lap, state.totalLaps)}/${state.totalLaps}`);
    setText(this.clock, state.clock < 0 ? '' : formatLapTime(state.clock));
    setText(this.carName, `P${state.car.position} · ${state.car.name}`);
    setText(this.carTeam, state.car.team);
    this.carColor.style.background = state.car.color;
    setText(this.cameraLabel, state.camera);
    this.towerRows.forEach((view, i) => {
      const row = state.rows[i];
      const key = row ? `${row.position}|${row.code}|${row.focused}|${row.inPit}` : '';
      if (key === view.key) return;
      view.key = key;
      view.root.classList.toggle('is-empty', !row);
      if (!row) return;
      view.root.classList.toggle('is-player', row.isPlayer);
      view.root.classList.toggle('is-focused', row.focused);
      view.root.classList.toggle('is-pit', row.inPit);
      view.pos.textContent = String(row.position);
      view.color.style.background = row.color;
      view.code.textContent = row.inPit ? `${row.code} · BOX` : row.code;
    });
  }

  onAction(action: UiAction): void {
    if (!this.visible) return;
    const o = this.options;
    switch (action) {
      case 'confirm':
        o.onTogglePlay();
        break;
      case 'back':
        o.onExit();
        break;
      case 'left':
        o.onCar(-1);
        break;
      case 'right':
        o.onCar(1);
        break;
      case 'up':
        o.onSpeed(1);
        break;
      case 'down':
        o.onSpeed(-1);
        break;
      case 'tabPrev':
        o.onSkip(-10);
        break;
      case 'tabNext':
        o.onSkip(10);
        break;
    }
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }
}

function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}
