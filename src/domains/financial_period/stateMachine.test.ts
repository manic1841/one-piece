import { describe, expect, it } from 'vitest';

import {
  completedStageCount,
  confirmStageInState,
  isStageCompleted,
  markNeedsReviewInState,
  resolvePeriodStatus,
} from './stateMachine';
import { FinancialPeriodStateError } from './stateMachine';
import {
  type FinancialPeriod,
  initialStageStates,
} from './schemas';

const basePeriod = (overrides: Partial<FinancialPeriod> = {}): FinancialPeriod => ({
  id: '2026-09',
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
  ...overrides,
});

describe('resolvePeriodStatus', () => {
  it('treats a missing record as OPEN', () => {
    expect(resolvePeriodStatus(null)).toBe('OPEN');
  });

  it('returns the persisted status when a record exists', () => {
    expect(resolvePeriodStatus(basePeriod({ status: 'NEEDS_REVIEW' }))).toBe('NEEDS_REVIEW');
  });
});

describe('confirmStageInState', () => {
  it('marks the stage completed and returns IN_PROGRESS', () => {
    const confirmedAt = new Date('2026-10-03T10:00:00Z');
    const next = confirmStageInState(basePeriod({ status: 'NEEDS_REVIEW' }), 'ACCOUNT_BALANCE', 'user-1', confirmedAt);

    expect(next.status).toBe('IN_PROGRESS');
    expect(next.reviewSourceStageId).toBeNull();
    expect(next.stages.ACCOUNT_BALANCE).toEqual({
      status: 'COMPLETED',
      confirmedBy: 'user-1',
      confirmedAt,
    });
  });

  it('preserves other stages', () => {
    const first = confirmStageInState(basePeriod(), 'ACCOUNT_BALANCE', 'user-1', new Date());
    const second = confirmStageInState(first, 'DEBT_REPAYMENT', 'user-1', new Date());

    expect(isStageCompleted(second, 'ACCOUNT_BALANCE')).toBe(true);
    expect(isStageCompleted(second, 'DEBT_REPAYMENT')).toBe(true);
    expect(isStageCompleted(second, 'CLOSE_PERIOD')).toBe(false);
    expect(completedStageCount(second)).toBe(2);
  });

  it('rejects an unknown stage', () => {
    expect(() => confirmStageInState(basePeriod(), 'NOT_A_STAGE' as never, 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects re-confirming a completed stage', () => {
    const confirmed = confirmStageInState(basePeriod(), 'ACCOUNT_BALANCE', 'user-1', new Date());
    expect(() => confirmStageInState(confirmed, 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects confirming a stage on a CLOSED period', () => {
    expect(() => confirmStageInState(basePeriod({ status: 'CLOSED' }), 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });
});

describe('markNeedsReviewInState', () => {
  it('records the review source stage', () => {
    const next = markNeedsReviewInState(basePeriod(), 'COMPLETENESS_CHECK');

    expect(next.status).toBe('NEEDS_REVIEW');
    expect(next.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
  });

  it('rejects review marking on a CLOSED period', () => {
    expect(() => markNeedsReviewInState(basePeriod({ status: 'CLOSED' }), 'COMPLETENESS_CHECK')).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects an unknown review source stage', () => {
    expect(() => markNeedsReviewInState(basePeriod(), 'NOT_A_STAGE' as never)).toThrow(
      FinancialPeriodStateError,
    );
  });
});
