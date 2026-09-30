import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import {
  type StoredReportsBundle,
  getStoredReportsBundleUseCase,
} from '@/application/report/use_cases/getStoredReportsBundleUseCase';
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
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

interface UseFinancialReportsStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  /** A CLOSED period renders the persisted record read-only; drift is not compared. */
  isClosed: boolean;
  enabled?: boolean;
}

const PREVIEW_ERROR = '無法載入報表預覽，請稍後再試。';

interface FinancialReportsData {
  customLabels: Map<string, string>;
  preview: PreviewFinancialReportsResult;
  /** The frozen record the preview is compared against; null when the read failed. */
  persistedBundle: StoredReportsBundle | null;
  /** Whether all three reports are persisted; null when the read failed (unknown). */
  isPersisted: boolean | null;
  /** The persisted reports' frozen generation times; empty when not persisted. */
  persistedTimestamps: ReportTimestampsVM;
}

/**
 * Loads everything the FINANCIAL_REPORTS stage needs in one pass: the
 * household's custom ledger labels (which the frozen report labels depend on),
 * the live preview bundle built with those labels, the persisted bundle the
 * drift comparison and the CLOSED view read, and the month's report persistence
 * flag with its timestamps. One load owns all four, so the drift baseline and
 * the persistence flag always land together instead of drifting apart across
 * two stage hooks (#228).
 *
 * Label loading precedes the preview so a custom code's label is frozen into
 * the statements rather than falling back to the static catalog. A label or
 * preview failure throws the canned message: the surface shows copy the
 * consumer owns, and the month-keyed state stays unset rather than claiming
 * there are no figures. The persistence reads degrade separately to null so a
 * failure there never drops the preview we did manage to load.
 */
const fetchFinancialReportsData = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<FinancialReportsData> => {
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

    const [preview, persistedBundle, persistence] = await Promise.all([
      previewFinancialReportsWorkflow.execute({ householdId, auth, year, month, labelResolver }),
      // A read failure degrades to null (the baseline is unknown) rather than
      // dropping the preview; the drift comparison simply has nothing to
      // compare against, exactly as for a month with no persisted reports.
      getStoredReportsBundleUseCase
        .execute({ householdId, yearMonth: selectedYearMonth, auth })
        .catch((caught) => {
          logger.warn('Failed to load persisted reports', 'useFinancialReportsStage', { caught });
          return null;
        }),
      // A deliberate degradation: a persistence read failure reads as "not
      // persisted" rather than dropping the preview we did manage to load.
      getReportPersistenceStateUseCase
        .execute({ householdId, yearMonth: selectedYearMonth })
        .catch((caught) => {
          logger.warn('Failed to load report persistence state', 'useFinancialReportsStage', {
            caught,
          });
          return null;
        }),
    ]);

    return {
      customLabels,
      preview,
      persistedBundle,
      // The persistence read may fail; null keeps it distinguishable from
      // "not persisted", so a failed read is never shown as 尚未產生 (#229).
      isPersisted: persistence?.isPersisted ?? null,
      // The same read supplies the flag and the times, so the badge and any
      // warning cannot disagree about whether reports were persisted (#222).
      persistedTimestamps: persistence?.timestamps ?? {},
    };
  } catch (caught) {
    logger.warn('Failed to load financial reports preview', 'useFinancialReportsStage', { caught });
    throw new Error(PREVIEW_ERROR);
  }
};

/**
 * Stage controller for FINANCIAL_REPORTS: owns the household's report label
 * resolver (the static catalog resolves first and household custom codes
 * override it, so persisted reports carry directly displayable labels), the
 * month's live preview bundle (with labels frozen in), the persisted bundle the
 * drift comparison and the CLOSED view read, and the report persistence flag the
 * reports-generated badge and CLOSE_PERIOD's evidence consume. All of these come
 * from one load so the drift baseline and the flag cannot disagree (#228); the
 * preview is loaded unconditionally, not gated on persistence. `refresh` reloads
 * everything after the period changes under the stage; there is no draft and no
 * gate.
 */
export const useFinancialReportsStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  isClosed,
  enabled = true,
}: UseFinancialReportsStageArgs): CloseStageControl & {
  labelResolver: ReportLabelResolver;
  reportBundle: PreviewFinancialReportsResult | null;
  persistedBundle: StoredReportsBundle | null;
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
    persistedBundle: StoredReportsBundle | null;
    isPersisted: boolean | null;
    persistedTimestamps: ReportTimestampsVM;
  } | null>(null);
  const { loading: isLoading, errorMessage, run } = useLoadingTask();
  // Paging months faster than the load completes supersedes the previous load;
  // without this the slower, older month could land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  const current = data?.yearMonth === selectedYearMonth ? data : null;
  const customLabels = useMemo(() => current?.customLabels ?? new Map<string, string>(), [current]);
  const preview = current?.preview ?? null;
  const reportBundle = preview;
  const persistedBundle = current?.persistedBundle ?? null;
  const reportsPersisted = current?.isPersisted ?? null;

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchFinancialReportsData({ householdId, selectedYearMonth, auth }), {
      signal: controller.signal,
      // A failed run writes nothing. On a month switch the new month therefore
      // reads empty rather than the previous month's; on a same-month refresh
      // the previous values stay on screen, so the error channel (not the data)
      // is what marks the stage not-ready (#226) — this also keeps a stale
      // `reportsPersisted` from being read as verified.
      writeBack: (result) => {
        if (!result.ok) return;
        setData({ yearMonth: selectedYearMonth, ...result.value });
      },
    });
  }, [auth, householdId, run, selectedYearMonth]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

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

  const timestamps = current?.persistedTimestamps ?? {};

  const control = useConfirmStageControl({
    stageId: 'FINANCIAL_REPORTS',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'FINANCIAL_REPORTS', labelResolver }),
    refresh: load,
    // The report preview stays open so the user can read the generated
    // reports before confirming the next stage; every other stage resets.
    keepsViewOnConfirm: true,
  });

  return {
    ...control,
    labelResolver,
    reportBundle,
    persistedBundle,
    reportsPersisted,
    reports,
    timestamps,
    isLoading,
    error: errorMessage,
  };
};
