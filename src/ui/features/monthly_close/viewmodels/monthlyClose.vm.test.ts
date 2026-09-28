import { describe, expect, it } from 'vitest';

import { CLOSE_STAGE_IDS } from '@/domains/financial_period/schemas';

import {
  resolveDisplayedStageId,
  resolveGoToResetRange,
  resolvePositionText,
  resolveStepText,
} from './monthlyClose.vm';

describe('resolveDisplayedStageId', () => {
  it('defaults a closed period to the Close Period summary as the read-only record', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: true,
        viewingStageId: null,
        currentStageId: 'ACCOUNT_BALANCE',
      }),
    ).toBe('CLOSE_PERIOD');
  });

  it('honors the viewed stage in a closed period so pipeline review works', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: true,
        viewingStageId: 'FINANCIAL_REPORTS',
        currentStageId: null,
      }),
    ).toBe('FINANCIAL_REPORTS');
  });

  it('defaults to the walk position while paused instead of the review source', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: false,
        viewingStageId: null,
        currentStageId: 'ACCOUNT_BALANCE',
      }),
    ).toBe('ACCOUNT_BALANCE');
  });

  it('honors the viewed stage while paused so GO TO deep links work', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: false,
        viewingStageId: 'DEBT_REPAYMENT',
        currentStageId: 'ACCOUNT_BALANCE',
      }),
    ).toBe('DEBT_REPAYMENT');
  });

  it('honors the viewed stage while not paused', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: false,
        viewingStageId: 'PORTFOLIO_CASH_FLOW',
        currentStageId: 'COMPLETENESS_CHECK',
      }),
    ).toBe('PORTFOLIO_CASH_FLOW');
  });

  it('falls back to the current stage when nothing is viewed', () => {
    expect(
      resolveDisplayedStageId({
        isClosed: false,
        viewingStageId: null,
        currentStageId: 'TRANSACTION_VALIDATION',
      }),
    ).toBe('TRANSACTION_VALIDATION');
  });
});

describe('resolveStepText', () => {
  it('formats the step number and label for a displayed stage', () => {
    const stages = CLOSE_STAGE_IDS.map((stageId) => ({ stageId, label: stageId }));

    expect(resolveStepText(stages, 'COMPLETENESS_CHECK')).toBe('07 COMPLETENESS_CHECK');
  });

  it('returns null for an unknown stage', () => {
    expect(resolveStepText([], 'ACCOUNT_BALANCE')).toBeNull();
  });
});

describe('resolvePositionText', () => {
  const stages = CLOSE_STAGE_IDS.map((stageId) => ({ stageId }));

  it('follows the viewed stage in a closed period so progress matches the step header', () => {
    expect(
      resolvePositionText(stages, null, true, CLOSE_STAGE_IDS.length, 'PORTFOLIO_CASH_FLOW'),
    ).toBe('04 / 09');
  });

  it('shows the final position for a closed period with no viewed stage', () => {
    expect(resolvePositionText(stages, null, true, CLOSE_STAGE_IDS.length, null)).toBe('09 / 09');
  });

  it('keeps the walk position while not paused', () => {
    expect(
      resolvePositionText(stages, 'ACCOUNT_BALANCE', false, CLOSE_STAGE_IDS.length, null),
    ).toBe('01 / 09');
  });
});

describe('resolveGoToResetRange', () => {
  it('derives the reset range from the target stage index', () => {
    const stages = CLOSE_STAGE_IDS.map((stageId) => ({ stageId }));

    expect(resolveGoToResetRange(stages, 'DEBT_REPAYMENT', 9)).toBe('06-09');
  });

  it('falls back to step 01 for an unknown stage', () => {
    expect(resolveGoToResetRange([], 'ACCOUNT_BALANCE', 9)).toBe('01-09');
  });
});
