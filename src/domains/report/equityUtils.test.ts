import { describe, expect, it } from 'vitest';

import { calculateEquityTotal } from './equityUtils';
import { ReportType } from './schemas';
import { type BalanceSheetData, type FinancialReport } from './types';

const buildBalanceSheet = (
  assetsTotal: number,
  liabilitiesTotal: number,
): BalanceSheetData => ({
  yearMonth: '2026-08',
  assets: { total: assetsTotal, groups: {} },
  liabilities: { total: liabilitiesTotal, groups: {} },
  equity: { total: assetsTotal - liabilitiesTotal, groups: {} },
});

describe('calculateEquityTotal', () => {
  it('returns assets.total minus liabilities.total', () => {
    expect(calculateEquityTotal(buildBalanceSheet(500_000, 120_000))).toBe(380_000);
  });

  it('returns a negative total when liabilities exceed assets', () => {
    expect(calculateEquityTotal(buildBalanceSheet(50_000, 120_000))).toBe(-70_000);
  });

  it('matches the stored balance sheet report total', () => {
    const report: FinancialReport = {
      id: 'report-1',
      householdId: 'household-1',
      yearMonth: '2026-08',
      createdBy: 'u1',
      updatedBy: 'u1',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
      type: ReportType.BALANCE_SHEET,
      data: buildBalanceSheet(900_000, 350_000),
    };
    expect(calculateEquityTotal(report.data)).toBe(550_000);
  });
});
