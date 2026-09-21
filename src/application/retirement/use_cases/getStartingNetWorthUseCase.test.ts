import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type AuthContext } from '@/application/types';
import { ReportType } from '@/domains/report/schemas';
import { type FinancialReport } from '@/domains/report/types';

import { getStartingNetWorthUseCase } from './getStartingNetWorthUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/infra/repositories/financialPeriodRepository', () => ({
  financialPeriodRepository: {
    getPeriod: vi.fn(),
  },
}));

import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { financialPeriodRepository } from '@/infra/repositories/financialPeriodRepository';

const auth: AuthContext = { uid: 'u1', isGlobalAdmin: false };

const buildReport = (yearMonth: string, assets: number, liabilities: number): FinancialReport => ({
  id: `report-${yearMonth}`,
  householdId: 'household-1',
  yearMonth,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  type: ReportType.BALANCE_SHEET,
  data: {
    yearMonth,
    assets: { total: assets, groups: {} },
    liabilities: { total: liabilities, groups: {} },
    equity: { total: assets - liabilities, groups: {} },
  },
});

describe('getStartingNetWorthUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest CLOSED balance sheet with assets, liabilities and net worth', async () => {
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      buildReport('2026-07', 400_000, 100_000),
      buildReport('2026-08', 500_000, 120_000),
    ]);
    vi.mocked(financialPeriodRepository.getPeriod).mockImplementation(async (_householdId, yearMonth) => {
      if (yearMonth === '2026-07' || yearMonth === '2026-08') {
        return { status: 'CLOSED' } as never;
      }
      return null;
    });

    const result = await getStartingNetWorthUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).not.toHaveProperty('reason');
    expect(result).toEqual({
      startingNetWorth: 380_000,
      anchorYearMonth: '2026-08',
      assets: 500_000,
      liabilities: 120_000,
    });
  });

  it('skips non-closed periods and falls back to an older CLOSED one', async () => {
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      buildReport('2026-08', 500_000, 120_000),
      buildReport('2026-07', 400_000, 100_000),
    ]);
    vi.mocked(financialPeriodRepository.getPeriod).mockImplementation(async (_householdId, yearMonth) => {
      if (yearMonth === '2026-07') {
        return { status: 'CLOSED' } as never;
      }
      return { status: 'OPEN' } as never;
    });

    const result = await getStartingNetWorthUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).toEqual({
      startingNetWorth: 300_000,
      anchorYearMonth: '2026-07',
      assets: 400_000,
      liabilities: 100_000,
    });
  });

  it('ignores non-balance-sheet reports entirely', async () => {
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      {
        ...buildReport('2026-08', 500_000, 120_000),
        type: ReportType.CASH_FLOW,
        data: { yearMonth: '2026-08', incomeTotal: 0, expenseTotal: 0, groups: [] },
      } as unknown as FinancialReport,
    ]);

    const result = await getStartingNetWorthUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(financialPeriodRepository.getPeriod).not.toHaveBeenCalled();
    expect(result).toEqual({ reason: 'NO_CLOSED_PERIOD' });
  });

  it('returns NO_CLOSED_PERIOD when no period is closed', async () => {
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      buildReport('2026-08', 500_000, 120_000),
    ]);
    vi.mocked(financialPeriodRepository.getPeriod).mockResolvedValue({ status: 'OPEN' } as never);

    const result = await getStartingNetWorthUseCase.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).toEqual({ reason: 'NO_CLOSED_PERIOD' });
  });
});
