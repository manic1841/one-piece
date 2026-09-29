import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseFinancialReportsStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

interface PersistenceState {
  isPersisted: boolean;
}

/**
 * Loads the month's report persistence state. Returns null on failure so
 * callers leave the month-keyed state unset (which reads as null) instead of
 * claiming the reports are absent.
 */
const loadPersistenceState = async ({
  householdId,
  selectedYearMonth,
}: {
  householdId: string;
  selectedYearMonth: string;
}): Promise<PersistenceState | null> => {
  try {
    return await getReportPersistenceStateUseCase.execute({
      householdId,
      yearMonth: selectedYearMonth,
    });
  } catch (caught) {
    logger.warn('Failed to load report persistence state', 'useFinancialReportsStage', { caught });
    return null;
  }
};

/**
 * Stage controller for FINANCIAL_REPORTS: owns the report label resolver
 * (absorbed from useReportLabelResolver) — the static catalog resolves first
 * and household custom codes override it, so persisted reports carry directly
 * displayable labels for user-defined ledger codes. It also owns the month's
 * report persistence state — the cross-stage fact the reports-generated badge
 * and (read across stages in the registry) CLOSE_PERIOD's evidence consume.
 * `refresh` reloads it after the period changes under the stage; there is no
 * draft and no gate. The live preview bundle belongs to CLOSE_PERIOD.
 */
export const useFinancialReportsStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseFinancialReportsStageArgs): CloseStageControl & {
  labelResolver: ReportLabelResolver;
  reportsPersisted: boolean | null;
} => {
  const auth = useAuthIdentity();
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());
  // Persistence is keyed by year-month: a value loaded for a previous month
  // reads as `null` under the current selection, so a month switch never shows
  // the last month's badge or evidence while the new month loads.
  const [persistence, setPersistence] = useState<{
    yearMonth: string;
    isPersisted: boolean;
  } | null>(null);
  const reportsPersisted =
    persistence?.yearMonth === selectedYearMonth ? persistence.isPersisted : null;

  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;

    const loadCustomLabels = async () => {
      try {
        const entries = await listAllLedgerCodesUseCase.execute({
          householdId,
          auth,
          labelResolver: getUnifiedLedgerCodeLabel,
        });
        if (cancelled) return;
        setCustomLabels(
          new Map(
            entries.filter((entry) => entry.isCustom).map((entry) => [entry.code, entry.label]),
          ),
        );
      } catch (caught) {
        logger.warn('Failed to load report label resolver', 'useFinancialReportsStage', { caught });
      }
    };

    void loadCustomLabels();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId]);

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      const result = await loadPersistenceState({ householdId, selectedYearMonth });
      if (cancelled || !result) return;
      setPersistence({ yearMonth: selectedYearMonth, isPersisted: result.isPersisted });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const result = await loadPersistenceState({ householdId, selectedYearMonth });
    if (!result) return;
    setPersistence({ yearMonth: selectedYearMonth, isPersisted: result.isPersisted });
  }, [householdId, selectedYearMonth]);

  const labelResolver = useCallback(
    (code: string, fallback?: string) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code,
    [customLabels],
  );

  const control = useConfirmStageControl({
    stageId: 'FINANCIAL_REPORTS',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'FINANCIAL_REPORTS', labelResolver }),
    // The report preview stays open so the user can read the generated
    // reports before confirming the next stage; every other stage resets.
    keepsViewOnConfirm: true,
  });

  return { ...control, labelResolver, reportsPersisted, refresh };
};
