/**
 * levels/level-base.js — Clase base abstracta de todos los niveles.
 *
 * Contrato del documento maestro (§4). Un nivel es un módulo aislado: recibe un
 * contenedor, pinta lo que quiera dentro y avisa al anfitrión cuando el jugador
 * intenta una solución. El nivel NUNCA toca el estado global, el router, el
 * progreso ni las estrellas — de eso se encarga la pantalla de nivel.
 *
 * Para crear el nivel 31 basta con:
 *   1. `js/levels/level-31.js` exportando por defecto una subclase de LevelBase.
 *   2. Una entrada en `data/levels-meta.json` con `"implemented": true`.
 * No hay que tocar ni una línea del núcleo.
 */

import { createDisposer, clear } from '../utils/dom.js';

export class LevelBase {
  /**
   * @param {number} levelId
   * @param {HTMLElement} containerElement Área de puzzle, ya vacía.
   * @param {{
   *   meta?: object,
   *   host?: {
   *     attempt: (solution:any) => boolean,
   *     solve: (solution?:any) => void,
   *     feedback: (message:string, tone?:'info'|'error'|'success') => void,
   *     setPrompt: (text:string) => void,
   *   }
   * }} [context]
   */
  constructor(levelId, containerElement, context = {}) {
    if (new.target === LevelBase) {
      throw new TypeError('LevelBase es abstracta: extiéndela en level-NN.js');
    }

    this.levelId = Number(levelId);
    this.container = containerElement;
    this.meta = context.meta ?? {};
    this.host = context.host ?? createNullHost();

    /** Acumulador de limpiezas: empuja aquí todo `off` de listener. */
    this.disposer = createDisposer();

    this._destroyed = false;
  }

  /* ======================================================================
     Métodos que CADA nivel debe implementar
     ====================================================================== */

  /** Renderiza la UI del nivel y engancha sus eventos. */
  init() {
    throw new Error(`Nivel ${this.levelId}: init() sin implementar`);
  }

  /**
   * ¿Es correcta la solución propuesta?
   * @param {any} solution
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  validate(solution) {
    throw new Error(`Nivel ${this.levelId}: validate() sin implementar`);
  }

  /** Las 3 pistas, de vaga (#1) a casi-solución (#3). */
  getHints() {
    return [];
  }

  /* ======================================================================
     Métodos con valor por defecto razonable (sobrescribir si hace falta)
     ====================================================================== */

  /** Estado serializable del puzzle, para reanudar un intento. */
  getState() {
    return null;
  }

  /** Restaura el estado devuelto por getState(). */
  // eslint-disable-next-line no-unused-vars
  setState(_state) {}

  /** Tipo de puzzle (informativo; viene de los metadatos). */
  getType() {
    return this.meta.type ?? 'generico';
  }

  hasTimeLimit() {
    return Boolean(this.meta.timeLimit);
  }

  getTimeLimit() {
    return this.meta.timeLimit ?? null;
  }

  /**
   * Cómo debe pintar la pantalla la barra de respuesta:
   *   'none'    el puzzle se resuelve interactuando, sin campo (por defecto)
   *   'text'    campo de texto libre
   *   'numeric' campo numérico / código
   */
  getInputMode() {
    return 'none';
  }

  /** Configuración de la barra de respuesta cuando no es 'none'. */
  getInputConfig() {
    return {
      label: 'Introduce tu respuesta',
      placeholder: '',
      maxLength: 24,
      submitLabel: 'Enviar',
    };
  }

  /** Instrucción breve mostrada sobre el puzzle. */
  getPrompt() {
    return '';
  }

  /** Se llama cuando el límite de tiempo se agota (el nivel no falla). */
  onTimeExpired() {}

  /** Se llama tras validar con éxito, antes de mostrar el modal. */
  onSolved() {}

  /** Se llama tras un intento fallido. */
  onFailed() {}

  /** Limpia listeners y DOM. Siempre llamar a `super.destroy()`. */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.disposer.run();
    if (this.container) clear(this.container);
  }

  /* ======================================================================
     Utilidades para las subclases
     ====================================================================== */

  /**
   * Propone una solución al anfitrión: valida, cuenta el intento y dispara
   * el acierto o el error. Es la vía única — los niveles no deciden por su
   * cuenta que están resueltos.
   * @returns {boolean} si fue correcta
   */
  attempt(solution) {
    return this.host.attempt(solution);
  }

  /** Mensaje breve bajo el puzzle. */
  feedback(message, tone = 'info') {
    this.host.feedback(message, tone);
  }

  /** Cambia la instrucción mostrada sobre el puzzle. */
  setPrompt(text) {
    this.host.setPrompt(text);
  }

  /** Registra un listener y programa su retirada en destroy(). */
  listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.disposer.add(() => target.removeEventListener(event, handler, options));
    return this;
  }

  /** Añade nodos al área de puzzle. */
  mount(...nodes) {
    this.container.append(...nodes);
    return this;
  }
}

/** Anfitrión inerte: permite instanciar un nivel en pruebas sin pantalla. */
function createNullHost() {
  return {
    attempt: () => false,
    solve: () => {},
    feedback: () => {},
    setPrompt: () => {},
  };
}

export default LevelBase;
