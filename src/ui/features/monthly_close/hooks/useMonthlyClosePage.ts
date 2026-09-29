import { useCallback, useEffect, useState } from 'react';

import { getAccountsUseCase } from '@/application/account/use_cases/getAccountsUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Account } from '@/domains/account/types/account';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Portfolio } from '@/domains/portfolio/schemas';
import { type Project } from '@/domains/project/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import {
  type CloseStepContext,
  useCloseStepRegistry,
} from '@/ui/features/monthly_close/hooks/useCloseStepRegistry';
import { useMonthlyClose } from '@/ui/features/monthly_close/hooks/useMonthlyClose';
import {
  resolveDisplayedStageId,
  resolveNextStageId,
  resolvePositionText,
  resolveStepText,
} from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

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
    anomalies,
    transactionIssues,
    readiness,
    selectYearMonth,
    start,
    reopen,
    confirmStage,
    resetStagesFrom,
    refreshStageEvidence,
  } = useMonthlyClose({ householdId, userEmail });
  const [viewingStageId, setViewingStageId] = useState<CloseStageId | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);

  // Bumped after a relevant confirm so the stage hooks' display data and
  // prefill re-run against the confirm's writes (staleness fix).
  const [stageRefreshKey, setStageRefreshKey] = useState(0);
  const bumpStageRefreshKey = useCallback(() => setStageRefreshKey((key) => key + 1), []);

  const stepRegistry = useCloseStepRegistry({
    householdId,
    selectedYearMonth,
    confirmingStageId,
    refreshKey: stageRefreshKey,
    accounts,
    portfolios,
    debtAccounts,
    evidenceInputs: { anomalies, transactionIssues },
    readiness,
    pageVM,
    refreshStageEvidence,
  });

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    const loadEntities = async () => {
      const [accountList, portfolioList, projectList, debtList] = await Promise.all([
        getAccountsUseCase.execute({ householdId, auth }),
        listPortfoliosUseCase.execute({ householdId, auth }),
        listProjectsUseCase.execute({ householdId }),
        listDebtAccountsUseCase.execute({ householdId }),
      ]);
      if (cancelled) return;
      setAccounts(accountList);
      setPortfolios(portfolioList);
      setProjects(projectList);
      setDebtAccounts(debtList);
    };

    void loadEntities();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId]);

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    void refreshStageEvidence();
  }, [householdId, selectedYearMonth, refreshStageEvidence]);

  // One refresh entry: the workflow's evidence plus every stage that opted into
  // `control.refresh`. Used wherever the period changed under the stages
  // (confirm, start, reopen, go-to-with-reset), so no call site has to know
  // which stage owns which loaded data.
  const refreshAll = useCallback(
    () =>
      Promise.all([
        refreshStageEvidence(),
        ...Object.values(stepRegistry).map((step) => step.control.refresh?.()),
      ]),
    [refreshStageEvidence, stepRegistry],
  );

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
  const handleSelectYearMonth = useCallback(
    (yearMonth: string) => {
      selectYearMonth(yearMonth);
      for (const step of Object.values(stepRegistry)) step.control.resetDraft();
    },
    [selectYearMonth, stepRegistry],
  );

  const handleConfirmStage = useCallback(
    async (stageId: CloseStageId) => {
      const step = stepRegistry[stageId];
      if (!step) return;
      const { control } = step;
      if (control.shouldBlock()) return;
      if (control.confirmGate && !(await control.confirmGate())) return;
      const result = await confirmStage(control.buildRequest());
      if (result && !control.keepsViewOnConfirm) {
        setViewingStageId(null);
      }
      control.afterConfirm();
      bumpStageRefreshKey();
      await refreshAll();
    },
    [bumpStageRefreshKey, confirmStage, refreshAll, stepRegistry],
  );

  const handleGoToStage = useCallback((stageId: string) => {
    setViewingStageId(stageId as CloseStageId);
  }, []);

  const handleGoToStageWithReset = useCallback(
    async (stageId: string) => {
      handleGoToStage(stageId);
      await resetStagesFrom(stageId as CloseStageId);
      await refreshAll();
    },
    [handleGoToStage, refreshAll, resetStagesFrom],
  );

  const isWalkPositionStage = (stageId: string) =>
    pageVM.isPaused ? stageId === currentStageId : stageId !== null;

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
    onGoToStage: handleGoToStage,
    // Continue advances to the next stage in walk order; the page asks the
    // viewmodel for it instead of naming a stage ID here.
    onContinue: () => setViewingStageId(resolveNextStageId(displayedStageId)),
    onBack: () => setViewingStageId(null),
    accounts,
    portfolios: portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name })),
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
  };

  return {
    householdId,
    pageVM,
    selectedYearMonth,
    confirmingStageId,
    isStarting,
    error,
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
    handleConfirmStage,
    handleGoToStage,
    handleGoToStageWithReset,
    isWalkPositionStage,
  };
};
