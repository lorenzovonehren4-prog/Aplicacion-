/**
 * Perfil del piloto:
 * - Tarjeta (avatar, nombre, título, nivel) con el nombre editable.
 * - Estadísticas de la trayectoria y récords por circuito (mejor vuelta,
 *   victorias, podios y si hay fantasma guardado).
 * - Vitrina: un trofeo por circuito (oro si ganaste ahí, plata si subiste al
 *   podio) y la copa del campeonato.
 * - Logros con su medalla (bronce, plata, oro) y el avance de los que faltan.
 */

import gsap from 'gsap';
import type { Game } from '../../core/Game';
import { DEFAULT_PILOT_NAME, PROFILE_NAME_MAX_LENGTH } from '../../core/save/schema';
import { formatInteger, formatLapTime } from '../../core/utils/format';
import { achievementContext, ACHIEVEMENTS } from '../../progression/career';
import { MEDAL_INFO, medalFor, medalTally } from '../../progression/medals';
import { passProgress, SEASON } from '../../progression/seasonPass';
import { TRACKS } from '../../tracks/registry';
import { finished } from '../anim/finished';
import { achievementBadge } from '../components/AchievementBadge';
import { ControlHints } from '../components/ControlHints';
import { PlayerCard } from '../components/PlayerCard';
import { h, prefersReducedMotion } from '../dom';
import { BaseScreen } from './BaseScreen';

const SVG_NS = 'http://www.w3.org/2000/svg';

type TrophyMetal = 'gold' | 'silver' | 'none';

/** Copa en SVG (oro, plata o apagada). */
/** "1 victoria", "3 victorias". */
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function trophyCup(metal: TrophyMetal, big = false): SVGSVGElement {
  const colors: Record<TrophyMetal, readonly [string, string, string]> = {
    gold: ['#fff1b8', '#f5c542', '#8a6410'],
    silver: ['#f4f7fb', '#a9b3c1', '#4c5563'],
    none: ['#3a3e46', '#262a31', '#15171b'],
  };
  const [light, mid, dark] = colors[metal];
  const id = `cup${Math.random().toString(36).slice(2, 8)}`;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 80');
  svg.setAttribute('class', `cup cup--${metal}${big ? ' cup--big' : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}"/><stop offset="0.35" stop-color="${light}"/><stop offset="0.7" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient></defs>
    <path d="M12 12 Q2 12 3 24 Q5 36 18 38" fill="none" stroke="${mid}" stroke-width="4"/>
    <path d="M52 12 Q62 12 61 24 Q59 36 46 38" fill="none" stroke="${mid}" stroke-width="4"/>
    <path d="M12 6 H52 V20 Q52 44 32 48 Q12 44 12 20 Z" fill="url(#${id})"/>
    <rect x="28" y="47" width="8" height="12" fill="${mid}"/>
    <path d="M18 60 H46 L50 70 H14 Z" fill="url(#${id})"/>
    <rect x="12" y="70" width="40" height="7" rx="1" fill="${dark}"/>`;
  return svg;
}

export class ProfileScreen extends BaseScreen {
  readonly id = 'profile';
  private readonly panel = h('div', { class: 'profile__panel' });
  private readonly side = h('div', { class: 'profile__side' });
  private readonly cardSlot = h('div', { class: 'profile__card' });
  private hints: ControlHints | null = null;

  constructor(game: Game) {
    super(game, 'screen--rsel screen--profile');
  }

  enter(): void {
    this.hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Recorrer' },
        { keys: [{ keyboard: 'ENTER', gamepad: 'A' }], label: 'Editar nombre' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => this.hints?.setDevice(device)));
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());
    this.root.append(h('div', { class: 'rsel__backdrop fx-backdrop' }), this.panel, this.side, h('footer', { class: 'rsel__footer' }, this.hints.element, back));
    this.buildPanel();
    this.buildSide();
  }

  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(this.panel, { x: -60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0);
    tl.from(this.side, { x: 60, opacity: 0, duration: quick ? 0.01 : 0.5 }, 0.05);
    tl.from(this.side.querySelectorAll('.cup'), { y: 20, opacity: 0, stagger: quick ? 0 : 0.08, duration: quick ? 0.01 : 0.4, ease: 'back.out(1.8)' }, 0.25);
    tl.from(this.side.querySelectorAll('.ach'), { scale: 0.85, opacity: 0, stagger: quick ? 0 : 0.025, duration: quick ? 0.01 : 0.3 }, 0.35);
    this.own.tween(tl);
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to([this.panel, this.side], { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.goTo('menu', undefined);
  }

  // ─── Panel izquierdo ───────────────────────────────────────────────────

  /** Mejor vuelta de un circuito, con el disco de la medalla ganada. */
  private recordLap(track: (typeof TRACKS)[number], best: number | null): HTMLElement {
    const medal = medalFor(track, best);
    const lap = h('span', { class: `precord__lap${medal ? ' has-medal' : ''}`, text: best ? formatLapTime(best) : '—:——.———' });
    if (medal) {
      lap.style.setProperty('--tone', MEDAL_INFO[medal].color);
      lap.title = `Medalla de ${MEDAL_INFO[medal].label}`;
    }
    return lap;
  }

  private buildPanel(): void {
    const data = this.game.save.data;
    const stats = data.stats;
    this.renderCard();
    const edit = h('button', { class: 'profile__edit', attrs: { type: 'button' }, text: 'Editar nombre' });
    this.nav.add(edit, { onConfirm: () => this.editName() });
    const pass = passProgress(data.progression.pass.xp);
    const medals = medalTally(TRACKS, (id) => data.records[id]?.bestLap);
    const cells: ReadonlyArray<readonly [string, string]> = [
      ['Carreras', formatInteger(stats.races)],
      ['Victorias', formatInteger(stats.wins)],
      ['Podios', formatInteger(stats.podiums)],
      ['Vueltas rápidas', formatInteger(stats.fastestLaps)],
      ['Carreras limpias', formatInteger(stats.cleanRaces)],
      ['Adelanta\u00ADmientos', formatInteger(stats.overtakes)],
      ['Vueltas válidas', formatInteger(stats.laps)],
      ['Km recorridos', formatInteger(stats.distanceKm)],
      ['Campeonatos', `${formatInteger(stats.championships)} / ${formatInteger(stats.seasons)}`],
      ['Nivel del pase', pass.complete ? 'Completo' : `${pass.tier} / ${SEASON.tiers}`],
      ['Pistas con medalla', `${medals.bronze} / ${TRACKS.length}`],
      ['Medallas de oro', `${medals.gold} / ${TRACKS.length}`],
    ];
    const grid = h(
      'div',
      { class: 'profile__stats' },
      ...cells.map(([label, value]) => h('div', { class: 'pstat' }, h('span', { class: 'pstat__value', text: value }), h('span', { class: 'pstat__label', text: label }))),
    );
    const records = h('div', { class: 'profile__records' });
    for (const track of TRACKS) {
      const record = data.records[track.id];
      const t = stats.tracks[track.id];
      const row = h(
        'div',
        { class: 'precord' },
        h('span', { class: 'precord__code', text: track.countryCode }),
        h('span', { class: 'precord__name' }, h('b', { text: track.name }), h('small', { text: track.grandPrix })),
        this.recordLap(track, record?.bestLap ?? null),
        h('span', { class: 'precord__meta', text: `${plural(t?.wins ?? 0, 'victoria', 'victorias')} · ${plural(t?.podiums ?? 0, 'podio', 'podios')}${record?.ghost ? ' · fantasma' : ''}` }),
      );
      records.append(row);
    }
    this.panel.append(
      h('header', { class: 'rsel__header' }, h('span', { class: 'rsel__kicker', text: 'Perfil' }), h('h2', { class: 'rsel__title', text: 'Tu trayectoria' })),
      h('div', { class: 'profile__identity' }, this.cardSlot, edit),
      h('h3', { class: 'rsel__section', text: 'Estadísticas' }),
      grid,
      h('h3', { class: 'rsel__section', text: 'Récords por circuito' }),
      records,
    );
    this.nav.focus(edit);
  }

  private renderCard(): void {
    const { profile, progression } = this.game.save.data;
    const card = new PlayerCard(profile, progression);
    for (const tween of card.animateIn(0.2)) this.own.tween(tween);
    this.cardSlot.replaceChildren(card.element);
  }

  /** Nombre editable en el lugar: ENTER guarda, ESC cancela. */
  private editName(): void {
    if (this.cardSlot.querySelector('input')) return;
    this.game.playUi('confirm');
    const input = h('input', {
      class: 'profile__input',
      attrs: { type: 'text', maxlength: PROFILE_NAME_MAX_LENGTH, 'aria-label': 'Nombre del piloto', spellcheck: 'false', autocomplete: 'off' },
    });
    input.value = this.game.save.data.profile.name;
    const hint = h('span', { class: 'profile__input-hint', text: 'ENTER para guardar · ESC para cancelar' });
    const wrap = h('div', { class: 'profile__editor' }, input, hint);
    this.cardSlot.replaceChildren(wrap);
    this.nav.setEnabled(false);
    input.focus();
    input.select();
    let done = false;
    const finish = (save: boolean): void => {
      if (done) return;
      done = true;
      if (save) {
        const name = input.value.trim() || DEFAULT_PILOT_NAME;
        this.game.save.update((data) => (data.profile.name = name));
        this.game.playUi('confirm');
      } else {
        this.game.playUi('back');
      }
      this.nav.setEnabled(true);
      this.renderCard();
    };
    this.own.listen(input, 'keydown', (event) => {
      if (event.key === 'Enter') finish(true);
      else if (event.key === 'Escape') finish(false);
      event.stopPropagation();
    });
    this.own.listen(input, 'blur', () => finish(true));
  }

  // ─── Vitrina y logros ──────────────────────────────────────────────────

  private buildSide(): void {
    const data = this.game.save.data;
    const shelf = h('div', { class: 'profile__shelf' });
    for (const track of TRACKS) {
      const t = data.stats.tracks[track.id];
      const metal: TrophyMetal = (t?.wins ?? 0) > 0 ? 'gold' : (t?.podiums ?? 0) > 0 ? 'silver' : 'none';
      shelf.append(
        h(
          'div',
          { class: `trophy trophy--${metal}` },
          trophyCup(metal),
          h('span', { class: 'trophy__name', text: track.grandPrix }),
          h('span', { class: 'trophy__count', text: metal === 'gold' ? `×${t?.wins ?? 0}` : metal === 'silver' ? 'Podio' : 'Sin ganar' }),
        ),
      );
    }
    const titles = data.stats.championships;
    shelf.append(
      h(
        'div',
        { class: `trophy trophy--champion trophy--${titles > 0 ? 'gold' : 'none'}` },
        trophyCup(titles > 0 ? 'gold' : 'none', true),
        h('span', { class: 'trophy__name', text: 'Campeonato' }),
        h('span', { class: 'trophy__count', text: titles > 0 ? `×${titles}` : 'Sin títulos' }),
      ),
    );

    const ctx = achievementContext(data);
    const unlocked = ACHIEVEMENTS.filter((a) => data.achievements[a.id] !== undefined).length;
    const list = h('div', { class: 'profile__achievements' });
    for (const achievement of ACHIEVEMENTS) {
      const when = data.achievements[achievement.id];
      const done = when !== undefined;
      const progress = achievement.progress(ctx);
      const bar = h('span', { class: 'ach__bar' }, h('i'));
      bar.style.setProperty('--p', String(progress));
      list.append(
        h(
          'div',
          { class: `ach ach--${achievement.tier}${done ? ' is-done' : ''}`, attrs: { title: achievement.description } },
          achievementBadge(achievement.tier, !done),
          h(
            'div',
            { class: 'ach__text' },
            h('span', { class: 'ach__name', text: achievement.name }),
            h('span', { class: 'ach__desc', text: achievement.description }),
            done ? h('span', { class: 'ach__date', text: new Date(when).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) }) : bar,
          ),
        ),
      );
    }
    this.side.append(
      h('h3', { class: 'rsel__section', text: 'Vitrina' }),
      shelf,
      h('div', { class: 'profile__ach-head' }, h('h3', { class: 'rsel__section', text: 'Logros' }), h('span', { class: 'profile__ach-count', text: `${unlocked} / ${ACHIEVEMENTS.length}` })),
      list,
    );
  }
}
