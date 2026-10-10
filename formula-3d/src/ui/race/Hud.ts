/**
 * HUD de carrera, estilo transmisión:
 * - arriba a la izquierda, la torre de tiempos: posición (en carrera), vuelta,
 *   tiempo en curso con delta en vivo, última y mejor vuelta, y los tres
 *   sectores coloreados; debajo, la torre de posiciones con los intervalos,
 * - arriba a la derecha, el minimapa con las zonas de DRS y los autos,
 * - abajo a la derecha, el tablero: LEDs de cambio, marcha, velocidad,
 *   pedales, DRS y luces de control de tracción y ABS,
 * - al centro, avisos (advertencias y sanciones, mejor vuelta, sentido contrario).
 *
 * Sólo toca el DOM cuando un valor cambia.
 */

import gsap from 'gsap';
import type { SpeedUnit } from '../../core/save/schema';
import { Disposer } from '../../core/utils/Disposer';
import { formatDelta, formatLapTime } from '../../core/utils/format';
import type { Track } from '../../tracks/Track';
import type { SectorResult } from '../../race/session/LapTimer';
import { LIGHT_COUNT } from '../../race/session/StartLights';
import { TRACK_LIMIT_WARNINGS, type StandingRow } from '../../race/Session';
import { h, prefersReducedMotion, svg } from '../dom';
import { Standings } from './Standings';

const LED_COUNT = 15;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface HudState {
  speed: number;
  gear: number;
  /** 0–1 de los LEDs de cambio. */
  shift: number;
  limiter: boolean;
  throttle: number;
  brake: number;
  /** armed = habilitado para la próxima zona (detección a menos de 1 s). */
  drs: 'off' | 'armed' | 'available' | 'open';
  tcActive: boolean;
  absActive: boolean;
  brakeAssistActive: boolean;
  stabilityActive: boolean;
  /** En la parrilla, esperando el semáforo. */
  onGrid: boolean;
  lap: number;
  lapTime: number | null;
  /** La vuelta en curso cuenta para el récord (sin las cuatro ruedas afuera). */
  lapValid: boolean;
  /** Infracciones por límites de pista en la carrera (null fuera de carrera). */
  warnings: number | null;
  /** Sanción de tiempo acumulada (s). */
  penalty: number;
  delta: number | null;
  lastLap: number | null;
  bestLap: number | null;
  personalBest: number | null;
  /** Posición del auto (mundo) para el minimapa. */
  x: number;
  z: number;
  wrongWay: boolean;
  /** Posición en carrera (null sin rivales). */
  position: number | null;
  /** Rebufo del auto (0–1). */
  slipstream: number;
}

/** Banderas para el HUD. */
export interface HudFlags {
  /** Sectores con amarilla (para el minimapa). */
  yellow: readonly boolean[];
  /** Amarilla en el sector del jugador o en el que viene (null = ninguna). */
  yellowHere: number | null;
  /** Abreviatura del que lo va a doblar (bandera azul). */
  blue: string | null;
  /** Bandera blanca y negra (última advertencia por límites de pista). */
  blackWhite: boolean;
}

/** Un rival en el minimapa. */
export interface MinimapCar {
  x: number;
  z: number;
}

type MessageTone = 'info' | 'good' | 'warn' | 'blue' | 'bad' | 'best' | 'gold';

/** Ayudas que muestran ícono en el tablero (sólo si están activadas). */
export interface HudAssists {
  braking: boolean;
  traction: boolean;
  abs: boolean;
  stability: boolean;
}

/** El auto visto desde arriba: alerón delantero, cuatro neumáticos y el cuerpo (los colores los pone el CSS). */
const CAR_ICON = `<svg viewBox="0 0 40 64" aria-hidden="true"><rect class="car__wing" x="5" y="2" width="30" height="4" rx="1"/><rect class="car__tyre" x="2" y="10" width="8" height="13" rx="2"/><rect class="car__tyre" x="30" y="10" width="8" height="13" rx="2"/><rect class="car__tyre" x="1" y="42" width="9" height="16" rx="2"/><rect class="car__tyre" x="30" y="42" width="9" height="16" rx="2"/><path class="car__body" d="M17 6h6l2 14 5 6v20l-3 12H13l-3-12V26l5-6z"/></svg>`;

/** Ondas de radio para el mensaje del equipo. */
const RADIO_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 13v8M9 21h6"/><circle cx="12" cy="10" r="2"/><path d="M8.5 6.5a5 5 0 0 0 0 7M15.5 6.5a5 5 0 0 1 0 7M5.7 3.7a9 9 0 0 0 0 12.6M18.3 3.7a9 9 0 0 1 0 12.6"/></svg>`;
/** Letras por segundo del mensaje de radio. */
const RADIO_TYPE_SPEED = 45;

/** Escribe texto en un elemento sólo si cambió. */
function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/** Última transformación escrita en cada elemento (el navegador normaliza la que devuelve). */
const lastTransforms = new WeakMap<HTMLElement, string>();

/** Cambia la transformación sólo si es distinta (evita invalidar el estilo en cada cuadro). */
function setTransform(element: HTMLElement, transform: string): void {
  if (lastTransforms.get(element) === transform) return;
  lastTransforms.set(element, transform);
  element.style.transform = transform;
}

function toggle(element: Element, className: string, on: boolean): void {
  if (element.classList.contains(className) !== on) element.classList.toggle(className, on);
}

class Minimap {
  readonly element: HTMLDivElement;
  private readonly car: SVGCircleElement;
  private readonly scale: number;
  private readonly offsetX: number;
  private readonly offsetZ: number;
  private readonly rivalLayer: SVGGElement;
  private rivals: SVGCircleElement[] = [];
  /** Tramo de cada sector (se pinta de amarillo con bandera amarilla). */
  private readonly sectorPaths: SVGPathElement[] = [];

  constructor(track: Track) {
    const g = track.geometry;
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < g.count; i++) {
      minX = Math.min(minX, g.x[i] ?? 0);
      maxX = Math.max(maxX, g.x[i] ?? 0);
      minZ = Math.min(minZ, g.z[i] ?? 0);
      maxZ = Math.max(maxZ, g.z[i] ?? 0);
    }
    const size = 200;
    const pad = 12;
    this.scale = (size - pad * 2) / Math.max(maxX - minX, maxZ - minZ);
    this.offsetX = pad + ((size - pad * 2) - (maxX - minX) * this.scale) / 2 - minX * this.scale;
    this.offsetZ = pad + ((size - pad * 2) - (maxZ - minZ) * this.scale) / 2 - minZ * this.scale;

    const path = (from: number, to: number): string => {
      const parts: string[] = [];
      const length = g.wrapS(to - from) || g.length;
      for (let d = 0; d <= length; d += 12) {
        const i = g.indexAt(from + d);
        parts.push(`${parts.length === 0 ? 'M' : 'L'}${this.px(g.x[i] ?? 0).toFixed(1)} ${this.pz(g.z[i] ?? 0).toFixed(1)}`);
      }
      return parts.join('');
    };

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.classList.add('minimap__svg');
    const make = (d: string, className: string): SVGPathElement => {
      const element = document.createElementNS(SVG_NS, 'path');
      element.setAttribute('d', d);
      element.setAttribute('class', className);
      svg.append(element);
      return element;
    };
    const full = `${path(0, g.length)}Z`;
    make(full, 'minimap__outline');
    make(full, 'minimap__track');
    for (const zone of track.drsZones) make(path(zone.start, zone.end), 'minimap__drs');
    const bounds = [track.startS, track.sectorEnds[0], track.sectorEnds[1], track.startS];
    for (let k = 0; k < 3; k++) this.sectorPaths.push(make(path(bounds[k] ?? 0, bounds[k + 1] ?? 0), 'minimap__sector'));

    // Línea de meta.
    const p = { x: 0, z: 0 };
    const t = { x: 0, z: 0 };
    g.pointAt(track.startS, 0, p, t);
    const line = document.createElementNS(SVG_NS, 'line');
    const nx = -t.z * 7;
    const nz = t.x * 7;
    line.setAttribute('x1', String(this.px(p.x) - nx));
    line.setAttribute('y1', String(this.pz(p.z) - nz));
    line.setAttribute('x2', String(this.px(p.x) + nx));
    line.setAttribute('y2', String(this.pz(p.z) + nz));
    line.setAttribute('class', 'minimap__start');
    svg.append(line);

    this.rivalLayer = document.createElementNS(SVG_NS, 'g');
    svg.append(this.rivalLayer);
    this.car = document.createElementNS(SVG_NS, 'circle');
    this.car.setAttribute('r', '5');
    this.car.setAttribute('class', 'minimap__car');
    svg.append(this.car);

    this.element = h('div', { class: 'hud__minimap minimap' });
    this.element.append(svg);
  }

  /** Sectores con bandera amarilla. */
  setYellow(sectors: readonly boolean[]): void {
    this.sectorPaths.forEach((element, k) => element.classList.toggle('is-yellow', sectors[k] === true));
  }

  setCar(x: number, z: number): void {
    this.car.setAttribute('cx', this.px(x).toFixed(1));
    this.car.setAttribute('cy', this.pz(z).toFixed(1));
  }

  /** Crea un punto por rival, con el color de su equipo. */
  setRivalColors(colors: readonly string[]): void {
    this.rivals = colors.map((color) => {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('r', '3.6');
      dot.setAttribute('class', 'minimap__rival');
      dot.style.fill = color;
      return dot;
    });
    this.rivalLayer.replaceChildren(...this.rivals);
  }

  setRivals(cars: readonly MinimapCar[]): void {
    this.rivals.forEach((dot, i) => {
      const car = cars[i];
      if (!car) return;
      // Con transform (sin reescribir atributos de geometría): más barato para el navegador.
      dot.setAttribute('transform', `translate(${this.px(car.x).toFixed(1)} ${this.pz(car.z).toFixed(1)})`);
    });
  }

  private px(x: number): number {
    return x * this.scale + this.offsetX;
  }

  private pz(z: number): number {
    return z * this.scale + this.offsetZ;
  }
}

/** Panel de la parada en boxes. */
export interface HudPit {
  title: string;
  detail: string;
  /** Reloj de la parada ("2.4") o null. */
  timer: string | null;
  /** Color del reloj: en vivo, récord, buena o lenta. */
  tone: 'live' | 'best' | 'good' | 'slow';
  /** Avance del servicio (0–1) o null. */
  progress: number | null;
}

export class Hud {
  readonly root: HTMLDivElement;
  private readonly own = new Disposer();
  private readonly minimap: Minimap;

  // Torre de tiempos.
  private readonly lapLabel = h('span', { class: 'timing__lap' });
  private readonly lapTime = h('span', { class: 'timing__time' });
  private readonly delta = h('span', { class: 'timing__delta' });
  /** Advertencias o sanción (carrera) o "sin récord" (vuelta con las cuatro ruedas afuera). */
  private readonly status = h('span', { class: 'timing__status' });
  // Posición en carrera ("P3/12").
  private readonly placeValue = h('span', { class: 'timing__place-value' });
  private readonly placeTotal = h('span', { class: 'timing__place-total' });
  private readonly place = h('span', { class: 'timing__place' }, h('span', { class: 'timing__place-p', text: 'P' }), this.placeValue, this.placeTotal);
  private readonly standings = new Standings();
  private readonly tow = h('div', { class: 'hud__tow', text: 'REBUFO' });
  private lastPlace = 0;
  private readonly lastValue = h('span', { class: 'timing__value' });
  private readonly bestValue = h('span', { class: 'timing__value' });
  private readonly pbValue = h('span', { class: 'timing__value' });
  /** Próxima medalla del circuito (práctica y contrarreloj): nombre y tiempo a bajar. */
  private readonly medalLabel = h('span', { class: 'timing__label' });
  private readonly medalValue = h('span', { class: 'timing__value' });
  private readonly medalRow = h('div', { class: 'timing__row timing__row--medal' }, this.medalLabel, this.medalValue);
  private readonly sectors: HTMLSpanElement[] = [0, 1, 2].map(() => h('span', { class: 'timing__sector' }));
  /** Bandera que le toca al jugador (amarilla, azul, blanca y negra), con su texto. */
  private readonly flagText = h('span', { class: 'timing__flag-text' });
  private readonly flag = h('div', { class: 'timing__flag' }, h('span', { class: 'timing__flag-cloth' }), this.flagText);
  private flagKey = '';

  // Tablero.
  private readonly leds: HTMLSpanElement[] = [];
  private readonly ledBar = h('div', { class: 'dash__leds' });
  private readonly gear = h('span', { class: 'dash__gear' });
  private readonly speed = h('span', { class: 'dash__speed' });
  private readonly unitLabel = h('span', { class: 'dash__unit' });
  private readonly throttleBar = h('span', { class: 'dash__pedal-fill dash__pedal-fill--throttle' });
  private readonly brakeBar = h('span', { class: 'dash__pedal-fill dash__pedal-fill--brake' });
  private readonly drs = h('span', { class: 'dash__drs', text: 'DRS' });
  private readonly brakeAid = h('span', { class: 'dash__aid', text: 'FRENO', attrs: { title: 'Ayuda de frenado' } });
  private readonly tc = h('span', { class: 'dash__aid', text: 'TC', attrs: { title: 'Control de tracción' } });
  private readonly abs = h('span', { class: 'dash__aid', text: 'ABS', attrs: { title: 'Antibloqueo de frenos' } });
  private readonly stability = h('span', { class: 'dash__aid', text: 'EST', attrs: { title: 'Control de estabilidad' } });

  // Estado del auto: neumáticos y alerón (dibujo cenital) y el pedido de boxes.
  private readonly carIcon = svg(CAR_ICON, 'car__icon');
  private readonly tyreValue = h('span', { class: 'car__value' });
  private readonly wingValue = h('span', { class: 'car__value' });
  private readonly boxChip = h('span', { class: 'car__box', text: 'BOX' });
  private readonly carPanel = h(
    'div',
    { class: 'car' },
    this.carIcon,
    h(
      'div',
      { class: 'car__stats' },
      h('span', { class: 'car__label', text: 'GOMAS' }),
      this.tyreValue,
      h('span', { class: 'car__label', text: 'ALERÓN' }),
      this.wingValue,
      this.boxChip,
    ),
  );
  private carKey = '';
  // Parada en boxes: qué está pasando y, en el box, cuánto falta.
  private readonly pitTitle = h('span', { class: 'pitbox__title' });
  private readonly pitDetail = h('span', { class: 'pitbox__detail' });
  private readonly pitTimer = h('span', { class: 'pitbox__timer' });
  private readonly pitBar = h('span', { class: 'pitbox__bar-fill' });
  private readonly pitBox = h(
    'div',
    { class: 'hud__pitbox pitbox', attrs: { role: 'status' } },
    h('span', { class: 'pitbox__text' }, this.pitTitle, this.pitDetail),
    this.pitTimer,
    h('span', { class: 'pitbox__bar' }, this.pitBar),
  );
  private pitKey = '';

  // Semáforo en pantalla.
  private readonly lamps: HTMLSpanElement[] = [];
  private readonly lights = h('div', { class: 'hud__lights', attrs: { 'aria-hidden': 'true' } });

  // Radio del equipo.
  private readonly radioText = h('p', { class: 'radio__text' });
  private readonly radioFrom = h('span', { class: 'radio__from' });
  private readonly radioBox = h(
    'div',
    { class: 'hud__radio radio', attrs: { role: 'status', 'aria-live': 'polite' } },
    h('div', { class: 'radio__head' }, svg(RADIO_ICON, 'icon radio__icon'), h('span', { class: 'radio__label', text: 'RADIO' }), this.radioFrom),
    this.radioText,
  );
  private radioTimeline: gsap.core.Timeline | null = null;
  private totalLaps: number | null = null;

  // Avisos.
  private readonly messages = h('div', { class: 'hud__messages' });
  private readonly wrongWay = h('div', { class: 'hud__wrongway', text: 'SENTIDO CONTRARIO' });
  private readonly cameraLabel = h('div', { class: 'hud__camera' });
  // Retrovisor: el marco (la imagen la dibuja el 3D debajo, en este mismo lugar) y quién viene detrás.
  private readonly mirrorBehind = h('span', { class: 'hud__mirror-who' });
  private readonly mirrorGap = h('span', { class: 'hud__mirror-gap' });
  /** Hueco del retrovisor: su rectángulo es donde se dibuja la imagen trasera. */
  readonly mirrorGlass = h('div', { class: 'hud__mirror-glass' });
  private readonly mirror = h(
    'div',
    { class: 'hud__mirror', attrs: { 'aria-hidden': 'true' } },
    this.mirrorGlass,
    h('div', { class: 'hud__mirror-caption' }, h('span', { class: 'hud__mirror-label', text: 'DETRÁS' }), this.mirrorBehind, this.mirrorGap),
  );

  private lastGear = Number.NaN;
  private units: SpeedUnit;

  constructor(track: Track, units: SpeedUnit) {
    this.units = units;
    this.minimap = new Minimap(track);

    for (let i = 0; i < LED_COUNT; i++) {
      const led = h('span', { class: `dash__led dash__led--${i < 5 ? 'green' : i < 10 ? 'red' : 'blue'}` });
      this.leds.push(led);
      this.ledBar.append(led);
    }

    const row = (label: string, value: HTMLElement): HTMLDivElement =>
      h('div', { class: 'timing__row' }, h('span', { class: 'timing__label', text: label }), value);

    // Distribución como la transmisión de una carrera: torre con las vueltas
    // arriba a la izquierda, tiempos y sectores arriba a la derecha, minimapa
    // abajo a la izquierda, tablero abajo al centro y ayudas abajo a la derecha.
    const tower = h(
      'div',
      { class: 'hud__tower tower' },
      h('div', { class: 'tower__head' }, h('span', { class: 'tower__brand', text: 'ÁPICE' }), this.lapLabel),
      this.standings.element,
    );

    const timing = h(
      'div',
      { class: 'hud__timing timing' },
      h('div', { class: 'timing__head' }, this.place, this.status),
      h('div', { class: 'timing__main' }, this.lapTime, this.delta),
      h('div', { class: 'timing__sectors' }, ...this.sectors),
      row('ÚLTIMA', this.lastValue),
      row('MEJOR', this.bestValue),
      row('RÉCORD', this.pbValue),
      this.medalRow,
      this.flag,
    );

    const dash = h(
      'div',
      { class: 'hud__dash dash' },
      this.ledBar,
      h(
        'div',
        { class: 'dash__body' },
        h(
          'div',
          { class: 'dash__pedals' },
          h('span', { class: 'dash__pedal' }, this.throttleBar),
          h('span', { class: 'dash__pedal' }, this.brakeBar),
        ),
        this.gear,
        h('div', { class: 'dash__speedo' }, this.speed, this.unitLabel),
      ),
    );

    const assistsPanel = h(
      'div',
      { class: 'hud__mfd mfd' },
      this.carPanel,
      h('span', { class: 'mfd__title', text: 'AYUDAS' }),
      h('div', { class: 'dash__flags' }, this.drs, this.brakeAid, this.tc, this.abs, this.stability),
    );

    // Semáforo: 5 columnas de 2 luces, como el del pórtico.
    for (let c = 0; c < LIGHT_COUNT; c++) {
      const column = h('span', { class: 'hud__lights-column' });
      for (let r = 0; r < 2; r++) {
        const lamp = h('span', { class: 'hud__lamp' });
        this.lamps.push(lamp);
        column.append(lamp);
      }
      this.lights.append(column);
    }

    this.root = h(
      'div',
      { class: 'hud' },
      tower,
      timing,
      this.minimap.element,
      this.tow,
      dash,
      assistsPanel,
      this.lights,
      this.messages,
      this.radioBox,
      this.wrongWay,
      this.cameraLabel,
      this.mirror,
      this.pitBox,
    );
    setText(this.unitLabel, units === 'kmh' ? 'KM/H' : 'MPH');
  }

  /**
   * Neumáticos y alerón (colores según el desgaste y el daño) y el pedido de
   * boxes. null = sin desgaste en esta sesión (contrarreloj): no se muestra.
   */
  setCar(state: { wear: number; damage: number; boxRequested: boolean } | null): void {
    const key = state ? `${Math.round(state.wear * 100)}|${Math.round(state.damage * 100)}|${state.boxRequested}` : 'off';
    if (key === this.carKey) return;
    this.carKey = key;
    toggle(this.carPanel, 'is-visible', state !== null);
    if (!state) return;
    const tyreTone = state.wear < 0.45 ? 'good' : state.wear < 0.72 ? 'warn' : 'bad';
    const wingTone = state.damage < 0.1 ? 'good' : state.damage < 0.4 ? 'warn' : 'bad';
    this.carIcon.dataset.tyres = tyreTone;
    this.carIcon.dataset.wing = wingTone;
    setText(this.tyreValue, `${Math.round((1 - state.wear) * 100)} %`);
    setText(this.wingValue, state.damage < 0.02 ? 'OK' : `${Math.round((1 - state.damage) * 100)} %`);
    this.tyreValue.dataset.tone = tyreTone;
    this.wingValue.dataset.tone = wingTone;
    toggle(this.boxChip, 'is-on', state.boxRequested);
  }

  /**
   * Panel de la parada en boxes, como el de la transmisión (null = no está en
   * boxes): título, detalle, el reloj de la parada (`timer`, con su color:
   * en vivo, récord, buena o lenta) y `progress` 0–1 durante el servicio.
   */
  setPit(state: HudPit | null): void {
    toggle(this.pitBox, 'is-visible', state !== null);
    toggle(this.root, 'has-pit', state !== null);
    if (!state) {
      this.pitKey = '';
      return;
    }
    const key = `${state.title}|${state.detail}|${state.tone}`;
    if (key !== this.pitKey) {
      this.pitKey = key;
      setText(this.pitTitle, state.title);
      setText(this.pitDetail, state.detail);
      this.pitBox.dataset.tone = state.tone;
    }
    toggle(this.pitBox, 'has-timer', state.timer !== null);
    if (state.timer !== null) setText(this.pitTimer, state.timer);
    toggle(this.pitBox, 'has-progress', state.progress !== null);
    if (state.progress !== null) setTransform(this.pitBar, `scaleX(${Math.max(0, Math.min(1, state.progress)).toFixed(3)})`);
  }

  /** Vueltas totales (null en práctica) y ayudas con ícono en el tablero. */
  configure(totalLaps: number | null, assists: HudAssists): void {
    this.totalLaps = totalLaps;
    toggle(this.brakeAid, 'is-enabled', assists.braking);
    toggle(this.tc, 'is-enabled', assists.traction);
    toggle(this.abs, 'is-enabled', assists.abs);
    toggle(this.stability, 'is-enabled', assists.stability);
  }

  setUnits(units: SpeedUnit): void {
    this.units = units;
    setText(this.unitLabel, units === 'kmh' ? 'KM/H' : 'MPH');
  }

  update(state: HudState): void {
    // Tablero.
    const speed = this.units === 'kmh' ? state.speed * 3.6 : state.speed * 2.23694;
    setText(this.speed, String(Math.round(speed)));
    if (state.gear !== this.lastGear) {
      setText(this.gear, state.gear < 0 ? 'R' : state.gear === 0 ? 'N' : String(state.gear));
      if (!Number.isNaN(this.lastGear) && !prefersReducedMotion()) {
        this.own.tween(gsap.fromTo(this.gear, { scale: 1.25 }, { scale: 1, duration: 0.25, ease: 'back.out(3)', overwrite: true }));
      }
      this.lastGear = state.gear;
    }
    const lit = Math.round(Math.max(0, Math.min(1, state.shift)) * LED_COUNT);
    this.leds.forEach((led, i) => toggle(led, 'is-on', i < lit));
    toggle(this.ledBar, 'is-limiter', state.limiter);
    setTransform(this.throttleBar, `scaleY(${state.throttle.toFixed(2)})`);
    setTransform(this.brakeBar, `scaleY(${state.brake.toFixed(2)})`);
    toggle(this.drs, 'is-armed', state.drs === 'armed');
    toggle(this.drs, 'is-available', state.drs === 'available');
    toggle(this.drs, 'is-open', state.drs === 'open');
    toggle(this.tc, 'is-active', state.tcActive);
    toggle(this.abs, 'is-active', state.absActive);
    toggle(this.brakeAid, 'is-active', state.brakeAssistActive);
    toggle(this.stability, 'is-active', state.stabilityActive);

    // Tiempos.
    const total = this.totalLaps;
    setText(
      this.lapLabel,
      state.onGrid
        ? 'PARRILLA DE SALIDA'
        : state.lap === 0
          ? 'VUELTA DE SALIDA'
          : total === null
            ? `VUELTA ${state.lap}`
            : `VUELTA ${Math.min(state.lap, total)}/${total}`,
    );
    setText(this.lapTime, state.lapTime === null ? '–:––.–––' : formatLapTime(state.lapTime));
    this.updateStatus(state);
    if (state.delta === null) {
      setText(this.delta, '');
      toggle(this.delta, 'is-visible', false);
    } else {
      setText(this.delta, formatDelta(state.delta, 2));
      toggle(this.delta, 'is-visible', true);
      toggle(this.delta, 'is-slower', state.delta > 0);
    }
    setText(this.lastValue, state.lastLap === null ? '–:––.–––' : formatLapTime(state.lastLap));
    setText(this.bestValue, state.bestLap === null ? '–:––.–––' : formatLapTime(state.bestLap));
    setText(this.pbValue, state.personalBest === null ? '–:––.–––' : formatLapTime(state.personalBest));

    this.minimap.setCar(state.x, state.z);
    toggle(this.tow, 'is-visible', state.slipstream > 0.3);
    if (state.position !== null && state.position !== this.lastPlace) {
      // Cada puesto ganado o perdido hace "saltar" el número.
      const gained = this.lastPlace > 0 && state.position < this.lastPlace;
      const lost = this.lastPlace > 0 && state.position > this.lastPlace;
      this.lastPlace = state.position;
      setText(this.placeValue, String(state.position));
      if ((gained || lost) && !prefersReducedMotion()) {
        this.own.tween(
          gsap.fromTo(
            this.placeValue,
            { scale: 1.45, color: gained ? '#27e06b' : '#ff3b4a' },
            { scale: 1, color: '#ffffff', duration: 0.6, ease: 'back.out(2.4)', overwrite: true },
          ),
        );
      }
    }
    toggle(this.wrongWay, 'is-visible', state.wrongWay);
  }

  /**
   * Banderas: los sectores amarillos en el minimapa y, debajo de los tiempos,
   * la que le toca al jugador (la más importante).
   */
  setFlags(flags: HudFlags): void {
    this.minimap.setYellow(flags.yellow);
    const kind = flags.blue ? 'blue' : flags.yellowHere !== null ? 'yellow' : flags.blackWhite ? 'blackWhite' : '';
    const text = flags.blue
      ? `AZUL · DEJA PASAR A ${flags.blue}`
      : flags.yellowHere !== null
        ? `AMARILLA · SECTOR ${flags.yellowHere + 1}`
        : flags.blackWhite
          ? 'BLANCA Y NEGRA · LÍMITES'
          : '';
    const key = `${kind}|${text}`;
    if (key === this.flagKey) return;
    this.flagKey = key;
    setText(this.flagText, text);
    this.flag.dataset.flag = kind;
    toggle(this.flag, 'is-visible', kind !== '');
  }

  /** Distintivo junto a la posición: sanción, advertencias o vuelta sin récord. */
  private updateStatus(state: HudState): void {
    let text = '';
    let tone = '';
    if (state.penalty > 0) {
      text = `+${state.penalty} s`;
      tone = 'is-penalty';
    } else if (state.warnings !== null && state.warnings > 0) {
      text = `⚠ ${state.warnings}/${TRACK_LIMIT_WARNINGS}`;
      tone = 'is-warning';
    } else if (state.warnings === null && state.lap > 0 && !state.lapValid) {
      text = 'SIN RÉCORD';
      tone = 'is-warning';
    }
    setText(this.status, text);
    toggle(this.status, 'is-visible', text !== '');
    toggle(this.status, 'is-penalty', tone === 'is-penalty');
    toggle(this.status, 'is-warning', tone === 'is-warning');
  }

  /** Colorea un sector (violeta = mejor de la sesión, amarillo = más lento). */
  setSector(index: number, result: SectorResult | null): void {
    const sector = this.sectors[index];
    if (!sector) return;
    sector.classList.remove('is-best', 'is-slower', 'is-done');
    if (result) sector.classList.add('is-done', result === 'best' ? 'is-best' : 'is-slower');
  }

  clearSectors(): void {
    for (let i = 0; i < this.sectors.length; i++) this.setSector(i, null);
  }

  /** Aviso central que se desvanece solo. */
  message(title: string, detail: string, tone: MessageTone = 'info'): void {
    const element = h(
      'div',
      { class: `hud__message hud__message--${tone}` },
      h('span', { class: 'hud__message-title', text: title }),
      detail ? h('span', { class: 'hud__message-detail', text: detail }) : null,
    );
    this.messages.append(element);
    // Máximo tres avisos a la vez.
    while (this.messages.children.length > 3) this.messages.firstElementChild?.remove();
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ onComplete: () => element.remove() });
    tl.fromTo(element, { y: 16, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: quick ? 0.01 : 0.35, ease: 'back.out(2)' });
    tl.to(element, { opacity: 0, y: -10, duration: quick ? 0.01 : 0.4, ease: 'power2.in' }, '+=2.4');
    this.own.tween(tl);
  }

  /** Enciende `lit` luces del semáforo en pantalla (0 = apagado). */
  setLights(lit: number): void {
    toggle(this.lights, 'is-visible', lit > 0);
    toggle(this.root, 'has-lights', lit > 0);
    this.lamps.forEach((lamp, i) => {
      const on = Math.floor(i / 2) < lit;
      if (on && !lamp.classList.contains('is-on') && !prefersReducedMotion()) {
        this.own.tween(gsap.fromTo(lamp, { scale: 1.35 }, { scale: 1, duration: 0.25, ease: 'power2.out' }));
      }
      toggle(lamp, 'is-on', on);
    });
  }

  /** ¡Apagadas! Las luces se apagan de golpe y el semáforo sale de pantalla. */
  lightsOut(): void {
    for (const lamp of this.lamps) toggle(lamp, 'is-on', false);
    const quick = prefersReducedMotion();
    this.own.tween(
      gsap.to(this.lights, {
        opacity: 0,
        y: -20,
        duration: quick ? 0.01 : 0.5,
        delay: quick ? 0 : 0.6,
        ease: 'power2.in',
        onComplete: () => {
          toggle(this.lights, 'is-visible', false);
          toggle(this.root, 'has-lights', false);
          gsap.set(this.lights, { clearProps: 'opacity,transform' });
        },
      }),
    );
    this.message('¡APAGADAS!', '', 'gold');
  }

  /** Mensaje de radio del equipo: aparece, se escribe letra por letra y se va. */
  radio(from: string, text: string): void {
    this.radioTimeline?.kill();
    this.radioFrom.textContent = from;
    const quick = prefersReducedMotion();
    const typing = { chars: quick ? text.length : 0 };
    this.radioText.textContent = quick ? text : '';
    const tl = gsap.timeline();
    tl.fromTo(this.radioBox, { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: quick ? 0.01 : 0.35, ease: 'power3.out' });
    if (!quick) {
      tl.to(typing, {
        chars: text.length,
        duration: text.length / RADIO_TYPE_SPEED,
        ease: 'none',
        onUpdate: () => {
          this.radioText.textContent = text.slice(0, Math.round(typing.chars));
        },
      });
    }
    tl.to(this.radioBox, { x: -20, opacity: 0, duration: quick ? 0.01 : 0.4, ease: 'power2.in' }, '+=3.2');
    this.radioTimeline = tl;
    this.own.tween(tl);
  }

  /** Nombre de la cámara al cambiarla. */
  showCamera(label: string): void {
    setText(this.cameraLabel, label);
    this.own.tween(
      gsap.fromTo(
        this.cameraLabel,
        { opacity: 1 },
        { opacity: 0, duration: 0.5, delay: 1.2, ease: 'power2.in', overwrite: true },
      ),
    );
  }

  /**
   * Carrera con rivales: cantidad de autos (para "P3/12") y colores de los
   * rivales en el minimapa. `null` = sin rivales (práctica).
   */
  configureRace(cars: { count: number; rivalColors: readonly string[] } | null): void {
    toggle(this.place, 'is-visible', cars !== null);
    this.standings.setVisible(cars !== null);
    this.lastPlace = 0;
    setText(this.placeTotal, cars ? `/${cars.count}` : '');
    this.minimap.setRivalColors(cars?.rivalColors ?? []);
  }

  /** Torre de posiciones (tabla completa, del primero al último). */
  updateStandings(rows: readonly StandingRow[]): void {
    this.standings.update(rows);
  }

  /** Rivales en el minimapa (en el mismo orden que sus colores). */
  setRivals(cars: readonly MinimapCar[]): void {
    this.minimap.setRivals(cars);
  }

  /** Entrada animada del HUD. */
  reveal(): void {
    const quick = prefersReducedMotion();
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: quick ? 0.01 : 0.6 } });
    tl.from(this.root.querySelector('.hud__tower'), { x: -60, opacity: 0 }, 0);
    tl.from(this.root.querySelector('.hud__timing'), { x: 60, opacity: 0 }, 0.05);
    tl.from(this.minimap.element, { x: -60, opacity: 0 }, 0.08);
    tl.from(this.root.querySelector('.hud__dash'), { y: 60, opacity: 0 }, 0.12);
    tl.from(this.root.querySelector('.hud__mfd'), { x: 60, opacity: 0 }, 0.14);
    this.own.tween(tl);
  }

  setVisible(visible: boolean): void {
    toggle(this.root, 'is-hidden', !visible);
  }

  /**
   * Próxima medalla del circuito: "ORO 1:30.100" con el color de la medalla,
   * o null para ocultar la fila (en carrera, o con el platino ya ganado).
   */
  setMedalTarget(target: { label: string; color: string; time: number } | null): void {
    toggle(this.medalRow, 'is-visible', target !== null);
    if (!target) return;
    setText(this.medalLabel, target.label.toUpperCase());
    setText(this.medalValue, formatLapTime(target.time));
    this.medalRow.style.setProperty('--tone', target.color);
  }

  /** Muestra u oculta el retrovisor (los avisos de arriba se corren para no taparse). */
  setMirror(visible: boolean): void {
    toggle(this.root, 'has-mirror', visible);
  }

  /**
   * Quién viene detrás: código, color y distancia (null = nadie cerca o sin rivales).
   * @param gap segundos detrás (null si todavía no se puede medir)
   */
  setMirrorBehind(behind: { code: string; color: string; gap: number | null } | null): void {
    toggle(this.mirror, 'is-alone', behind === null);
    setText(this.mirrorBehind, behind ? behind.code : 'NADIE CERCA');
    this.mirrorBehind.style.setProperty('--team', behind?.color ?? 'transparent');
    // Pegado (rueda a rueda o en la largada) no se escribe "a 0.0 s".
    setText(this.mirrorGap, behind && behind.gap !== null ? (behind.gap < 0.05 ? 'pegado' : `a ${behind.gap.toFixed(1)} s`) : '');
  }

  dispose(): void {
    this.own.dispose();
    this.root.remove();
  }
}
