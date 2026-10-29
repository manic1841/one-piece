import { useCallback, useMemo, useState } from 'react';

import { type ProjectionCalculation } from '@/application/retirement/types';
import { type CalculateProjectionOutcome } from '@/application/retirement/workflows/calculateProjection';
import {
  calculateRetirementAge,
  compareRetirementAges,
} from '@/application/retirement/workflows/compareRetirementAges';
import { type ProjectionResolveError } from '@/domains/retirement/projectionTypes';
import {
  PROJECTION_RESULT_LABELS,
  resolveValidationIssueLabel,
} from '@/ui/constants/retirement/resultLabels';
import { type useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { type useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';
import { mapProjectionResultToVM } from '@/ui/features/retirement/viewmodels/projectionResult.vm';
import {
  type ProjectionSummaryVM,
  mapProjectionSummaryToVM,
} from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { mapRetirementComparison } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

export interface CalculatedProjection {
  projection: ReturnType<typeof mapProjectionResultToVM>;
  summary: ProjectionSummaryVM;
  calculation: ProjectionCalculation;
  comparisonInput: Extract<CalculateProjectionOutcome, { ok: true }>['comparisonInput'];
}

function mapCalculated(
  outcome: Extract<CalculateProjectionOutcome, { ok: true }>,
): CalculatedProjection {
  return {
    projection: mapProjectionResultToVM(outcome.calculation.input, outcome.calculation.result),
    summary: mapProjectionSummaryToVM(outcome.calculation.result.summary),
    calculation: outcome.calculation,
    comparisonInput: outcome.comparisonInput,
  };
}

interface UseProjectionCalculateOptions {
  startYear: number;
  opening: OpeningNetWorthVM;
  calculateProjection: ReturnType<typeof useProjectionCmds>['calculate'];
  validate: ReturnType<typeof useWorkspaceValidation>['validate'];
  takeValidatedPlan: ReturnType<typeof useWorkspaceValidation>['takeValidatedPlan'];
  /** Called once a projection succeeded; the shell drops stale indicators here. */
  onSuccess: () => void;
  setOpeningValidationError: (message: string | undefined) => void;
  setStartYearValidationError: (message: string | undefined) => void;
}

/**
 * Runs CALCULATE and owns its four outcomes: the projection, resolve errors, a
 * readable failure and the busy flag. Validation order lives here so a single
 * press reports the opening, the start year and every draft problem together.
 */
export function useProjectionCalculate({
  startYear,
  opening,
  calculateProjection,
  validate,
  takeValidatedPlan,
  onSuccess,
  setOpeningValidationError,
  setStartYearValidationError,
}: UseProjectionCalculateOptions) {
  const [calculated, setCalculated] = useState<CalculatedProjection | null>(null);
  const [resolveErrors, setResolveErrors] = useState<ProjectionResolveError[]>([]);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const calculate = useCallback(async () => {
    const validation = validate();
    setOpeningValidationError(validation.openingError);
    setStartYearValidationError(validation.startYearError);
    setCalculateError(null);
    setResolveErrors([]);

    const plan = takeValidatedPlan();
    if (plan === null) return;

    setCalculating(true);

    const task = await calculateProjection({
      startYear,
      opening: { source: opening.source, amount: Number(opening.amountText) },
      assumptions: plan.assumptions,
      rules: plan.projectionRules,
      lifeEvents: plan.lifeEvents,
    });
    setCalculating(false);

    if (!task.ok) {
      setCalculateError(getTaskErrorMessage(task, PROJECTION_RESULT_LABELS.CALCULATE_FAILED));
      setCalculated(null);
      return;
    }

    const outcome = task.value;
    if (!outcome.ok) {
      if (outcome.code === 'PROJECTION_RESOLVE_FAILED') {
        setResolveErrors(outcome.errors ?? []);
        setCalculateError(PROJECTION_RESULT_LABELS.RESOLVE_FAILED);
      } else if (outcome.issues !== undefined) {
        setCalculateError(
          outcome.issues
            .map(resolveValidationIssueLabel)
            .join(PROJECTION_RESULT_LABELS.ISSUE_SEPARATOR),
        );
      } else {
        setCalculateError(PROJECTION_RESULT_LABELS.CALCULATE_FAILED);
      }
      setCalculated(null);
      return;
    }

    setCalculated(mapCalculated(outcome));
    onSuccess();
  }, [
    calculateProjection,
    onSuccess,
    opening.amountText,
    opening.source,
    setOpeningValidationError,
    setStartYearValidationError,
    startYear,
    takeValidatedPlan,
    validate,
  ]);

  /** Drops a result and every message that belongs to it. */
  const reset = useCallback(() => {
    setCalculated(null);
    setResolveErrors([]);
    setCalculateError(null);
    setOpeningValidationError(undefined);
    setStartYearValidationError(undefined);
  }, [setOpeningValidationError, setStartYearValidationError]);

  const currentYear = new Date().getFullYear();
  const retirementComparisons = useMemo(
    () =>
      calculated === null
        ? []
        : compareRetirementAges(calculated.comparisonInput, currentYear).map((comparison) =>
            mapRetirementComparison(comparison, calculated.calculation.result.summary),
          ),
    [calculated, currentYear],
  );
  const applyRetirementAge = useCallback(
    (age: number): boolean => {
      if (calculated === null) {
        setCalculateError(PROJECTION_RESULT_LABELS.CALCULATE_FAILED);
        return false;
      }
      const outcome = calculateRetirementAge(calculated.comparisonInput, age, currentYear);
      if (!outcome.ok) {
        setCalculateError(PROJECTION_RESULT_LABELS.CALCULATE_FAILED);
        setResolveErrors(outcome.errors ?? []);
        return false;
      }
      setCalculateError(null);
      setResolveErrors([]);
      setCalculated(mapCalculated(outcome));
      return true;
    },
    [calculated, currentYear],
  );

  return {
    calculated,
    resolveErrors,
    calculateError,
    calculating,
    calculate,
    reset,
    retirementComparisons,
    applyRetirementAge,
  };
}
