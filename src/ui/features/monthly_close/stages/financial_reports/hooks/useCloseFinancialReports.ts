import { useCallback, useEffect, useMemo, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import {
  type StoredReportsBundle,
  getStoredReportsBundleUseCase,
} from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import {
  type PreviewFinancialReportsResult,
  type ReportTimestamps,
  previewFinancialReportsWorkflow,
} from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import {
  type BalanceSheetDrift,
  type CashFlowDrift,
  type IncomeStatementDrift,
  annotateBalanceSheet,
  annotateCashFlow,
  annotateIncomeStatement,
  diffBalanceSheet,
  diffCashFlow,
  diffIncomeStatement,
} from '@/domains/report/reportDrift';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

const PREVIEW_ERROR = '無法載入報表預覽，請稍後再試。';

export type CloseReportsView = 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';

interface UseCloseFinancialReportsArgs {
  householdId: string;
  year: number;
  month: number;
  /** A CLOSED period renders the persisted record read-only; drift is not compared. */
  isClosed: boolean;
}

/**
 * Owns the FINANCIAL_REPORTS stage's data: the report preview bundle, the
 * settlement readiness gate, and the statement view selection. The component
 * keeps only layout and rendering.
 */
export const useCloseFinancialReports = ({
  householdId,
  year,
  month,
  isClosed,
}: UseCloseFinancialReportsArgs) => {
  const auth = useAuthIdentity();
  const [view, setView] = useState<CloseReportsView>('INCOME_STATEMENT');
  const [reports, setReports] = useState<PreviewFinancialReportsResult | null>(null);
  const [storedReports, setStoredReports] = useState<StoredReportsBundle | null>(null);
  const [timestamps, setTimestamps] = useState<ReportTimestamps>({});
  const [missingCategoryNames, setMissingCategoryNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId) return;

    setIsLoading(true);
    setError(null);
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
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

      const [readiness, preview, stored] = await Promise.all([
        getSettlementReadinessUseCase.execute({ householdId, auth, year, month }),
        previewFinancialReportsWorkflow.execute({ householdId, auth, year, month, labelResolver }),
        // A read failure degrades to "no persisted report" (no drift) rather
        // than surfacing a false comparison; the preview still renders.
        getStoredReportsBundleUseCase.execute({ householdId, yearMonth, auth }).catch((caught) => {
          logger.warn('Failed to load persisted reports for drift', 'useCloseFinancialReports', {
            caught,
          });
          return null;
        }),
      ]);

      setMissingCategoryNames([
        ...readiness.unsettledProjects.map((project) => project.name),
        ...readiness.unsettledAccounts.map((account) => account.name),
        ...readiness.unsettledPortfolios.map((portfolio) => portfolio.name),
        ...readiness.unsettledDebts.map((debt) => debt.name),
      ]);

      setReports(preview);
      setStoredReports(stored);
      setTimestamps(preview.isPersisted ? preview.timestamps : {});
    } catch (caught) {
      console.error('Error loading financial reports preview:', caught);
      setError(PREVIEW_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [auth, householdId, month, year]);

  useEffect(() => {
    void load();
  }, [load]);

  // A CLOSED period renders the persisted record with no drift marks; a live
  // period renders the preview annotated against the persisted report, so a
  // reopened period with leftover files keeps comparing.
  const incomeStatement = useMemo<IncomeStatementDrift | null>(() => {
    if (isClosed) {
      return storedReports?.incomeStatement
        ? annotateIncomeStatement(storedReports.incomeStatement)
        : null;
    }
    return reports
      ? diffIncomeStatement(reports.incomeStatement, storedReports?.incomeStatement ?? null)
      : null;
  }, [isClosed, reports, storedReports]);

  const balanceSheet = useMemo<BalanceSheetDrift | null>(() => {
    if (isClosed) {
      return storedReports?.balanceSheet ? annotateBalanceSheet(storedReports.balanceSheet) : null;
    }
    return reports
      ? diffBalanceSheet(reports.balanceSheet, storedReports?.balanceSheet ?? null)
      : null;
  }, [isClosed, reports, storedReports]);

  const cashFlow = useMemo<CashFlowDrift | null>(() => {
    if (isClosed) {
      return storedReports?.cashFlow ? annotateCashFlow(storedReports.cashFlow) : null;
    }
    return reports ? diffCashFlow(reports.cashFlow, storedReports?.cashFlow ?? null) : null;
  }, [isClosed, reports, storedReports]);

  return {
    view,
    setView,
    incomeStatement,
    balanceSheet,
    cashFlow,
    timestamps,
    missingCategoryNames,
    isLoading,
    error,
  };
};

export type CloseReportsData = {
  incomeStatement: IncomeStatementDrift | null;
  balanceSheet: BalanceSheetDrift | null;
  cashFlow: CashFlowDrift | null;
};

export default useCloseFinancialReports;
