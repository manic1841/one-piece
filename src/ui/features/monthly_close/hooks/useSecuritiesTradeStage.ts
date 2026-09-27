import { useCallback, useEffect, useState } from 'react';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { type FinancingInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';

import type { CloseStageControl } from './closeStageControl';
import { EMPTY_STAGE_CONFIRM_OPTIONS, useConfirmStageControl } from './useConfirmStageControl';

const toTradeRow = (transaction: {
  id: string;
  amount?: number | null;
  date: Date;
  description?: string | null;
  projectId?: string | null;
}) => ({
  transactionId: transaction.id,
  amount: transaction.amount ?? 0,
  date: transaction.date,
  description: transaction.description ?? undefined,
  projectId: transaction.projectId,
});

interface UseSecuritiesTradeStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

/**
 * Stage controller for SECURITIES_TRADE: owns the diff-merge draft (buys,
 * sells, financing, removed IDs), the month-transaction prefill, and the
 * empty-stage pre-confirm warning. Drafts live here; the page only orchestrates.
 */
export const useSecuritiesTradeStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseSecuritiesTradeStageArgs): CloseStageControl & {
  securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
  setSecurities: React.Dispatch<
    React.SetStateAction<{ buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] }>
  >;
  financing: { shareholderFinancing: FinancingInput[]; dividendPayout: FinancingInput[] };
  setFinancing: React.Dispatch<
    React.SetStateAction<{
      shareholderFinancing: FinancingInput[];
      dividendPayout: FinancingInput[];
    }>
  >;
  removedTransactionIds: string[];
  setRemovedTransactionIds: React.Dispatch<React.SetStateAction<string[]>>;
} => {
  const [securities, setSecurities] = useState<{
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  }>({ buys: [], sells: [] });
  const [financing, setFinancing] = useState<{
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  }>({ shareholderFinancing: [], dividendPayout: [] });
  const [removedTransactionIds, setRemovedTransactionIds] = useState<string[]>([]);
  // Bumped after a successful confirm so the month-transaction prefill re-runs
  // and local rows pick up their Firestore document IDs.
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0);
  const { confirm: confirmDialog } = useConfirm();

  // SECURITIES_TRADE prefill: the month's existing investment and financing
  // transactions become editable rows carrying their transaction IDs, so the
  // confirmation diff-merges instead of duplicating (ADR-0052 revision).
  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const loadMonthTransactions = async () => {
      const rows = await getMonthInvestmentFinancingUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
      });
      if (cancelled) return;
      setSecurities({
        buys: rows.buys.map(toTradeRow),
        sells: rows.sells.map(toTradeRow),
      });
      setFinancing({
        shareholderFinancing: rows.shareholderFinancing.map(toTradeRow),
        dividendPayout: rows.dividendPayout.map(toTradeRow),
      });
      setRemovedTransactionIds([]);
    };

    void loadMonthTransactions();
    return () => {
      cancelled = true;
    };
  }, [householdId, selectedYearMonth, tradeRefreshKey]);

  const hasSecurities = securities.buys.length > 0 || securities.sells.length > 0;
  const hasFinancing =
    financing.shareholderFinancing.length > 0 || financing.dividendPayout.length > 0;
  const needsWarning = !hasSecurities && !hasFinancing;

  const confirmGate = useCallback(async () => {
    if (!needsWarning) return true;
    return confirmDialog({ ...EMPTY_STAGE_CONFIRM_OPTIONS });
  }, [confirmDialog, needsWarning]);

  const control = useConfirmStageControl({
    stageId: 'SECURITIES_TRADE',
    confirmingStageId,
    buildRequest: () => ({
      stageId: 'SECURITIES_TRADE',
      securities,
      financing,
      removedTransactionIds,
    }),
    afterConfirm: () => setTradeRefreshKey((key) => key + 1),
    resetDraft: () => {
      setSecurities({ buys: [], sells: [] });
      setFinancing({ shareholderFinancing: [], dividendPayout: [] });
      setRemovedTransactionIds([]);
    },
  });

  return {
    ...control,
    confirmGate,
    securities,
    setSecurities,
    financing,
    setFinancing,
    removedTransactionIds,
    setRemovedTransactionIds,
  };
};
