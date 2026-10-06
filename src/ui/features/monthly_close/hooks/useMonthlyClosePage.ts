import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { type MonthlyCloseConfirmResult } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import {
  type MonthlyCloseConfirmRequest,
  monthlyCloseWorkflowUseCase,
} from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { type Project } from '@/domains/project/schemas';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import {
  type CloseStepContext,
  useCloseStepRegistry,
} from '@/ui/features/monthly_close/hooks/useCloseStepRegistry';
import {
  resolveDisplayedStageId,
  resolveGoToResetRange,
  resolveNextStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

import { mapPeriodToPageVM } from '../mappers/monthlyClose.mappers';
import { monthlyCloseErrorText } from './monthlyCloseErrorText';

const ENTITIES_LOAD_ERROR = '無法載入帳戶、專案與債務資料，請稍後再試。';

interface UseMonthlyCloseWorkspaceArgs {
  householdId: string;
  userEmail: string;
  yearMonth: string;
  initialPeriod: FinancialPeriod;
}

/** Owns one period's close state: its commands, shared entities, and derived stage selection. */
export const useMonthlyClosePage = ({
  householdId,
  userEmail,
  yearMonth,
  initialPeriod,
}: UseMonthlyCloseWorkspaceArgs) => {
  const auth = useAuthIdentity();
  const [period, setPeriod] = useState<FinancialPeriod>(initialPeriod);
  const [confirmingStageId, setConfirmingStageId] = useState<CloseStageId | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);

  const pageVM = useMemo(() => mapPeriodToPageVM(period), [period]);

  // Monotonic request sequence: a stale write cannot clobber a newer one on the same period.
  const requestSeqRef = useRef(0);
  const beginRequest = useCallback(() => (requestSeqRef.current += 1), []);
  const isLatestRequest = useCallback((seq: number) => seq === requestSeqRef.current, []);

  const reopen = useCallback(async (): Promise<FinancialPeriod | null> => {
    const seq = beginRequest();
    setIsStarting(true);
    setError(null);
    try {
      const result = await monthlyCloseWorkflowUseCase.reopen({
        householdId,
        yearMonth,
        userEmail,
        auth,
      });
      if (!isLatestRequest(seq)) return null;
      setPeriod(result);
      return result;
    } catch (err) {
      if (!isLatestRequest(seq)) return null;
      setError(monthlyCloseErrorText(err, MONTHLY_CLOSE_LABELS.REOPEN_ERROR));
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [auth, beginRequest, householdId, isLatestRequest, userEmail, yearMonth]);

  const confirmStage = useCallback(
    async (
      request: Omit<MonthlyCloseConfirmRequest, 'householdId' | 'yearMonth' | 'userEmail' | 'auth'>,
    ): Promise<MonthlyCloseConfirmResult | null> => {
      const seq = beginRequest();
      setConfirmingStageId(request.stageId);
      setError(null);
      try {
        const result = await monthlyCloseWorkflowUseCase.confirmStage({
          householdId,
          yearMonth,
          userEmail,
          auth,
          ...request,
        });
        if (!isLatestRequest(seq)) return null;
        setPeriod(result.period);
        return result;
      } catch (err) {
        if (!isLatestRequest(seq)) return null;
        setError(monthlyCloseErrorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
        return null;
      } finally {
        setConfirmingStageId(null);
      }
    },
    [auth, beginRequest, householdId, isLatestRequest, userEmail, yearMonth],
  );

  const resetStagesFrom = useCallback(
    async (fromStageId: CloseStageId): Promise<FinancialPeriod | null> => {
      const seq = beginRequest();
      setIsStarting(true);
      setError(null);
      try {
        const result = await monthlyCloseWorkflowUseCase.resetStagesFrom({
          householdId,
          yearMonth,
          userEmail,
          auth,
          fromStageId,
        });
        if (!isLatestRequest(seq)) return null;
        setPeriod(result);
        return result;
      } catch (err) {
        if (!isLatestRequest(seq)) return null;
        setError(monthlyCloseErrorText(err, MONTHLY_CLOSE_LABELS.CONFIRM_ERROR));
        return null;
      } finally {
        setIsStarting(false);
      }
    },
    [auth, beginRequest, householdId, isLatestRequest, userEmail, yearMonth],
  );

  const stepRegistry = useCloseStepRegistry({
    householdId,
    selectedYearMonth: yearMonth,
    confirmingStageId,
    accounts,
    portfolios,
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    debtAccounts,
    pageVM,
  });
  const { confirm } = useConfirm();

  // One shared entity load; a failed read gets its own copy instead of an empty page.
  const { errorMessage: entitiesError, run: runEntities } = useLoadingTask();
  const entitiesInFlightRef = useRef<AbortController | null>(null);

  const loadEntities = useCallback(async () => {
    if (!householdId) return;
    entitiesInFlightRef.current?.abort();
    const controller = new AbortController();
    entitiesInFlightRef.current = controller;

    await runEntities(
      async () => {
        try {
          return await Promise.all([
            getAccountsUseCase.execute({ householdId, auth }),
            listPortfoliosUseCase.execute({ householdId, auth }),
            listProjectsUseCase.execute({ householdId }),
            listDebtAccountsUseCase.execute({ householdId }),
          ] as const);
        } catch (caught) {
          logger.warn('Failed to load shared entities', 'useMonthlyClosePage', { caught });
          throw new Error(ENTITIES_LOAD_ERROR);
        }
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (!result.ok) return;
          const [accountList, portfolioList, projectList, debtList] = result.value;
          setAccounts(accountList);
          setPortfolios(portfolioList);
          setProjects(projectList);
          setDebtAccounts(debtList);
        },
      },
    );
  }, [auth, householdId, runEntities]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  // One refresh entry for every stage that opted into refresh, after confirm/reopen/reset (#236).
  const refreshAll = () =>
    Promise.all(Object.values(stepRegistry).map((step) => step.control.refresh?.()));

  const currentStageId = pageVM.isClosed
    ? null
    : (pageVM.stages.find((stage) => !stage.isCompleted)?.stageId ?? null);
  const displayedStageId = resolveDisplayedStageId({
    isClosed: pageVM.isClosed,
    viewingStageId,
    currentStageId,
  });
  const displayedStage = pageVM.stages.find((stage) => stage.stageId === displayedStageId) ?? null;
  // Only CLOSED is read-only; a cascade-demoted period keeps a full recovery walk (ADR-0066).
  const isReadOnlyPeriod = pageVM.isClosed;
  const isReviewing =
    !isReadOnlyPeriod && displayedStageId !== null && displayedStageId !== currentStageId;

  const positionText = resolvePositionText(
    pageVM.stages,
    currentStageId,
    pageVM.isClosed,
    pageVM.totalCount,
    displayedStageId,
  );
  const displayedStepText = resolveStepText(pageVM.stages, displayedStageId);

  const handleConfirmStage = async (stageId: CloseStageId) => {
    // The registry is a complete record, so the stage is always present.
    const { control } = stepRegistry[stageId];
    if (control.confirmGate && !(await control.confirmGate())) return;
    const result = await confirmStage(control.buildRequest());
    // A failed confirm writes nothing, so no view reset and no refresh may follow.
    if (!result) return;
    if (!control.keepsViewOnConfirm) {
      setViewingStageId(null);
    }
    // Generic forward: an indexed call reduces the argument to `never`.
    const dispatch = <S extends CloseStageId>(confirmed: MonthlyCloseConfirmResult<S>) =>
      stepRegistry[confirmed.stageId].control.afterConfirm(confirmed.data);
    dispatch(result);
    await refreshAll();
  };

  /** Show a stage without touching its state — plain navigation. */
  const showStage = (stageId: CloseStageId) => {
    setViewingStageId(stageId);
  };

  const handleGoToStageWithReset = async (stageId: CloseStageId) => {
    showStage(stageId);
    await resetStagesFrom(stageId);
    await refreshAll();
  };

  // Reopen withdraws the finalize decision behind a confirmation (ADR-0066).
  const handleReopen = async () => {
    const confirmed = await confirm({
      title:
        period.status === 'CLOSED'
          ? MONTHLY_CLOSE_LABELS.REOPENED_TITLE
          : MONTHLY_CLOSE_LABELS.REOPENED_BANNER,
      context: MONTHLY_CLOSE_LABELS.REOPENED_CONTEXT,
      consequence: MONTHLY_CLOSE_LABELS.REOPENED_CONSEQUENCE,
      confirmLabel: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM,
      cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
    });
    if (!confirmed) return;
    const result = await reopen();
    if (!result) return;
    await refreshAll();
  };

  // GO TO in a paused period resets the target stage and everything after it (ADR-0070).
  const handleGoToStage = async (stageId: CloseStageId) => {
    if (!pageVM.isPaused) {
      showStage(stageId);
      return;
    }
    const confirmed = await confirm({
      title: MONTHLY_CLOSE_LABELS.GO_TO_RESET_TITLE,
      consequence: MONTHLY_CLOSE_LABELS.GO_TO_RESET_CONSEQUENCE.replace(
        '{range}',
        resolveGoToResetRange(pageVM.stages, stageId, pageVM.totalCount),
      ),
      confirmLabel: MONTHLY_CLOSE_LABELS.GO_TO_RESET_CONFIRM,
      cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
    });
    if (!confirmed) return;
    await handleGoToStageWithReset(stageId);
  };

  // Only the walk position may be confirmed; a paused period is held at the review stage.
  const isWalkPositionStage = (stageId: CloseStageId) =>
    pageVM.isPaused ? stageId === currentStageId : true;

  const stageContext: CloseStepContext = {
    stepText: displayedStepText ?? positionText,
    progressText: positionText,
    confirmedAtText: displayedStage?.confirmedAtText ?? null,
    confirming: displayedStage ? confirmingStageId === displayedStage.stageId : false,
    isConfirmable: displayedStage
      ? !isReadOnlyPeriod && isWalkPositionStage(displayedStage.stageId)
      : false,
    isReadOnly: isReadOnlyPeriod,
    isReviewing,
    // Render only runs for the displayed stage, so every confirm is the same call.
    onConfirm: () => {
      if (displayedStage) void handleConfirmStage(displayedStage.stageId);
    },
    onGoToStage: (stageId) => void handleGoToStage(stageId),
    // Continue asks the viewmodel for the next stage instead of naming a stage ID.
    onContinue: () => setViewingStageId(resolveNextStageId(displayedStageId)),
    onBack: () => setViewingStageId(null),
    accounts,
    portfolios: portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name })),
  };

  return {
    householdId,
    yearMonth,
    pageVM,
    confirmingStageId,
    isStarting,
    error,
    entitiesError,
    viewingStageId,
    setViewingStageId,
    currentStageId,
    displayedStageId,
    displayedStage,
    isReviewing,
    positionText,
    displayedStepText,
    stepRegistry,
    stageContext,
    reopen,
    refreshAll,
    handleReopen,
    handleConfirmStage,
    handleGoToStage,
    handleGoToStageWithReset,
  };
};
