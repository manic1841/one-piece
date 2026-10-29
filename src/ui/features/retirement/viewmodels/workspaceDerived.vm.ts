import { getRetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { type AssumptionsVM } from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import {
  assumptionsFilled,
  currentAgeFor,
  finalYearFor,
  retirementAgeRange,
  retirementYearFor,
} from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import {
  type OpeningNetWorthVM,
  openingSchema,
} from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import {
  buildProgress,
  buildReadiness,
} from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';

interface BuildWorkspaceDerivedOptions {
  assumptions: AssumptionsVM;
  rulesReady: boolean;
  eventCount: number;
  ruleCount: number;
  incomeRuleCount: number;
  opening: OpeningNetWorthVM;
  currentYear: number;
}

/**
 * Numbers the shell derives from the draft: readiness, the progress dots and
 * the retirement-age bounds. Pure reads, so they are recomputed on every render
 * and the controller does not have to re-list each field.
 */
export function buildWorkspaceDerived({
  assumptions,
  rulesReady,
  eventCount,
  ruleCount,
  incomeRuleCount,
  opening,
  currentYear,
}: BuildWorkspaceDerivedOptions) {
  const openingResolved =
    opening.amountText.trim() !== '' && openingSchema.safeParse(opening).success;

  return {
    openingResolved,
    /** Numeric reads of the assumption strings, so render never parses them. */
    birthYear: Number(assumptions.birthYear),
    lifeExpectancy: Number(assumptions.lifeExpectancy),
    finalYear: finalYearFor(assumptions.birthYear, assumptions.lifeExpectancy),
    readiness: buildReadiness({
      valid: rulesReady,
      incomeRuleCount,
      openingResolved,
    }),
    ageRange: retirementAgeRange(
      currentAgeFor(assumptions.birthYear, currentYear),
      Number(assumptions.lifeExpectancy) || 90,
    ),
    retirementYear: retirementYearFor(assumptions.birthYear, assumptions.retirementAge),
    assumptionBounds: getRetirementAssumptionBounds(currentYear),
    progress: buildProgress({
      hasBaseline: openingResolved,
      assumptionsFilled: assumptionsFilled(assumptions),
      incomeRuleCount,
      expenseRuleCount: ruleCount - incomeRuleCount,
      eventCount,
    }),
  };
}

export type WorkspaceDerivedVM = ReturnType<typeof buildWorkspaceDerived>;
