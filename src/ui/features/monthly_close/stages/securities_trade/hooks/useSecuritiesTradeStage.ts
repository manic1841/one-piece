import { type Dispatch, type SetStateAction, useCallback, useMemo } from 'react';

import { getMonthInvestmentFinancingUseCase } from '@/application/monthly_close/use_cases/getMonthInvestmentFinancingUseCase';
import { type FinancingInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type SecuritiesTradeInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import {
  EMPTY_STAGE_CONFIRM_OPTIONS,
  useConfirmStageControl,
} from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useSeededDraft } from '@/ui/features/monthly_close/hooks/useSeededDraft';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
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

type SecuritiesRows = { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
type FinancingRows = {
  shareholderFinancing: FinancingInput[];
  dividendPayout: FinancingInput[];
};

/** The whole stage draft: rows are swapped between buckets and a removal rewrites rows and IDs together. */
interface SecuritiesTradeDraft {
  securities: SecuritiesRows;
  financing: FinancingRows;
  removedTransactionIds: string[];
}

const emptyDraft = (): SecuritiesTradeDraft => ({
  securities: { buys: [], sells: [] },
  financing: { shareholderFinancing: [], dividendPayout: [] },
  removedTransactionIds: [],
});

interface UseSecuritiesTradeStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  enabled?: boolean;
}

/**
 * Stage controller for SECURITIES_TRADE: owns the diff-merge draft (buys,
 * sells, financing, removed IDs), the month-transaction prefill, the
 * empty-stage pre-confirm warning, and the add-edit trade drawer with its
 * RHF form. Drafts and the drawer live here; the page only orchestrates. The
 * prefill is seeded by `useSeededDraft`, so a background reload never clears a
 * row the user is editing.
 */
export const useSecuritiesTradeStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  enabled = true,
}: UseSecuritiesTradeStageArgs): CloseStageControl<'SECURITIES_TRADE'> & {
  securities: SecuritiesRows;
  setSecurities: Dispatch<SetStateAction<SecuritiesRows>>;
  financing: FinancingRows;
  setFinancing: Dispatch<SetStateAction<FinancingRows>>;
  removedTransactionIds: string[];
  setRemovedTransactionIds: Dispatch<SetStateAction<string[]>>;
  /** The drawer's VM projection: state, open/close/confirm wiring, and the RHF form. */
  drawer: ReturnType<typeof useTradeDrawer>;
  drawerForm: ReturnType<typeof useTradeDrawerForm>;
  /** The count of planned buys/sells the readiness check consumes (cross-stage). */
  totalPlannedTrades: number;
  /** Canned copy when the month-transaction prefill failed to load. */
  errorMessage: string | null;
} => {
  const { confirm: confirmDialog } = useConfirm();

  // SECURITIES_TRADE prefill: the month's existing investment and financing
  // transactions become editable rows carrying their transaction IDs, so the
  // confirmation diff-merges instead of duplicating (ADR-0052 revision).
  const load = useCallback(async (): Promise<SecuritiesTradeDraft> => {
    try {
      const result = await getMonthInvestmentFinancingUseCase.execute({
        householdId,
        year: Number(selectedYearMonth.slice(0, 4)),
        month: Number(selectedYearMonth.slice(5, 7)),
      });
      return {
        securities: { buys: result.buys.map(toTradeRow), sells: result.sells.map(toTradeRow) },
        financing: {
          shareholderFinancing: result.shareholderFinancing.map(toTradeRow),
          dividendPayout: result.dividendPayout.map(toTradeRow),
        },
        removedTransactionIds: [],
      };
    } catch (caught) {
      logger.warn('Failed to load month transactions', 'useSecuritiesTradeStage', { caught });
      throw new Error(LOAD_ERROR);
    }
  }, [householdId, selectedYearMonth]);

  const { data, errorMessage, refresh } = useStageLoader<SecuritiesTradeDraft>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '',
    load,
  });
  // One draft unit: the drawer moves rows between buckets and records a removal together.
  const [draft, setDraft] = useSeededDraft<SecuritiesTradeDraft>(selectedYearMonth, data);

  const securities = draft?.securities ?? emptyDraft().securities;
  const financing = draft?.financing ?? emptyDraft().financing;
  const removedTransactionIds = draft?.removedTransactionIds ?? [];

  const setDraftBucket = useCallback(
    <K extends keyof SecuritiesTradeDraft>(bucket: K) =>
      (updater: SetStateAction<SecuritiesTradeDraft[K]>) =>
        setDraft((previous) => {
          const base = previous ?? emptyDraft();
          const value = typeof updater === 'function' ? updater(base[bucket]) : updater;
          return { ...base, [bucket]: value };
        }),
    [setDraft],
  );

  const setSecurities = useMemo(
    () => setDraftBucket('securities') as Dispatch<SetStateAction<SecuritiesRows>>,
    [setDraftBucket],
  );
  const setFinancing = useMemo(
    () => setDraftBucket('financing') as Dispatch<SetStateAction<FinancingRows>>,
    [setDraftBucket],
  );
  const setRemovedTransactionIds = useMemo(
    () => setDraftBucket('removedTransactionIds') as Dispatch<SetStateAction<string[]>>,
    [setDraftBucket],
  );

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
    afterConfirm: (confirmed) => {
      if (!confirmed) return;
      setDraft({
        securities: { buys: confirmed.buys, sells: confirmed.sells },
        financing: {
          shareholderFinancing: confirmed.shareholderFinancing,
          dividendPayout: confirmed.dividendPayout,
        },
        removedTransactionIds: [],
      });
    },
    refresh,
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
