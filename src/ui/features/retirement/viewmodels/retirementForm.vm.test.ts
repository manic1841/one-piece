import { describe, expect, it } from 'vitest';

import { CalculationMode } from '@/domains/retirement/types';

import {
  RetirementAssumptionsFormVMSchema,
  buildRetirementEventFormVM,
  buildRetirementExpenseFormVM,
  buildRetirementIncomeFormVM,
  mapRetirementEventVMToDomain,
  mapRetirementExpenseVMToDomain,
  mapRetirementIncomeVMToDomain,
} from './retirementForm.vm';

describe('retirementForm.vm', () => {
  it('builds and maps income form vm', () => {
    const vm = buildRetirementIncomeFormVM(undefined, 2030);
    expect(vm.startYear).toBe(2030);
    expect(vm.endYear).toBe(2050);

    const domain = mapRetirementIncomeVMToDomain({
      ...vm,
      name: 'Salary',
      type: 'salary',
      baseAmount: 120000,
    });

    expect(domain.name).toBe('Salary');
    expect(domain.baseAmount).toBe(120000);
  });

  it('builds and maps expense form vm', () => {
    const vm = buildRetirementExpenseFormVM(undefined, 2030);
    expect(vm.retirementMultiplier).toBe(70);

    const domain = mapRetirementExpenseVMToDomain({
      ...vm,
      name: 'Housing',
      endYear: '2060',
      retirementMultiplier: 80,
    });

    expect(domain.endYear).toBe(2060);
    expect(domain.retirementMultiplier).toBe(0.8);
  });

  it('builds and maps event form vm', () => {
    const vm = buildRetirementEventFormVM(undefined, 2030);
    expect(vm.phases[0]?.startYear).toBe('2030');

    const domain = mapRetirementEventVMToDomain({
      ...vm,
      name: 'One-time cost',
      type: 'expense',
      phases: [
        {
          name: 'Phase 1',
          startYear: '2030',
          endYear: '2030',
          mode: CalculationMode.FIXED,
          amount: '10000',
          growthRate: '0',
          percentage: '0',
          linkedIncomeId: '',
        },
      ],
    });

    expect(domain.phases?.[0]?.startYear).toBe(2030);
    expect(domain.phases?.[0]?.amount).toBe(10000);
  });

  it('validates assumptions vm', () => {
    const parsed = RetirementAssumptionsFormVMSchema.safeParse({
      currentYear: 2025,
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      currentSavings: 100000,
      salaryGrowthRate: 3,
      inflationRate: 2,
      investmentReturnRate: 5,
    });

    expect(parsed.success).toBe(true);
  });
});
