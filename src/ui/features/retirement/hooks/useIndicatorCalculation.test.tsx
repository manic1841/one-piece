import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useIndicatorCalculation } from './useIndicatorCalculation';

/**
 * The rail is a preview, not a gate: an unparseable rule or event is dropped and
 * the sum continues, while a bad opening or assumption fails the whole refresh.
 * Those two halves are the contract this file pins down.
 */

interface DraftsOverrides {
  assumptions?: { ok: boolean; data?: unknown };
  rules?: { ok: boolean; data?: unknown };
  events?: { ok: boolean; data?: unknown };
}

const draftsOf = (overrides: DraftsOverrides = {}) =>
  ({
    validate: () => ({
      assumptions: overrides.assumptions ?? { ok: true, data: { birthYear: 1990 } },
      rules: overrides.rules ?? { ok: true, data: [{ id: 'rule-1' }] },
      events: overrides.events ?? { ok: true, data: [{ id: 'event-1' }] },
    }),
    opening: { source: 'manual', amountText: '1000' },
    startYear: 2026,
  }) as never;

const summary = { finalNetWorth: 10 } as never;

const calculateOf = () =>
  vi
    .fn()
    .mockResolvedValue({ ok: true, value: { ok: true, calculation: { result: { summary } } } });

const setup = (
  drafts = draftsOf(),
  validateOpening: () => string | undefined = () => undefined,
) => {
  const calculateProjection = calculateOf();
  let run: ReturnType<typeof useIndicatorCalculation>['run'];

  function Harness() {
    // eslint-disable-next-line react-hooks/globals
    run = useIndicatorCalculation({
      drafts,
      validateOpening,
      calculateProjection: calculateProjection as never,
    }).run;
    return <div />;
  }

  render(<Harness />);
  return { run: () => run(), calculateProjection };
};

describe('useIndicatorCalculation', () => {
  it('passes the parsed draft through and returns the summary', async () => {
    const { run, calculateProjection } = setup();

    await expect(act(async () => void (await run()))).resolves.toBeUndefined();

    expect(calculateProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        assumptions: { birthYear: 1990 },
        rules: [{ id: 'rule-1' }],
        lifeEvents: [{ id: 'event-1' }],
      }),
    );
  });

  it('fails the whole refresh on an invalid opening', async () => {
    const { run, calculateProjection } = setup(draftsOf(), () => '期初餘額不合法');

    await expect(run()).rejects.toThrow('期初餘額不合法');
    expect(calculateProjection).not.toHaveBeenCalled();
  });

  it('fails the whole refresh on invalid assumptions', async () => {
    const { run, calculateProjection } = setup(draftsOf({ assumptions: { ok: false } }));

    await expect(run()).rejects.toThrow();
    expect(calculateProjection).not.toHaveBeenCalled();
  });

  it('drops an invalid rule but still calculates', async () => {
    const { run, calculateProjection } = setup(draftsOf({ rules: { ok: false } }));

    await act(async () => void (await run()));

    expect(calculateProjection).toHaveBeenCalledWith(expect.objectContaining({ rules: [] }));
  });

  it('drops an invalid event but still calculates', async () => {
    const { run, calculateProjection } = setup(draftsOf({ events: { ok: false } }));

    await act(async () => void (await run()));

    expect(calculateProjection).toHaveBeenCalledWith(expect.objectContaining({ lifeEvents: [] }));
  });
});
