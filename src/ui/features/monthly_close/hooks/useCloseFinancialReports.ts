import { useCallback, useEffect, useState } from 'react';

import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { getSettlementReadinessUseCase } from '@/application/report/use_cases/getSettlementReadinessUseCase';
import { previewFinancialReportsWorkflow } from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import {
  type PreviewFinancialReportsResult,
  type ReportTimestamps,
} from '@/application/report/use_cases/previewFinancialReportsWorkflow';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';
import {
  type BalanceSheetData,
  type BalanceSheetGroup,
  type CashFlowData,
  type IncomeStatementData,
} from '@/domains/report/schemas';
import { getUnifiedLedgerCodeLabel } from '@/ui/constants/transaction';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

const PREVIEW_ERROR = '無法載入報表預覽，請稍後再試。';

export type { BalanceSheetData, BalanceSheetGroup, CashFlowData, IncomeStatementData };

export type CloseReportsView = 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';

interface UseCloseFinancialReportsArgs {
  householdId: string;
  year: number;
  month: number;
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
}: UseCloseFinancialReportsArgs) => {
  const auth = useAuthIdentity();
  const [view, setView] = useState<CloseReportsView>('INCOME_STATEMENT');
  const [reports, setReports] = useState<PreviewFinancialReportsResult | null>(null);
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

      const [readiness, preview] = await Promise.all([
        getSettlementReadinessUseCase.execute({ householdId, auth, year, month }),
        previewFinancialReportsWorkflow.execute({ householdId, auth, year, month, labelResolver }),
      ]);

      setMissingCategoryNames([
        ...readiness.unsettledProjects.map((project) => project.name),
        ...readiness.unsettledAccounts.map((account) => account.name),
        ...readiness.unsettledPortfolios.map((portfolio) => portfolio.name),
        ...readiness.unsettledDebts.map((debt) => debt.name),
      ]);

      setReports(preview);
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

  return {
    view,
    setView,
    incomeStatement: reports?.incomeStatement ?? null,
    balanceSheet: reports?.balanceSheet ?? null,
    cashFlow: reports?.cashFlow ?? null,
    timestamps,
    missingCategoryNames,
    isLoading,
    error,
  };
};

export type CloseReportsData = {
  incomeStatement: IncomeStatementData | null;
  balanceSheet: BalanceSheetData | null;
  cashFlow: CashFlowData | null;
};

export default useCloseFinancialReports;
