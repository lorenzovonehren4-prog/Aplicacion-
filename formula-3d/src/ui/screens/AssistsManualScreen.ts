/**
 * Manual de ayudas (se abre encima de Ajustes, del menú o de la selección de
 * carrera): cada ayuda con un texto corto y dos demos animadas lado a lado,
 * sin y con la ayuda; la línea de trazada, fija y dinámica; y la tabla de
 * niveles. "¿Nuevo? Empieza en Principiante".
 */

import gsap from 'gsap';
import { ASSIST_PRESETS, BRAKING_LABELS, LEVEL_INFO, LINE_LABELS, LINE_TYPE_LABELS, TRACTION_LABELS, xpMultiplier } from '../../assists/presets';
import type { Game } from '../../core/Game';
import { finished } from '../anim/finished';
import { AssistDemo, type DemoScene } from '../components/AssistDemo';
import { ControlHints } from '../components/ControlHints';
import { h, prefersReducedMotion } from '../dom';
import { BaseScreen } from './BaseScreen';

interface Topic {
  id: string;
  label: string;
  title: string;
  text: string;
  tips: readonly string[];
  /** Escenas izquierda / derecha, con sus rótulos. */
  demos: readonly [DemoView, DemoView] | null;
}

interface DemoView {
  scene: DemoScene;
  assisted: boolean;
  caption: string;
  good: boolean;
}

const TOPICS: readonly Topic[] = [
  {
    id: 'braking',
    label: 'Ayuda de frenado',
    title: 'Ayuda de frenado',
    text: 'Si llegas a una curva más rápido de lo que se puede doblar, el auto frena por ti justo lo necesario. Con Completa frena todo; Media corrige a la mitad; Baja sólo en emergencias.',
    tips: ['La luz roja atrás del auto indica que la ayuda está frenando.', 'Aprende los puntos de frenada mirando cuándo actúa y ve bajándola.'],
    demos: [
      { scene: 'braking', assisted: false, caption: 'Sin ayuda: llega pasado y se va a la grava', good: false },
      { scene: 'braking', assisted: true, caption: 'Con ayuda: frena antes y dobla', good: true },
    ],
  },
  {
    id: 'traction',
    label: 'Control de tracción',
    title: 'Control de tracción',
    text: 'Al acelerar saliendo de una curva, las ruedas traseras pueden patinar y la cola se escapa. El control de tracción corta la potencia justo lo necesario. Completo: nunca patinan; Medio: dejan patinar un poco.',
    tips: ['Sin control de tracción, acelera de a poco hasta enderezar el volante.', 'El ícono TC del tablero parpadea cuando corta potencia.'],
    demos: [
      { scene: 'traction', assisted: false, caption: 'Sin ayuda: acelera a fondo y la cola se va', good: false },
      { scene: 'traction', assisted: true, caption: 'Con ayuda: sale limpio', good: true },
    ],
  },
  {
    id: 'abs',
    label: 'ABS',
    title: 'ABS (antibloqueo)',
    text: 'Frenando muy fuerte las ruedas se pueden bloquear: el auto deja de doblar y sigue derecho, con humo y marcas. El ABS suelta y vuelve a apretar el freno muchas veces por segundo para que sigas doblando.',
    tips: ['Sin ABS, suelta un poco el freno si ves humo en las ruedas.', 'El ABS no acorta la frenada: sólo te deja seguir doblando.'],
    demos: [
      { scene: 'abs', assisted: false, caption: 'Sin ABS: bloquea y sigue derecho', good: false },
      { scene: 'abs', assisted: true, caption: 'Con ABS: frena fuerte y dobla', good: true },
    ],
  },
  {
    id: 'line',
    label: 'Línea de trazada',
    title: 'Línea de trazada',
    text: 'La trazada ideal pintada en el asfalto. Verde: acelera. Amarillo: levanta. Rojo: frena. La fija pinta cada punto según la curva; la dinámica cambia de color según tu velocidad: si vas pasado se pone roja aunque estés en una recta.',
    tips: ['"Sólo curvas" la esconde en las rectas.', 'Con la dinámica, apunta a que delante tuyo siempre esté verde o amarilla.'],
    demos: [
      { scene: 'lineFixed', assisted: true, caption: 'Fija: colores según la curva', good: true },
      { scene: 'lineDynamic', assisted: true, caption: 'Dinámica: colores según tu velocidad', good: true },
    ],
  },
  {
    id: 'levels',
    label: 'Niveles de ayudas',
    title: 'Niveles de ayudas',
    text: 'Cada nivel combina las ayudas. Menos ayudas, más XP por carrera. Puedes cambiar de nivel en cualquier momento desde Ajustes → Ayudas, también en plena carrera desde la pausa.',
    tips: ['Personalizado: elige cada ayuda por separado; la XP se calcula según lo que quites.'],
    demos: null,
  },
];

export class AssistsManualScreen extends BaseScreen {
  readonly id = 'assistsManual';
  private readonly list = h('nav', { class: 'manual__list' });
  private readonly body = h('section', { class: 'manual__body' });
  private readonly panel = h('div', { class: 'manual__panel' });
  private demos: AssistDemo[] = [];
  private current = '';

  constructor(game: Game) {
    super(game, 'screen--manual');
  }

  enter(): void {
    const hints = new ControlHints(
      [
        { keys: [{ keyboard: '↑↓', gamepad: '✚' }], label: 'Tema' },
        { keys: [{ keyboard: 'ESC', gamepad: 'B' }], label: 'Volver' },
      ],
      this.game.input.lastDevice,
    );
    this.own.add(this.game.events.on('input:device', ({ device }) => hints.setDevice(device)));
    this.own.add(() => this.stopDemos());
    for (const topic of TOPICS) {
      const button = h('button', { class: 'manual__topic', attrs: { type: 'button' }, text: topic.label });
      this.nav.add(button, { onFocus: () => this.show(topic) });
      this.list.append(button);
    }
    const back = h('button', { class: 'rsel__back', attrs: { type: 'button' }, text: 'Volver' });
    this.own.listen(back, 'click', () => this.onBack());
    this.panel.append(
      h(
        'header',
        { class: 'manual__header' },
        h('span', { class: 'rsel__kicker', text: 'Manual' }),
        h('h2', { class: 'rsel__title', text: 'Ayudas de manejo' }),
        h('p', { class: 'manual__new', text: '¿Nuevo? Empieza en Principiante: el auto frena solo, no patina y la dirección es más estable.' }),
      ),
      h('div', { class: 'manual__main' }, this.list, this.body),
      h('footer', { class: 'manual__footer' }, hints.element, back),
    );
    this.root.append(h('div', { class: 'manual__backdrop' }), this.panel);
    const first = this.list.firstElementChild;
    if (first instanceof HTMLElement) this.nav.focus(first);
    const topic = TOPICS[0];
    if (topic) this.show(topic);
  }

  reveal(): void {
    if (prefersReducedMotion()) return;
    this.own.tween(gsap.from(this.panel, { y: 40, opacity: 0, duration: 0.45, ease: 'power3.out' }));
  }

  async hide(): Promise<void> {
    const tl = gsap.timeline();
    tl.to(this.panel, { y: 30, opacity: 0, duration: 0.25, ease: 'power2.in' });
    if (prefersReducedMotion()) tl.progress(1);
    await finished(tl);
  }

  protected onBack(): void {
    this.game.playUi('back');
    void this.game.screens.pop();
  }

  private stopDemos(): void {
    for (const demo of this.demos) demo.dispose();
    this.demos = [];
  }

  private show(topic: Topic): void {
    if (topic.id === this.current) return;
    this.current = topic.id;
    this.stopDemos();
    const content: HTMLElement[] = [h('h3', { class: 'manual__title', text: topic.title }), h('p', { class: 'manual__text', text: topic.text })];
    if (topic.demos) {
      const animate = !prefersReducedMotion();
      content.push(
        h(
          'div',
          { class: 'manual__demos' },
          ...topic.demos.map((view) => {
            const demo = new AssistDemo(view.scene, view.assisted, animate);
            this.demos.push(demo);
            demo.play();
            return h('figure', { class: `demo${view.good ? ' is-good' : ' is-bad'}` }, demo.element, h('figcaption', { text: view.caption }));
          }),
        ),
      );
      if (topic.id === 'line') {
        content.push(
          h(
            'div',
            { class: 'manual__legend' },
            ...(
              [
                ['#39d353', 'Acelera'],
                ['#ffd23f', 'Levanta'],
                ['#ff2a3c', 'Frena'],
              ] as const
            ).map(([color, label]) => h('span', {}, h('i', { style: { background: color } }), h('b', { text: label }))),
          ),
        );
      }
    } else {
      content.push(this.levelsTable());
    }
    content.push(h('ul', { class: 'manual__tips' }, ...topic.tips.map((tip) => h('li', { text: tip }))));
    this.body.replaceChildren(...content);
    if (!prefersReducedMotion()) this.own.tween(gsap.from(this.body.children, { y: 12, opacity: 0, stagger: 0.05, duration: 0.3, ease: 'power2.out' }));
  }

  private levelsTable(): HTMLElement {
    const rows = (['beginner', 'intermediate', 'advanced'] as const).map((level) => {
      const preset = ASSIST_PRESETS[level];
      return h(
        'tr',
        {},
        h('th', { text: LEVEL_INFO[level].name }),
        h('td', { text: BRAKING_LABELS[preset.braking] }),
        h('td', { text: TRACTION_LABELS[preset.traction] }),
        h('td', { text: preset.abs ? 'Sí' : 'No' }),
        h('td', { text: LINE_LABELS[preset.line] }),
        h('td', { text: LINE_TYPE_LABELS[preset.lineType] }),
        h('td', { class: 'manual__xp', text: `×${xpMultiplier({ level, custom: preset }).toFixed(2)}` }),
      );
    });
    return h(
      'div',
      { class: 'manual__table-wrap' },
      h(
        'table',
        { class: 'manual__table' },
        h('thead', {}, h('tr', {}, ...['Nivel', 'Frenado', 'Tracción', 'ABS', 'Línea', 'Tipo', 'XP'].map((text) => h('th', { text })))),
        h('tbody', {}, ...rows),
      ),
    );
  }
}
