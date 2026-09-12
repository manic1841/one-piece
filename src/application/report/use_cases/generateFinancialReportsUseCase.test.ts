import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type BalanceSheetData } from '@/domains/report/schemas';
import { type CashFlowData } from '@/domains/report/schemas';
import { type IncomeStatementData } from '@/domains/report/schemas';
import { ReportType } from '@/domains/report/schemas';
import { reportRepository } from '@/infra/repositories/reportRepository';

import { generateFinancialReportsUseCase } from './generateFinancialReportsUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./getSettlementReadinessUseCase', () => ({
  getSettlementReadinessUseCase: { execute: vi.fn() },
}));

vi.mock('./previewFinancialReportsWorkflow', () => ({
  previewFinancialReportsWorkflow: { execute: vi.fn() },
}));

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: { saveReport: vi.fn().mockResolvedValue(undefined) },
}));

const auth: AuthContext = {
  uid: 'user-1',
  email: 'u1@example.com',
  isGlobalAdmin: false,
};

const incomeStatement: IncomeStatementData = {
  yearMonth: '2026-03',
  incomeTotal: 5000,
  expenseTotal: 800,
  netIncome: 4200,
  incomeItems: [],
  expenseItems: [],
};

const balanceSheet: BalanceSheetData = {
  yearMonth: '2026-03',
  assets: { total: 10000, groups: {} },
  liabilities: { total: 3000, groups: {} },
  equity: { total: 7000, groups: {} },
};

const cashFlow: CashFlowData = {
  yearMonth: '2026-03',
  operating: { label: '', total: 0, inflowItems: [], outflowItems: [] },
  investing: { label: '', total: 0, inflowItems: [], outflowItems: [] },
  financing: { label: '', total: 0, inflowItems: [], outflowItems: [] },
  netCashChange: 0,
  beginningBalance: 0,
  endingBalance: 0,
  actualBalance: 0,
  adjustment: 0,
};

const previewResult = {
  incomeStatement,
  balanceSheet,
  cashFlow,
  isPersisted: false,
  timestamps: {},
};

describe('generateFinancialReportsUseCase', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue(undefined);
    const { getSettlementReadinessUseCase } = await import('./getSettlementReadinessUseCase');
    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      isReady: true,
      unsettledAccounts: [],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 0,
    } as never);
    const { previewFinancialReportsWorkflow } = await import('./previewFinancialReportsWorkflow');
    vi.mocked(previewFinancialReportsWorkflow.execute).mockResolvedValue(previewResult);
    vi.mocked(reportRepository.saveReport).mockResolvedValue(undefined);
  });

  it('checks write permission before any work', async () => {
    await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(householdPermissionService.assertWritePermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
  });

  it('rejects when write permission is denied', async () => {
    vi.mocked(householdPermissionService.assertWritePermission).mockRejectedValue(
      new Error('forbidden'),
    );

    const { previewFinancialReportsWorkflow } = await import('./previewFinancialReportsWorkflow');

    await expect(
      generateFinancialReportsUseCase.execute({
        householdId: 'household-1',
        auth,
        year: 2026,
        month: 3,
      }),
    ).rejects.toThrow('forbidden');

    expect(previewFinancialReportsWorkflow.execute).not.toHaveBeenCalled();
    expect(reportRepository.saveReport).not.toHaveBeenCalled();
  });

  it('rejects with SettlementNotReadyError when settlement is not ready', async () => {
    const { getSettlementReadinessUseCase } = await import('./getSettlementReadinessUseCase');
    const { previewFinancialReportsWorkflow } = await import('./previewFinancialReportsWorkflow');

    vi.mocked(getSettlementReadinessUseCase.execute).mockResolvedValue({
      year: 2026,
      month: 3,
      isReady: false,
      unsettledAccounts: [{ id: 'a1', name: 'Account 1' } as never],
      unsettledPortfolios: [],
      unsettledDebts: [],
      unsettledProjects: [],
      totalUnsettled: 1,
    } as never);

    await expect(
      generateFinancialReportsUseCase.execute({
        householdId: 'household-1',
        auth,
        year: 2026,
        month: 3,
      }),
    ).rejects.toThrow(/Settlement not ready/);

    expect(previewFinancialReportsWorkflow.execute).not.toHaveBeenCalled();
    expect(reportRepository.saveReport).not.toHaveBeenCalled();
  });

  it('proceeds with generation when settlement is ready', async () => {
    const { previewFinancialReportsWorkflow } = await import('./previewFinancialReportsWorkflow');

    const result = await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalled();
    expect(reportRepository.saveReport).toHaveBeenCalledTimes(3);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('delegates calculation to previewFinancialReportsWorkflow', async () => {
    const { previewFinancialReportsWorkflow } = await import('./previewFinancialReportsWorkflow');

    await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
      labelResolver: (code) => code,
    });

    expect(previewFinancialReportsWorkflow.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
      labelResolver: expect.any(Function),
    });
  });

  it('persists all three report types via repository', async () => {
    await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(reportRepository.saveReport).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(reportRepository.saveReport).mock.calls;
    const types = calls.map((c) => c[1].type);
    expect(types).toContain(ReportType.INCOME_STATEMENT);
    expect(types).toContain(ReportType.BALANCE_SHEET);
    expect(types).toContain(ReportType.CASH_FLOW);
  });

  it('returns computed data structures (not FinancialReport wrappers) with timestamp', async () => {
    const result = await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    expect(result.incomeStatement).toEqual(incomeStatement);
    expect(result.balanceSheet).toEqual(balanceSheet);
    expect(result.cashFlow).toEqual(cashFlow);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });

  it('uses auth.email as createdBy/updatedBy when available', async () => {
    await generateFinancialReportsUseCase.execute({
      householdId: 'household-1',
      auth,
      year: 2026,
      month: 3,
    });

    const call = vi.mocked(reportRepository.saveReport).mock.calls[0];
    expect(call[1].createdBy).toBe('u1@example.com');
    expect(call[1].updatedBy).toBe('u1@example.com');
    expect(call[2]).toBe('u1@example.com');
  });
});
