import { beforeEach, describe, expect, it } from 'vitest';

import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';
import { initialStageStates } from '@/domains/financial_period/schemas';
import { resetMockDb } from '@/test/mocks/firebase';

// resetMockDb deletes server-side via REST, but the shared long-lived SDK
// connection keeps stale cached snapshots (see firestore-emulator gotchas).
// Unique household IDs per test keep reads cache-cold and deterministic.
let householdSeq = 0;

describe('financial period persistence (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
    householdSeq += 1;
  });

  const householdId = () => `household-financial-period-${householdSeq}`;

  it('returns no record for a period that has not started closing', async () => {
    const HOUSEHOLD = householdId();

    expect(await financialPeriodRepository.getPeriod(HOUSEHOLD, '2026-09')).toBeNull();
  });

  it('saves and reads a period record with all stage states intact', async () => {
    const HOUSEHOLD = householdId();
    const confirmedAt = new Date('2026-10-03T10:00:00Z');

    await financialPeriodRepository.savePeriod(
      HOUSEHOLD,
      {
        yearMonth: '2026-09',
        status: 'NEEDS_REVIEW',
        stages: {
          ...initialStageStates(),
          ACCOUNT_BALANCE: { status: 'COMPLETED', confirmedBy: 'user@test.com', confirmedAt },
        },
        reviewSourceStageId: 'COMPLETENESS_CHECK',
      },
      'user@test.com',
    );

    const period = await financialPeriodRepository.getPeriod(HOUSEHOLD, '2026-09');
    expect(period).not.toBeNull();
    expect(period?.status).toBe('NEEDS_REVIEW');
    expect(period?.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(period?.stages.ACCOUNT_BALANCE).toEqual({
      status: 'COMPLETED',
      confirmedBy: 'user@test.com',
      confirmedAt,
    });
    expect(period?.stages.CLOSE_PERIOD).toEqual({ status: 'PENDING' });
    expect(Object.keys(period?.stages ?? {})).toHaveLength(8);
  });

  it('overwrites the period record on re-save (upsert by yearMonth)', async () => {
    const HOUSEHOLD = householdId();

    await financialPeriodRepository.savePeriod(
      HOUSEHOLD,
      { yearMonth: '2026-10', status: 'IN_PROGRESS', stages: initialStageStates() },
      'user@test.com',
    );
    await financialPeriodRepository.savePeriod(
      HOUSEHOLD,
      { yearMonth: '2026-10', status: 'CLOSED', stages: initialStageStates() },
      'user@test.com',
    );

    const periods = await financialPeriodRepository.getPeriod(HOUSEHOLD, '2026-10');
    expect(periods?.status).toBe('CLOSED');
  });
});
