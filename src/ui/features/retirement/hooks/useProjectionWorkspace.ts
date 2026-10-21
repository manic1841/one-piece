import { useCallback, useEffect, useState } from 'react';

import { useSearchParams } from 'react-router-dom';

import { type ProjectionCalculation } from '@/application/retirement/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionResolveError } from '@/domains/retirement/logic/projectionTypes';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { type RetirementPlan } from '@/domains/retirement/types';
import { defaultProjectionName } from '@/shared/projectionName';
import {
  PROJECTION_RESULT_LABELS,
  resolveErrorLabel,
  resolveValidationIssueLabel,
} from '@/ui/constants/retirement/resultLabels';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { useProjectionCmds } from '@/ui/features/retirement/hooks/useProjectionCmds';
import { useProjectionPreload } from '@/ui/features/retirement/hooks/useProjectionPreload';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
import { useWorkspaceLeaveGuard } from '@/ui/features/retirement/hooks/useWorkspaceLeaveGuard';
import {
  type SaveWorkspaceOutcome,
  useWorkspaceSave,
} from '@/ui/features/retirement/hooks/useWorkspaceSave';
import { mapProjectionResultToVM } from '@/ui/features/retirement/viewmodels/projectionResultVm';
import {
  type ProjectionSummaryVM,
  mapProjectionSummaryToVM,
} from '@/ui/features/retirement/viewmodels/projectionViewVm';
import {
  type WorkspaceDraft,
  openingSchema,
  startYearSchema,
} from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type ProjectionWorkspaceStage = 'setup' | 'preview';

export type { SaveWorkspaceOutcome } from '@/ui/features/retirement/hooks/useWorkspaceSave';

interface ValidatedPlan {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

interface CalculatedProjection {
  projection: ReturnType<typeof mapProjectionResultToVM>;
  summary: ProjectionSummaryVM;
  calculation: ProjectionCalculation;
}

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
  const [calculated, setCalculated] = useState<CalculatedProjection | null>(null);
  const [resolveErrors, setResolveErrors] = useState<ProjectionResolveError[]>([]);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSavedName, setLastSavedName] = useState<string | null>(null);
  const [savedAsPlan, setSavedAsPlan] = useState(false);
  const [startYear, setStartYearState] = useState(() => new Date().getFullYear());
  const [preloadWarning, setPreloadWarning] = useState<string | null>(null);

  const markDirty = useCallback(() => setDirty(true), []);
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
    enterManual,
    useReportValue,
  } = openingDraft;
  const assumptions = useAssumptionDraft(markDirty);
  const rules = useRuleDrafts(markDirty);
  const events = useLifeEventDrafts(markDirty);
  const { resetFrom: resetAssumptions } = assumptions;
  const { replaceAll: replaceRules } = rules;
  const { replaceAll: replaceEvents } = events;

  const clearParams = useCallback(() => {
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

  const applyPlan = useCallback(
    (plan: RetirementPlan) => {
      assumptions.resetFrom(plan.assumptions);
      rules.replaceAll(plan.projectionRules);
      events.replaceAll(plan.lifeEvents);
      setAppliedPlanName(plan.name);
      setCalculated(null);
      setResolveErrors([]);
      setCalculateError(null);
      setStage('setup');
      markDirty();
    },
    [assumptions, events, markDirty, rules],
  );

  const validateOpening = useCallback((): string | undefined => {
    const parsed = openingSchema.safeParse(opening);
    return parsed.success ? undefined : PROJECTION_RESULT_LABELS.OPENING_INVALID;
  }, [opening]);

  const validateStartYear = useCallback((): string | undefined => {
    return startYearSchema.safeParse(startYear).success
      ? undefined
      : PROJECTION_RESULT_LABELS.START_YEAR_INVALID;
  }, [startYear]);

  const validateCore = useCallback(() => {
    const assumptionsResult = assumptions.validate();
    const rulesResult = rules.validate();
    const eventsResult = events.validate();

    return {
      assumptions: assumptionsResult,
      rules: rulesResult,
      events: eventsResult,
    };
  }, [assumptions, events, rules]);

  const validate = useCallback(() => {
    const core = validateCore();
    const openingError = validateOpening();
    const startYearError = validateStartYear();

    return {
      ok:
        core.assumptions.ok &&
        core.rules.ok &&
        core.events.ok &&
        openingError === undefined &&
        startYearError === undefined,
      ...core,
      openingError,
      startYearError,
    };
  }, [validateCore, validateOpening, validateStartYear]);

  const revealErrors = useCallback(() => {
    assumptions.revealAll();
    rules.revealAll();
    events.revealAll();
  }, [assumptions, events, rules]);

  const valid = assumptions.valid && rules.valid && events.valid;

  const goToPreview = useCallback(() => setStage('preview'), []);

  const backToSetup = useCallback(() => {
    setStage('setup');
    setCalculated(null);
    setResolveErrors([]);
    setCalculateError(null);
    setOpeningValidationError(undefined);
    setStartYearValidationError(undefined);
  }, []);

  /** Validation gate shared by CALCULATE and SAVE AS PLAN; reveals errors. */
  const takeValidatedPlan = useCallback((): ValidatedPlan | null => {
    const validation = validate();
    const { data: assumptions } = validation.assumptions;
    const { data: rules } = validation.rules;
    const { data: lifeEvents } = validation.events;

    if (!validation.ok || !assumptions || !rules || !lifeEvents) {
      revealErrors();
      return null;
    }

    return { assumptions, rules, lifeEvents };
  }, [revealErrors, validate]);

  const { save: saveAction, saveAsPlan } = useWorkspaceSave({
    householdId,
    persist,
    saveAsPlanCommand: saveWorkspaceAsPlan,
    takeValidatedPlan,
    setSavedId,
    setLastSavedName,
    setSavedAsPlan,
  });

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
      opening: {
        source: opening.source,
        amount: Number(opening.amountText),
      },
      ...plan,
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

    setCalculated({
      projection: mapProjectionResultToVM(outcome.calculation.input, outcome.calculation.result),
      summary: mapProjectionSummaryToVM(outcome.calculation.result.summary),
      calculation: outcome.calculation,
    });
    setStage('preview');
  }, [
    calculateProjection,
    opening.amountText,
    opening.source,
    startYear,
    takeValidatedPlan,
    validate,
  ]);

  const save = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> =>
      saveAction(name, calculated === null ? null : calculated.calculation),
    [calculated, saveAction],
  );

  return {
    stage,
    opening,
    preloadWarning,
    assumptions,
    rules,
    events,
    appliedPlanName,
    applyPlan,
    validate,
    revealErrors,
    valid,
    dirty,
    calculated,
    warningLabels: calculated?.calculation.warnings.map(resolveErrorLabel) ?? [],
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
    setOpeningAmount,
    enterManual,
    useReportValue,
    retryOpening,
    defaultName: defaultProjectionName,
    goToPreview,
    backToSetup,
  };
}
