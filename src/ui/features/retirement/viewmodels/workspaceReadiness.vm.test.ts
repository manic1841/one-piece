import { describe, expect, it } from 'vitest';

import { buildProgress, buildReadiness } from './workspaceReadiness.vm';

const ok = { valid: true, incomeRuleCount: 1, openingResolved: true };

describe('buildReadiness', () => {
  it('passes when all three conditions hold', () => {
    expect(buildReadiness(ok)).toEqual({ ready: true, blockers: [] });
  });

  it('blocks on each condition independently', () => {
    expect(buildReadiness({ ...ok, valid: false }).blockers).toEqual(['schema']);
    expect(buildReadiness({ ...ok, incomeRuleCount: 0 }).blockers).toEqual(['noIncome']);
    expect(buildReadiness({ ...ok, openingResolved: false }).blockers).toEqual(['opening']);
  });

  it('lists every blocker in a stable order', () => {
    expect(
      buildReadiness({ valid: false, incomeRuleCount: 0, openingResolved: false }).blockers,
    ).toEqual(['schema', 'noIncome', 'opening']);
  });
});

describe('buildProgress', () => {
  it('counts the sections that carry content out of five', () => {
    expect(
      buildProgress({
        hasBaseline: true,
        assumptionsFilled: false,
        incomeRuleCount: 2,
        expenseRuleCount: 0,
        eventCount: 1,
      }),
    ).toEqual({ filled: 3, total: 5 });
  });

  it('treats unfilled sections as empty', () => {
    expect(
      buildProgress({
        hasBaseline: false,
        assumptionsFilled: false,
        incomeRuleCount: 0,
        expenseRuleCount: 0,
        eventCount: 0,
      }),
    ).toEqual({ filled: 0, total: 5 });
  });
});
