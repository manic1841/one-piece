import { describe, expect, it } from 'vitest';

import {
  collectAssumptionErrors,
  createAssumptionFormSchema,
  decimalToPercentText,
  mapAssumptionsToVM,
  mapAssumptionsVMToDomain,
  percentToDecimal,
} from './assumptionForm.vm';

const valid = {
  birthYear: '1980',
  retirementAge: '65',
  lifeExpectancy: '90',
  inflationRate: '2',
  annualReturnRate: '5',
};

describe('assumptionForm.vm', () => {
  it('round-trips percentages at four decimal places', () => {
    expect(percentToDecimal('2.5')).toBe(0.025);
    expect(percentToDecimal('2.12345')).toBe(0.0212);
    expect(decimalToPercentText(0.02)).toBe('2');
  });

  it('maps the VM to domain values', () => {
    expect(mapAssumptionsVMToDomain(valid)).toEqual({
      birthYear: 1980,
      retirementAge: 65,
      lifeExpectancy: 90,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    });
  });

  it('maps domain values back to percentage text', () => {
    expect(
      mapAssumptionsToVM({
        birthYear: 1980,
        retirementAge: 65,
        lifeExpectancy: 90,
        inflationRate: 0.02,
        annualReturnRate: 0.05,
      }),
    ).toEqual(valid);
  });

  it('attributes a non-integer issue to its own field', () => {
    const parsed = createAssumptionFormSchema(2026).safeParse({
      ...valid,
      retirementAge: 'abc',
    });

    expect(parsed.success).toBe(false);
    expect(collectAssumptionErrors(parsed.error!)).toEqual({ retirementAge: '必須是整數' });
  });

  it('keeps the first label when a field has several issues', () => {
    const parsed = createAssumptionFormSchema(2026).safeParse({
      ...valid,
      inflationRate: '99',
    });

    expect(collectAssumptionErrors(parsed.error!)).toEqual({ inflationRate: '超出允許範圍' });
  });
});
