import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reportRepository } from '@/infra/repositories/reportRepository';

import {
  type StoredReportKind,
  getStoredReportUseCase,
} from './getStoredReportUseCase';

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: { getReport: vi.fn() },
}));

const incomeStatementData = {
  yearMonth: '2026-03',
  incomeTotal: 1000,
  expenseTotal: 400,
  netIncome: 600,
  incomeItems: [],
  expenseItems: [],
};

const balanceSheetData = {
  yearMonth: '2026-03',
  assets: { total: 5000, groups: {} },
  liabilities: { total: 1200, groups: {} },
  equity: { total: 3800, groups: {} },
};

const cashFlowData = {
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

describe('getStoredReportUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reportRepository.getReport).mockResolvedValue(null);
  });

  it('returns null when no stored report exists for monthly mode', async () => {
    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      kind: 'incomeStatement',
    });

    expect(result).toBeNull();
    expect(reportRepository.getReport).toHaveBeenCalledWith(
      'household-1',
      '2026-03',
      expect.anything(),
    );
  });

  it('returns stored income statement data in monthly mode', async () => {
    vi.mocked(reportRepository.getReport).mockResolvedValue({ data: incomeStatementData } as never);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      kind: 'incomeStatement',
    });

    expect(result).toEqual(incomeStatementData);
  });

  it('returns stored balance sheet data in monthly mode', async () => {
    vi.mocked(reportRepository.getReport).mockResolvedValue({ data: balanceSheetData } as never);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      kind: 'balanceSheet',
    });

    expect(result).toEqual(balanceSheetData);
  });

  it('returns stored cash flow data in monthly mode', async () => {
    vi.mocked(reportRepository.getReport).mockResolvedValue({ data: cashFlowData } as never);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026-03',
      kind: 'cashFlow',
    });

    expect(result).toEqual(cashFlowData);
  });

  it('aggregates 12 monthly reports in yearly mode for income statement', async () => {
    const monthlyReport = { ...incomeStatementData, incomeTotal: 100, netIncome: 60 };
    vi.mocked(reportRepository.getReport).mockResolvedValue({ data: monthlyReport } as never);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026',
      kind: 'incomeStatement',
    });

    expect(reportRepository.getReport).toHaveBeenCalledTimes(12);
    expect(result).not.toBeNull();
    // 12 months * 100 income = 1200
    expect((result as typeof incomeStatementData).incomeTotal).toBe(1200);
  });

  it('returns null for yearly balance sheet when December is missing', async () => {
    vi.mocked(reportRepository.getReport).mockImplementation(async (_h, monthKey) => {
      if (monthKey === '2026-12') return null;
      return { data: balanceSheetData } as never;
    });

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026',
      kind: 'balanceSheet',
    });

    expect(result).toBeNull();
  });

  it('returns aggregated balance sheet when December exists', async () => {
    const decemberData = { ...balanceSheetData, yearMonth: '2026-12' };
    vi.mocked(reportRepository.getReport).mockResolvedValue({ data: decemberData } as never);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026',
      kind: 'balanceSheet',
    });

    expect(result).not.toBeNull();
  });

  it('returns null for yearly cash flow when no monthly reports exist', async () => {
    vi.mocked(reportRepository.getReport).mockResolvedValue(null);

    const result = await getStoredReportUseCase.execute({
      householdId: 'household-1',
      yearMonth: '2026',
      kind: 'cashFlow',
    });

    expect(result).toBeNull();
  });

  it('handles each kind correctly via the kind parameter', async () => {
    const kinds: StoredReportKind[] = ['incomeStatement', 'balanceSheet', 'cashFlow'];
    for (const kind of kinds) {
      vi.mocked(reportRepository.getReport).mockClear();
      vi.mocked(reportRepository.getReport).mockResolvedValue(null);

      await getStoredReportUseCase.execute({
        householdId: 'household-1',
        yearMonth: '2026-03',
        kind,
      });

      expect(reportRepository.getReport).toHaveBeenCalledTimes(1);
    }
  });
});
