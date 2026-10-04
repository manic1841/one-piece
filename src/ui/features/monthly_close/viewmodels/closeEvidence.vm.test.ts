import { describe, expect, it } from 'vitest';

import { type CompletenessActivity } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';

import {
  NO_EVIDENCE,
  adjustmentEvidence,
  persistenceEvidence,
  settlementsEvidence,
  zeroActivityEvidence,
} from './closeEvidence.vm';

const anomaly = (name: string): CompletenessActivity => ({
  targetType: 'ACCOUNT',
  targetId: 'account-1',
  name,
  status: 'ZERO_ACTIVITY',
  activityCount: 0,
  activityAmount: 0,
});

describe('closeEvidence factories', () => {
  it('carries only the payload of its own kind', () => {
    expect(zeroActivityEvidence([anomaly('台新銀行'), anomaly('國泰帳戶')])).toEqual({
      kind: 'ZERO_ACTIVITY',
      names: ['台新銀行', '國泰帳戶'],
    });
    expect(adjustmentEvidence(-120)).toEqual({ kind: 'ADJUSTMENT', count: -120 });
    expect(persistenceEvidence(true)).toEqual({ kind: 'PERSISTENCE', persisted: true });
  });

  it('maps project settlements into the settlement evidence', () => {
    const evidence = settlementsEvidence([
      {
        projectId: 'project-1',
        projectName: '裝修',
        settled: true,
        openingBalance: 1000,
        income: 5000,
        expense: 3000,
        closingBalance: 2000,
      },
      {
        projectId: 'project-2',
        projectName: '旅遊',
        settled: false,
        openingBalance: 0,
        income: 0,
        expense: 0,
        closingBalance: 0,
      },
    ]);

    expect(evidence.kind).toBe('SETTLEMENTS');
    expect(evidence.kind === 'SETTLEMENTS' && evidence.rows).toHaveLength(2);
    expect(evidence.kind === 'SETTLEMENTS' && evidence.rows[0]?.settled).toBe(true);
  });

  it('exposes the empty evidence as the NONE variant', () => {
    expect(NO_EVIDENCE).toEqual({ kind: 'NONE' });
  });
});
