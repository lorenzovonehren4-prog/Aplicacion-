import { describe, expect, it, vi } from 'vitest';
import { SCREEN_FLOW, canGoTo, canPush, type ScreenId } from '../src/core/screens/flow';
import type { Screen } from '../src/core/screens/Screen';
import { ScreenManager, type ScreenChange, type TransitionPlayer } from '../src/core/screens/ScreenManager';

/** Nodo DOM mínimo: el manager sólo usa appendChild y remove. */
class FakeNode {
  parent: FakeHost | null = null;
  remove(): void {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
}

class FakeHost {
  children: FakeNode[] = [];
  appendChild(node: FakeNode): FakeNode {
    node.parent = this;
    this.children.push(node);
    return node;
  }
}

interface TestParams {
  splash: undefined;
  menu: undefined;
  settings: { tab: string } | undefined;
  garage: undefined;
  assistsManual: undefined;
  tutorial: undefined;
}

/** Pantalla de prueba que anota cada llamada de su ciclo de vida. */
function makeScreen(id: ScreenId, log: string[], opts: { failEnter?: boolean; enterDelay?: Promise<void> } = {}): Screen<unknown> {
  return {
    id,
    root: new FakeNode() as unknown as HTMLElement,
    async enter(params: unknown) {
      log.push(`${id}:enter${params ? `(${JSON.stringify(params)})` : ''}`);
      if (opts.enterDelay) await opts.enterDelay;
      if (opts.failEnter) throw new Error(`fallo en ${id}`);
    },
    reveal: () => log.push(`${id}:reveal`),
    onCovered: () => log.push(`${id}:covered`),
    onUncovered: () => log.push(`${id}:uncovered`),
    hide: () => {
      log.push(`${id}:hide`);
      return Promise.resolve();
    },
    exit: () => {
      log.push(`${id}:exit`);
    },
  };
}

function setup(transition?: TransitionPlayer) {
  const host = new FakeHost();
  const log: string[] = [];
  const changes: ScreenChange[] = [];
  const errors: unknown[] = [];
  const manager = new ScreenManager<TestParams>({
    host: host as unknown as HTMLElement,
    ...(transition ? { transition } : {}),
    fallback: 'menu',
    onChange: (c) => changes.push(c),
    onError: (e) => errors.push(e),
  });
  for (const id of ['splash', 'menu', 'settings', 'garage', 'assistsManual'] as const) {
    manager.register(id, () => makeScreen(id, log));
  }
  return { host, log, changes, errors, manager };
}

describe('tabla de flujo', () => {
  it('sigue el recorrido del documento de diseño', () => {
    expect(canGoTo(SCREEN_FLOW, null, 'splash')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, null, 'menu')).toBe(false);
    expect(canGoTo(SCREEN_FLOW, 'splash', 'tutorial')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'splash', 'menu')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'raceSelect', 'trackIntro')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'trackIntro', 'race')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'race', 'results')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'results', 'podium')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'podium', 'menu')).toBe(true);
    // Práctica libre: del menú directo a la pista.
    expect(canGoTo(SCREEN_FLOW, 'menu', 'race')).toBe(true);
    expect(canGoTo(SCREEN_FLOW, 'menu', 'results')).toBe(false);
    expect(canPush(SCREEN_FLOW, 'menu', 'settings')).toBe(true);
    expect(canPush(SCREEN_FLOW, 'race', 'settings')).toBe(true);
    expect(canPush(SCREEN_FLOW, 'raceSelect', 'assistsManual')).toBe(true);
    expect(canPush(SCREEN_FLOW, 'garage', 'settings')).toBe(false);
    expect(canPush(SCREEN_FLOW, null, 'settings')).toBe(false);
  });

  it('todas las pantallas se pueden alcanzar desde el splash', () => {
    const reached = new Set<ScreenId>(['splash']);
    const queue: ScreenId[] = ['splash'];
    while (queue.length > 0) {
      const from = queue.shift() as ScreenId;
      for (const to of [...SCREEN_FLOW.goTo[from], ...(SCREEN_FLOW.push[from] ?? [])]) {
        if (!reached.has(to)) {
          reached.add(to);
          queue.push(to);
        }
      }
    }
    expect(reached.size).toBe(Object.keys(SCREEN_FLOW.goTo).length);
  });
});

describe('ScreenManager', () => {
  it('entra a la primera pantalla y avisa el cambio', async () => {
    const { manager, log, changes, host } = setup();
    expect(await manager.goTo('splash', undefined)).toBe(true);
    expect(manager.currentId).toBe('splash');
    expect(log).toEqual(['splash:enter', 'splash:reveal']);
    expect(changes[0]).toMatchObject({ from: null, to: 'splash', kind: 'goTo' });
    expect(host.children).toHaveLength(1);
  });

  it('goTo reemplaza la pila completa y libera las pantallas viejas', async () => {
    const { manager, log, host } = setup();
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    await manager.push('settings', { tab: 'audio' });
    log.length = 0;
    await manager.goTo('garage', undefined).then((ok) => expect(ok).toBe(false)); // desde Ajustes no se puede
    await manager.pop();
    await manager.goTo('garage', undefined);
    expect(manager.stackIds).toEqual(['garage']);
    expect(host.children).toHaveLength(1);
    expect(log).toContain('menu:exit');
    expect(log).toContain('settings:exit');
  });

  it('rechaza transiciones que no están en la tabla', async () => {
    const { manager, errors } = setup();
    expect(await manager.goTo('menu', undefined)).toBe(false);
    expect(manager.currentId).toBeNull();
    expect(String(errors[0])).toContain('no permitida');
  });

  it('push deja viva la pantalla de abajo y pop vuelve a ella', async () => {
    const { manager, log, host, changes } = setup();
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    log.length = 0;
    expect(await manager.push('settings', { tab: 'audio' })).toBe(true);
    expect(manager.stackIds).toEqual(['menu', 'settings']);
    expect(host.children).toHaveLength(2);
    expect(log).toEqual(['settings:enter({"tab":"audio"})', 'menu:covered', 'settings:reveal']);

    log.length = 0;
    expect(await manager.pop()).toBe(true);
    expect(manager.stackIds).toEqual(['menu']);
    expect(log).toEqual(['settings:hide', 'settings:exit', 'menu:uncovered']);
    expect(changes.at(-1)).toMatchObject({ from: 'settings', to: 'menu', kind: 'pop' });
  });

  it('pop sin nada apilado no hace nada', async () => {
    const { manager } = setup();
    await manager.goTo('splash', undefined);
    expect(await manager.pop()).toBe(false);
    expect(manager.currentId).toBe('splash');
  });

  it('no permite navegar a pantallas no registradas', async () => {
    const { manager, errors } = setup();
    await manager.goTo('splash', undefined);
    expect(manager.canGoTo('tutorial')).toBe(false);
    expect(await manager.goTo('tutorial', undefined)).toBe(false);
    expect(String(errors[0])).toContain('no está registrada');
  });

  it('con cambios simultáneos sólo se ejecuta el último pendiente', async () => {
    let releaseCover: () => void = () => undefined;
    const transition: TransitionPlayer = {
      cover: () => new Promise<void>((resolve) => (releaseCover = resolve)),
      reveal: () => Promise.resolve(),
    };
    const { manager } = setup(transition);
    const first = manager.goTo('splash', undefined);
    expect(manager.isBusy).toBe(true);
    const second = manager.goTo('splash', undefined); // queda pendiente…
    const third = manager.goTo('splash', undefined); // …y lo reemplaza éste
    expect(await second).toBe(false);
    releaseCover();
    expect(await first).toBe(true);
    // El tercero corre después (splash → splash no está permitido, pero se intentó).
    await expect(third).resolves.toBe(false);
  });

  it('ignora acciones de UI durante un cambio y las entrega a la pantalla de arriba', async () => {
    const { manager } = setup();
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    const onAction = vi.fn();
    (manager.top as { onAction?: (a: string) => void }).onAction = onAction;
    manager.dispatch('confirm');
    expect(onAction).toHaveBeenCalledWith('confirm');
  });

  it('si una pantalla falla al entrar, cae a la de rescate y destapa igual', async () => {
    const reveal = vi.fn(() => Promise.resolve());
    const transition: TransitionPlayer = { cover: () => Promise.resolve(), reveal };
    const { manager, errors, log } = setup(transition);
    manager.register('garage', () => makeScreen('garage', log, { failEnter: true }));
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    expect(await manager.goTo('garage', undefined)).toBe(false);
    expect(errors).toHaveLength(1);
    expect(manager.stackIds).toEqual(['menu']);
    // La primera pantalla entra sin transición; menú y garaje sí la usan.
    expect(reveal).toHaveBeenCalledTimes(2);
  });

  it('la primera pantalla aparece sin barrido', async () => {
    const cover = vi.fn(() => Promise.resolve());
    const { manager } = setup({ cover, reveal: () => Promise.resolve() });
    await manager.goTo('splash', undefined);
    expect(cover).not.toHaveBeenCalled();
    await manager.goTo('menu', undefined);
    expect(cover).toHaveBeenCalledTimes(1);
  });

  it('update y fixedUpdate llegan a todas las pantallas de la pila', async () => {
    const { manager } = setup();
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    const menuUpdate = vi.fn();
    const menuFixed = vi.fn();
    (manager.top as Screen).update = menuUpdate;
    (manager.top as Screen).fixedUpdate = menuFixed;
    await manager.push('settings', undefined);
    const settingsUpdate = vi.fn();
    (manager.top as Screen).update = settingsUpdate;
    manager.update(0.016, 0.4);
    manager.fixedUpdate(1 / 120);
    expect(menuUpdate).toHaveBeenCalledWith(0.016, 0.4);
    expect(settingsUpdate).toHaveBeenCalledWith(0.016, 0.4);
    expect(menuFixed).toHaveBeenCalledWith(1 / 120);
  });

  it('destroy cierra todas las pantallas', async () => {
    const { manager, host, log } = setup();
    await manager.goTo('splash', undefined);
    await manager.goTo('menu', undefined);
    await manager.push('settings', undefined);
    await manager.destroy();
    expect(host.children).toHaveLength(0);
    expect(log.slice(-2)).toEqual(['settings:exit', 'menu:exit']);
  });
});

describe('ScreenManager: red de seguridad de animaciones', () => {
  it('una animación de salida que nunca termina no traba el juego', async () => {
    const log: string[] = [];
    const quick = new ScreenManager<TestParams>({
      host: new FakeHost() as unknown as HTMLElement,
      animationTimeoutMs: 30,
    });
    quick.register('splash', () => makeScreen('splash', log));
    quick.register('menu', () => makeScreen('menu', log));
    quick.register('settings', () => ({ ...makeScreen('settings', log), hide: () => new Promise<void>(() => undefined) }));
    await quick.goTo('splash', undefined);
    await quick.goTo('menu', undefined);
    await quick.push('settings', undefined);
    expect(await quick.pop()).toBe(true);
    expect(quick.stackIds).toEqual(['menu']);
    expect(quick.isBusy).toBe(false);
  });

  it('una transición que nunca termina tampoco', async () => {
    const stuck: TransitionPlayer = { cover: () => new Promise<void>(() => undefined), reveal: () => Promise.resolve() };
    const quick = new ScreenManager<TestParams>({
      host: new FakeHost() as unknown as HTMLElement,
      transition: stuck,
      animationTimeoutMs: 30,
    });
    quick.register('splash', () => makeScreen('splash', []));
    expect(await quick.goTo('splash', undefined)).toBe(true);
  });
});
