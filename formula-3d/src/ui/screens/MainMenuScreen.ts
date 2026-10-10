/**
 * Menú principal, como el centro de mando de un juego de carreras actual: el
 * monoplaza gira sobre el podio iluminado del estudio; arriba, la marca y la
 * tarjeta del piloto; a la izquierda, el acceso enfocado en grande (categoría,
 * título que entra por una máscara, descripción, datos que cuentan y el botón
 * de acción); abajo, un riel de tarjetas con color propio: "Continuar" (ancha,
 * con el trazado de la próxima carrera) y los accesos agrupados en Competir,
 * Tu equipo y Opciones. Una barra de luz sigue a la tarjeta enfocada.
 *
 * Todo lo animado usa transform y opacity (GSAP o CSS), así que no traba el
 * 3D, y se acorta con "reducir movimiento". Los accesos a pantallas que llegan
 * en fases futuras se muestran bloqueados con su fase.
 */

import gsap from 'gsap';
import { LEVEL_INFO } from '../../assists/presets';
import type { Game } from '../../core/Game';
import { CHAMPIONSHIPS, getChampionship, LEVEL_LABEL, TRACK_DIFFICULTY } from '../../data/championships';
import { GAME_VERSION, MAIN_MENU, type MenuItem, type MenuItemId } from '../../data/game';
import type { DriverGesture, DriverPose } from '../../garage/DriverModel';
import type { StudioScene, StudioShot } from '../../garage/StudioScene';
import { formatInteger } from '../../core/utils/format';
import { currentStreak, DAILY_COLOR, dailyChallenge, dailyReward, dateKey, doneToday } from '../../progression/daily';
import { licenseFor } from '../../progression/license';
import { MEDAL_INFO, medalFor, medalTally, nextMedal } from '../../progression/medals';
import { WEEKLY_COLOR, weeklyEvent } from '../../progression/weekly';
import { LOADING_TIPS } from '../../data/tips';
import { formatLapTime } from '../../core/utils/format';
import { applyUpgrades, carStats, totalLevels, UPGRADE_IDS, UPGRADE_MAX_LEVEL } from '../../progression/upgrades';
import { DIFFICULTY_INFO, difficultyValue } from '../../race/ai/difficulty';
import { F1_SPEC } from '../../race/physics/CarSpec';
import { isFinished, nextRound } from '../../race/championship';
import { getTrack, TRACKS } from '../../tracks/registry';
import { countUp } from '../anim/countUp';
import { ControlHints } from '../components/ControlHints';
import { createLogo } from '../components/Logo';
import { denyFeedback } from '../components/MenuButton';
import { PlayerCard } from '../components/PlayerCard';
import { createTrackThumb } from '../components/TrackMap';
import { h, prefersReducedMotion, svg } from '../dom';
import { ICONS, type IconName } from '../icons';
import { uiWidth } from '../scale';
import { BaseScreen } from './BaseScreen';

type Opener = (game: Game) => Promise<boolean>;

/**
 * Cómo se abre cada acceso del menú. Sólo figuran los que ya existen: el resto
 * se muestra bloqueado con su fase. Cada fase agrega aquí los suyos.
 */
const OPENERS: Partial<Record<MenuItemId, Opener>> = {
  practice: (game) => game.screens.goTo('raceSelect', { mode: 'practice' }),
  quickRace: (game) => game.screens.goTo('raceSelect', { mode: 'quickRace' }),
  timeTrial: (game) => game.screens.goTo('raceSelect', { mode: 'timeTrial' }),
  championship: (game) => game.screens.goTo('championship', undefined),
  circuits: (game) => game.screens.goTo('circuits', undefined),
  pass: (game) => game.screens.goTo('pass', undefined),
  garage: (game) => game.screens.goTo('garage', undefined),
  profile: (game) => game.screens.goTo('profile', undefined),
  manual: (game) => game.screens.push('assistsManual', undefined),
  settings: (game) => game.screens.push('settings', undefined),
};

/** Color de cada acceso: borde, brillo, ícono y la barra de foco. */
const ACCENTS: Readonly<Record<MenuItemId, string>> = {
  practice: '#3ee0ff',
  quickRace: '#ff2a3c',
  timeTrial: '#a97bff',
  championship: '#ffc53d',
  circuits: '#29d8ff',
  garage: '#ff8a3d',
  pass: '#ff5fb0',
  profile: '#5b9bff',
  manual: '#3ddc84',
  settings: '#c9cfdb',
};
const CONTINUE_ACCENT = '#ff4a2e';

/** Texto del botón de acción (por defecto "Abrir"). */
const ACTIONS: Partial<Record<MenuItemId, string>> = {
  practice: 'Salir a pista',
  quickRace: 'Correr',
  timeTrial: 'Correr',
  championship: 'Elegir campeonato',
};

const QUALITY_LABEL: Readonly<Record<string, string>> = { low: 'Baja', medium: 'Media', high: 'Alta', ultra: 'Ultra' };

/** Lo que muestra el panel grande para la tarjeta enfocada. */
interface Feature {
  group: string;
  icon: IconName;
  title: string;
  text: string;
  /** Valores numéricos cuentan al aparecer. */
  stats: ReadonlyArray<readonly [string, string | number]>;
  action: string;
  note: string;
  accent: string;
  open: Opener | undefined;
  card: HTMLButtonElement;
  /** Qué acceso es (para el gesto del piloto). */
  id: StageId;
}

type StageId = MenuItemId | 'continue' | 'daily' | 'weekly';

/**
 * Lo que pasa en el estudio al enfocar cada tarjeta, como en los menús de
 * los juegos grandes: la cámara va a un encuadre propio del auto (o vuelve a
 * girar sola) y el piloto hace un gesto o toma una pose.
 */
const STAGING: Readonly<Record<StageId, { gesture?: DriverGesture; pose?: DriverPose; shot?: StudioShot }>> = {
  continue: { gesture: 'helmet', shot: 'front' },
  daily: { gesture: 'thumbsUp', shot: 'helmet' },
  weekly: { gesture: 'point', shot: 'side' },
  practice: { gesture: 'thumbsUp', shot: 'overview' },
  quickRace: { gesture: 'helmet', shot: 'front' },
  timeTrial: { gesture: 'helmet', pose: 'hips', shot: 'wheel' },
  championship: { gesture: 'thumbsUp', shot: 'rear' },
  circuits: { gesture: 'point', shot: 'floor' },
  garage: { gesture: 'point', pose: 'lean', shot: 'engine' },
  pass: { gesture: 'wave' },
  profile: { pose: 'crossed', shot: 'driver' },
  manual: { pose: 'hips' },
  settings: {},
};
/** Noticias de la barra de abajo: velocidad del texto (px/s). */
const TICKER_SPEED = 55;
/** Tiempo que el foco tiene que quedarse en una tarjeta para que el piloto reaccione (ms). */
const STAGE_DELAY = 420;
/** Separación mínima entre gestos (s): navegar rápido no lo vuelve loco. */
const GESTURE_GAP = 2.4;

/**
 * Rótulo de la tarjeta: las palabras largas llevan un guion suave en su
 * sílaba, así en tarjetas angostas cortan bien ("CONTRA-RRELOJ") en vez de
 * quedar recortadas.
 */
const SOFT_BREAKS: Readonly<Record<string, string>> = { Contrarreloj: 'Contra\u00ADrreloj' };
function cardLabel(label: string): string {
  return SOFT_BREAKS[label] ?? label;
}

/** Cuánto se corre el auto a la derecha para dejar lugar al panel, según el ancho. */
function frameShiftFor(width: number): number {
  if (width < 720) return 0;
  if (width < 1100) return 0.1;
  return 0.13;
}

export class MainMenuScreen extends BaseScreen {
  readonly id = 'menu';
  private studio: StudioScene | null = null;
  /** Tarjetas en el orden del riel (la primera es "Continuar"). */
  private readonly cards: HTMLButtonElement[] = [];
  private readonly tiles = new Map<MenuItemId, HTMLButtonElement>();
  private readonly features = new Map<HTMLButtonElement, () => Feature>();

  private readonly top = h('header', { class: 'menu__top' });
  private readonly chips = h('div', { class: 'menu__chips' });
  private readonly kickerIcon = h('span', { class: 'menu__kicker-icon' });
  private readonly kickerGroup = h('span', { class: 'menu__kicker-group' });
  private readonly kickerCount = h('span', { class: 'menu__kicker-count' });
  private readonly kickerBar = h('i', { class: 'menu__kicker-bar' });
  private readonly kicker = h('div', { class: 'menu__kicker' }, this.kickerBar, this.kickerIcon, this.kickerGroup, this.kickerCount);
  private readonly title = h('h2', { class: 'menu__title' });
  private readonly text = h('p', { class: 'menu__text' });
  private readonly stats = h('div', { class: 'menu__stats' });
  private readonly actionLabel = h('span', { class: 'menu__action-label' });
  private readonly action = h(
    'button',
    { class: 'menu__action', attrs: { type: 'button', tabindex: -1 } },
    svg(ICONS.play, 'icon menu__action-icon'),
    this.actionLabel,
    h('kbd', { class: 'menu__action-key', text: 'ENTER' }),
  );
  private readonly note = h('p', { class: 'menu__note' });
  private readonly hero = h('section', { class: 'menu__hero' }, this.kicker, this.title, this.text, this.stats, this.action, this.note);
  private readonly rail = h('nav', { class: 'menu__rail', attrs: { 'aria-label': 'Menú principal' } });
  private readonly pill = h('span', { class: 'menu__pill', attrs: { 'aria-hidden': 'true' } });
  private readonly foot = h('footer', { class: 'menu__foot' });
  private readonly fx = h(
    'div',
    { class: 'menu__fx', attrs: { 'aria-hidden': 'true' } },
    h('span', { class: 'menu__sweep' }),
    ...[0, 1, 2, 3, 4, 5].map((i) => h('span', { class: 'menu__streak', style: { '--i': String(i) } })),
  );

  private card: PlayerCard | null = null;
  private hints: ControlHints | null = null;
  private current: Feature | null = null;
  private heroTween: gsap.core.Timeline | null = null;
  private pillPlaced = false;
  private stageTimer: ReturnType<typeof setTimeout> | null = null;
  private lastGesture = -Infinity;
  private shot: StudioShot | null = null;

  constructor(game: Game) {
    super(game, 'screen--menu');
  }

  async enter(): Promise<void> {
    // Si el 3D falla (GPU sin memoria, driver roto), el menú sigue funcionando sin auto.
    try {
      this.studio = await this.game.getStudio();
    } catch (error) {
      console.error('[Menú] Sin estudio 3D:', error);
      this.studio = null;
    }
    this.game.render.setView(this.studio);
    this.studio?.setFrameShift(frameShiftFor(uiWidth()));
    this.studio?.playIntro();

    const { profile, progression } = this.game.save.data;
    const records = this.game.save.data.records;
    this.card = new PlayerCard(profile, progression, licenseFor(medalTally(TRACKS, (id) => records[id]?.bestLap)));
    this.top.append(
      h(
        'div',
        { class: 'menu__brand' },
        createLogo('menu__logo'),
        h(
          'div',
          { class: 'menu__season' },
          h('b', { text: 'Temporada 2026' }),
          h('span', { text: `${TRACKS.length} circuitos · ${CHAMPIONSHIPS.length} campeonatos` }),
        ),
      ),
      h('div', { class: 'menu__top-right' }, this.chips, h('div', { class: 'menu__player' }, this.card.element)),
    );

    // Riel: "Continuar" y los accesos por grupo; las opciones van arriba, como botones redondos
    // (el desafío del día primero, con su racha).
    this.rail.append(this.group('Ahora', 2, this.createContinue()));
    this.chips.append(this.createDaily(), this.createWeekly());
    for (const group of MAIN_MENU) {
      if (group.title === 'Opciones') {
        for (const item of group.items) this.chips.append(this.createTile(item, group.title, 'chip'));
        continue;
      }
      this.rail.append(this.group(group.title, group.items.length, ...group.items.map((item) => this.createTile(item, group.title, 'card'))));
    }
    this.rail.append(this.pill);
    this.cards.forEach((card, i) => card.style.setProperty('--n', String(i)));

    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '←→', gamepad: '✚' }], label: 'Navegar' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Elegir' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));

    const storageNote = this.game.save.isPersistent
      ? h('span', { class: 'menu__save is-ok', text: 'Progreso guardado en este navegador' })
      : h('span', { class: 'menu__save is-warn', text: 'Tu navegador bloquea el guardado: el progreso se perderá al cerrar' });
    this.foot.append(this.hints.element, this.createTicker(), h('div', { class: 'menu__meta' }, storageNote, h('span', { class: 'menu__version', text: `v${GAME_VERSION}` })));

    this.root.append(this.fx, h('div', { class: 'menu__scrim' }), this.top, this.hero, this.rail, this.foot);

    // El botón de acción confirma la tarjeta enfocada (para el ratón).
    this.own.listen(this.action, 'click', () => {
      if (this.current) this.confirm(this.current);
    });
    // Paralaje de la cámara con el ratón y encuadre según el ancho.
    this.own.listen(window, 'pointermove', (event) => {
      this.studio?.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    });
    this.own.listen(window, 'resize', () => {
      this.studio?.setFrameShift(frameShiftFor(uiWidth()));
      this.placePill(false);
    });
    this.own.add(() => {
      this.heroTween?.kill();
      if (this.stageTimer) clearTimeout(this.stageTimer);
    });

    const first = this.tiles.get('quickRace') ?? this.cards[0];
    if (first) this.nav.focus(first);
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.fx, { opacity: 0, duration: 1.2 }, 0);
    tl.from(this.top, { y: -28, opacity: 0, duration: 0.7, clearProps: 'transform,opacity' }, 0.05);
    if (this.card) for (const tween of this.card.animateIn(0.45)) tl.add(tween, 0);
    tl.from(this.rail.querySelectorAll('.menu__group-label'), { opacity: 0, x: -12, duration: 0.5, stagger: 0.08 }, 0.3);
    tl.from(this.pill, { opacity: 0, duration: 0.5 }, 0.9);
    // Las tarjetas y los botones de arriba entran con una animación de CSS (con
    // `transform`), que se suma a la elevación del foco (`translate`/`scale`)
    // sin pisarla: con GSAP, la tarjeta enfocada al abrir quedaba levantada.
    if (!quick) {
      this.root.classList.add('is-entering');
      this.own.timeout(() => this.root.classList.remove('is-entering'), 1800);
    }
    tl.from(this.foot, { opacity: 0, duration: 0.5 }, 0.7);
    if (quick) tl.progress(1);
    this.own.tween(tl);
    // El panel grande vuelve a entrar con el resto (la pantalla ya está a la vista).
    if (this.current) this.showFeature(this.current, 0.2);
    this.placePill(false);
    // El piloto saluda al llegar al menú.
    this.own.timeout(() => {
      this.lastGesture = performance.now() / 1000;
      this.studio?.driverGesture('wave');
    }, quick ? 0 : 700);
  }

  override exit(): void {
    // El estudio sigue para otras pantallas: vuelve al giro lento y a las poses sueltas.
    if (this.shot) this.studio?.setShot(null);
    this.studio?.driverPose(null);
    super.exit();
  }

  update(dt: number): void {
    this.studio?.update(dt);
  }

  onCovered(): void {
    this.nav.setEnabled(false);
    // `overwrite: 'auto'` corta la animación de entrada si todavía estaba en curso.
    this.own.tween(
      gsap.to([this.top, this.hero, this.rail, this.foot], {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        overwrite: 'auto',
      }),
    );
    // El auto vuelve al centro mientras hay un panel encima.
    this.studio?.setFrameShift(-0.12);
  }

  onUncovered(): void {
    this.nav.setEnabled(true);
    this.own.tween(
      gsap.to([this.top, this.hero, this.rail, this.foot], {
        opacity: 1,
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      }),
    );
    this.studio?.setFrameShift(frameShiftFor(uiWidth()));
    this.placePill(false);
  }

  /** En el menú raíz, "volver" regresa a la primera tarjeta. */
  protected onBack(): void {
    const first = this.cards[0];
    if (first && this.nav.focused !== first) this.nav.focus(first, false);
  }

  /** El piloto (y la cámara) reaccionan a la tarjeta si el foco se queda en ella. */
  private stage(id: StageId): void {
    if (this.stageTimer) clearTimeout(this.stageTimer);
    this.stageTimer = setTimeout(() => {
      this.stageTimer = null;
      const staging = STAGING[id];
      const shot = staging.shot ?? null;
      if (shot !== this.shot) {
        this.shot = shot;
        this.studio?.setShot(shot);
        this.game.playUi('whooshIn');
      }
      this.studio?.driverPose(staging.pose ?? null);
      const now = performance.now() / 1000;
      if (staging.gesture && now - this.lastGesture > GESTURE_GAP) {
        this.lastGesture = now;
        this.studio?.driverGesture(staging.gesture);
      }
    }, STAGE_DELAY);
  }

  /** Grupo del riel: rótulo y tarjetas; `units` reparte el ancho. */
  private group(label: string, units: number, ...cards: HTMLButtonElement[]): HTMLElement {
    return h(
      'div',
      { class: 'menu__group', style: { '--units': String(units) } },
      h('span', { class: 'menu__group-label', text: label }),
      h('div', { class: 'menu__group-cards' }, ...cards),
    );
  }

  /** Registra una tarjeta en el riel y en la navegación. */
  private register(card: HTMLButtonElement, feature: () => Feature): void {
    this.cards.push(card);
    this.features.set(card, feature);
    this.nav.add(card, {
      onFocus: () => {
        const next = feature();
        this.showFeature(next, 0);
        this.placePill(true);
        this.stage(next.id);
      },
      onConfirm: () => {
        const next = this.current?.card === card ? this.current : feature();
        this.confirm(next);
      },
    });
  }

  /**
   * Acceso del menú: tarjeta del riel (color, ícono, rótulo y un dato corto) o
   * botón redondo de la barra de arriba (ícono y rótulo).
   */
  private createTile(item: MenuItem, group: string, kind: 'card' | 'chip'): HTMLButtonElement {
    const open = OPENERS[item.id];
    const props = {
      class: `${kind === 'card' ? 'mcard' : 'mchip'} mtile${open ? '' : ' is-locked'}`,
      attrs: { type: 'button', 'aria-label': item.label },
      style: { '--card-accent': ACCENTS[item.id] },
    };
    const tile =
      kind === 'card'
        ? h(
            'button',
            props,
            svg(ICONS[item.icon], 'icon mcard__mark'),
            h('span', { class: 'mcard__head' }, svg(ICONS[item.icon], 'icon mcard__icon'), open ? null : svg(ICONS.lock, 'icon mcard__lock')),
            h('span', { class: 'mcard__label', text: cardLabel(item.label) }),
            h('span', { class: 'mcard__sub', text: open ? this.subFor(item.id) : `Fase ${item.phase}` }),
          )
        : h('button', props, svg(ICONS[item.icon], 'icon mchip__icon'), h('span', { class: 'mchip__label', text: item.label }));
    this.tiles.set(item.id, tile);
    this.register(tile, () => ({
      group,
      icon: item.icon,
      title: item.label,
      text: item.description,
      stats: this.statsFor(item.id),
      action: open ? (ACTIONS[item.id] ?? 'Abrir') : 'Bloqueado',
      note: open ? '' : `Llega en la Fase ${item.phase} del desarrollo.`,
      accent: ACCENTS[item.id],
      open,
      card: tile,
      id: item.id,
    }));
    return tile;
  }

  /**
   * Tarjeta ancha "Continuar": sigue el campeonato en curso o, si no hay, una
   * carrera rápida con lo último elegido. Muestra el trazado de esa carrera.
   */
  private createContinue(): HTMLButtonElement {
    const state = this.game.save.data.championship;
    const race = this.game.settings.race;
    const running = state && !isFinished(state) ? state : null;
    let title: string;
    let sub: string;
    let text: string;
    let stats: Array<[string, string | number]>;
    let progress = -1;
    let open: Opener;
    let track = TRACKS.find((t) => t.id === race.trackId) ?? TRACKS[0];
    if (running) {
      const round = nextRound(running);
      const total = running.rounds.length;
      const cup = running.cup ? getChampionship(running.cup).name : 'Temporada';
      track = getTrack(running.rounds[round]?.trackId ?? '');
      const level = TRACK_DIFFICULTY[track.id]?.level;
      title = 'Continuar campeonato';
      sub = `${cup} · Ronda ${round + 1}/${total}`;
      text = `Sigue la ${cup}: la próxima carrera es el ${track.grandPrix}, en ${track.short}.`;
      stats = [
        ['Ronda', `${round + 1}/${total}`],
        ['Circuito', track.short],
        ['Dificultad', level ? LEVEL_LABEL[level] : '—'],
      ];
      progress = round / Math.max(1, total);
      open = (game) => game.screens.goTo('championship', undefined);
    } else {
      title = 'Correr ahora';
      sub = `${track?.short ?? ''} · ${race.laps} vueltas`;
      text = `Una carrera rápida con lo último que elegiste${track ? `: ${track.grandPrix}` : ''}. Semáforo, rivales y a fondo.`;
      stats = [
        ['Circuito', track?.short ?? '—'],
        ['Vueltas', race.laps],
        ['Autos', race.rivals + 1],
        ['Rivales', DIFFICULTY_INFO[race.difficulty].label],
      ];
      open = (game) => game.screens.goTo('raceSelect', { mode: 'quickRace' });
    }
    const thumb = track ? createTrackThumb(track, 'mcard__track') : null;
    // Con `pathLength = 1` el trazado se "dibuja" con una animación de CSS.
    thumb?.querySelectorAll('path').forEach((path) => path.setAttribute('pathLength', '1'));
    const card = h(
      'button',
      { class: 'mcard mcard--hero', attrs: { type: 'button', 'aria-label': title }, style: { '--card-accent': CONTINUE_ACCENT } },
      h(
        'span',
        { class: 'mcard__body' },
        h('span', { class: 'mcard__live' }, h('i'), running ? 'En curso' : 'Listo para correr'),
        h('span', { class: 'mcard__label', text: title }),
        h('span', { class: 'mcard__sub', text: sub }),
        progress >= 0 ? h('span', { class: 'mcard__progress', style: { '--p': progress.toFixed(3) } }, h('i')) : null,
      ),
      thumb,
    );
    this.register(card, () => ({
      group: 'Ahora',
      icon: 'flag',
      title,
      text,
      stats,
      action: running ? 'Continuar' : 'Correr',
      note: '',
      accent: CONTINUE_ACCENT,
      open,
      card,
      id: 'continue',
    }));
    return card;
  }

  /**
   * Botón del desafío del día (arriba, antes de las opciones): con la racha y
   * un punto que late mientras no se cumplió el de hoy. El panel grande
   * muestra el objetivo, el circuito, el premio y cuánto falta para que cambie.
   */
  private createDaily(): HTMLButtonElement {
    const data = this.game.save.data;
    const today = dateKey(new Date());
    const challenge = dailyChallenge(today, TRACKS, (id) => data.records[id]?.bestLap, difficultyValue(this.game.settings.race));
    const done = doneToday(data.daily, today);
    const streak = currentStreak(data.daily, today);
    // El premio si lo cumple hoy (la racha sube un día).
    const reward = dailyReward(done ? streak : streak + 1);
    const track = getTrack(challenge.trackId);
    const chip = h(
      'button',
      { class: `mchip mtile mchip--daily${done ? ' is-done' : ''}`, attrs: { type: 'button', 'aria-label': 'Desafío del día' }, style: { '--card-accent': DAILY_COLOR } },
      svg(ICONS.flame, 'icon mchip__icon'),
      h('span', { class: 'mchip__label', text: done ? 'Cumplido' : 'Desafío' }),
      streak > 0 ? h('span', { class: 'mchip__streak', text: String(streak), attrs: { title: `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}` } }) : null,
    );
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const hours = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000));
    this.register(chip, () => ({
      group: done ? 'Desafío del día · cumplido' : 'Desafío del día',
      icon: 'flame',
      title: challenge.title,
      text: done
        ? `Ya cumpliste el de hoy en ${track.short}. Puedes correrlo otra vez por diversión; mañana hay otro y, si lo cumples, la racha sube a ${streak + 1} días.`
        : `${challenge.goal} Premio: ${reward.xp} XP y ${reward.points} puntos de desarrollo${streak > 0 ? `; la racha sube a ${streak + 1} días` : ''}.`,
      stats: [
        ['Circuito', track.short],
        ['Racha', `${streak} ${streak === 1 ? 'día' : 'días'}`],
        done ? ['Cumplidos', data.daily.total] : ['Premio', `${reward.xp} XP`],
        ['Mejor racha', data.daily.best],
      ],
      action: done ? 'Correr otra vez' : 'Aceptar desafío',
      note: done ? 'El de mañana sale a la medianoche.' : `Quedan ${hours} h para cumplirlo.`,
      accent: DAILY_COLOR,
      open: (game) => game.screens.goTo('race', challenge.race),
      card: chip,
      id: 'daily',
    }));
    return chip;
  }

  /**
   * Botón del evento semanal (arriba, junto al desafío): un circuito fijo toda la semana en
   * contrarreloj, con tu mejor vuelta, la medalla que sigue, el puesto en la
   * tabla en línea (si está disponible) y los días que quedan.
   */
  private createWeekly(): HTMLButtonElement {
    const data = this.game.save.data;
    const now = new Date();
    const event = weeklyEvent(now, TRACKS);
    const track = getTrack(event.trackId);
    const best = data.records[track.id]?.bestLap ?? null;
    const medal = medalFor(track, best);
    const next = nextMedal(track, best);
    const days = Math.max(1, Math.ceil((event.ends.getTime() - now.getTime()) / 86_400_000));
    const online = this.game.online;
    const rows = online.status === 'online' ? online.trackRows(track.id) : [];
    const mine = rows.find((row) => row.entry.id === online.myId) ?? null;
    const leader = rows[0] ?? null;
    const card = h(
      'button',
      { class: 'mchip mtile mchip--weekly', attrs: { type: 'button', 'aria-label': 'Evento semanal' }, style: { '--card-accent': WEEKLY_COLOR } },
      svg(ICONS.trophy, 'icon mchip__icon'),
      h('span', { class: 'mchip__label', text: 'Semanal' }),
      h('span', { class: 'mchip__streak', text: String(days), attrs: { title: `Cierra en ${days} ${days === 1 ? 'día' : 'días'}` } }),
    );
    const stats: Array<[string, string | number]> = [
      ['Circuito', track.short],
      ['Tu mejor', best === null ? '—' : formatLapTime(best)],
      ['Medalla', medal ? MEDAL_INFO[medal].label : 'Ninguna'],
    ];
    if (mine) stats.push(['Puesto', `${mine.rank}/${rows.length}`]);
    else stats.push(['Cierra en', `${days} ${days === 1 ? 'día' : 'días'}`]);
    this.register(card, () => ({
      group: 'Evento semanal',
      icon: 'trophy',
      title: track.grandPrix,
      text:
        `Esta semana se corre en ${track.short}: contrarreloj con tu fantasma. ` +
        (next ? `Baja de ${formatLapTime(next.time)} para la medalla de ${MEDAL_INFO[next.medal].label.toLowerCase()}.` : 'Ya tienes platino: ve por el primer puesto de la tabla.') +
        (leader ? ` Récord de la tabla: ${formatLapTime(leader.time)} de ${leader.entry.name}.` : ''),
      stats,
      action: 'Correr el evento',
      note: `Cambia de circuito el lunes. ${online.status === 'online' ? 'Tu vuelta entra sola en la tabla en línea.' : 'La tabla en línea se ve abriendo el juego desde claude.ai.'}`,
      accent: WEEKLY_COLOR,
      open: (game) => game.screens.goTo('race', event.race),
      card,
      id: 'weekly',
    }));
    return card;
  }

  /**
   * Barra de noticias del pie, como la de una transmisión: próxima carrera,
   * evento semanal, desafío del día, récords, licencia y consejos, pasando
   * solos (se repite el contenido para que el giro no tenga cortes). Sólo
   * transform con CSS: no carga el 3D. Con "reducir movimiento" queda quieta.
   */
  private createTicker(): HTMLElement {
    const data = this.game.save.data;
    const items: string[] = [];
    const state = data.championship;
    if (state && !isFinished(state)) {
      const round = nextRound(state);
      items.push(`PRÓXIMA CARRERA · ${getTrack(state.rounds[round]?.trackId ?? '').grandPrix} (ronda ${round + 1}/${state.rounds.length})`);
    }
    const weekly = getTrack(weeklyEvent(new Date(), TRACKS).trackId);
    items.push(`EVENTO SEMANAL · Contrarreloj en ${weekly.short}`);
    const today = dateKey(new Date());
    const daily = dailyChallenge(today, TRACKS, (id) => data.records[id]?.bestLap, difficultyValue(this.game.settings.race));
    items.push(doneToday(data.daily, today) ? 'DESAFÍO DEL DÍA · Cumplido: vuelve mañana' : `DESAFÍO DEL DÍA · ${daily.title} en ${getTrack(daily.trackId).short}`);
    const license = licenseFor(medalTally(TRACKS, (id) => data.records[id]?.bestLap));
    items.push(license.next ? `TU LICENCIA · ${license.tier.name}: faltan ${license.next.missing} medallas para la ${license.next.tier.name}` : `TU LICENCIA · ${license.tier.name}`);
    const timed = TRACKS.filter((t) => data.records[t.id]?.bestLap);
    const latest = timed[Math.floor(Math.random() * timed.length)];
    const latestLap = latest ? data.records[latest.id]?.bestLap : null;
    if (latest && latestLap) items.push(`TU RÉCORD · ${latest.short}: ${formatLapTime(latestLap)}`);
    if (data.stats.races > 0) items.push(`TRAYECTORIA · ${data.stats.races} carreras, ${data.stats.wins} victorias, ${data.stats.podiums} podios`);
    const start = Math.floor(Math.random() * LOADING_TIPS.length);
    for (let k = 0; k < 3; k++) items.push(`CONSEJO · ${LOADING_TIPS[(start + k) % LOADING_TIPS.length] ?? ''}`);
    const line = (): HTMLElement => h('span', { class: 'menu__ticker-line' }, ...items.map((text) => h('span', { class: 'menu__ticker-item', text })));
    const track = h('div', { class: 'menu__ticker-track' }, line(), line());
    const length = items.join('').length;
    track.style.setProperty('--ticker-time', `${Math.round((length * 7.5) / TICKER_SPEED)}s`);
    return h('div', { class: 'menu__ticker', attrs: { 'aria-label': 'Noticias' } }, h('span', { class: 'menu__ticker-tag', text: 'EN VIVO' }), h('div', { class: 'menu__ticker-window' }, track));
  }

  private confirm(feature: Feature): void {
    if (!feature.open) {
      this.game.playUi('locked');
      denyFeedback(feature.card);
      gsap.fromTo(this.note, { opacity: 0.3 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
      return;
    }
    this.game.playUi('confirm');
    gsap.fromTo(this.action, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'back.out(3)', clearProps: 'scale' });
    void feature.open(this.game);
  }

  /** Dato corto que muestra cada tarjeta debajo del rótulo. */
  private subFor(id: MenuItemId): string {
    const data = this.game.save.data;
    const settings = this.game.settings;
    switch (id) {
      case 'practice':
        return `${TRACKS.length} circuitos`;
      case 'quickRace':
        return (TRACKS.find((t) => t.id === settings.race.trackId) ?? TRACKS[0])?.short ?? '';
      case 'timeTrial': {
        // Las medallas son la meta de la contrarreloj: cuántas pistas tienen alguna y cuántas de oro.
        const tally = medalTally(TRACKS, (trackId) => data.records[trackId]?.bestLap);
        if (tally.gold > 0) return `${tally.gold} ${tally.gold === 1 ? 'oro' : 'oros'} · ${tally.bronze}/${TRACKS.length}`;
        return tally.bronze > 0 ? `${tally.bronze}/${TRACKS.length} con medalla` : 'Gana medallas';
      }
      case 'championship': {
        const state = data.championship;
        if (state && !isFinished(state)) return `${state.rounds.filter((r) => r.results).length}/${state.rounds.length} carreras`;
        return `${CHAMPIONSHIPS.length} campeonatos`;
      }
      case 'circuits': {
        const timed = Object.values(data.records).filter((r) => r.bestLap !== null).length;
        return `${timed}/${TRACKS.length} con tiempo`;
      }
      case 'garage':
        return data.workshop.points > 0 ? `${data.workshop.points} ${data.workshop.points === 1 ? 'punto' : 'puntos'}` : `Auto #${data.garage.number}`;
      case 'pass':
        return `Nivel ${this.passLevel()}`;
      case 'profile':
        return `${data.stats.races} ${data.stats.races === 1 ? 'carrera' : 'carreras'}`;
      case 'manual':
        return LEVEL_INFO[settings.assists.level].name;
      case 'settings':
        return `Calidad ${QUALITY_LABEL[settings.graphics.quality] ?? '—'}`;
    }
  }

  /** Datos del panel grande para cada acceso. */
  private statsFor(id: MenuItemId): Array<[string, string | number]> {
    const data = this.game.save.data;
    const settings = this.game.settings;
    const stats = data.stats;
    const records = Object.values(data.records);
    switch (id) {
      case 'practice':
        return [
          ['Circuitos', TRACKS.length],
          ['Récords propios', records.filter((r) => r.bestLap).length],
          ['Ayudas', LEVEL_INFO[settings.assists.level].name],
        ];
      case 'quickRace': {
        const track = TRACKS.find((t) => t.id === settings.race.trackId) ?? TRACKS[0];
        return [
          ['Circuito', track?.short ?? '—'],
          ['Autos', settings.race.rivals + 1],
          ['Vueltas', settings.race.laps],
          ['Rivales', DIFFICULTY_INFO[settings.race.difficulty].label],
        ];
      }
      case 'timeTrial':
        return [
          ['Circuitos', TRACKS.length],
          ['Fantasmas', records.filter((r) => r.ghost).length],
        ];
      case 'championship': {
        const state = data.championship;
        const running = state && !isFinished(state);
        return [
          ['En curso', running && state ? (state.cup ? getChampionship(state.cup).name : 'Temporada') : 'Ninguno'],
          ['Campeonatos', CHAMPIONSHIPS.length],
          ['Títulos', stats.championships],
        ];
      }
      case 'circuits':
        return [
          ['Circuitos', TRACKS.length],
          ['Con tu tiempo', records.filter((r) => r.bestLap !== null).length],
          ['Curvas', TRACKS.reduce((sum, t) => sum + t.turns, 0)],
        ];
      case 'garage': {
        const car = carStats(applyUpgrades(F1_SPEC, data.workshop.levels));
        return [
          ['Mejoras', `${totalLevels(data.workshop.levels)}/${UPGRADE_IDS.length * UPGRADE_MAX_LEVEL}`],
          ['Puntos', data.workshop.points],
          ['Potencia', `${formatInteger(car.power)} CV`],
        ];
      }
      case 'pass':
        return [
          ['Nivel del pase', this.passLevel()],
          ['Nivel de piloto', data.progression.level],
        ];
      case 'profile':
        return [
          ['Carreras', stats.races],
          ['Victorias', stats.wins],
          ['Podios', stats.podiums],
        ];
      case 'manual':
        return [['Nivel de ayudas', LEVEL_INFO[settings.assists.level].name]];
      case 'settings':
        return [
          ['Calidad', QUALITY_LABEL[settings.graphics.quality] ?? '—'],
          ['Ayudas', LEVEL_INFO[settings.assists.level].name],
        ];
    }
  }

  private passLevel(): number {
    return Math.min(50, Math.floor(this.game.save.data.progression.pass.xp / 1000) + 1);
  }

  /**
   * Panel grande: cambia el contenido y lo hace entrar (el título palabra por
   * palabra desde abajo de una máscara, los datos uno tras otro y contando).
   * Cada cambio corta el anterior: navegar rápido nunca deja restos.
   */
  private showFeature(feature: Feature, delay: number): void {
    this.current = feature;
    this.root.style.setProperty('--menu-accent', feature.accent);
    const index = this.cards.indexOf(feature.card);

    this.kickerIcon.replaceChildren(svg(ICONS[feature.icon], 'icon'));
    this.kickerGroup.textContent = feature.group;
    this.kickerCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(this.cards.length).padStart(2, '0')}`;
    const words = feature.title.split(' ').map((word) => h('span', { text: word }));
    this.title.replaceChildren(...words.map((word) => h('span', { class: 'menu__word' }, word)));
    this.title.setAttribute('aria-label', feature.title);
    this.text.textContent = feature.text;
    const counters: Array<[HTMLElement, number]> = [];
    this.stats.replaceChildren(
      ...feature.stats.map(([label, value]) => {
        const valueEl = h('b', { text: String(value) });
        if (typeof value === 'number') counters.push([valueEl, value]);
        return h('div', { class: 'menu__stat' }, h('span', { text: label }), valueEl);
      }),
    );
    this.actionLabel.textContent = feature.action;
    this.action.classList.toggle('is-locked', !feature.open);
    this.note.textContent = feature.note;

    this.heroTween?.kill();
    if (prefersReducedMotion()) {
      this.heroTween = null;
      return;
    }
    const tl = gsap.timeline({ delay, defaults: { ease: 'power3.out' } });
    tl.fromTo(this.kickerBar, { scaleX: 0 }, { scaleX: 1, duration: 0.5 }, 0);
    tl.fromTo([this.kickerIcon, this.kickerGroup, this.kickerCount], { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05 }, 0.05);
    tl.fromTo(
      words,
      { yPercent: 110, rotate: 4 },
      { yPercent: 0, rotate: 0, duration: 0.6, ease: 'power4.out', stagger: 0.06 },
      0.04,
    );
    tl.fromTo(this.text, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5 }, 0.16);
    if (this.stats.childElementCount > 0) {
      tl.fromTo([...this.stats.children], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06 }, 0.22);
    }
    for (const [element, value] of counters) tl.add(countUp(element, value, { duration: 0.9 }), 0.24);
    tl.fromTo(this.action, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.45, clearProps: 'transform' }, 0.3);
    this.heroTween = tl;
  }

  /**
   * Lleva la barra de luz debajo de la tarjeta enfocada (deslizándose). Usa
   * medidas de maquetación (offset), que no cambian con la elevación ni la
   * escala de la tarjeta ni con el achique de la interfaz. Con el foco en los
   * botones de arriba, la barra se apaga.
   */
  private placePill(animate: boolean): void {
    const card = this.nav.focused;
    if (!card) return;
    const inRail = this.rail.contains(card);
    this.pill.classList.toggle('is-off', !inRail);
    if (!inRail || card.offsetWidth === 0) return;
    let x = 0;
    let node: HTMLElement | null = card;
    while (node && node !== this.rail) {
      x += node.offsetLeft;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    if (node !== this.rail) return;
    const width = card.offsetWidth;
    if (!animate || !this.pillPlaced || prefersReducedMotion()) {
      gsap.set(this.pill, { x, width });
      this.pillPlaced = true;
      return;
    }
    gsap.to(this.pill, { x, width, duration: 0.45, ease: 'power3.out', overwrite: true });
  }
}
