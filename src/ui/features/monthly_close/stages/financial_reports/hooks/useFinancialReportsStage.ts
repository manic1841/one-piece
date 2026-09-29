import { useCallback, useEffect, useMemo, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { type StoredReportsBundle } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import {
  type PreviewFinancialReportsResult,
  previewFinancialReportsWorkflow,
} from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type AuthContext } from '@/application/types';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import {
  annotateBalanceSheet,
  annotateCashFlow,
  annotateIncomeStatement,
  diffBalanceSheet,
  diffCashFlow,
  diffIncomeStatement,
} from '@/domains/report/reportDrift';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import type {
  ReportTimestampsVM,
  ReportViewsVM,
} from '@/ui/features/monthly_close/viewmodels/financialReports.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseFinancialReportsStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  /** The persisted bundle CLOSE_PERIOD owns; the drift baseline. */
  persistedBundle: StoredReportsBundle | null;
  /** A CLOSED period renders the persisted record read-only; drift is not compared. */
  isClosed: boolean;
}

const PREVIEW_ERROR = '無法載入報表預覽，請稍後再試。';

interface FinancialReportsData {
  customLabels: Map<string, string>;
  preview: PreviewFinancialReportsResult;
  isPersisted: boolean;
}

/**
 * Loads everything the FINANCIAL_REPORTS stage displays in one pass: the
 * household's custom ledger labels (which the frozen report labels depend on),
 * the live preview bundle built with those labels, and the month's report
 * persistence flag. Label loading precedes the preview so a custom code's label
 * is frozen into the statements rather than falling back to the static catalog.
 * A read failure returns null so the month-keyed state stays unset rather than
 * claiming there are no figures.
 */
const fetchFinancialReportsData = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<FinancialReportsData | null> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const labelEntries = await listAllLedgerCodesUseCase.execute({
      householdId,
      auth,
      labelResolver: getUnifiedLedgerCodeLabel,
    });
    const customLabels = new Map(
      labelEntries.filter((entry) => entry.isCustom).map((entry) => [entry.code, entry.label]),
    );
    const labelResolver: ReportLabelResolver = (code, fallback) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code;

    const [preview, persistence] = await Promise.all([
      previewFinancialReportsWorkflow.execute({ householdId, auth, year, month, labelResolver }),
      // A persistence read failure degrades to "not persisted" rather than
      // dropping the preview we did manage to load.
      getReportPersistenceStateUseCase
        .execute({ householdId, yearMonth: selectedYearMonth })
        .catch((caught) => {
          logger.warn('Failed to load report persistence state', 'useFinancialReportsStage', {
            caught,
          });
          return null;
        }),
    ]);

    return { customLabels, preview, isPersisted: persistence?.isPersisted ?? false };
  } catch (caught) {
    logger.warn('Failed to load financial reports preview', 'useFinancialReportsStage', { caught });
    return null;
  }
};

/**
 * Stage controller for FINANCIAL_REPORTS: owns the household's report label
 * resolver (the static catalog resolves first and household custom codes
 * override it, so persisted reports carry directly displayable labels), the
 * month's report persistence flag (the cross-stage fact the reports-generated
 * badge and CLOSE_PERIOD's evidence consume), and the drift-annotated
 * statements the stage renders. The persisted bundle it compares against stays
 * owned by CLOSE_PERIOD and arrives as `persistedBundle`; the live preview is
 * loaded unconditionally, not gated on persistence. `refresh` reloads
 * everything after the period changes under the stage; there is no draft and no
 * gate.
 */
export const useFinancialReportsStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  persistedBundle,
  isClosed,
}: UseFinancialReportsStageArgs): CloseStageControl & {
  labelResolver: ReportLabelResolver;
  reportsPersisted: boolean | null;
  reports: ReportViewsVM;
  timestamps: ReportTimestampsVM;
  isLoading: boolean;
  error: string | null;
} => {
  const auth = useAuthIdentity();
  // Keyed by year-month: a value loaded for a previous month reads as null
  // under the current selection, so a month switch never shows the last
  // month's figures or badge while the new month loads.
  const [data, setData] = useState<{
    yearMonth: string;
    customLabels: Map<string, string>;
    preview: PreviewFinancialReportsResult;
    isPersisted: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = data?.yearMonth === selectedYearMonth ? data : null;
  const customLabels = useMemo(() => current?.customLabels ?? new Map<string, string>(), [current]);
  const preview = current?.preview ?? null;
  const reportsPersisted = current?.isPersisted ?? null;

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await fetchFinancialReportsData({ householdId, selectedYearMonth, auth });
      if (cancelled) return;
      if (!result) {
        setError(PREVIEW_ERROR);
      } else {
        setData({ yearMonth: selectedYearMonth, ...result });
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth]);

  const refresh = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    const result = await fetchFinancialReportsData({ householdId, selectedYearMonth, auth });
    if (!result) return;
    setData({ yearMonth: selectedYearMonth, ...result });
  }, [auth, householdId, selectedYearMonth]);

  const labelResolver = useMemo<ReportLabelResolver>(
    () => (code, fallback) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code,
    [customLabels],
  );

  // A CLOSED period renders the persisted record with no drift marks; a live
  // period renders the preview annotated against the persisted report, so a
  // reopened period with leftover files keeps comparing.
  const reports = useMemo<ReportViewsVM>(
    () => ({
      incomeStatement: isClosed
        ? persistedBundle?.incomeStatement
          ? annotateIncomeStatement(persistedBundle.incomeStatement)
          : null
        : preview
          ? diffIncomeStatement(preview.incomeStatement, persistedBundle?.incomeStatement ?? null)
          : null,
      balanceSheet: isClosed
        ? persistedBundle?.balanceSheet
          ? annotateBalanceSheet(persistedBundle.balanceSheet)
          : null
        : preview
          ? diffBalanceSheet(preview.balanceSheet, persistedBundle?.balanceSheet ?? null)
          : null,
      cashFlow: isClosed
        ? persistedBundle?.cashFlow
          ? annotateCashFlow(persistedBundle.cashFlow)
          : null
        : preview
          ? diffCashFlow(preview.cashFlow, persistedBundle?.cashFlow ?? null)
          : null,
    }),
    [isClosed, persistedBundle, preview],
  );

  const timestamps = preview?.isPersisted ? preview.timestamps : {};

  const control = useConfirmStageControl({
    stageId: 'FINANCIAL_REPORTS',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'FINANCIAL_REPORTS', labelResolver }),
    refresh,
    // The report preview stays open so the user can read the generated
    // reports before confirming the next stage; every other stage resets.
    keepsViewOnConfirm: true,
  });

  return {
    ...control,
    labelResolver,
    reportsPersisted,
    reports,
    timestamps,
    isLoading,
    error,
  };
};
