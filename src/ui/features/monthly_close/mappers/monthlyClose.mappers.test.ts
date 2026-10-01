import { describe, expect, it } from 'vitest';

import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import { mapPeriodToPageVM } from './monthlyClose.mappers';

const authPeriod = (overrides: Partial<FinancialPeriod> = {}): FinancialPeriod => ({
  yearMonth: '2026-09',
  status: 'IN_PROGRESS',
  stages: initialStageStates(),
  reviewSourceStageId: null,
  id: '2026-09',
  createdBy: 'user@test.com',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedBy: 'user@test.com',
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

describe('mapPeriodToPageVM', () => {
  it('maps stage list with glyphs order and completed progress', () => {
    const period = authPeriod();
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'user@test.com',
      confirmedAt: new Date('2026-09-16T08:00:00Z'),
    };
    period.stages.DEBT_REPAYMENT = { status: 'COMPLETED' };

    const vm = mapPeriodToPageVM(period);

    expect(vm.stages).toHaveLength(9);
    expect(vm.stages[0].stageId).toBe('ACCOUNT_BALANCE');
    expect(vm.stages[1].stageId).toBe('TRANSACTION_VALIDATION');
    expect(vm.stages[0].isCompleted).toBe(true);
    expect(vm.stages[0].confirmedAtText).toContain('2026-09-16');
    expect(vm.completedCount).toBe(2);
    expect(vm.isActive).toBe(true);
    expect(vm.isClosed).toBe(false);
  });

  it('flags the review source stage when paused', () => {
    const period = authPeriod({
      status: 'NEEDS_REVIEW',
      reviewSourceStageId: 'COMPLETENESS_CHECK',
    });

    const vm = mapPeriodToPageVM(period);

    expect(vm.isPaused).toBe(true);
    expect(vm.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(vm.reviewSourceLabel).toBeTruthy();
    const source = vm.stages.find((stage) => stage.stageId === 'COMPLETENESS_CHECK');
    expect(source?.isReviewSource).toBe(true);
  });

  it('marks a closed period as finalized', () => {
    const vm = mapPeriodToPageVM(authPeriod({ status: 'CLOSED' }));

    expect(vm.isClosed).toBe(true);
    expect(vm.isActive).toBe(false);
  });
});
