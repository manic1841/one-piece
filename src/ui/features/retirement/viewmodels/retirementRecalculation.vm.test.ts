import { describe, expect, it } from 'vitest';

import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlan,
} from '@/domains/retirement/types';

import { isRetirementSummaryStale, shiftRetirementEndingRows } from './retirementRecalculation.vm';

const BIRTH_YEAR = 1986;
const RETIREMENT_AGE = 60;
const RETIREMENT_YEAR = BIRTH_YEAR + RETIREMENT_AGE; // 2046

const income = (overrides: Partial<RetirementIncomeSource> = {}): RetirementIncomeSource => ({
  id: 'i1',
  name: '薪資',
  type: 'salary',
  lifelong: false,
  startYear: 2026,
  endYear: RETIREMENT_YEAR,
  currentAnnual: 120000,
  ...overrides,
});

const expense = (
  overrides: Partial<RetirementExpenseCategory> = {},
): RetirementExpenseCategory => ({
  id: 'e1',
  name: '生活支出',
  type: 'general',
  includesPrincipal: false,
  interestOnly: false,
  currentAnnual: 50000,
  retirementMultiplier: 1,
  startYear: 2026,
  endYear: null,
  ...overrides,
});

const plan = (
  overrides: Partial<
    Pick<RetirementPlan, 'birthYear' | 'retirementAge' | 'incomes' | 'expenses'>
  > = {},
): Pick<RetirementPlan, 'birthYear' | 'retirementAge' | 'incomes' | 'expenses'> => ({
  birthYear: BIRTH_YEAR,
  retirementAge: RETIREMENT_AGE,
  incomes: [],
  expenses: [],
  ...overrides,
});

describe('isRetirementSummaryStale', () => {
  it('is stale when the cached retirementYear no longer matches the assumptions', () => {
    expect(
      isRetirementSummaryStale({
        birthYear: BIRTH_YEAR,
        retirementAge: 65,
        summary: { retirementYear: RETIREMENT_YEAR } as RetirementPlan['summary'],
      }),
    ).toBe(true);
  });

  it('is not stale when the cached retirementYear matches', () => {
    expect(
      isRetirementSummaryStale({
        birthYear: BIRTH_YEAR,
        retirementAge: RETIREMENT_AGE,
        summary: { retirementYear: RETIREMENT_YEAR } as RetirementPlan['summary'],
      }),
    ).toBe(false);
  });

  it('is not stale when there is no cached summary at all', () => {
    expect(isRetirementSummaryStale({ birthYear: BIRTH_YEAR, retirementAge: RETIREMENT_AGE })).toBe(
      false,
    );
  });
});

describe('shiftRetirementEndingRows', () => {
  it('moves a stored 退休時結束 income to the new retirement year', () => {
    const shift = shiftRetirementEndingRows(plan({ incomes: [income()] }), {
      birthYear: BIRTH_YEAR,
      retirementAge: 65,
    });

    expect(shift?.incomes?.[0].endYear).toBe(BIRTH_YEAR + 65);
    expect(shift?.expenses).toBeUndefined();
  });

  it('moves a general expense whose endYear is the retirement year', () => {
    const shift = shiftRetirementEndingRows(
      plan({ expenses: [expense({ endYear: RETIREMENT_YEAR })] }),
      { birthYear: BIRTH_YEAR, retirementAge: 62 },
    );

    expect(shift?.expenses?.[0].endYear).toBe(BIRTH_YEAR + 62);
    expect(shift?.incomes).toBeUndefined();
  });

  it('re-anchoring the birth year alone still moves the rows', () => {
    const shift = shiftRetirementEndingRows(plan({ incomes: [income()] }), {
      birthYear: BIRTH_YEAR - 3,
      retirementAge: RETIREMENT_AGE,
    });

    expect(shift?.incomes?.[0].endYear).toBe(BIRTH_YEAR - 3 + RETIREMENT_AGE);
  });

  it('leaves lifelong rows untouched (no year)', () => {
    const shift = shiftRetirementEndingRows(
      plan({ incomes: [income({ lifelong: true, endYear: undefined })] }),
      { birthYear: BIRTH_YEAR, retirementAge: 65 },
    );

    expect(shift).toBeNull();
  });

  it('leaves 指定年份 rows untouched', () => {
    const shift = shiftRetirementEndingRows(plan({ incomes: [income({ endYear: 2055 })] }), {
      birthYear: BIRTH_YEAR,
      retirementAge: 65,
    });

    expect(shift).toBeNull();
  });

  it('never moves an imported income (its endYear is not the retirement year)', () => {
    const shift = shiftRetirementEndingRows(plan({ incomes: [income({ endYear: 2046 + 20 })] }), {
      birthYear: BIRTH_YEAR,
      retirementAge: 55,
    });

    expect(shift).toBeNull();
  });

  it('never moves a debt payment row even when its imported endYear coincides', () => {
    const shift = shiftRetirementEndingRows(
      plan({ expenses: [expense({ type: 'debt_payment', endYear: RETIREMENT_YEAR })] }),
      { birthYear: BIRTH_YEAR, retirementAge: 65 },
    );

    expect(shift).toBeNull();
  });

  it('does not move a row whose new endYear would precede its startYear', () => {
    const shift = shiftRetirementEndingRows(
      plan({ incomes: [income({ startYear: 2050 })] }),
      { birthYear: BIRTH_YEAR, retirementAge: 55 }, // 2041 < 2050
    );

    expect(shift).toBeNull();
  });

  it('returns null when the retirement year does not change', () => {
    expect(
      shiftRetirementEndingRows(plan({ incomes: [income()] }), {
        birthYear: BIRTH_YEAR,
        retirementAge: RETIREMENT_AGE,
      }),
    ).toBeNull();
  });

  it('does not mutate the original collections', () => {
    const incomes = [income()];
    const original = incomes[0];
    shiftRetirementEndingRows(plan({ incomes }), { birthYear: BIRTH_YEAR, retirementAge: 65 });

    expect(incomes[0]).toBe(original);
    expect(incomes[0].endYear).toBe(RETIREMENT_YEAR);
  });
});
