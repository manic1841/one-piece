import { describe, expect, it } from 'vitest';

import { type FinancialPeriod } from '@/domains/financial_period/schemas';

import { buildCloseMonthMatrix } from './closeMonthMatrix.vm';

const period = (yearMonth: string, status: FinancialPeriod['status']) =>
  ({ yearMonth, status }) as FinancialPeriod;

describe('buildCloseMonthMatrix', () => {
  it('returns the six months ending at the anchor, newest last', () => {
    const months = buildCloseMonthMatrix('2026-03', []);

    expect(months.map((month) => month.yearMonth)).toEqual([
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('carries each month status and its label', () => {
    const months = buildCloseMonthMatrix('2026-03', [
      period('2026-02', 'CLOSED'),
      period('2026-03', 'IN_PROGRESS'),
    ]);

    expect(months.find((month) => month.yearMonth === '2026-02')).toMatchObject({
      status: 'CLOSED',
      statusText: '已關帳',
    });
    expect(months.find((month) => month.yearMonth === '2026-03')).toMatchObject({
      status: 'IN_PROGRESS',
      statusText: '進行中',
    });
  });

  it('keeps a demoted month on its own status instead of falling back to 未開始', () => {
    const months = buildCloseMonthMatrix('2026-03', [period('2026-01', 'NEEDS_REVIEW')]);

    expect(months.find((month) => month.yearMonth === '2026-01')).toMatchObject({
      status: 'NEEDS_REVIEW',
      statusText: '待審閱',
    });
  });

  it('treats a month without a period record as still available', () => {
    const months = buildCloseMonthMatrix('2026-03', []);

    expect(months.every((month) => month.status === 'NOT_STARTED')).toBe(true);
    expect(months[0].statusText).toBe('未開始');
  });

  it('rolls back across the year boundary', () => {
    const months = buildCloseMonthMatrix('2026-01', []);

    expect(months[0].yearMonth).toBe('2025-08');
    expect(months.at(-1)?.monthText).toBe('1 月');
  });
});
