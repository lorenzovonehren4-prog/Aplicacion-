import { describe, expect, it } from 'vitest';
import { PerformanceGovernor, type GovernorDecision, type GovernorState } from '../src/core/render/PerformanceGovernor';

/** Simula `seconds` de juego a `fps` constantes y aplica cada decisión al estado. */
function run(
  governor: PerformanceGovernor,
  state: GovernorState,
  fps: number,
  seconds: number,
  stopAtFirst = false,
): GovernorDecision[] {
  const decisions: GovernorDecision[] = [];
  const frame = 1 / fps;
  for (let t = 0; t < seconds; t += frame) {
    const decision = governor.sample(frame, state);
    if (!decision) continue;
    decisions.push(decision);
    state.resolutionScale = decision.scale;
    if (decision.kind === 'quality') state.quality = decision.quality;
    if (stopAtFirst) break;
  }
  return decisions;
}

describe('PerformanceGovernor', () => {
  it('no toca nada si se cumple el objetivo', () => {
    const state: GovernorState = { quality: 'high', resolutionScale: 1, fpsTarget: 60 };
    expect(run(new PerformanceGovernor(), state, 60, 60)).toEqual([]);
  });

  it('ignora el calentamiento inicial', () => {
    const state: GovernorState = { quality: 'high', resolutionScale: 1, fpsTarget: 60 };
    expect(run(new PerformanceGovernor(), state, 20, 2.5)).toEqual([]);
  });

  it('baja primero la calidad (con la resolución entera) y la resolución sólo en Baja, hasta 80 %', () => {
    const state: GovernorState = { quality: 'high', resolutionScale: 1, fpsTarget: 60 };
    const decisions = run(new PerformanceGovernor(), state, 25, 60);
    expect(decisions[0]).toEqual({ kind: 'quality', quality: 'medium', scale: 1 });
    expect(decisions[1]).toEqual({ kind: 'quality', quality: 'low', scale: 1 });
    expect(decisions[2]).toEqual({ kind: 'resolution', scale: 0.9 });
    expect(decisions[3]).toEqual({ kind: 'resolution', scale: 0.8 });
    // Termina en el mínimo: calidad Baja y 80 %, sin seguir pidiendo cambios (nunca borroso).
    expect(state.quality).toBe('low');
    expect(state.resolutionScale).toBeCloseTo(0.8);
    expect(run(new PerformanceGovernor(), state, 25, 30)).toEqual([]);
  });

  it('respeta el objetivo de 30 FPS', () => {
    const state: GovernorState = { quality: 'medium', resolutionScale: 1, fpsTarget: 30 };
    expect(run(new PerformanceGovernor(), state, 30, 60)).toEqual([]);
  });

  it('recupera resolución si sobra y no oscila si la subida falla', () => {
    const governor = new PerformanceGovernor();
    const state: GovernorState = { quality: 'low', resolutionScale: 0.8, fpsTarget: 60 };
    const up = run(governor, state, 60, 40, true);
    expect(up).toEqual([{ kind: 'resolution', scale: 0.85 }]);
    // A la resolución nueva no llega: vuelve a bajar y ya no vuelve a subir.
    const down = run(governor, state, 40, 8);
    expect(down).toEqual([{ kind: 'resolution', scale: 0.8 }]);
    expect(run(governor, state, 60, 120)).toEqual([]);
    expect(state.resolutionScale).toBe(0.8);
  });
});
