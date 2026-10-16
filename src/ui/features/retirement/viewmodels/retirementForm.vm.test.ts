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
  mapRetirementAssumptionsVMToPlanUpdates,
  mapRetirementEventVMToDomain,
  mapRetirementExpenseVMToDomain,
  mapRetirementIncomeVMToDomain,
} from './retirementForm.vm';

describe('retirementForm.vm', () => {
  it('builds and maps income form vm', () => {
    const input = buildRetirementIncomeFormInput(undefined, 2030);
    expect(input.startYear).toBe('2030');
    expect(input.endYear).toBe('2050');
    expect(input.currentAnnual).toBeNull();

    const domain = mapRetirementIncomeVMToDomain(
      RetirementIncomeFormVMSchema.parse({
        ...input,
        name: 'Salary',
        type: 'salary',
        currentAnnual: 120000,
      }),
    );

    expect(domain.name).toBe('Salary');
    expect(domain.currentAnnual).toBe(120000);
    expect(domain.startYear).toBe(2030);
    expect(domain.endYear).toBe(2050);
  });

  it('coerces blank income numerics to missing, not zero', () => {
    const vm = RetirementIncomeFormVMSchema.parse({
      ...buildRetirementIncomeFormInput(undefined, 2030),
      name: 'Salary',
      retirementAnnual: '',
      growthRate: '',
      endYear: '',
    });

    expect(vm.retirementAnnual).toBeUndefined();
    expect(vm.growthRate).toBeUndefined();
    expect(vm.endYear).toBeUndefined();
  });

  it('rejects a blank required income start year', () => {
    const result = RetirementIncomeFormVMSchema.safeParse({
      ...buildRetirementIncomeFormInput(undefined, 2030),
      name: 'Salary',
      startYear: '',
    });

    expect(result.success).toBe(false);
  });

  it('builds and maps expense form vm', () => {
    const input = buildRetirementExpenseFormInput(undefined, 2030);
    expect(input.retirementMultiplier).toBe('70');
    expect(input.currentAnnual).toBe('');

    const domain = mapRetirementExpenseVMToDomain(
      RetirementExpenseFormVMSchema.parse({
        ...input,
        name: 'Housing',
        currentAnnual: '48000',
        endYear: '2060',
        retirementMultiplier: '80',
      }),
    );

    expect(domain.endYear).toBe(2060);
    expect(domain.retirementMultiplier).toBe(0.8);
    expect(domain.currentAnnual).toBe(48000);
  });

  it('keeps an explicit expense growth rate of 0', () => {
    const vm = RetirementExpenseFormVMSchema.parse({
      ...buildRetirementExpenseFormInput(undefined, 2030),
      name: 'Housing',
      currentAnnual: '48000',
      growthRate: '0',
    });

    expect(vm.growthRate).toBe(0);
    expect(mapRetirementExpenseVMToDomain(vm).growthRate).toBe(0);
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
