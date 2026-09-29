import { useCallback, useEffect, useRef, useState } from 'react';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { type FinancingInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import {
  EMPTY_STAGE_CONFIRM_OPTIONS,
  useConfirmStageControl,
} from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

import { useTradeDrawer } from './useTradeDrawer';
import { useTradeDrawerForm } from './useTradeDrawerForm';

const LOAD_ERROR = '無法載入本月投資與融資交易，請稍後再試。';

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
 * sells, financing, removed IDs), the month-transaction prefill, the
 * empty-stage pre-confirm warning, and the add-edit trade drawer with its
 * RHF form. Drafts and the drawer live here; the page only orchestrates.
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
  /** The drawer's VM projection: state, open/close/confirm wiring, and the RHF form. */
  drawer: ReturnType<typeof useTradeDrawer>;
  drawerForm: ReturnType<typeof useTradeDrawerForm>;
  /** The count of planned buys/sells the readiness check consumes (cross-stage). */
  totalPlannedTrades: number;
  /** Canned copy when the month-transaction prefill failed to load. */
  errorMessage: string | null;
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
  const { confirm: confirmDialog } = useConfirm();
  const { errorMessage, run } = useLoadingTask();
  const inFlightRef = useRef<AbortController | null>(null);

  // SECURITIES_TRADE prefill: the month's existing investment and financing
  // transactions become editable rows carrying their transaction IDs, so the
  // confirmation diff-merges instead of duplicating (ADR-0052 revision).
  // `control.refresh` re-runs it after a confirm, so local rows pick up their
  // Firestore document IDs.
  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(
      async () => {
        try {
          return await getMonthInvestmentFinancingUseCase.execute({
            householdId,
            year: Number(selectedYearMonth.slice(0, 4)),
            month: Number(selectedYearMonth.slice(5, 7)),
          });
        } catch (caught) {
          logger.warn('Failed to load month transactions', 'useSecuritiesTradeStage', { caught });
          throw new Error(LOAD_ERROR);
        }
      },
      {
        signal: controller.signal,
        writeBack: (result) => {
          if (!result.ok) return;
          setSecurities({
            buys: result.value.buys.map(toTradeRow),
            sells: result.value.sells.map(toTradeRow),
          });
          setFinancing({
            shareholderFinancing: result.value.shareholderFinancing.map(toTradeRow),
            dividendPayout: result.value.dividendPayout.map(toTradeRow),
          });
          setRemovedTransactionIds([]);
        },
      },
    );
  }, [householdId, run, selectedYearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

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
    resetDraft: () => {
      setSecurities({ buys: [], sells: [] });
      setFinancing({ shareholderFinancing: [], dividendPayout: [] });
      setRemovedTransactionIds([]);
    },
    refresh: load,
  });

  const closeMonth = new Date(
    Number(selectedYearMonth.slice(0, 4)),
    Number(selectedYearMonth.slice(5, 7)) - 1,
    15,
  );
  const drawer = useTradeDrawer({
    securities,
    financing,
    setSecurities,
    setFinancing,
    removedTransactionIds,
    setRemovedTransactionIds,
    closeMonth,
  });
  const drawerForm = useTradeDrawerForm({
    isOpen: drawer.state.kind !== null,
    editRow: drawer.findRow(drawer.state.targetId),
    onDraftConfirm: drawer.confirmDraft,
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
    drawer,
    drawerForm,
    errorMessage,
    totalPlannedTrades: securities.buys.length + securities.sells.length,
  };
};
