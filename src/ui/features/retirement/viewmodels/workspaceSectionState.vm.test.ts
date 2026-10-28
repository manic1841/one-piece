import { describe, expect, it } from 'vitest';

import { buildSectionState } from './workspaceSectionState.vm';

const quiet = {
  blockers: [] as const,
  assumptionsInvalid: false,
  rulesInvalid: false,
  eventsInvalid: false,
};

describe('buildSectionState', () => {
  it('reports nothing when every band is settled', () => {
    expect(buildSectionState({ ...quiet, blockers: [] })).toEqual({
      baseline: undefined,
      assumptions: undefined,
      rules: undefined,
      events: undefined,
    });
  });

  it('explains a missing opening without a glyph', () => {
    expect(buildSectionState({ ...quiet, blockers: ['opening'] }).baseline).toEqual({
      hint: 'Resolve the opening net worth.',
    });
  });

  it('lets the opening field own its own error', () => {
    expect(
      buildSectionState({
        ...quiet,
        blockers: ['opening'],
        openingValidationError: 'Enter a whole dollar amount.',
      }).baseline,
    ).toEqual({ status: 'error' });
  });

  it('explains missing income without a glyph, because it is a gap not an error', () => {
    expect(buildSectionState({ ...quiet, blockers: ['noIncome'] }).rules).toEqual({
      hint: 'Add at least one income rule.',
    });
  });

  it('hangs the global schema blocker only on the band holding the invalid row', () => {
    const state = buildSectionState({ ...quiet, blockers: ['schema'], rulesInvalid: true });

    expect(state.rules).toEqual({
      status: 'error',
      hint: 'Fix the validation errors in the setup.',
    });
    expect(state.assumptions).toBeUndefined();
    expect(state.events).toBeUndefined();
    expect(state.baseline).toBeUndefined();
  });

  it('prefers the invalid rule band over the income hint when both apply', () => {
    const state = buildSectionState({
      ...quiet,
      blockers: ['schema', 'noIncome'],
      rulesInvalid: true,
    });

    expect(state.rules?.hint).toBe('Fix the validation errors in the setup.');
  });

  it('marks an invalid event', () => {
    expect(
      buildSectionState({ ...quiet, blockers: ['schema'], eventsInvalid: true }).events,
    ).toEqual({ status: 'error', hint: 'Fix the validation errors in the setup.' });
  });
});
