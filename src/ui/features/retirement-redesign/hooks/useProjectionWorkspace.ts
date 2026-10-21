import { useCallback, useEffect, useRef, useState } from 'react';

import { useBlocker, useSearchParams } from 'react-router-dom';

import { createProjectionUseCase } from '@/application/retirement/use_cases/createProjectionUseCase';
import { getStartingNetWorthUseCase } from '@/application/retirement/use_cases/getStartingNetWorthUseCase';
import { type RetirementPlanWorkspaceData } from '@/application/retirement/use_cases/retirementPlanLookup';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import {
  type ProjectionResolveError,
  type ProjectionSummary,
} from '@/domains/retirement/logic/projectionTypes';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import {
  PROJECTION_RESULT_LABELS,
  resolveErrorLabel,
} from '@/ui/constants/retirement-redesign/resultLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { useAssumptionDraft } from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';
import { useProjectionPreload } from '@/ui/features/retirement-redesign/hooks/useProjectionPreload';
import { useRuleDrafts } from '@/ui/features/retirement-redesign/hooks/useRuleDrafts';
import { mapProjectionResultToVM } from '@/ui/features/retirement-redesign/viewmodels/projectionResultVm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export type { ProjectionSummary } from '@/domains/retirement/logic/projectionTypes';

export type ProjectionWorkspaceStage = 'setup' | 'preview';
export type OpeningNetWorthSource = 'derived' | 'manual';

export interface OpeningNetWorthVM {
  source: OpeningNetWorthSource;
  /** Raw field value; kept as a string at the field boundary. */
  amountText: string;
  /** Only present while the value is derived. */
  anchorYearMonth: string | null;
}

interface ReportValue {
  amountText: string;
  anchorYearMonth: string;
}

const EMPTY_OPENING: OpeningNetWorthVM = {
  source: 'derived',
  amountText: '',
  anchorYearMonth: null,
};

interface ValidatedPlan {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

interface CalculatedProjection {
  projection: ReturnType<typeof mapProjectionResultToVM>;
  summary: ProjectionSummary;
  warnings: ProjectionResolveError[];
  source: ValidatedPlan;
}

/**
 * Controller for the projection workspace shell. The draft is a single
 * in-memory object; switching stages never changes the route and never drops
 * it. Every edit marks the workspace dirty, and leaving is gated through
 * `useConfirm` for both router navigation and refresh.
 */
export function useProjectionWorkspace(householdId: string | undefined) {
  const auth = useAuthIdentity();
  const { confirm } = useConfirm();
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
  const [opening, setOpening] = useState<OpeningNetWorthVM>(EMPTY_OPENING);
  const [reportValue, setReportValue] = useState<ReportValue | null>(null);
  const [dirty, setDirty] = useState(false);
  const [appliedPlanName, setAppliedPlanName] = useState<string | null>(null);
  const [openingValidationError, setOpeningValidationError] = useState<string | undefined>();
  const [calculated, setCalculated] = useState<CalculatedProjection | null>(null);
  const [resolveErrors, setResolveErrors] = useState<ProjectionResolveError[]>([]);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [startYear, setStartYear] = useState(() => new Date().getFullYear());
  const [preloadWarning, setPreloadWarning] = useState<string | null>(null);

  const seededRef = useRef(false);
  const preloadStartedRef = useRef<string | null>(null);
  const promptingRef = useRef(false);

  const markDirty = useCallback(() => setDirty(true), []);
  const assumptions = useAssumptionDraft(markDirty);
  const rules = useRuleDrafts(markDirty);
  const events = useLifeEventDrafts(markDirty);
  const { resetFrom: resetAssumptions } = assumptions;
  const { replaceAll: replaceRules } = rules;
  const { replaceAll: replaceEvents } = events;

  const loadOpening = useCallback(async () => {
    await run(
      async () => {
        if (!householdId) return { reason: 'NO_CLOSED_PERIOD' as const };
        return getStartingNetWorthUseCase.execute({ householdId, auth });
      },
      {
        writeBack: (result) => {
          if (!result.ok || seededRef.current) return;
          seededRef.current = true;

          if ('reason' in result.value) {
            setReportValue(null);
            setOpening(EMPTY_OPENING);
            return;
          }

          const seeded: ReportValue = {
            amountText: String(result.value.startingNetWorth),
            anchorYearMonth: result.value.anchorYearMonth,
          };
          setReportValue(seeded);
          setOpening({
            source: 'derived',
            amountText: seeded.amountText,
            anchorYearMonth: seeded.anchorYearMonth,
          });
        },
      },
    );
  }, [auth, householdId, run]);

  const markSeeded = useCallback(() => {
    seededRef.current = true;
  }, []);
  const clearParams = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const preloadFromProjection = useProjectionPreload({
    auth,
    householdId,
    run,
    setDirty,
    setWarning: setPreloadWarning,
    setOpening,
    setReportValue,
    setStartYear,
    resetAssumptions,
    replaceRules,
    replaceEvents,
    markSeeded,
    clearParams,
  });

  useEffect(() => {
    if (fromId === null) {
      if (!seededRef.current) void loadOpening();
      return;
    }
    if (preloadStartedRef.current === fromId) return;

    // Start after the current task: StrictMode tears the first mount down before
    // its run could settle, and the cleanup below lets the second mount start it.
    preloadStartedRef.current = fromId;
    const timer = setTimeout(() => void preloadFromProjection(fromId), 0);
    return () => {
      clearTimeout(timer);
      preloadStartedRef.current = null;
    };
  }, [fromId, loadOpening, preloadFromProjection]);

  // Router blocker: an in-app navigation away from a dirty workspace asks first.
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== 'blocked' || promptingRef.current) return;
    promptingRef.current = true;

    void confirm({
      title: PROJECTION_WORKSPACE_LABELS.LEAVE_TITLE,
      context: PROJECTION_WORKSPACE_LABELS.LEAVE_CONTEXT,
      consequence: PROJECTION_WORKSPACE_LABELS.LEAVE_CONSEQUENCE,
      confirmLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CONFIRM,
      cancelLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CANCEL,
    }).then((confirmed) => {
      promptingRef.current = false;
      if (confirmed) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);

  // Refresh / tab close: the browser dialog has no confirm UI of ours.
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const setOpeningAmount = useCallback(
    (amountText: string) => {
      setOpening((current) => ({ ...current, amountText }));
      markDirty();
    },
    [markDirty],
  );

  const enterManual = useCallback(() => {
    setOpening((current) => ({ ...current, source: 'manual', anchorYearMonth: null }));
    markDirty();
  }, [markDirty]);

  const useManualValue = enterManual;

  const useReportValue = useCallback(() => {
    if (!reportValue) return;
    setOpening({ source: 'derived', ...reportValue });
    markDirty();
  }, [markDirty, reportValue]);

  const retryOpening = useCallback(() => {
    void loadOpening();
  }, [loadOpening]);

  const applyPlan = useCallback(
    (plan: RetirementPlanWorkspaceData) => {
      assumptions.resetFrom(plan.assumptions);
      rules.replaceAll(plan.rules);
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

  /** One call the setup stage can use before saving: the three schema groups. */
  const validateOpening = useCallback((): string | undefined => {
    if (opening.source !== 'manual') return undefined;
    const text = opening.amountText.trim();
    const amount = Number(text);
    if (text === '' || !Number.isInteger(amount)) {
      return PROJECTION_RESULT_LABELS.OPENING_INVALID;
    }
    return undefined;
  }, [opening.amountText, opening.source]);

  const validate = useCallback(() => {
    const assumptionsResult = assumptions.validate();
    const rulesResult = rules.validate();
    const eventsResult = events.validate();
    const openingError = validateOpening();

    return {
      ok: assumptionsResult.ok && rulesResult.ok && eventsResult.ok && openingError === undefined,
      assumptions: assumptionsResult,
      rules: rulesResult,
      events: eventsResult,
      openingError,
    };
  }, [assumptions, events, rules, validateOpening]);

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
  }, []);

  const calculate = useCallback(async () => {
    const validation = validate();
    setOpeningValidationError(validation.openingError);
    setCalculateError(null);
    setResolveErrors([]);

    const { data: assumptionData } = validation.assumptions;
    const { data: ruleData } = validation.rules;
    const { data: eventData } = validation.events;

    if (!validation.ok || !assumptionData || !ruleData || !eventData) {
      revealErrors();
      return;
    }

    const plan: ValidatedPlan = {
      assumptions: assumptionData,
      rules: ruleData,
      lifeEvents: eventData,
    };

    setCalculating(true);

    const outcome = await createProjectionUseCase.execute({
      householdId: householdId ?? '',
      auth,
      startYear,
      opening: {
        source: opening.source,
        amount: Number(opening.amountText),
      },
      ...plan,
      persist: false,
    });
    setCalculating(false);

    if (!outcome.ok) {
      if (outcome.code === 'PROJECTION_RESOLVE_FAILED') {
        setResolveErrors(outcome.errors ?? []);
        setCalculateError(PROJECTION_RESULT_LABELS.RESOLVE_FAILED);
      } else {
        setCalculateError(PROJECTION_RESULT_LABELS.CALCULATE_FAILED);
      }
      setCalculated(null);
      return;
    }

    setCalculated({
      projection: mapProjectionResultToVM(outcome.input, outcome.result),
      summary: outcome.result.summary,
      warnings: outcome.warnings,
      source: plan,
    });
    setStage('preview');
  }, [auth, householdId, opening.amountText, opening.source, revealErrors, startYear, validate]);

  const save = useCallback(
    async (name: string): Promise<string | null> => {
      if (calculated === null) return null;

      const outcome = await createProjectionUseCase.execute({
        householdId: householdId ?? '',
        auth,
        startYear,
        opening: {
          source: opening.source,
          amount: Number(opening.amountText),
        },
        ...calculated.source,
        name,
        persist: true,
      });

      if (!outcome.ok || outcome.id === null) return null;
      setSavedId(outcome.id);
      return outcome.id;
    },
    [auth, calculated, householdId, opening.amountText, opening.source, startYear],
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
    warningLabels: calculated?.warnings.map(resolveErrorLabel) ?? [],
    errorLabels: resolveErrors.map(resolveErrorLabel),
    calculateError,
    calculating,
    savedId,
    calculate,
    save,
    openingValidationError,
    openingLoading,
    openingError,
    hasClosedPeriod: reportValue !== null,
    canUseReportValue: reportValue !== null,
    setOpeningAmount,
    enterManual,
    useManualValue,
    useReportValue,
    retryOpening,
    goToPreview,
    backToSetup,
  };
}
