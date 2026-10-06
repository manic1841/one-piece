import { useCallback, useMemo } from 'react';

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
  type ReportDriftModel,
  annotateReports,
  compareReports,
} from '@/domains/report/reportDrift';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
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
  /** A CLOSED period renders the persisted record read-only; drift is not compared. */
  isClosed: boolean;
}

const PREVIEW_ERROR = '無法載入報表預覽，請稍後再試。';

/**
 * The cash-flow adjustment is the part of the change the derivations cannot
 * explain (docs/financial_report.md): a figure this large means the data is
 * wrong somewhere the system cannot locate, so the user must confirm before
 * generating. The threshold is an application decision, not a render one.
 */
export const ADJUSTMENT_WARNING_THRESHOLD = 1000;

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
}: UseFinancialReportsStageArgs): CloseStageControl<'FINANCIAL_REPORTS'> & {
  labelResolver: ReportLabelResolver;
  reportBundle: PreviewFinancialReportsResult | null;
  persistedBundle: StoredReportsBundle | null;
  reportsPersisted: boolean | null;
  reports: ReportViewsVM;
  reportDrift: ReportDriftModel;
  hasAnyDrift: boolean;
  /** Whether the cash-flow adjustment exceeds the confirmation threshold. */
  showAdjustmentWarning: boolean;
  timestamps: ReportTimestampsVM;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchFinancialReportsData({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, isLoading, isLoaded, refresh } = useStageLoader<FinancialReportsData>(
    {
      enabled: householdId !== '' && selectedYearMonth !== '',
      load,
    },
  );

  const customLabels = useMemo(() => data?.customLabels ?? new Map<string, string>(), [data]);
  const preview = data?.preview ?? null;
  const reportBundle = preview;
  const persistedBundle = data?.persistedBundle ?? null;
  const reportsPersisted = data?.isPersisted ?? null;

  const labelResolver = useMemo<ReportLabelResolver>(
    () => (code, fallback) =>
      customLabels.get(code) ?? getUnifiedLedgerCodeLabel(code) ?? fallback ?? code,
    [customLabels],
  );

  // CLOSED annotates the persisted record; otherwise compare the preview against it.
  const reportDrift = useMemo<ReportDriftModel>(
    () =>
      isClosed
        ? annotateReports(persistedBundle)
        : preview
          ? compareReports(preview, persistedBundle)
          : annotateReports(null),
    [isClosed, persistedBundle, preview],
  );

  const reports = useMemo<ReportViewsVM>(
    () => ({
      incomeStatement: reportDrift.incomeStatement,
      balanceSheet: reportDrift.balanceSheet,
      cashFlow: reportDrift.cashFlow,
    }),
    [reportDrift],
  );

  const timestamps = data?.persistedTimestamps ?? {};

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
    reportBundle,
    persistedBundle,
    reportsPersisted,
    reports,
    reportDrift,
    hasAnyDrift: reportDrift.hasAnyDrift,
    showAdjustmentWarning:
      Math.abs(reports.cashFlow?.adjustment.amount ?? 0) > ADJUSTMENT_WARNING_THRESHOLD,
    timestamps,
    isLoading,
    isLoaded,
    error: errorMessage,
  };
};
