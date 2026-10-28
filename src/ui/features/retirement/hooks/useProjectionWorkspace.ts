import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { type RetirementPlan } from '@/domains/retirement/types';
import { defaultProjectionName } from '@/shared/projectionName';
import {
  PROJECTION_RESULT_LABELS,
  resolveErrorLabel,
} from '@/ui/constants/retirement/resultLabels';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { usePlanPreload } from '@/ui/features/retirement/hooks/usePlanPreload';
import { useProjectionCalculate } from '@/ui/features/retirement/hooks/useProjectionCalculate';
import { useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { useProjectionPreload } from '@/ui/features/retirement/hooks/useProjectionPreload';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
import { useWorkspaceDerived } from '@/ui/features/retirement/hooks/useWorkspaceDerived';
import { useWorkspaceIndicators } from '@/ui/features/retirement/hooks/useWorkspaceIndicators';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import {
  type SaveWorkspaceOutcome,
  useWorkspaceSave,
} from '@/ui/features/retirement/hooks/useWorkspaceSave';
import { useWorkspaceUndo } from '@/ui/features/retirement/hooks/useWorkspaceUndo';
import { useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';
import { mapProjectionWarningsToVM } from '@/ui/features/retirement/viewmodels/projectionResult.vm';
import { type WorkspaceDraft } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type ProjectionWorkspaceStage = 'setup' | 'preview';

export type { SaveWorkspaceOutcome } from '@/ui/features/retirement/hooks/useWorkspaceSave';

/**
 * Controller for the projection workspace shell. The draft is a single
 * in-memory object; switching stages never changes the route and never drops
 * it. Every edit marks the workspace dirty, and leaving is gated through
 * `useConfirm` for both router navigation and refresh.
 */
export function useProjectionWorkspace(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const {
    calculate: calculateProjection,
    persist,
    saveForm,
    submitSaveForm,
    saveWorkspaceAsPlan,
    planForm,
    submitPlanForm,
  } = useProjectionCmds(householdId);
  const [searchParams, setSearchParams] = useSearchParams();
  const fromId = searchParams.get('from');
  const planId = searchParams.get('plan');
  const {
    loading: openingLoading,
    error: openingError,
    run,
  } = useLoadingTask({
    initiallyLoading: true,
  });

  const [stage, setStage] = useState<ProjectionWorkspaceStage>('setup');
  const [dirty, setDirty] = useState(false);
  const [appliedPlanName, setAppliedPlanName] = useState<string | null>(null);
  const [openingValidationError, setOpeningValidationError] = useState<string | undefined>();
  const [startYearValidationError, setStartYearValidationError] = useState<string | undefined>();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const [savedAsPlan, setSavedAsPlan] = useState(false);
  const [startYear, setStartYearState] = useState(() => new Date().getFullYear());
  const [preloadWarning, setPreloadWarning] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const calculateIndicatorsRef = useRef<(() => Promise<ProjectionSummary>) | undefined>(undefined);
  const indicators = useWorkspaceIndicators(
    () => calculateIndicatorsRef.current?.() ?? Promise.reject(new Error('not ready')),
    PROJECTION_RESULT_LABELS.RESOLVE_FAILED,
  );
  const undo = useWorkspaceUndo();

  const markDirty = useCallback(() => {
    setDirty(true);
    indicators.markOutdated();
  }, [indicators]);
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
  const { resetFrom: resetAssumptions } = assumptions;
  const { replaceAll: replaceRules } = rules;
  const { replaceAll: replaceEvents } = events;

  const clearParams = useCallback(() => {
    // The chosen plan has been applied; nothing in the query is replayable any
    // more, so drop it. `{}` keeps the URL free of a trailing `?`.
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

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

  useProjectionPreload({
    auth,
    householdId,
    fromId,
    run,
    setDirty,
    setWarning: setPreloadWarning,
    replaceAll,
    markSeeded,
    clearParams,
  });

  useEffect(() => {
    if (fromId === null && !seededRef.current) void loadOpening();
  }, [fromId, loadOpening, seededRef]);

  // Router blocker: an in-app navigation away from a dirty workspace asks first.
  // Refresh / tab close uses the browser dialog instead. Both live in the guard.
  useWorkspaceLeaveGuard(dirty);

  const retryOpening = useCallback(() => {
    void reloadOpening();
  }, [reloadOpening]);

  const setStartYear = useCallback(
    (next: string) => {
      setStartYearState(Number(next));
      markDirty();
    },
    [markDirty],
  );

  const setRetirementAge = useCallback(
    (next: string) => {
      assumptions.setField('retirementAge', next);
      indicators.schedule();
    },
    [assumptions, indicators],
  );

  const setAssumptionField = useCallback(
    (field: Parameters<typeof assumptions.setField>[0], value: string) => {
      assumptions.setField(field, value);
    },
    [assumptions],
  );

  const { validate, revealErrors, takeValidatedPlan, validateOpening } = useWorkspaceValidation({
    assumptions,
    rules,
    events,
    opening,
    startYear,
  });

  const incomeRuleCount = rules.rules.filter((rule) => rule.ruleType === 'income').length;
  const valid = assumptions.valid && rules.valid && events.valid;
  const derived = useWorkspaceDerived({
    assumptions: assumptions.values,
    rulesReady: valid,
    eventCount: events.events.length,
    ruleCount: rules.rules.length,
    incomeRuleCount,
    opening,
    currentYear,
  });

  const {
    calculated,
    resolveErrors,
    calculateError,
    calculating,
    calculate,
    reset: resetCalculation,
    retirementComparisons,
    applyRetirementAge: applyCalculatedRetirementAge,
  } = useProjectionCalculate({
    startYear,
    opening,
    calculateProjection,
    validate,
    takeValidatedPlan,
    onSuccess: () => {
      indicators.reset();
      setStage('preview');
    },
    setOpeningValidationError,
    setStartYearValidationError,
  });

  const applyPlan = useCallback(
    (plan: RetirementPlan) => {
      assumptions.resetFrom(plan.assumptions);
      rules.replaceAll(plan.projectionRules);
      events.replaceAll(plan.lifeEvents);
      // A plan carries assumptions, rules and events only. Everything else goes
      // back to its blank default so the result is not a mix of two scenarios.
      resetOpeningDraft();
      setStartYearState(currentYear);
      setSavedId(null);
      setLastSavedName(null);
      setSavedAsPlan(false);
      setPreloadWarning(null);
      setAppliedPlanName(plan.name);
      resetCalculation();
      setStage('setup');
      indicators.reset();
      undo.clear();
      markDirty();
    },
    [
      assumptions,
      currentYear,
      events,
      indicators,
      markDirty,
      resetCalculation,
      resetOpeningDraft,
      rules,
      undo,
    ],
  );

  const applyPlanById = usePlanPreload({
    householdId,
    planId,
    auth,
    applyPlan,
    setWarning: setPreloadWarning,
    clearParams,
  });

  /**
   * Re-apply the plan already in the query. Picking the same plan again keeps
   * the URL identical, so the preload effect will not fire on its own.
   */
  const reapplyPlan = useCallback(() => {
    if (planId !== null) void applyPlanById(planId);
  }, [applyPlanById, planId]);

  /**
   * Discard everything and start over blank. The route does not change element
   * on a same-path restart, so nothing unmounts — the reset has to happen here.
   */
  const resetToBlank = useCallback(() => {
    assumptions.resetToBlank();
    rules.replaceAll([]);
    events.replaceAll([]);
    resetOpeningDraft();
    setStartYearState(currentYear);
    setSavedId(null);
    setLastSavedName(null);
    setSavedAsPlan(false);
    setPreloadWarning(null);
    setAppliedPlanName(null);
    resetCalculation();
    setStage('setup');
    indicators.reset();
    undo.clear();
    markDirty();
  }, [
    assumptions,
    currentYear,
    events,
    indicators,
    markDirty,
    resetCalculation,
    resetOpeningDraft,
    rules,
    undo,
  ]);

  const goToPreview = useCallback(() => setStage('preview'), []);

  const backToSetup = useCallback(() => {
    setStage('setup');
    resetCalculation();
  }, [resetCalculation]);

  const calculateIndicators = useCallback(async (): Promise<ProjectionSummary> => {
    const assumptionsResult = assumptions.validate();
    const openingError = validateOpening();
    if (
      !assumptionsResult.ok ||
      assumptionsResult.data === undefined ||
      openingError !== undefined
    ) {
      throw new Error(openingError ?? 'invalid');
    }

    // Only opening and assumptions gate the preview, but rules and events shape
    // the numbers, so a parseable draft is always included in the sum.
    const ruleResult = rules.validate();
    const eventResult = events.validate();

    const task = await calculateProjection({
      startYear,
      opening: { source: opening.source, amount: Number(opening.amountText) },
      assumptions: assumptionsResult.data,
      rules: ruleResult.data ?? [],
      lifeEvents: eventResult.data ?? [],
    });
    if (!task.ok || !task.value.ok) throw new Error('calculate failed');
    return task.value.calculation.result.summary;
  }, [assumptions, calculateProjection, events, opening, rules, startYear, validateOpening]);
  useEffect(() => {
    calculateIndicatorsRef.current = calculateIndicators;
  }, [calculateIndicators]);

  const { save: saveAction, saveAsPlan } = useWorkspaceSave({
    householdId,
    persist,
    saveAsPlanCommand: saveWorkspaceAsPlan,
    takeValidatedPlan,
    setSavedId,
    setLastSavedName: (name) => {
      setLastSavedName(name);
      undo.clear();
    },
    setSavedAsPlan,
  });

  const save = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> =>
      saveAction(name, calculated === null ? null : calculated.calculation),
    [calculated, saveAction],
  );

  const applyRetirementAge = useCallback(
    (age: number) => {
      if (!applyCalculatedRetirementAge(age)) return;
      assumptions.setField('retirementAge', String(age));
      setSavedId(null);
      setSavedAsPlan(false);
      undo.clear();
      markDirty();
    },
    [applyCalculatedRetirementAge, assumptions, markDirty, undo],
  );

  return {
    stage,
    opening,
    preloadWarning,
    assumptions,
    rules,
    events,
    appliedPlanName,
    planId,
    applyPlan,
    resetToBlank,
    reapplyPlan,
    validate,
    revealErrors,
    valid,
    dirty,
    calculated,
    retirementComparisons,
    applyRetirementAge,
    warningLabels: calculated ? mapProjectionWarningsToVM(calculated.calculation) : [],
    errorLabels: resolveErrors.map(resolveErrorLabel),
    calculateError,
    calculating,
    savedId,
    savedAsPlan,
    calculate,
    save,
    saveAsPlan,
    saveForm,
    lastSavedName,
    submitSave: (onSuccess?: () => void) =>
      submitSaveForm(async (name) => {
        const outcome = await save(name);
        if (outcome.ok) onSuccess?.();
        return outcome;
      }),
    saveAsPlanForm: planForm,
    submitSaveAsPlan: (onSuccess?: () => void) =>
      submitPlanForm(async (name) => {
        const outcome = await saveAsPlan(name);
        if (outcome.ok) onSuccess?.();
        return outcome;
      }),
    startYear,
    setStartYear,
    openingValidationError,
    startYearValidationError,
    openingLoading,
    openingError,
    hasClosedPeriod: reportValue !== null,
    hasSnapshot: reportValue !== null,
    setOpeningAmount,
    commitOpeningAmount,
    resetToSnapshot,
    retryOpening,
    defaultName: defaultProjectionName,
    goToPreview,
    backToSetup,
    indicators: indicators.indicators,
    readiness: derived.readiness,
    progress: derived.progress,
    ageRange: derived.ageRange,
    assumptionBounds: derived.assumptionBounds,
    retirementYear: derived.retirementYear,
    setRetirementAge,
    setAssumptionField,
    undo: undo.undo,
    canUndo: undo.canUndo,
    pushUndo: undo.push,
  };
}
