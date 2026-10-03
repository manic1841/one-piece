import { useCallback } from 'react';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import {
  EMPTY_STAGE_CONFIRM_OPTIONS,
  useConfirmStageControl,
} from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useSeededDraft } from '@/ui/features/monthly_close/hooks/useSeededDraft';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { logger } from '@/utils/logger';

import {
  EMPTY_TRADE_DRAFT,
  type SecuritiesTradeDraft,
  type TradeCommand,
  adoptConfirmedTradeRows,
  applyTradeCommand,
  findTradeRow,
  toTradeRowValue,
} from '../../../viewmodels/tradeDraft.vm';
import { useTradeDrawer } from './useTradeDrawer';
import { useTradeDrawerForm } from './useTradeDrawerForm';

const LOAD_ERROR = '無法載入本月投資與融資交易，請稍後再試。';

interface UseSecuritiesTradeStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

export const useSecuritiesTradeStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseSecuritiesTradeStageArgs): CloseStageControl<'SECURITIES_TRADE'> & {
  securities: SecuritiesTradeDraft['securities'];
  financing: SecuritiesTradeDraft['financing'];
  drawer: ReturnType<typeof useTradeDrawer>;
  drawerForm: ReturnType<typeof useTradeDrawerForm>;
  handleDeleteRow: () => void;
  /** The count of planned buys/sells the readiness check consumes (cross-stage). */
  totalPlannedTrades: number;
  errorMessage: string | null;
} => {
  const { confirm: confirmDialog } = useConfirm();

  // Prefill this month's investment and financing transactions as rows carrying their IDs (ADR-0052).
  const load = useCallback(async (): Promise<SecuritiesTradeDraft> => {
    try {
      const result = await getMonthInvestmentFinancingUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
      });
      return {
        securities: {
          buys: result.buys.map(toTradeRowValue),
          sells: result.sells.map(toTradeRowValue),
        },
        financing: {
          shareholderFinancing: result.shareholderFinancing.map(toTradeRowValue),
          dividendPayout: result.dividendPayout.map(toTradeRowValue),
        },
        removedTransactionIds: [],
      };
    } catch (caught) {
      logger.warn('Failed to load month transactions', 'useSecuritiesTradeStage', { caught });
      throw new Error(LOAD_ERROR);
    }
  }, [householdId, selectedYearMonth]);

  const { data, errorMessage, refresh } = useStageLoader<SecuritiesTradeDraft>({
    enabled: householdId !== '' && selectedYearMonth !== '',
    load,
  });
  const [draft, setDraft] = useSeededDraft<SecuritiesTradeDraft>(data);
  const current = draft ?? EMPTY_TRADE_DRAFT;

  const applyCommand = useCallback(
    (command: TradeCommand) => {
      setDraft((previous) => applyTradeCommand(previous ?? EMPTY_TRADE_DRAFT, command));
    },
    [setDraft],
  );

  const { securities, financing, removedTransactionIds } = current;
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
    // Adopt the write's authoritative rows so a re-confirmation updates in place.
    afterConfirm: (confirmed) =>
      setDraft((previous) => adoptConfirmedTradeRows(previous ?? EMPTY_TRADE_DRAFT, confirmed)),
    refresh,
  });

  const closeMonth = new Date(
    Number(selectedYearMonth.slice(0, 4)),
    Number(selectedYearMonth.slice(5, 7)) - 1,
    15,
  );
  const drawer = useTradeDrawer({ closeMonth });
  const editing =
    drawer.state.mode === 'EDIT' ? findTradeRow(current, drawer.state.targetId) : null;
  const drawerForm = useTradeDrawerForm({
    isOpen: drawer.state.kind !== null,
    editRow: editing ? { side: editing.side, ...editing.row } : undefined,
    onDraftConfirm: (vmDraft) => {
      const command = drawer.resolveCommand(vmDraft, editing?.row);
      if (command) applyCommand(command);
      drawer.close();
    },
  });

  const handleDeleteRow = useCallback(() => {
    const command = drawer.resolveDelete();
    if (command) applyCommand(command);
    drawer.close();
  }, [drawer, applyCommand]);

  return {
    ...control,
    confirmGate,
    securities,
    financing,
    drawer,
    drawerForm,
    handleDeleteRow,
    errorMessage,
    totalPlannedTrades: securities.buys.length + securities.sells.length,
  };
};
