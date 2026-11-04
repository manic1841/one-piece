import { useCallback, useState } from 'react';

import { type AuthContext } from '@/application/types';
import { useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { type PlanDraftPayload, usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { type WorkspaceDraft } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { type useLoadingTask } from '@/ui/hooks/useLoadingTask';

interface UseWorkspaceDraftArgs {
  householdId: string | undefined;
  auth: AuthContext;
  /** Called on every user edit: the workspace marks its rail stale here. */
  onDirty: () => void;
  run: ReturnType<typeof useLoadingTask>['run'];
  currentYear: number;
}

/**
 * The whole workspace draft: opening net worth, start year, assumptions, rules
 * and events. They are one draft in practice — a plan or a preload replaces all
 * of it at once — so the wholesale replace/reset helpers live here instead of at
 * each call site. The three input groups belong to the plan draft module.
 *
 * `resetBase` and `resetAll` are separate gestures: applying a plan keeps the
 * three groups and drops the rest, starting over blank drops everything.
 */
export function useWorkspaceDraft({
  householdId,
  auth,
  onDirty,
  run,
  currentYear,
}: UseWorkspaceDraftArgs) {
  const planDrafts = usePlanDrafts({ onDirty });
  const { markDirty } = planDrafts;

  const openingDraft = useOpeningDraft({ householdId, auth, markDirty, run });
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
      markDirty();
    },
    [markDirty],
  );

  /**
   * The parts a plan does not carry: the opening goes back to its unset draft so
   * a scenario is never a mix of two runs, and the start year returns to this
   * year.
   */
  const resetBase = useCallback(() => {
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

  const resetAll = useCallback(() => {
    planDrafts.reset();
    resetBase();
  }, [planDrafts, resetBase]);

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
    replaceGroups: (payload: PlanDraftPayload) => planDrafts.replaceAll(payload),
    startYear,
    setStartYear,
    replaceAll,
    resetBase,
    resetAll,
    retryOpening,
  };
}

export type WorkspaceDraftController = ReturnType<typeof useWorkspaceDraft>;
