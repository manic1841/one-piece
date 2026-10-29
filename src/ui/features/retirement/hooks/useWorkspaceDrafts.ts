import { useCallback, useState } from 'react';

import { type AuthContext } from '@/application/types';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
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
 * of at each call site.
 */
export function useWorkspaceDrafts({
  householdId,
  auth,
  markDirty,
  run,
  currentYear,
}: UseWorkspaceDraftsArgs) {
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
  const assumptions = useAssumptionDraft(markDirty);
  const rules = useRuleDrafts(markDirty);
  const events = useLifeEventDrafts(markDirty);
  const [startYear, setStartYearState] = useState(currentYear);

  const { resetFrom: resetAssumptions, resetToBlank: blankAssumptions } = assumptions;
  const { replaceAll: replaceRules } = rules;
  const { replaceAll: replaceEvents } = events;

  const setStartYear = useCallback(
    (next: string) => {
      setStartYearState(Number(next));
      markDirty();
    },
    [markDirty],
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
      resetAssumptions(draft.assumptions);
      replaceRules(draft.rules);
      replaceEvents(draft.events);
      setStartYearState(draft.startYear);
      replaceOpening(draft.opening, draft.reportValue);
    },
    [replaceEvents, replaceOpening, replaceRules, resetAssumptions],
  );

  const resetDraftToBlank = useCallback(() => {
    blankAssumptions();
    replaceRules([]);
    replaceEvents([]);
    resetScenarioBase();
  }, [blankAssumptions, replaceEvents, replaceRules, resetScenarioBase]);

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
    assumptions,
    rules,
    events,
    startYear,
    setStartYear,
    replaceAll,
    resetScenarioBase,
    resetDraftToBlank,
    retryOpening,
  };
}
