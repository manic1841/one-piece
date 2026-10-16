import { describe, expect, it } from 'vitest';

import {
  RetirementAssumptionsFormVMSchema,
  RetirementEventFormVMSchema,
  RetirementExpenseFormVMSchema,
  RetirementIncomeFormVMSchema,
  buildRetirementAssumptionsFormInput,
  buildRetirementEventFormInput,
  buildRetirementExpenseFormInput,
  buildRetirementIncomeFormInput,
  collapseRetirementEndCondition,
  defaultIncomeEndCondition,
  deriveRetirementEndCondition,
  mapRetirementAssumptionsVMToPlanUpdates,
  mapRetirementEventVMToDomain,
  mapRetirementExpenseVMToDomain,
  mapRetirementIncomeVMToDomain,
  retirementEndConditionText,
} from './retirementForm.vm';

describe('retirementForm.vm', () => {
  it('builds and maps income form vm (退休時結束 collapses to the retirement year)', () => {
    const input = buildRetirementIncomeFormInput(undefined, {
      currentYear: 2030,
      retirementYear: 2050,
    });
    expect(input.startYear).toBe('2030');
    expect(input.endCondition).toBe('retirement');
    expect(input.currentAnnual).toBeNull();

    const domain = mapRetirementIncomeVMToDomain(
      RetirementIncomeFormVMSchema.parse({
        ...input,
        name: 'Salary',
        type: 'salary',
        currentAnnual: 120000,
      }),
      { birthYear: 1990, retirementYear: 2050 },
    );

    expect(domain.name).toBe('Salary');
    expect(domain.currentAnnual).toBe(120000);
    expect(domain.startYear).toBe(2030);
    expect(domain.endYear).toBe(2050);
    expect(domain.lifelong).toBe(false);
  });

  it('coerces blank income growth to missing, not zero', () => {
    const vm = RetirementIncomeFormVMSchema.parse({
      ...buildRetirementIncomeFormInput(undefined, { currentYear: 2030, retirementYear: 2050 }),
      name: 'Salary',
      growthRate: '',
    });

    expect(vm.growthRate).toBeUndefined();
    expect(vm.endConditionValue).toBe('');
  });

  it('rejects a blank required income start year', () => {
    const result = RetirementIncomeFormVMSchema.safeParse({
      ...buildRetirementIncomeFormInput(undefined, { currentYear: 2030, retirementYear: 2050 }),
      name: 'Salary',
      startYear: '',
    });

    expect(result.success).toBe(false);
  });

  it('requires a value when the income end condition is 指定年齡 or 指定年份', () => {
    const base = buildRetirementIncomeFormInput(undefined, {
      currentYear: 2030,
      retirementYear: 2050,
    });
    expect(
      RetirementIncomeFormVMSchema.safeParse({
        ...base,
        name: 'Rent',
        endCondition: 'year',
        endConditionValue: '',
      }).success,
    ).toBe(false);
    expect(
      RetirementIncomeFormVMSchema.safeParse({
        ...base,
        name: 'Rent',
        endCondition: 'age',
        endConditionValue: '70',
      }).success,
    ).toBe(true);
  });

  it('builds and maps expense form vm (general expense defaults to 持續至預期壽命)', () => {
    const input = buildRetirementExpenseFormInput(undefined, {
      currentYear: 2030,
      retirementYear: 2050,
    });
    expect(input.endCondition).toBe('lifelong');
    expect(input.currentAnnual).toBe('');

    const domain = mapRetirementExpenseVMToDomain(
      RetirementExpenseFormVMSchema.parse({
        ...input,
        name: 'Housing',
        currentAnnual: '48000',
        endCondition: 'year',
        endConditionValue: '2060',
      }),
      { birthYear: 1990, retirementYear: 2050, retirementMultiplier: 1 },
    );

    expect(domain.endYear).toBe(2060);
    expect(domain.retirementMultiplier).toBe(1);
    expect(domain.currentAnnual).toBe(48000);
  });

  it('clears the expense end year for 持續至預期壽命 and preserves the stored multiplier', () => {
    const vm = RetirementExpenseFormVMSchema.parse({
      ...buildRetirementExpenseFormInput(undefined, { currentYear: 2030, retirementYear: 2050 }),
      name: 'Housing',
      currentAnnual: '48000',
      endCondition: 'lifelong',
    });

    const domain = mapRetirementExpenseVMToDomain(vm, {
      birthYear: 1990,
      retirementYear: 2050,
      retirementMultiplier: 0.7,
    });
    expect(domain.endYear).toBeNull();
    expect(domain.retirementMultiplier).toBe(0.7);
  });

  it('keeps an explicit expense growth rate of 0', () => {
    const vm = RetirementExpenseFormVMSchema.parse({
      ...buildRetirementExpenseFormInput(undefined, { currentYear: 2030, retirementYear: 2050 }),
      name: 'Housing',
      currentAnnual: '48000',
      growthRate: '0',
    });

    expect(vm.growthRate).toBe(0);
    expect(
      mapRetirementExpenseVMToDomain(vm, {
        birthYear: 1990,
        retirementYear: 2050,
        retirementMultiplier: 1,
      }).growthRate,
    ).toBe(0);
  });

  describe('end-condition semantics (spec #301 §2.2)', () => {
    it('collapses each semantic to { lifelong, endYear }', () => {
      const anchor = { birthYear: 1990, retirementYear: 2050 };
      expect(collapseRetirementEndCondition('retirement', '', anchor)).toEqual({
        lifelong: false,
        endYear: 2050,
      });
      expect(collapseRetirementEndCondition('age', '70', anchor)).toEqual({
        lifelong: false,
        endYear: 2060,
      });
      expect(collapseRetirementEndCondition('year', '2062', anchor)).toEqual({
        lifelong: false,
        endYear: 2062,
      });
      expect(collapseRetirementEndCondition('lifelong', '', anchor)).toEqual({ lifelong: true });
    });

    it('reads back conservatively (never 指定年齡)', () => {
      expect(deriveRetirementEndCondition({ lifelong: true }, 2050)).toBe('lifelong');
      expect(deriveRetirementEndCondition({ lifelong: false, endYear: 2050 }, 2050)).toBe(
        'retirement',
      );
      expect(deriveRetirementEndCondition({ lifelong: false, endYear: 2062 }, 2050)).toBe('year');
      expect(deriveRetirementEndCondition({ endYear: null }, 2050)).toBe('lifelong');
    });

    it('renders the semantic label as a pure function', () => {
      expect(retirementEndConditionText('retirement')).toBe('退休時結束');
      expect(retirementEndConditionText('lifelong')).toBe('持續至預期壽命');
      expect(retirementEndConditionText('age', 70)).toBe('指定年齡 70');
      expect(retirementEndConditionText('year', 2062)).toBe('指定年份 2062');
    });

    it('defaults income by type (Salary → 退休時結束; 其餘 → 持續至預期壽命)', () => {
      expect(defaultIncomeEndCondition('salary')).toBe('retirement');
      expect(defaultIncomeEndCondition('bonus')).toBe('lifelong');
      expect(defaultIncomeEndCondition('pension')).toBe('lifelong');
      expect(defaultIncomeEndCondition('rent')).toBe('lifelong');
      expect(defaultIncomeEndCondition('other')).toBe('lifelong');
    });
  });

  it('builds and maps event form vm', () => {
    const vm = buildRetirementEventFormInput(undefined, 2030);
    expect(vm.phases[0]?.startYear).toBe('2030');

    const domain = mapRetirementEventVMToDomain(
      RetirementEventFormVMSchema.parse({
        ...vm,
        name: 'One-time cost',
        type: 'expense',
        phases: [
          {
            name: 'Phase 1',
            startYear: '2030',
            endYear: '2030',
            amount: '10000',
          },
        ],
      }),
    );

    expect(domain.phases?.[0]?.startYear).toBe(2030);
    expect(domain.phases?.[0]?.amount).toBe(10000);
  });

  it('rejects a non-numeric event phase amount at the gate', () => {
    const result = RetirementEventFormVMSchema.safeParse({
      ...buildRetirementEventFormInput(undefined, 2030),
      name: 'One-time cost',
      phases: [{ name: 'Phase 1', startYear: '2030', endYear: '2030', amount: 'abc' }],
    });

    expect(result.success).toBe(false);
  });

  it('validates assumptions vm and coerces field strings', () => {
    const input = buildRetirementAssumptionsFormInput({
      currentAge: 36,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2,
      investmentReturnRate: 5,
      currentYear: 2026,
      retirementYear: 2050,
      lifeExpectancyYear: 2075,
    });

    expect(input.retirementAge).toBe('60');

    const parsed = RetirementAssumptionsFormVMSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.retirementAge).toBe(60);
  });

  it('rejects a non-integer assumptions age', () => {
    const result = RetirementAssumptionsFormVMSchema.safeParse({
      currentAge: '36.5',
      retirementAge: '60',
      lifeExpectancy: '85',
      inflationRate: '2',
      investmentReturnRate: '5',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an out-of-order assumptions timeline', () => {
    const result = RetirementAssumptionsFormVMSchema.safeParse({
      currentAge: '60',
      retirementAge: '60',
      lifeExpectancy: '85',
      inflationRate: '2',
      investmentReturnRate: '5',
    });

    expect(result.success).toBe(false);
  });

  it('maps assumptions to plan updates anchored to the base year', () => {
    const vm = RetirementAssumptionsFormVMSchema.parse({
      currentAge: '36',
      retirementAge: '60',
      lifeExpectancy: '85',
      inflationRate: '2',
      investmentReturnRate: '5',
    });

    expect(mapRetirementAssumptionsVMToPlanUpdates(vm, 2026)).toEqual({
      currentYear: 2026,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 2,
      investmentReturnRate: 5,
    });
  });
});
