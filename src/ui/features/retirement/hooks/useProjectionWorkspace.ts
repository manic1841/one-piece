import { useCallback, useEffect, useRef, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { defaultProjectionName } from '@/shared/projectionName';
import {
  PROJECTION_RESULT_LABELS,
  resolveErrorLabel,
} from '@/ui/constants/retirement/resultLabels';
import { useIndicatorCalculation } from '@/ui/features/retirement/hooks/useIndicatorCalculation';
import { useNameField } from '@/ui/features/retirement/hooks/useNameField';
import { useProjectionCalculate } from '@/ui/features/retirement/hooks/useProjectionCalculate';
import { useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { useProjectionPreload } from '@/ui/features/retirement/hooks/useProjectionPreload';
import { useWorkspaceDraft } from '@/ui/features/retirement/hooks/useWorkspaceDraft';
import { useWorkspaceIndicators } from '@/ui/features/retirement/hooks/useWorkspaceIndicators';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import { useWorkspaceSave } from '@/ui/features/retirement/hooks/useWorkspaceSave';
import { useWorkspaceScenario } from '@/ui/features/retirement/hooks/useWorkspaceScenario';
import { useWorkspaceValidation } from '@/ui/features/retirement/hooks/useWorkspaceValidation';
import {
  type ProjectionWorkspaceStage,
  type WorkspaceCalc,
  type WorkspaceOpening,
  type WorkspaceUndo,
} from '@/ui/features/retirement/types/workspaceTypes';
import { mapProjectionWarningsToVM } from '@/ui/features/retirement/viewmodels/projectionResult.vm';
import { buildWorkspaceDerived } from '@/ui/features/retirement/viewmodels/workspaceDerived.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type { SaveWorkspaceOutcome } from '@/ui/features/retirement/hooks/useWorkspaceSave';
export type { ProjectionWorkspaceStage } from '@/ui/features/retirement/types/workspaceTypes';

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
    saveWorkspaceAsPlan,
  } = useProjectionCmds(householdId);
  const saveForm = useNameField();
  const saveAsPlanForm = useNameField();
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
  const [appliedPlanName, setAppliedPlanName] = useState<string | null>(null);
  const [openingValidationError, setOpeningValidationError] = useState<string | undefined>();
  const [startYearValidationError, setStartYearValidationError] = useState<string | undefined>();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const [savedAsPlan, setSavedAsPlan] = useState(false);
  const [preloadWarning, setPreloadWarning] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  // The rail indicators are created before the draft exists, so they reach the
  // refresh through this ref; it is filled below, once the drafts are wired.
  const indicatorsRef = useRef<(() => Promise<ProjectionSummary>) | undefined>(undefined);
  const indicators = useWorkspaceIndicators(
    () => indicatorsRef.current?.() ?? Promise.reject(new Error('not ready')),
    PROJECTION_RESULT_LABELS.RESOLVE_FAILED,
  );

  const drafts = useWorkspaceDraft({
    householdId,
    auth,
    onDirty: indicators.markOutdated,
    run,
    currentYear,
  });
  const {
    opening,
    reportValue,
    seededRef,
    markSeeded,
    loadOpening,
    retryOpening,
    replaceAll,
    replaceGroups,
    resetBase,
    resetAll,
    setOpeningAmount,
    commitOpeningAmount,
    resetToSnapshot,
    assumptions,
    rules,
    events,
    startYear,
    setStartYear,
    dirty,
    undo,
    rememberEvents,
    markSaved,
    markDirty,
    sectionState,
  } = drafts;

  const clearParams = useCallback(() => {
    // The chosen plan has been applied; nothing in the query is replayable any
    // more, so drop it. `{}` keeps the URL free of a trailing `?`.
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  useProjectionPreload({
    auth,
    householdId,
    fromId,
    run,
    markDirty,
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
    drafts,
    opening,
    startYear,
  });

  const incomeRuleCount = rules.rules.filter((rule) => rule.ruleType === 'income').length;
  const valid = assumptions.valid && rules.valid && events.valid;
  const derived = buildWorkspaceDerived({
    assumptions: assumptions.values,
    rulesReady: valid,
    eventCount: events.events.length,
    ruleCount: rules.rules.length,
    incomeRuleCount,
    opening,
    currentYear,
  });

  const goToPreview = useCallback(() => setStage('preview'), []);
  const goToSetup = useCallback(() => setStage('setup'), []);

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
      goToPreview();
    },
    setOpeningValidationError,
    setStartYearValidationError,
  });

  const backToSetup = useCallback(() => {
    goToSetup();
    resetCalculation();
  }, [goToSetup, resetCalculation]);

  const { run: runIndicators } = useIndicatorCalculation({
    drafts,
    validateOpening,
    calculateProjection,
  });
  useEffect(() => {
    indicatorsRef.current = runIndicators;
  }, [runIndicators]);

  /**
   * What any replacement of the draft invalidates: the saved identity and the
   * gesture undo stack. Both a scenario swap and an applied retirement age go
   * through here, so the list cannot drift between them.
   */
  const dropSavedState = useCallback(() => {
    setSavedId(null);
    setLastSavedName(null);
    setSavedAsPlan(false);
    undo.clear();
  }, [undo]);

  const onScenarioSwapped = useCallback(
    (appliedName: string | null) => {
      setPreloadWarning(null);
      setAppliedPlanName(appliedName);
      resetCalculation();
      goToSetup();
      indicators.reset();
      dropSavedState();
      markDirty();
    },
    [dropSavedState, indicators, markDirty, resetCalculation, goToSetup],
  );

  const { applyPlan, resetToBlank, reapplyPlan } = useWorkspaceScenario({
    householdId,
    planId,
    auth,
    replaceGroups,
    resetDraftsToBlank: resetAll,
    resetBase,
    onSwapped: onScenarioSwapped,
    setWarning: setPreloadWarning,
    clearParams,
  });

  const { save: saveAction, saveAsPlan } = useWorkspaceSave({
    householdId,
    persist,
    saveAsPlanCommand: saveWorkspaceAsPlan,
    takeValidatedPlan,
    setSavedId,
    setLastSavedName,
    setSavedAsPlan,
    markSaved,
  });

  const save = useCallback(
    (name: string) => saveAction(name, calculated === null ? null : calculated.calculation),
    [calculated, saveAction],
  );

  const applyRetirementAge = useCallback(
    (age: number) => {
      if (!applyCalculatedRetirementAge(age)) return;
      assumptions.setField('retirementAge', String(age));
      dropSavedState();
      markDirty();
    },
    [applyCalculatedRetirementAge, assumptions, dropSavedState, markDirty],
  );

  return {
    stage,
    goToPreview,
    backToSetup,
    planId,
    applyPlan,
    resetToBlank,
    reapplyPlan,
    validate,
    revealErrors,
    valid,
    dirty,
    sectionState,
    preloadWarning,
    appliedPlanName,
    opening: {
      value: opening,
      loading: openingLoading,
      error: openingError,
      validationError: openingValidationError,
      startYearError: startYearValidationError,
      hasClosedPeriod: reportValue !== null,
      hasSnapshot: reportValue !== null,
      setOpeningAmount,
      commitOpeningAmount,
      resetToSnapshot,
      reload: retryOpening,
    } satisfies WorkspaceOpening,
    assumptions,
    rules,
    events,
    startYear,
    setStartYear,
    setRetirementAge,
    setAssumptionField,
    derived,
    undo: { canUndo: undo.canUndo, run: undo.run, rememberEvents } satisfies WorkspaceUndo,
    calc: {
      calculated,
      calculating,
      calculate,
      calculateError,
      errorLabels: resolveErrors.map(resolveErrorLabel),
      warningLabels: calculated ? mapProjectionWarningsToVM(calculated.calculation) : [],
      retirementComparisons,
      applyRetirementAge,
    } satisfies WorkspaceCalc,
    save: {
      savedId,
      savedAsPlan,
      save,
      saveAsPlan,
      saveForm,
      lastSavedName,
      saveAsPlanForm,
      defaultName: defaultProjectionName,
    },
    indicators: indicators.indicators,
  };
}
