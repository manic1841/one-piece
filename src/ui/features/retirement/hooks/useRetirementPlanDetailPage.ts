import { useCallback, useState } from 'react';

import { mergeImportedExpensesUseCase } from '@/application/retirement/use_cases/mergeImportedExpensesUseCase';
import { calculatePlanProjection } from '@/domains/retirement/logic/retirementPlanProjection';
import { showToast } from '@/ui/components/Toast';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import {
  RetirementBaselineLabels,
  RetirementRecalculationLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { useRetirementEventActions } from '@/ui/features/retirement/hooks/useRetirementEventActions';
import { useRetirementExpenseActions } from '@/ui/features/retirement/hooks/useRetirementExpenseActions';
import { useRetirementIncomeActions } from '@/ui/features/retirement/hooks/useRetirementIncomeActions';
import { useRetirementPlanCore } from '@/ui/features/retirement/hooks/useRetirementPlanCore';
import { mapRetirementPlanToBaselineItems } from '@/ui/features/retirement/viewmodels/retirementBaseline.vm';
import {
  mapRetirementEventToVM,
  mapRetirementPlanToAssumptionsDisplayVM,
  mapRetirementPlanToHeaderVM,
  mapRetirementProjectionToVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { type RetirementPlanCreate } from '@/ui/features/retirement/viewmodels/retirementForm.vm';
import {
  isRetirementSummaryStale,
  shiftRetirementEndingRows,
} from '@/ui/features/retirement/viewmodels/retirementRecalculation.vm';
import { deriveTimelineRange } from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';

/** Rows kept by an import because their ledger source was not in it (spec #301 §4.3). */
export interface RetirementImportNotice {
  unmatchedCount: number;
}

export const useRetirementPlanDetailPage = (
  id: string | undefined,
  householdId: string | undefined,
  userEmail: string | undefined,
) => {
  const {
    plan,
    loading,
    error,
    reload,
    netWorthSource,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleDelete,
    handleSaveName,
    importIncomeData,
    importDebtData,
    importExpenseDataFromLedger,
  } = useRetirementPlanCore({ id, householdId, userEmail });

  const {
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments: importDebtRepayments,
  } = useRetirementExpenseActions({
    id,
    plan,
    importDebtData,
    handleUpdatePlan,
  });

  const [importNotice, setImportNotice] = useState<RetirementImportNotice | null>(null);

  const handleDismissImportNotice = useCallback(() => setImportNotice(null), []);

  // Import feedback (spec #301 §2.4 / §4.3): a success toast plus a persistent
  // notice when existing rows did not match any source in the import.
  const reportImport = useCallback((unmatchedCount: number | null) => {
    if (unmatchedCount === null) return;
    showToast(RetirementBaselineLabels.importedToast);
    setImportNotice(unmatchedCount > 0 ? { unmatchedCount } : null);
  }, []);

  const handleImportExpensesFromLedger = useCallback(async (): Promise<number | null> => {
    if (!plan) return null;
    const imported = await importExpenseDataFromLedger();

    const mergeResult = mergeImportedExpensesUseCase.execute({ plan, importedExpenses: imported });
    // Import only introduces/updates rows; it never triggers a recalculation.
    if (mergeResult.hasChanges) {
      await handleUpdatePlan({ expenses: mergeResult.expenses });
    }
    return mergeResult.unmatchedCount;
  }, [plan, importExpenseDataFromLedger, handleUpdatePlan]);

  const handleImportDebtRepayments = useCallback(async () => {
    reportImport(await importDebtRepayments());
  }, [importDebtRepayments, reportImport]);

  const {
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleAddPhase,
    handleUpdatePhase,
    handleDeletePhase,
    handleTimelineUpdatePhase,
  } = useRetirementEventActions({
    id,
    plan,
    handleUpdatePlan,
  });

  const { handleUpdateIncome, handleDeleteIncome, handleImportIncomeFromTransactions } =
    useRetirementIncomeActions({
      id,
      plan,
      importIncomeData,
      handleUpdatePlan,
    });

  const { confirm } = useConfirm();

  // Assumption changes can move the years of stored 「退休時結束」 rows (spec #301
  // §3.4): prompt and require confirmation before moving. Declining still saves the
  // assumptions — the rows simply stay put. Only stored rows move; unsaved side-editor
  // drafts are never remapped (their existing dirty confirm guards them).
  const handleSaveAssumptions = useCallback(
    async (updates: Partial<RetirementPlanCreate>) => {
      if (!plan) return;
      let next = updates;
      if (updates.birthYear != null && updates.retirementAge != null) {
        const shift = shiftRetirementEndingRows(plan, {
          birthYear: updates.birthYear,
          retirementAge: updates.retirementAge,
        });
        if (shift) {
          const confirmed = await confirm({
            title: RetirementRecalculationLabels.yearShiftTitle,
            context: RetirementRecalculationLabels.yearShiftContext,
            consequence: RetirementRecalculationLabels.yearShiftConsequence,
            confirmLabel: RetirementRecalculationLabels.yearShiftConfirm,
            cancelLabel: RetirementRecalculationLabels.yearShiftCancel,
            confirmTone: 'primary',
          });
          if (confirmed) next = { ...updates, ...shift };
        }
      }
      await handleUpdatePlan(next);
    },
    [plan, confirm, handleUpdatePlan],
  );

  const isSummaryStale = plan ? isRetirementSummaryStale(plan) : false;

  // One ledger import for the merged Financial Baseline section (spec #301 §4.3):
  // incomes and expenses are imported together from the same "Import from Ledger".
  const handleImportFromLedger = useCallback(async () => {
    const incomeUnmatched = await handleImportIncomeFromTransactions();
    const expenseUnmatched = await handleImportExpensesFromLedger();
    if (incomeUnmatched === null && expenseUnmatched === null) return;
    reportImport((incomeUnmatched ?? 0) + (expenseUnmatched ?? 0));
  }, [handleImportIncomeFromTransactions, handleImportExpensesFromLedger, reportImport]);

  const projectionVM =
    plan && netWorthSource && 'startingNetWorth' in netWorthSource
      ? mapRetirementProjectionToVM(
          calculatePlanProjection(plan, netWorthSource.startingNetWorth),
          plan.birthYear + plan.retirementAge,
          plan,
        )
      : null;

  return {
    plan,
    headerVM: plan ? mapRetirementPlanToHeaderVM(plan) : null,
    assumptionsVM: plan ? mapRetirementPlanToAssumptionsDisplayVM(plan) : null,
    netWorthSource,
    baselineItems: plan ? mapRetirementPlanToBaselineItems(plan) : [],
    timelineRange: plan ? deriveTimelineRange(plan) : null,
    eventItems: plan
      ? plan.events.map((event) => ({
          domain: event,
          vm: mapRetirementEventToVM(event, plan.inflationRate),
        }))
      : [],
    projectionVM,
    loading,
    error,
    reload,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleSaveAssumptions,
    isSummaryStale,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleAddPhase,
    handleUpdatePhase,
    handleDeletePhase,
    handleTimelineUpdatePhase,
    handleDelete,
    handleSaveName,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportFromLedger,
    importNotice,
    handleDismissImportNotice,
  };
};
