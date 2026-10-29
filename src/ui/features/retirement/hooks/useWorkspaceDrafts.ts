import { useCallback, useState } from 'react';

import { type AuthContext } from '@/application/types';
import { useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { type WorkspaceDraft } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { type useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface UseWorkspaceDraftsArgs {
  householdId: string | undefined;
  auth: AuthContext;
  /** Marks the workspace dirty on every user edit (not on a preload). */
  markDirty: () => void;
  run: ReturnType<typeof useLoadingTask>['run'];
  currentYear: number;
}

/**
 * Everything the user edits: opening net worth, assumptions, rules, events and
 * the start year. They are one draft in practice — a plan or a preload replaces
 * all of it at once — so the wholesale replace/reset helpers live here instead
 * of at each call site. The three groups themselves belong to the draft module.
 */
export function useWorkspaceDrafts({
  householdId,
  auth,
  markDirty,
  run,
  currentYear,
}: UseWorkspaceDraftsArgs) {
  const planDrafts = usePlanDrafts({ onDirty: markDirty });
  const { setDirty } = planDrafts;
  /** Every user edit, whether or not it lands in one of the three groups. */
  const onEdit = useCallback(() => {
    setDirty(true);
    markDirty();
  }, [markDirty, setDirty]);

  const openingDraft = useOpeningDraft({ householdId, auth, markDirty: onEdit, run });
  const {
    opening,
    reportValue,
    seededRef,
    markSeeded,
    loadOpening,
    reload: reloadOpening,
    replace: replaceOpening,
    setOpeningAmount,
    commitOpeningAmount,
    resetToSnapshot,
    resetDraft: resetOpeningDraft,
  } = openingDraft;
  const [startYear, setStartYearState] = useState(currentYear);

  const setStartYear = useCallback(
    (next: string) => {
      setStartYearState(Number(next));
      onEdit();
    },
    [onEdit],
  );

  /**
   * The parts neither a plan nor a blank reset keeps: the opening goes back to
   * its unset draft so a scenario is never a mix of two runs.
   */
  const resetScenarioBase = useCallback(() => {
    resetOpeningDraft();
    setStartYearState(currentYear);
  }, [currentYear, resetOpeningDraft]);

  const replaceAll = useCallback(
    (draft: WorkspaceDraft) => {
      planDrafts.replaceAll({
        assumptions: draft.assumptions,
        projectionRules: draft.rules,
        lifeEvents: draft.events,
      });
      setStartYearState(draft.startYear);
      replaceOpening(draft.opening, draft.reportValue);
    },
    [planDrafts, replaceOpening],
  );

  const resetDraftToBlank = useCallback(() => {
    planDrafts.reset();
    resetScenarioBase();
  }, [planDrafts, resetScenarioBase]);

  const retryOpening = useCallback(() => {
    void reloadOpening();
  }, [reloadOpening]);

  return {
    opening,
    reportValue,
    seededRef,
    markSeeded,
    loadOpening,
    replaceOpening,
    setOpeningAmount,
    commitOpeningAmount,
    resetToSnapshot,
    ...planDrafts,
    /** The three groups only: what a plan carries. */
    replaceGroups: planDrafts.replaceAll,
    startYear,
    setStartYear,
    replaceAll,
    resetScenarioBase,
    resetDraftToBlank,
    retryOpening,
  };
}
