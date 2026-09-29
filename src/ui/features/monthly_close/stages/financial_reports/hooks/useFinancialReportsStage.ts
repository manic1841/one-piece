import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import {
  type PreviewFinancialReportsResult,
  previewFinancialReportsWorkflow,
} from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type AuthContext } from '@/application/types';
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

interface ReportState {
  isPersisted: boolean;
  bundle: PreviewFinancialReportsResult | null;
}

/**
 * Loads the month's report persistence state and, when persisted, the preview
 * bundle. Returns null on failure so callers leave the month-keyed state unset
 * (which reads as null) instead of claiming the reports are absent.
 */
const loadReportState = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<ReportState | null> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const state = await getReportPersistenceStateUseCase.execute({
      householdId,
      yearMonth: selectedYearMonth,
    });
    if (!state.isPersisted) return { isPersisted: false, bundle: null };
    try {
      const preview = await previewFinancialReportsWorkflow.execute({
        householdId,
        auth,
        year,
        month,
      });
      return { isPersisted: true, bundle: preview };
    } catch (previewError) {
      logger.warn('Failed to preview financial reports', 'useFinancialReportsStage', {
        previewError,
      });
      return { isPersisted: true, bundle: null };
    }
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
 * report persistence state and the preview bundle derived from it, which drive
 * the reports-generated badge, the registry's close-summary VM, and (read
 * across stages in the registry) CLOSE_PERIOD's evidence. `refresh` reloads
 * both after the period changes under the stage; there is no draft and no gate.
 */
export const useFinancialReportsStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseFinancialReportsStageArgs): CloseStageControl & {
  labelResolver: ReportLabelResolver;
  reportsPersisted: boolean | null;
  reportBundle: PreviewFinancialReportsResult | null;
} => {
  const auth = useAuthIdentity();
  const [customLabels, setCustomLabels] = useState<Map<string, string>>(new Map());
  // Persistence and the preview bundle are keyed by year-month: a value loaded
  // for a previous month reads as `null` under the current selection, so a
  // month switch never shows the last month's badge or evidence while the new
  // month loads.
  const [persistence, setPersistence] = useState<{
    yearMonth: string;
    isPersisted: boolean;
  } | null>(null);
  const [bundle, setBundle] = useState<{
    yearMonth: string;
    data: PreviewFinancialReportsResult;
  } | null>(null);
  const reportsPersisted =
    persistence?.yearMonth === selectedYearMonth ? persistence.isPersisted : null;
  const reportBundle = bundle?.yearMonth === selectedYearMonth ? bundle.data : null;

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

  // Persistence state and the preview bundle travel together: no persisted
  // reports means no bundle.
  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      const result = await loadReportState({ householdId, selectedYearMonth, auth });
      if (cancelled || !result) return;
      setPersistence({ yearMonth: selectedYearMonth, isPersisted: result.isPersisted });
      setBundle(result.bundle ? { yearMonth: selectedYearMonth, data: result.bundle } : null);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const result = await loadReportState({ householdId, selectedYearMonth, auth });
    if (!result) return;
    setPersistence({ yearMonth: selectedYearMonth, isPersisted: result.isPersisted });
    setBundle(result.bundle ? { yearMonth: selectedYearMonth, data: result.bundle } : null);
  }, [auth, householdId, selectedYearMonth]);

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

  return { ...control, labelResolver, reportsPersisted, reportBundle, refresh };
};
