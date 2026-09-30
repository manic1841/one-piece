import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { type Project } from '@/domains/project/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import {
  type CloseStepContext,
  useCloseStepRegistry,
} from '@/ui/features/monthly_close/hooks/useCloseStepRegistry';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import {
  isReopenablePeriod,
  resolveDisplayedStageId,
  resolveGoToResetRange,
  resolveNextStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

const ENTITIES_LOAD_ERROR = '無法載入帳戶、專案與債務資料，請稍後再試。';

interface UseMonthlyClosePageArgs {
  householdId?: string;
  userEmail?: string;
}

/**
 * Owns MonthlyClosePage's workflow state: the close workflow, the entity lists
 * the steps share, and the derived stage selection. The nine step hooks run
 * inside the unified registry (useCloseStepRegistry), so this hook reads each
 * stage's control, content, and evidence from the registry record instead of
 * knowing any step's internals. The page keeps only layout and rendering.
 */
export const useMonthlyClosePage = ({
  householdId: householdIdProp,
  userEmail: userEmailProp,
}: UseMonthlyClosePageArgs) => {
  const { userProfile } = useAuthState();
  const householdId = householdIdProp ?? userProfile?.householdId ?? '';
  const userEmail = userEmailProp ?? userProfile?.email ?? '';
  const auth = useAuthIdentity();

  const {
    pageVM,
    selectedYearMonth,
    confirmingStageId,
    isStarting,
    error,
    selectYearMonth,
    start,
    reopen,
    confirmStage,
    resetStagesFrom,
  } = useMonthlyClose({ householdId, userEmail });
  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);

  const stepRegistry = useCloseStepRegistry({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    accounts,
    portfolios,
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    debtAccounts,
    pageVM,
  });
  const { confirm } = useConfirm();

  // The shared entity lists are loaded once for the whole page; a failed read
  // would otherwise leave every stage silently empty, so it gets its own copy.
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

  // One refresh entry: every stage that opted into `control.refresh`. Used
  // wherever the period changed under the stages (confirm, start, reopen,
  // go-to-with-reset), so no call site has to know which stage owns which
  // loaded data. Deliberately a plain function: the registry object is rebuilt
  // on every render, so a `useCallback` around it would never hold (#236).
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
  // Only CLOSED locks the workspace read-only. A cascade-demoted period stays
  // NEEDS_REVIEW with a full recovery walk (ADR-0066), so its confirm buttons
  // must stay reachable; the page-level reopen entry handles its own gating.
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

  // Stage inputs are submitted with the selected month's confirmation, so a
  // month switch retires every stage draft through the registry; the next
  // month's tables then prefill.
  const handleSelectYearMonth = (yearMonth: string) => {
    selectYearMonth(yearMonth);
    for (const step of Object.values(stepRegistry)) step.control.resetDraft();
  };

  const handleConfirmStage = async (stageId: CloseStageId) => {
    // The registry is a complete record, so the stage is always present.
    const { control } = stepRegistry[stageId];
    if (control.confirmGate && !(await control.confirmGate())) return;
    const result = await confirmStage(control.buildRequest());
    // A failed confirm (null) writes nothing, so none of the post-confirm
    // side effects may run: no view reset and no refresh (which would
    // recompute the report preview for nothing).
    if (!result) return;
    if (!control.keepsViewOnConfirm) {
      setViewingStageId(null);
    }
    control.afterConfirm();
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

  const handleStart = async () => {
    const result = await start();
    await refreshAll();
    if (!result) return;
    if (!isReopenablePeriod(result)) return;

    const confirmed = await confirm({
      title:
        result.status === 'CLOSED'
          ? MONTHLY_CLOSE_LABELS.REOPENED_TITLE
          : MONTHLY_CLOSE_LABELS.REOPENED_BANNER,
      context: MONTHLY_CLOSE_LABELS.REOPENED_CONTEXT,
      consequence: MONTHLY_CLOSE_LABELS.REOPENED_CONSEQUENCE,
      confirmLabel: MONTHLY_CLOSE_LABELS.REOPEN_CONFIRM,
      cancelLabel: MONTHLY_CLOSE_LABELS.CANCEL,
    });
    if (confirmed) {
      await reopen();
      await refreshAll();
    }
  };

  // Going back to a stage in a paused period is a recovery walk, so it resets
  // the target stage and everything after it (ADR-0070) — behind a confirmation,
  // because that discards later confirmations.
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

  // Only the stage the walk is standing on may be confirmed; a paused period is
  // held at the stage that raised the review.
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
    // The render only ever runs for displayedStage, so every confirm command is
    // the same call; stages never name a stage ID.
    onConfirm: () => {
      if (displayedStage) void handleConfirmStage(displayedStage.stageId);
    },
    onGoToStage: (stageId) => void handleGoToStage(stageId),
    // Continue advances to the next stage in walk order; the page asks the
    // viewmodel for it instead of naming a stage ID here.
    onContinue: () => setViewingStageId(resolveNextStageId(displayedStageId)),
    onBack: () => setViewingStageId(null),
    accounts,
    portfolios: portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name })),
  };

  return {
    householdId,
    pageVM,
    selectedYearMonth,
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
    selectYearMonth: handleSelectYearMonth,
    start,
    reopen,
    refreshAll,
    handleStart,
    handleConfirmStage,
    handleGoToStage,
    handleGoToStageWithReset,
  };
};
