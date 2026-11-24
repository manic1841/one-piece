import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { type BalanceSheetData } from '@/domains/report/types';

import { OPENING_PERIOD_LIMIT, listProjectionOpeningPeriods } from './listProjectionOpeningPeriods';

const { listPeriodsMock } = vi.hoisted(() => ({ listPeriodsMock: vi.fn() }));

vi.mock('@/application/monthly_close/use_cases/financialPeriodAccessUseCases', () => ({
  ListFinancialPeriodsUseCase: vi.fn(function () {
    return { execute: listPeriodsMock };
  }),
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn() },
}));

vi.mock('@/application/report/use_cases/listReportsUseCase', () => ({
  listReportsUseCase: { execute: vi.fn() },
}));

vi.mock('@/infra/firestore', () => ({ db: {} }));

const auth: AuthContext = { uid: 'u1', isGlobalAdmin: false };

const report = (yearMonth: string, assets: number, liabilities: number) => ({
  id: `${yearMonth}-balance_sheet`,
  householdId: 'household-1',
  yearMonth,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
  type: 'BALANCE_SHEET' as const,
  data: {
    yearMonth,
    assets: { total: assets, groups: {} },
    liabilities: { total: liabilities, groups: {} },
    equity: { total: assets - liabilities, groups: {} },
  } as BalanceSheetData,
});

const period = (yearMonth: string, status: 'CLOSED' | 'IN_PROGRESS' | 'NEEDS_REVIEW') => ({
  yearMonth,
  status,
  stages: {},
});

const monthsBack = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const month = 12 - (index % 12);
    const year = 2026 - Math.floor(index / 12);
    return `${year}-${String(month).padStart(2, '0')}`;
  });

describe('listProjectionOpeningPeriods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([]);
  });

  it('returns closed months newest first with their net worth', async () => {
    listPeriodsMock.mockResolvedValue([period('2026-03', 'CLOSED'), period('2026-08', 'CLOSED')]);
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      report('2026-03', 300_000, 50_000),
      report('2026-08', 500_000, 120_000),
    ] as never);

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.periods).toEqual([
      { yearMonth: '2026-08', netWorth: 380_000 },
      { yearMonth: '2026-03', netWorth: 250_000 },
    ]);
    expect(result.pinned).toBeNull();
  });

  it('drops open months and closed months without a balance sheet', async () => {
    listPeriodsMock.mockResolvedValue([
      period('2026-08', 'CLOSED'),
      period('2026-07', 'IN_PROGRESS'),
      period('2026-06', 'CLOSED'),
    ]);
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([report('2026-08', 100, 0)] as never);

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.periods).toEqual([{ yearMonth: '2026-08', netWorth: 100 }]);
  });

  it('applies the balance sheet filter before the cap so report-less months do not eat slots', async () => {
    const months = monthsBack(OPENING_PERIOD_LIMIT + 3);
    listPeriodsMock.mockResolvedValue(months.map((month) => period(month, 'CLOSED')));
    // The two newest months have no balance sheet and must not shrink the window.
    vi.mocked(listReportsUseCase.execute).mockResolvedValue(
      months.slice(2).map((month) => report(month, 10, 0)) as never,
    );

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.periods).toHaveLength(OPENING_PERIOD_LIMIT);
    expect(result.periods[0]?.yearMonth).toBe(months[2]);
  });

  it('returns the anchor as pinned only when the window no longer holds it', async () => {
    listPeriodsMock.mockResolvedValue([period('2026-08', 'CLOSED'), period('2025-01', 'CLOSED')]);
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      report('2026-08', 500, 0),
      report('2025-01', 900, 100),
    ] as never);

    const inside = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth: '2026-08',
    });
    expect(inside.periods).toHaveLength(2);
    expect(inside.pinned).toBeNull();

    const outside = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth: '2024-05',
    });
    expect(outside.pinned).toBeNull();

    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      report('2026-08', 500, 0),
      report('2024-05', 900, 100),
    ] as never);
    const pinned = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth: '2024-05',
    });
    expect(pinned.pinned).toEqual({ yearMonth: '2024-05', netWorth: 800 });
  });

  it('returns an empty window without reading reports when nothing is closed', async () => {
    listPeriodsMock.mockResolvedValue([period('2026-08', 'IN_PROGRESS')]);

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).toEqual({ periods: [], pinned: null });
    expect(listReportsUseCase.execute).not.toHaveBeenCalled();
  });
});
