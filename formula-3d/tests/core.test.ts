import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import { FIXED_STEP, GameLoop, type LoopScheduler } from '../src/core/GameLoop';
import { InputManager } from '../src/core/input/InputManager';
import type { UiAction } from '../src/core/input/actions';
import { detectQuality, shadowMapSize } from '../src/core/render/quality';
import { Disposer } from '../src/core/utils/Disposer';
import { formatDelta, formatInteger, formatLapTime, formatPercent } from '../src/core/utils/format';
import { clamp, damp, lerp } from '../src/core/utils/math';
import { levelProgress, MAX_LEVEL, xpToNextLevel } from '../src/progression/levels';

describe('matemáticas', () => {
  it('funciones básicas', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('damp da el mismo resultado a distintos FPS', () => {
    let at30 = 0;
    for (let i = 0; i < 30; i++) at30 = damp(at30, 1, 4, 1 / 30);
    let at144 = 0;
    for (let i = 0; i < 144; i++) at144 = damp(at144, 1, 4, 1 / 144);
    expect(at30).toBeCloseTo(at144, 10);
  });
});

describe('formato', () => {
  it('usa separador de miles de Perú', () => {
    expect(formatInteger(12500)).toBe('12,500');
    expect(formatPercent(0.855)).toBe('86 %');
  });

  it('formatea tiempos de vuelta y deltas', () => {
    expect(formatLapTime(83.456)).toBe('1:23.456');
    expect(formatLapTime(65.0004)).toBe('1:05.000');
    expect(formatLapTime(9.5)).toBe('9.500');
    expect(formatLapTime(59.9996)).toBe('1:00.000');
    expect(formatDelta(0.2341)).toBe('+0.234');
    expect(formatDelta(-1.5)).toBe('−1.500');
  });
});

describe('EventBus', () => {
  interface Events {
    ping: { n: number };
    pong: undefined;
  }

  it('entrega, desuscribe y aísla errores', () => {
    const bus = new EventBus<Events>();
    const got: number[] = [];
    const off = bus.on('ping', ({ n }) => got.push(n));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    bus.on('ping', () => {
      throw new Error('listener roto');
    });
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(got).toEqual([1]);
    expect(errorSpy).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('once escucha una sola vez', () => {
    const bus = new EventBus<Events>();
    const spy = vi.fn();
    bus.once('pong', spy);
    bus.emit('pong', undefined);
    bus.emit('pong', undefined);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('pong')).toBe(0);
  });
});

describe('Disposer', () => {
  it('libera en orden inverso y sigue aunque una limpieza falle', () => {
    const order: number[] = [];
    const d = new Disposer();
    d.add(() => order.push(1));
    d.add(() => {
      throw new Error('x');
    });
    d.own({ dispose: () => order.push(3) });
    d.tween({ kill: () => order.push(4) });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    d.dispose();
    d.dispose();
    expect(order).toEqual([4, 3, 1]);
    expect(d.isDisposed).toBe(true);
    // Lo que llega tarde se libera al instante.
    d.add(() => order.push(5));
    expect(order.at(-1)).toBe(5);
    errorSpy.mockRestore();
  });

  it('quita listeners del DOM', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const d = new Disposer();
    d.listen(target as unknown as HTMLElement, 'click', handler);
    target.dispatchEvent(new Event('click'));
    d.dispose();
    target.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('curva de niveles', () => {
  it('valores de referencia del PLAN', () => {
    expect(xpToNextLevel(1)).toBe(600);
    expect(xpToNextLevel(10)).toBe(2100);
    expect(xpToNextLevel(50)).toBe(11150);
    expect(xpToNextLevel(99)).toBe(24000);
    expect(xpToNextLevel(MAX_LEVEL)).toBe(0);
    expect(xpToNextLevel(0)).toBe(0);
  });

  it('es creciente', () => {
    for (let n = 1; n < MAX_LEVEL - 1; n++) expect(xpToNextLevel(n + 1)).toBeGreaterThanOrEqual(xpToNextLevel(n));
  });

  it('progreso para la barra de XP', () => {
    expect(levelProgress(1, 300)).toMatchObject({ needed: 600, fraction: 0.5, isMax: false });
    expect(levelProgress(100, 0)).toMatchObject({ fraction: 1, isMax: true });
  });
});

describe('calidad gráfica', () => {
  it('detecta la calidad inicial', () => {
    expect(detectQuality({ hardwareConcurrency: 16 })).toBe('high');
    expect(detectQuality({ hardwareConcurrency: 4 })).toBe('medium');
    expect(detectQuality({ hardwareConcurrency: 12, isMobile: true })).toBe('medium');
  });

  it('tamaño del mapa de sombras', () => {
    expect(shadowMapSize('off', 'ultra')).toBe(0);
    expect(shadowMapSize('low', 'high')).toBe(1024);
    expect(shadowMapSize('high', 'high')).toBe(2048);
    expect(shadowMapSize('high', 'ultra')).toBe(4096);
  });
});

describe('GameLoop', () => {
  function manualScheduler(): LoopScheduler & { fire(time: number): void } {
    let pending: ((time: number) => void) | null = null;
    return {
      request: (cb) => {
        pending = cb;
        return 1;
      },
      cancel: () => {
        pending = null;
      },
      fire(time: number) {
        const cb = pending;
        pending = null;
        cb?.(time);
      },
    };
  }

  it('ejecuta pasos fijos de 120 Hz sin importar los FPS', () => {
    const fixed = vi.fn();
    const update = vi.fn();
    const render = vi.fn();
    const scheduler = manualScheduler();
    const loop = new GameLoop({ fixedUpdate: fixed, update, render }, scheduler);
    loop.start();
    scheduler.fire(0);
    // Un segundo a 30 FPS.
    for (let i = 1; i <= 30; i++) scheduler.fire((i * 1000) / 30);
    expect(fixed.mock.calls.length).toBeGreaterThanOrEqual(119);
    expect(fixed.mock.calls.length).toBeLessThanOrEqual(120);
    expect(fixed).toHaveBeenCalledWith(FIXED_STEP);
    expect(render).toHaveBeenCalledTimes(31);
    const alpha = update.mock.calls.at(-1)?.[1] as number;
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
  });

  it('acota el dt al volver de una pestaña oculta', () => {
    const fixed = vi.fn();
    const loop = new GameLoop({ fixedUpdate: fixed, update: vi.fn(), render: vi.fn() }, manualScheduler());
    loop.frame(0);
    loop.frame(10_000);
    expect(fixed.mock.calls.length).toBeLessThanOrEqual(12);
  });

  it('limita a 30 FPS en un monitor de 60 Hz y a ~60 en uno de 144 Hz', () => {
    const count = (target: 30 | 60, hz: number) => {
      const render = vi.fn();
      const loop = new GameLoop({ update: vi.fn(), render }, manualScheduler());
      loop.setFpsTarget(target);
      for (let i = 0; i <= hz * 2; i++) loop.frame((i * 1000) / hz);
      // El primer fotograma (t = 0) sólo arranca la cuenta.
      return (render.mock.calls.length - 1) / 2;
    };
    expect(count(30, 60)).toBe(30);
    expect(count(60, 60)).toBe(60);
    const at144 = count(60, 144);
    expect(at144).toBeGreaterThan(54);
    expect(at144).toBeLessThanOrEqual(72);
  });

  it('mide los FPS', () => {
    const loop = new GameLoop({ update: vi.fn(), render: vi.fn() }, manualScheduler());
    for (let i = 0; i <= 120; i++) loop.frame((i * 1000) / 60);
    expect(loop.fps).toBeCloseTo(60, 0);
    expect(loop.frameMs).toBeCloseTo(16.67, 1);
  });
});

describe('InputManager', () => {
  function key(type: 'keydown' | 'keyup', code: string, extra: Partial<KeyboardEvent> = {}): Event {
    return Object.assign(new Event(type, { cancelable: true }), {
      code,
      key: code,
      repeat: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      ...extra,
    });
  }

  function fakePad(pressed: number[], axes: number[] = [0, 0]): Gamepad {
    return {
      connected: true,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: false, value: 0 })),
    } as unknown as Gamepad;
  }

  it('traduce teclas a acciones y evita la acción por defecto', () => {
    const target = new EventTarget();
    const input = new InputManager(target as unknown as Window, { getGamepads: () => [] });
    const actions: UiAction[] = [];
    input.onAction((a) => actions.push(a));
    const down = key('keydown', 'ArrowDown');
    target.dispatchEvent(down);
    target.dispatchEvent(key('keydown', 'Enter'));
    target.dispatchEvent(key('keydown', 'Escape'));
    target.dispatchEvent(key('keydown', 'KeyE'));
    target.dispatchEvent(key('keydown', 'KeyZ'));
    expect(actions).toEqual(['down', 'confirm', 'back', 'tabNext']);
    expect(down.defaultPrevented).toBe(true);
    input.dispose();
  });

  it('repite direcciones al mantener, pero no confirmar', () => {
    const target = new EventTarget();
    const input = new InputManager(target as unknown as Window, { getGamepads: () => [] });
    const actions: UiAction[] = [];
    input.onAction((a) => actions.push(a));
    target.dispatchEvent(key('keydown', 'ArrowUp', { repeat: true }));
    target.dispatchEvent(key('keydown', 'Enter', { repeat: true }));
    expect(actions).toEqual(['up']);
  });

  it('ignora atajos con Ctrl y las modificadoras para "cualquier tecla"', () => {
    const target = new EventTarget();
    const input = new InputManager(target as unknown as Window, { getGamepads: () => [] });
    const any = vi.fn();
    const actions: UiAction[] = [];
    input.onAnyInput(any);
    input.onAction((a) => actions.push(a));
    target.dispatchEvent(key('keydown', 'KeyR', { ctrlKey: true }));
    target.dispatchEvent(Object.assign(key('keydown', 'ShiftLeft'), { key: 'Shift' }));
    expect(any).not.toHaveBeenCalled();
    target.dispatchEvent(key('keydown', 'KeyZ'));
    expect(any).toHaveBeenCalledTimes(1);
    expect(actions).toEqual([]);
  });

  it('gamepad: flancos, repetición al mantener y cambio de dispositivo', () => {
    let pad = fakePad([]);
    const input = new InputManager(new EventTarget() as unknown as Window, { getGamepads: () => [null, pad] });
    const actions: UiAction[] = [];
    const devices: string[] = [];
    input.onAction((a) => actions.push(a));
    input.onDeviceChange((d) => devices.push(d));

    pad = fakePad([0]);
    input.update(0);
    input.update(16);
    expect(actions).toEqual(['confirm']);

    pad = fakePad([], [0, 0.9]);
    input.update(100);
    input.update(300); // antes del retardo de repetición
    input.update(500); // primera repetición
    input.update(620); // segunda
    expect(actions).toEqual(['confirm', 'down', 'down', 'down']);
    expect(devices).toEqual(['gamepad']);
    expect(input.gamepadConnected).toBe(true);
  });
});
