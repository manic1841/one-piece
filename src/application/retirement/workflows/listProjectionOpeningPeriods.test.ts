import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type AuthContext } from '@/application/types';
import { type BalanceSheetData } from '@/domains/report/types';

import { OPENING_PERIOD_LIMIT, listProjectionOpeningPeriods } from './listProjectionOpeningPeriods';

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

  it('returns report months newest first with their net worth', async () => {
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

  it('lists every report month, closed or not', async () => {
    // Periods are not read at all: every stored balance sheet is offerable.
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      report('2026-08', 100, 0),
      report('2026-07', 90, 0),
    ] as never);

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.periods).toEqual([
      { yearMonth: '2026-08', netWorth: 100 },
      { yearMonth: '2026-07', netWorth: 90 },
    ]);
  });

  it('caps the window at the limit, newest first', async () => {
    const months = monthsBack(OPENING_PERIOD_LIMIT + 3);
    vi.mocked(listReportsUseCase.execute).mockResolvedValue(
      months.map((month) => report(month, 10, 0)) as never,
    );

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result.periods).toHaveLength(OPENING_PERIOD_LIMIT);
    expect(result.periods[0]?.yearMonth).toBe(months[0]);
  });

  it('returns the anchor as pinned only when the window no longer holds it', async () => {
    const months = monthsBack(OPENING_PERIOD_LIMIT + 3);
    const anchorYearMonth = months[months.length - 1] as string;
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([
      ...months.map((month) => report(month, 500, 0)),
      report(anchorYearMonth, 900, 100),
    ] as never);

    const inside = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth: months[0],
    });
    expect(inside.periods).toHaveLength(OPENING_PERIOD_LIMIT);
    expect(inside.pinned).toBeNull();

    const outside = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth,
    });
    expect(outside.pinned).toEqual({ yearMonth: anchorYearMonth, netWorth: 800 });
  });

  it('returns no pin when the anchor month has no report left', async () => {
    vi.mocked(listReportsUseCase.execute).mockResolvedValue([report('2026-08', 500, 0)] as never);

    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
      anchorYearMonth: '2024-05',
    });

    expect(result.pinned).toBeNull();
  });

  it('returns an empty window when no balance sheet is stored', async () => {
    const result = await listProjectionOpeningPeriods.execute({
      householdId: 'household-1',
      auth,
    });

    expect(result).toEqual({ periods: [], pinned: null });
    expect(listReportsUseCase.execute).toHaveBeenCalled();
  });
});
