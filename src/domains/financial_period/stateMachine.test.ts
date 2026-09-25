import { describe, expect, it } from 'vitest';

import { type FinancialPeriod, initialStageStates } from './schemas';
import {
  closePeriodInState,
  completedStageCount,
  confirmStageInState,
  isStageCompleted,
  markNeedsReviewInState,
  resolvePeriodStatus,
} from './stateMachine';
import { FinancialPeriodStateError } from './stateMachine';

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
    const next = confirmStageInState(
      basePeriod({ status: 'NEEDS_REVIEW' }),
      'ACCOUNT_BALANCE',
      'user-1',
      confirmedAt,
    );

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
    expect(() =>
      confirmStageInState(basePeriod(), 'NOT_A_STAGE' as never, 'user-1', new Date()),
    ).toThrow(FinancialPeriodStateError);
  });

  it('rejects re-confirming a completed stage', () => {
    const confirmed = confirmStageInState(basePeriod(), 'ACCOUNT_BALANCE', 'user-1', new Date());
    expect(() => confirmStageInState(confirmed, 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects confirming a stage on a CLOSED period', () => {
    expect(() =>
      confirmStageInState(
        basePeriod({ status: 'CLOSED' }),
        'ACCOUNT_BALANCE',
        'user-1',
        new Date(),
      ),
    ).toThrow(FinancialPeriodStateError);
  });
});

describe('markNeedsReviewInState', () => {
  it('records the review source stage', () => {
    const next = markNeedsReviewInState(basePeriod(), 'COMPLETENESS_CHECK');

    expect(next.status).toBe('NEEDS_REVIEW');
    expect(next.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
  });

  it('rejects review marking on a CLOSED period', () => {
    expect(() =>
      markNeedsReviewInState(basePeriod({ status: 'CLOSED' }), 'COMPLETENESS_CHECK'),
    ).toThrow(FinancialPeriodStateError);
  });

  it('rejects an unknown review source stage', () => {
    expect(() => markNeedsReviewInState(basePeriod(), 'NOT_A_STAGE' as never)).toThrow(
      FinancialPeriodStateError,
    );
  });
});

describe('closePeriodInState', () => {
  it('requires Close Period stage completed', () => {
    expect(() => closePeriodInState(basePeriod(), 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('finalizes the period as CLOSED when Close Period is confirmed', () => {
    const closedAt = new Date('2026-10-05T10:00:00Z');
    const confirmed = confirmStageInState(basePeriod(), 'CLOSE_PERIOD', 'user-1', new Date());
    const next = closePeriodInState(confirmed, 'user-1', closedAt);

    expect(next.status).toBe('CLOSED');
    expect(next.reviewSourceStageId).toBeNull();
    expect(next.stages.CLOSE_PERIOD).toEqual({
      status: 'COMPLETED',
      confirmedBy: 'user-1',
      confirmedAt: closedAt,
    });
  });

  it('allows closing when the Close Period stage is completed', () => {
    const confirmed = confirmStageInState(basePeriod(), 'CLOSE_PERIOD', 'user-1', new Date());
    const next = closePeriodInState(confirmed, 'user-1', new Date());

    expect(next.status).toBe('CLOSED');
  });

  it('rejects closing an already-closed period', () => {
    const confirmed = confirmStageInState(basePeriod(), 'CLOSE_PERIOD', 'user-1', new Date());
    const closed = closePeriodInState(confirmed, 'user-1', new Date());

    expect(() => closePeriodInState(closed, 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });
});
