import { createAssumptionsSchema } from '@/domains/retirement/assumptions';
import { getRetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { calculateProjection } from '@/domains/retirement/calculators';
import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import {
  type ResolveProjectionInputParams,
  resolveProjectionInput,
} from '@/domains/retirement/resolveProjectionInput';

import { type CalculateProjectionOutcome } from './calculateProjection';

export function retirementComparisonBounds(
  input: ResolveProjectionInputParams,
  currentYear: number,
) {
  const bounds = getRetirementAssumptionBounds(currentYear).retirementAge;
  return {
    min: Math.max(bounds.min, Math.max(currentYear, input.startYear) - input.assumptions.birthYear),
    max: Math.min(bounds.max, input.assumptions.lifeExpectancy - 1),
  };
}

/** Re-resolve the rules against the same source facts, never against a shifted annual input. */
export function calculateRetirementAge(
  input: ResolveProjectionInputParams,
  age: number,
  currentYear: number,
): CalculateProjectionOutcome {
  const bounds = retirementComparisonBounds(input, currentYear);
  const parsed = createAssumptionsSchema(currentYear).safeParse({
    ...input.assumptions,
    retirementAge: age,
  });
  if (!parsed.success) {
    return { ok: false, code: 'PROJECTION_VALIDATION_FAILED', issues: parsed.error.issues };
  }
  if (age < bounds.min || age > bounds.max) {
    return { ok: false, code: 'PROJECTION_VALIDATION_FAILED' };
  }

  const comparisonInput = { ...input, assumptions: parsed.data };
  const resolved = resolveProjectionInput(comparisonInput);
  if (!resolved.ok) {
    return {
      ok: false,
      code: 'PROJECTION_RESOLVE_FAILED',
      errors: resolved.errors,
      warnings: resolved.warnings,
    };
  }
  return {
    ok: true,
    comparisonInput,
    calculation: {
      input: resolved.input,
      result: calculateProjection(resolved.input),
      warnings: resolved.warnings,
      config: {
        startYear: input.startYear,
        openingNetWorth: {
          amount: resolved.input.openingNetWorth,
          source: input.opening.source,
          ...(input.opening.anchorYearMonth === undefined
            ? {}
            : { anchorYearMonth: input.opening.anchorYearMonth }),
        },
        assumptions: parsed.data,
        projectionRules: input.rules,
        lifeEvents: input.lifeEvents,
      },
      source: { ruleSources: resolved.ruleSources },
    },
  };
}

export interface RetirementAgeComparison {
  age: number;
  outcome:
    | { ok: true; summary: ProjectionSummary }
    | Extract<CalculateProjectionOutcome, { ok: false }>;
}

/** Only summaries are retained; chart/annual data are rebuilt once an age is applied. */
export function compareRetirementAges(
  input: ResolveProjectionInputParams,
  currentYear: number,
): RetirementAgeComparison[] {
  const { min, max } = retirementComparisonBounds(input, currentYear);
  const comparisons: RetirementAgeComparison[] = [];
  for (let age = min; age <= max; age += 1) {
    const outcome = calculateRetirementAge(input, age, currentYear);
    comparisons.push({
      age,
      outcome: outcome.ok ? { ok: true, summary: outcome.calculation.result.summary } : outcome,
    });
  }
  return comparisons;
}
