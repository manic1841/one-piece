import { describe, expect, it } from 'vitest';

import { CLOSE_STAGE_IDS, type FinancialPeriod, initialStageStates } from './schemas';
import {
  closePeriodInState,
  completedStageCount,
  confirmStageInState,
  isStageCompleted,
  reconfirmStageInState,
  reopenPeriodInState,
  resetStagesFromInState,
  resolveWalkPosition,
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

describe('confirmStageInState', () => {
  it('marks the stage completed and returns IN_PROGRESS', () => {
    const confirmedAt = new Date('2026-10-03T10:00:00Z');
    const next = confirmStageInState(basePeriod(), 'ACCOUNT_BALANCE', 'user-1', confirmedAt);

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

  it('allows re-confirming a completed debt stage in state', () => {
    const confirmed = confirmStageInState(basePeriod(), 'DEBT_REPAYMENT', 'user-1', new Date());
    const next = confirmStageInState(confirmed, 'DEBT_REPAYMENT', 'user-2', new Date());

    expect(next.stages.DEBT_REPAYMENT?.confirmedBy).toBe('user-2');
    expect(next.status).toBe('IN_PROGRESS');
  });

  it('allows re-confirming a completed reconfirmable stage', () => {
    const confirmed = confirmStageInState(basePeriod(), 'ACCOUNT_BALANCE', 'user-1', new Date());
    const next = confirmStageInState(confirmed, 'ACCOUNT_BALANCE', 'user-2', new Date());

    expect(next.stages.ACCOUNT_BALANCE?.confirmedBy).toBe('user-2');
    expect(confirmStageInState(confirmed, 'PORTFOLIO_CASH_FLOW', 'user-2', new Date()).status).toBe(
      'IN_PROGRESS',
    );
  });

  // ADR-0073 (drift shortcut): regenerating the reports must not demote the
  // stages after it, or the Close Period summary the gate blocks would be
  // unreachable without rewalking the whole pipeline.
  it('re-confirms a completed reports stage without touching later stages', () => {
    const walkComplete = basePeriod();
    for (const stageId of Object.keys(walkComplete.stages)) {
      if (stageId !== 'CLOSE_PERIOD') {
        walkComplete.stages[stageId] = {
          status: 'COMPLETED',
          confirmedBy: 'u',
          confirmedAt: new Date(),
        };
      }
    }

    const next = reconfirmStageInState(
      walkComplete,
      'FINANCIAL_REPORTS',
      'user-2',
      new Date('2026-10-04T10:00:00Z'),
    );

    expect(next.status).toBe('IN_PROGRESS');
    expect(next.stages.FINANCIAL_REPORTS?.confirmedBy).toBe('user-2');
    expect(completedStageCount(next)).toBe(completedStageCount(walkComplete));
    expect(isStageCompleted(next, 'CLOSE_PERIOD')).toBe(false);
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

describe('resolveWalkPosition', () => {
  it('returns the first PENDING stage in CLOSE_STAGE_IDS order', () => {
    const period = basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: null });
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'u',
      confirmedAt: new Date(),
    };

    expect(resolveWalkPosition(period)).toBe('SECURITIES_TRADE');
  });

  it('returns ACCOUNT_BALANCE when nothing is completed', () => {
    const period = basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: null });

    expect(resolveWalkPosition(period)).toBe('ACCOUNT_BALANCE');
  });

  it('returns null when every stage is completed', () => {
    const period = basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: null });
    for (const stageId of Object.keys(period.stages)) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }

    expect(resolveWalkPosition(period)).toBeNull();
  });
});

describe('confirmStageInState — paused-period guards', () => {
  it('keeps the pause and review source when a non-terminal stage is confirmed', () => {
    const confirmedAt = new Date('2026-10-03T10:00:00Z');
    const next = confirmStageInState(
      basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: 'COMPLETENESS_CHECK' }),
      'ACCOUNT_BALANCE',
      'user-1',
      confirmedAt,
    );

    expect(next.status).toBe('NEEDS_REVIEW');
    expect(next.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(next.stages.ACCOUNT_BALANCE).toEqual({
      status: 'COMPLETED',
      confirmedBy: 'user-1',
      confirmedAt,
    });
  });

  it('clears the pause when the review source stage is confirmed', () => {
    const period = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });
    for (const stageId of [
      'ACCOUNT_BALANCE',
      'SECURITIES_TRADE',
      'PORTFOLIO_CASH_FLOW',
      'PROJECT_SETTLEMENT',
      'DEBT_REPAYMENT',
    ]) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }
    period.stages.FINANCIAL_REPORTS = {
      status: 'COMPLETED',
      confirmedBy: 'u',
      confirmedAt: new Date(),
    };

    const next = confirmStageInState(period, 'COMPLETENESS_CHECK', 'user-1', new Date());

    expect(next.status).toBe('IN_PROGRESS');
    expect(next.reviewSourceStageId).toBeNull();
    expect(next.stages.COMPLETENESS_CHECK?.status).toBe('COMPLETED');
    expect(next.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(next.stages.CLOSE_PERIOD?.status).toBe('PENDING');
    expect(next.stages.ACCOUNT_BALANCE?.status).toBe('COMPLETED');
  });

  it('rejects confirming a non-walk-position stage while paused', () => {
    const period = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'u',
      confirmedAt: new Date(),
    };

    expect(() => confirmStageInState(period, 'COMPLETENESS_CHECK', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects re-confirming a completed stage while paused even when reconfirmable', () => {
    const period = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'u',
      confirmedAt: new Date(),
    };

    expect(() => confirmStageInState(period, 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects confirming a stage on a closed paused walk', () => {
    expect(() =>
      confirmStageInState(
        basePeriod({ status: 'CLOSED' }),
        'ACCOUNT_BALANCE',
        'user-1',
        new Date(),
      ),
    ).toThrow(FinancialPeriodStateError);
  });

  it('rejects reconfirming a non-walk-position stage while paused', () => {
    const period = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'u',
      confirmedAt: new Date(),
    };

    expect(() => reconfirmStageInState(period, 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });

  it('rejects reconfirming when paused and all stages complete', () => {
    const period = basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: null });
    for (const stageId of Object.keys(period.stages)) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }

    expect(() => reconfirmStageInState(period, 'ACCOUNT_BALANCE', 'user-1', new Date())).toThrow(
      FinancialPeriodStateError,
    );
  });
});

describe('reopenPeriodInState — cascade branch', () => {
  it('resets every stage to PENDING and stays NEEDS_REVIEW for a cascade-demoted period', () => {
    const period = basePeriod({ status: 'NEEDS_REVIEW', reviewSourceStageId: null });
    for (const stageId of Object.keys(period.stages)) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }

    const next = reopenPeriodInState(period);

    expect(next.status).toBe('NEEDS_REVIEW');
    expect(next.reviewSourceStageId).toBeNull();
    for (const stageId of Object.keys(next.stages)) {
      expect(next.stages[stageId].status).toBe('PENDING');
    }
  });

  it('resets Financial Reports and Close Period for a closed period', () => {
    const period = basePeriod({ status: 'CLOSED' });
    for (const stageId of Object.keys(period.stages)) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }

    const next = reopenPeriodInState(period);

    expect(next.status).toBe('IN_PROGRESS');
    expect(next.reviewSourceStageId).toBeNull();
    expect(next.stages.FINANCIAL_REPORTS?.status).toBe('PENDING');
    expect(next.stages.CLOSE_PERIOD?.status).toBe('PENDING');
    expect(next.stages.ACCOUNT_BALANCE?.status).toBe('COMPLETED');
  });

  it('rejects reopening an in-progress period', () => {
    expect(() => reopenPeriodInState(basePeriod())).toThrow(FinancialPeriodStateError);
  });
});

describe('resetStagesFromInState', () => {
  it('resets the given stage and every later stage to PENDING', () => {
    const period = basePeriod();
    for (const stageId of Object.keys(period.stages)) {
      period.stages[stageId] = { status: 'COMPLETED', confirmedBy: 'u', confirmedAt: new Date() };
    }

    const next = resetStagesFromInState(period, 'SECURITIES_TRADE');

    expect(next.stages.ACCOUNT_BALANCE?.status).toBe('COMPLETED');
    expect(next.stages.SECURITIES_TRADE?.status).toBe('PENDING');
    expect(next.stages.COMPLETENESS_CHECK?.status).toBe('PENDING');
    expect(next.stages.CLOSE_PERIOD?.status).toBe('PENDING');
  });

  it('keeps the paused status and review source', () => {
    const period = basePeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });

    const next = resetStagesFromInState(period, 'ACCOUNT_BALANCE');

    expect(next.status).toBe('NEEDS_REVIEW');
    expect(next.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(next.stages.ACCOUNT_BALANCE?.status).toBe('PENDING');
  });

  it('rejects an unknown stage', () => {
    expect(() => resetStagesFromInState(basePeriod(), 'NOT_A_STAGE' as never)).toThrow(
      FinancialPeriodStateError,
    );
  });
});

describe('closePeriodInState', () => {
  /** Every walk stage has been confirmed; CLOSE_PERIOD itself completes on close. */
  const readyToClose = (): FinancialPeriod['stages'] =>
    Object.fromEntries(
      CLOSE_STAGE_IDS.filter((stageId) => stageId !== 'CLOSE_PERIOD').map((stageId) => [
        stageId,
        { status: 'COMPLETED' as const },
      ]),
    );

  it('rejects closing while any stage is incomplete', () => {
    const confirmed = confirmStageInState(basePeriod(), 'CLOSE_PERIOD', 'user-1', new Date());
    expect(() => closePeriodInState(confirmed, 'user-1', new Date())).toThrow(/STAGES_INCOMPLETE/);
  });

  it('finalizes the period as CLOSED when every stage is completed', () => {
    const closedAt = new Date('2026-10-05T10:00:00Z');
    const next = closePeriodInState(basePeriod({ stages: readyToClose() }), 'user-1', closedAt);

    expect(next.status).toBe('CLOSED');
    expect(next.reviewSourceStageId).toBeNull();
    expect(next.stages.CLOSE_PERIOD).toEqual({
      status: 'COMPLETED',
      confirmedBy: 'user-1',
      confirmedAt: closedAt,
    });
  });

  it('rejects closing an already-closed period', () => {
    const closed = closePeriodInState(basePeriod({ stages: readyToClose() }), 'user-1', new Date());

    expect(() => closePeriodInState(closed, 'user-1', new Date())).toThrow(/PERIOD_CLOSED/);
  });
});
