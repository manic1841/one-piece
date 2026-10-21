import { z } from 'zod';

import { getRetirementAssumptionBounds } from './bounds';
import { RetirementSchemaErrorCode } from './errorCodes';
import { addIssue, decimalField, integerField } from './numeric';

interface AssumptionCrossCheckInput {
  retirementAge: number;
  lifeExpectancy: number;
}

function crossCheck(
  value: AssumptionCrossCheckInput,
  currentYear: number,
  birthYear: number,
  ctx: z.RefinementCtx,
): void {
  const currentAge = currentYear - birthYear;

  if (currentAge > 130) {
    addIssue(ctx, RetirementSchemaErrorCode.CURRENT_AGE_TOO_HIGH, ['birthYear'], {
      currentYear,
      birthYear,
      currentAge,
    });
  }

  if (value.lifeExpectancy <= value.retirementAge) {
    addIssue(
      ctx,
      RetirementSchemaErrorCode.LIFE_EXPECTANCY_NOT_AFTER_RETIREMENT,
      ['lifeExpectancy'],
      {
        lifeExpectancy: value.lifeExpectancy,
        retirementAge: value.retirementAge,
      },
    );
  }

  if (value.lifeExpectancy < currentAge) {
    addIssue(
      ctx,
      RetirementSchemaErrorCode.LIFE_EXPECTANCY_BEFORE_CURRENT_AGE,
      ['lifeExpectancy'],
      { lifeExpectancy: value.lifeExpectancy, currentAge },
    );
  }
}

/**
 * Create-time assumptions. The clock is injected so no factory defaults leak
 * into the persisted document.
 */
export function createAssumptionsSchema(currentYear: number) {
  const bounds = getRetirementAssumptionBounds(currentYear);

  return z
    .object({
      birthYear: integerField(bounds.birthYear.min, bounds.birthYear.max),
      retirementAge: integerField(bounds.retirementAge.min, bounds.retirementAge.max),
      lifeExpectancy: integerField(bounds.lifeExpectancy.min, bounds.lifeExpectancy.max),
      inflationRate: decimalField(bounds.inflationRate.min, bounds.inflationRate.max),
      annualReturnRate: decimalField(bounds.annualReturnRate.min, bounds.annualReturnRate.max),
    })
    .superRefine((value, ctx) => {
      crossCheck(value, currentYear, value.birthYear, ctx);
    });
}

/**
 * Update-time assumptions. `birthYear` is immutable, so it is absent from the
 * shape and its stored value is passed in for the same cross-field checks.
 */
export function createAssumptionsUpdateSchema(currentYear: number, birthYear: number) {
  const bounds = getRetirementAssumptionBounds(currentYear);

  return z
    .object({
      retirementAge: integerField(bounds.retirementAge.min, bounds.retirementAge.max),
      lifeExpectancy: integerField(bounds.lifeExpectancy.min, bounds.lifeExpectancy.max),
      inflationRate: decimalField(bounds.inflationRate.min, bounds.inflationRate.max),
      annualReturnRate: decimalField(bounds.annualReturnRate.min, bounds.annualReturnRate.max),
    })
    .superRefine((value, ctx) => {
      crossCheck(value, currentYear, birthYear, ctx);
    });
}

export type RetirementAssumptions = z.infer<ReturnType<typeof createAssumptionsSchema>>;
export type RetirementAssumptionsUpdate = z.infer<ReturnType<typeof createAssumptionsUpdateSchema>>;
