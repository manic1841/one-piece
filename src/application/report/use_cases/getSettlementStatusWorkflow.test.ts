import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';

import { getSettlementReadinessUseCase } from './getSettlementReadinessUseCase';
import { previewDebtSettlementsUseCase } from '../../settlement/use_cases/previewDebtSettlementsUseCase';
import { previewFinancialReportsWorkflow } from './previewFinancialReportsWorkflow';
import { getSettlementStatusWorkflow } from './getSettlementStatusWorkflow';

vi.mock('./getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));
vi.mock('./previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));
vi.mock('../../settlement/use_cases/previewDebtSettlementsUseCase', () => ({
  previewDebtSettlementsUseCase: { execute: vi.fn() },
}));

const auth: AuthContext = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };
const request = { householdId: 'household-1', auth, year: 2026, month: 3 };

const readiness = (isReady: boolean) => ({
  year: 2026,
  month: 3,
  isReady,
  unsettledAccounts: [],
  unsettledPortfolios: [],
  unsettledDebts: [],
  unsettledProjects: [],
  totalUnsettled: isReady ? 0 : 2,
});

const debtPreview = {
  year: 2026,
  month: 3,
  yearMonth: '2026-03',
  items: [],
  hasMissingRepayments: true,
  missingRepaymentAccountNames: ['Loan A'],
};

const reports = {
  incomeStatement: { incomeTotal: 1000 },
  balanceSheet: { assets: { total: 5000 }, liabilities: { total: 1200 } },
  cashFlow: {},
  isPersisted: true,
  timestamps: { incomeStatement: '10:30' },
} as never;

describe('getSettlementStatusWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(previewDebtSettlementsUseCase.execute).mockResolvedValue(debtPreview);
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(reports);
  });

  it('carries the debt preview and the readiness alongside the computed reports', async () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readiness(true));

    const status = await getSettlementStatusWorkflow.execute(request);

    expect(status.readiness.isReady).toBe(true);
    expect(status.debtPreview.missingRepaymentAccountNames).toEqual(['Loan A']);
    expect(status.reports).toBe(reports);
  });

  it('does not compute the reports when the month is not settled yet', async () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readiness(false));

    const status = await getSettlementStatusWorkflow.execute(request);

    expect(status.reports).toBeNull();
    // The preview is both expensive and meaningless before every entity is
    // settled, so readiness has to gate it.
    expect(previewFinancialReportsWorkflow.execute).not.toHaveBeenCalled();
  });

  it('checks readiness before deciding whether to preview', async () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readiness(true));

    await getSettlementStatusWorkflow.execute(request);

    expect(previewDebtSettlementsUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      year: 2026,
      month: 3,
      auth,
    });
    expect(getSettlementReadinessUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });
  });

  it('passes the label resolver through to the report preview', async () => {
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue(readiness(true));
    const labelResolver = (code: string) => code;

    await getSettlementStatusWorkflow.execute({ ...request, labelResolver });

    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ labelResolver }),
    );
  });
});
