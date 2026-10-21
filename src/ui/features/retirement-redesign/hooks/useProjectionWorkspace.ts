import { useCallback, useEffect, useRef, useState } from 'react';

import { useBlocker, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import {
  type ProjectionCalculation,
  createProjectionUseCase,
} from '@/application/retirement/use_cases/createProjectionUseCase';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { type RetirementPlanWorkspaceData } from '@/application/retirement/use_cases/retirementPlanLookup';
import { saveWorkspaceAsPlanUseCase } from '@/application/retirement/use_cases/saveProjectionAsPlanUseCase';
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
  resolveValidationIssueLabel,
} from '@/ui/constants/retirement-redesign/resultLabels';
import { resolveErrorLabel } from '@/ui/constants/retirement-redesign/resultLabels';
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

export interface WorkspaceDraft {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  events: LifeEvent[];
  startYear: number;
  opening: OpeningNetWorthVM;
  reportValue: ReportValue | null;
}

export interface SaveFailure {
  ok: false;
  messages: string[];
}

export type SaveWorkspaceOutcome = { ok: true; id: string } | SaveFailure;

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
  calculation: ProjectionCalculation;
}

const openingSchema = z
  .object({
    source: z.enum(['derived', 'manual']),
    amountText: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.source !== 'manual') return;
    const text = value.amountText.trim();
    const amount = Number(text);
    if (text === '' || !Number.isInteger(amount)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountText'], message: 'INVALID' });
    }
  });

const startYearSchema = z.number().int();

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
  const [startYearValidationError, setStartYearValidationError] = useState<string | undefined>();
  const [calculated, setCalculated] = useState<CalculatedProjection | null>(null);
  const [resolveErrors, setResolveErrors] = useState<ProjectionResolveError[]>([]);
  const [calculateError, setCalculateError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedAsPlan, setSavedAsPlan] = useState(false);
  const [startYear, setStartYearState] = useState(() => new Date().getFullYear());
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
        return getProjectionOpeningUseCase.execute({ householdId, auth });
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
            amountText: String(result.value.openingNetWorth),
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

  const replaceAll = useCallback(
    (draft: WorkspaceDraft) => {
      resetAssumptions(draft.assumptions);
      replaceRules(draft.rules);
      replaceEvents(draft.events);
      setStartYearState(draft.startYear);
      setOpening(draft.opening);
      setReportValue(draft.reportValue);
    },
    [replaceEvents, replaceRules, resetAssumptions],
  );

  const preloadFromProjection = useProjectionPreload({
    auth,
    householdId,
    run,
    setDirty,
    setWarning: setPreloadWarning,
    replaceAll,
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

  const useReportValue = useCallback(() => {
    if (!reportValue) return;
    setOpening({ source: 'derived', ...reportValue });
    markDirty();
  }, [markDirty, reportValue]);

  const retryOpening = useCallback(() => {
    void loadOpening();
  }, [loadOpening]);

  const setStartYear = useCallback(
    (next: string) => {
      setStartYearState(Number(next));
      markDirty();
    },
    [markDirty],
  );

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

  const calculate = useCallback(async () => {
    const validation = validate();
    setOpeningValidationError(validation.openingError);
    setStartYearValidationError(validation.startYearError);
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

    const outcome = await createProjectionUseCase.calculate({
      householdId: householdId ?? '',
      auth,
      startYear,
      opening: {
        source: opening.source,
        amount: Number(opening.amountText),
      },
      ...plan,
    });
    setCalculating(false);

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
      summary: outcome.calculation.result.summary,
      calculation: outcome.calculation,
    });
    setStage('preview');
  }, [auth, householdId, opening.amountText, opening.source, revealErrors, startYear, validate]);

  const save = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> => {
      if (calculated === null || householdId === undefined) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED] };
      }

      const outcome = await createProjectionUseCase.persist({
        householdId,
        auth,
        name,
        calculation: calculated.calculation,
      });

      if (!outcome.ok) {
        return {
          ok: false,
          messages:
            outcome.issues !== undefined
              ? outcome.issues.map(resolveValidationIssueLabel)
              : [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED],
        };
      }

      setSavedId(outcome.id);
      return { ok: true, id: outcome.id };
    },
    [auth, calculated, householdId],
  );

  const saveAsPlan = useCallback(
    async (name: string): Promise<SaveWorkspaceOutcome> => {
      const validation = validate();
      if (!validation.ok) {
        revealErrors();
        const { data: assumptionData } = validation.assumptions;
        const { data: ruleData } = validation.rules;
        const { data: eventData } = validation.events;
        if (!assumptionData || !ruleData || !eventData) {
          return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_INVALID] };
        }
      }

      const { data: assumptionData } = validation.assumptions;
      const { data: ruleData } = validation.rules;
      const { data: eventData } = validation.events;
      if (householdId === undefined || !assumptionData || !ruleData || !eventData) {
        return { ok: false, messages: [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED] };
      }

      const outcome = await saveWorkspaceAsPlanUseCase.execute({
        householdId,
        auth,
        name,
        assumptions: assumptionData,
        projectionRules: ruleData,
        lifeEvents: eventData,
      });

      if (!outcome.ok) {
        return {
          ok: false,
          messages: [PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN_FAILED],
        };
      }

      setSavedAsPlan(true);
      return { ok: true, id: outcome.id };
    },
    [auth, householdId, revealErrors, validate],
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
    warningLabels: calculated?.calculation.warnings.map(resolveErrorLabelSafe) ?? [],
    errorLabels: resolveErrors.map(resolveErrorLabelSafe),
    calculateError,
    calculating,
    savedId,
    savedAsPlan,
    calculate,
    save,
    saveAsPlan,
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
    goToPreview,
    backToSetup,
  };
}

const resolveErrorLabelSafe = resolveErrorLabel;
