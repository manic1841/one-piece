import { describe, expect, it } from 'vitest';

import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type FinancialPeriod, initialStageStates } from '@/domains/financial_period/schemas';

import {
  NO_EVIDENCE,
  mapAdjustmentCountToEvidence,
  mapAnomaliesToEvidence,
  mapPeriodToPageVM,
  mapPersistenceToEvidence,
} from './monthlyClose.mappers';

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

const anomaly = (name: string): CompletenessActivity => ({
  targetType: 'ACCOUNT',
  targetId: 'account-1',
  name,
  status: 'ZERO_ACTIVITY',
  activityCount: 0,
  activityAmount: 0,
});

describe('mapPeriodToPageVM', () => {
  it('maps a missing period to the not-started shell', () => {
    const vm = mapPeriodToPageVM(null, '2026-09');

    expect(vm.isStarted).toBe(false);
    expect(vm.status).toBe('NONE');
    expect(vm.totalCount).toBe(9);
    expect(vm.stages).toHaveLength(0);
  });

  it('maps stage list with glyphs order and completed progress', () => {
    const period = authPeriod();
    period.stages.ACCOUNT_BALANCE = {
      status: 'COMPLETED',
      confirmedBy: 'user@test.com',
      confirmedAt: new Date('2026-09-16T08:00:00Z'),
    };
    period.stages.DEBT_REPAYMENT = { status: 'COMPLETED' };

    const vm = mapPeriodToPageVM(period, '2026-09');

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

    const vm = mapPeriodToPageVM(period, '2026-09');

    expect(vm.isPaused).toBe(true);
    expect(vm.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(vm.reviewSourceLabel).toBeTruthy();
    const source = vm.stages.find((stage) => stage.stageId === 'COMPLETENESS_CHECK');
    expect(source?.isReviewSource).toBe(true);
  });

  it('marks a closed period as finalized', () => {
    const vm = mapPeriodToPageVM(authPeriod({ status: 'CLOSED' }), '2026-09');

    expect(vm.isClosed).toBe(true);
    expect(vm.isActive).toBe(false);
  });
});

describe('evidence mappers', () => {
  it('maps anomalies with names', () => {
    const evidence = mapAnomaliesToEvidence([anomaly('台新銀行'), anomaly('國泰帳戶')]);

    expect(evidence.kind).toBe('COMPLETENESS_ANOMALIES');
    expect(evidence.zeroActivityNames).toEqual(['台新銀行', '國泰帳戶']);
  });

  it('maps adjustment count and persistence state', () => {
    expect(mapAdjustmentCountToEvidence(-120).cashFlowAdjustments).toBe(-120);
    expect(mapPersistenceToEvidence(true).reportsPersisted).toBe(true);
    expect(NO_EVIDENCE.kind).toBe('NONE');
  });
});
