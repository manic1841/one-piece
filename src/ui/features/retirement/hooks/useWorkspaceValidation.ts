import { useCallback } from 'react';

import { PROJECTION_RESULT_LABELS } from '@/ui/constants/retirement/resultLabels';
import { type usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import {
  type OpeningNetWorthVM,
  openingSchema,
  startYearSchema,
} from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';

interface UseWorkspaceValidationOptions {
  /** The one draft gate. Only its all-or-nothing half is used for writing. */
  drafts: Pick<ReturnType<typeof usePlanDrafts>, 'validate' | 'revealAll' | 'takeValidated'>;
  opening: OpeningNetWorthVM;
  startYear: number;
}

/**
 * The workspace's share of the gate: the two fields the plan form does not have.
 * The three draft groups belong to the draft module, so this adapter only
 * reports the opening and start-year messages CALCULATE prints under its fields.
 */
export function useWorkspaceValidation({
  drafts,
  opening,
  startYear,
}: UseWorkspaceValidationOptions) {
  const validateOpening = useCallback(
    (): string | undefined =>
      openingSchema.safeParse(opening).success
        ? undefined
        : PROJECTION_RESULT_LABELS.OPENING_INVALID,
    [opening],
  );

  const validateStartYear = useCallback(
    (): string | undefined =>
      startYearSchema.safeParse(startYear).success
        ? undefined
        : PROJECTION_RESULT_LABELS.START_YEAR_INVALID,
    [startYear],
  );

  /** The draft outcomes plus the two field messages CALCULATE prints. */
  const validate = useCallback(
    () => ({
      ...drafts.validate(),
      openingError: validateOpening(),
      startYearError: validateStartYear(),
    }),
    [drafts, validateOpening, validateStartYear],
  );

  return {
    validate,
    revealErrors: drafts.revealAll,
    takeValidatedPlan: drafts.takeValidated,
    validateOpening,
    validateStartYear,
  };
}
