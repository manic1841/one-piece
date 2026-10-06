import { useEffect, useMemo, useState } from 'react';

import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { getStoredReportsBundleUseCase } from '@/application/report/use_cases/getStoredReportsBundleUseCase';
import { type FinancialPeriodStatus } from '@/domains/financial_period/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import {
  mapBalanceSheetToVM,
  mapCashFlowToVM,
  mapIncomeStatementToVM,
} from '../viewmodels/reportDisplay.vm';
import {
  type BalanceSheetVM,
  type CashFlowVM,
  type IncomeStatementVM,
} from '../viewmodels/reportDisplay.vm';
import { type ReportPeriod, parseReportPeriod } from '../viewmodels/reportHistory.vm';

export interface ReportDetailReady {
  status: 'ready';
  period: ReportPeriod;
  incomeStatement: IncomeStatementVM | null;
  balanceSheet: BalanceSheetVM | null;
  cashFlow: CashFlowVM | null;
  /** 該期間的關帳狀態；年期間或無紀錄時為 null。 */
  closeStatus: FinancialPeriodStatus | null;
}

export type ReportDetailState =
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'empty'; period: ReportPeriod }
  | { status: 'error' }
  | ReportDetailReady;

/**
 * 報表 detail 的資料來源：一律讀取已產生報表（不比對漂移、不以即時預覽重算），
 * 期間字串直接對應資料層（`YYYY-MM` 為月、`YYYY` 為年）。
 */
export const useReportDetail = (
  householdId: string,
  rawPeriod: string | undefined,
): { state: ReportDetailState; reload: () => void } => {
  const period = useMemo(() => parseReportPeriod(rawPeriod), [rawPeriod]);
  const auth = useAuthIdentity();
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${householdId}\u0000${period?.raw ?? ''}\u0000${reloadToken}`;
  const [result, setResult] = useState<{ key: string; state: ReportDetailState } | null>(null);

  useEffect(() => {
    if (!period || !householdId) return;
    let active = true;
    void Promise.all([
      getStoredReportsBundleUseCase.execute({
        householdId,
        yearMonth: period.raw,
        auth,
      }),
      new GetFinancialPeriodUseCase().execute({ householdId, yearMonth: period.raw }),
    ])
      .then(([bundle, financialPeriod]) => {
        if (!active) return;
        const isEmpty =
          bundle.incomeStatement === null &&
          bundle.balanceSheet === null &&
          bundle.cashFlow === null;
        setResult({
          key: requestKey,
          state: isEmpty
            ? { status: 'empty', period }
            : {
                status: 'ready',
                period,
                incomeStatement: bundle.incomeStatement
                  ? mapIncomeStatementToVM(bundle.incomeStatement)
                  : null,
                balanceSheet: bundle.balanceSheet ? mapBalanceSheetToVM(bundle.balanceSheet) : null,
                cashFlow: bundle.cashFlow ? mapCashFlowToVM(bundle.cashFlow) : null,
                closeStatus: financialPeriod?.status ?? null,
              },
        });
      })
      .catch(() => {
        if (!active) return;
        setResult({ key: requestKey, state: { status: 'error' } });
      });
    return () => {
      active = false;
    };
  }, [householdId, period, auth, requestKey]);

  if (period === null) return { state: { status: 'invalid' }, reload: () => {} };
  const reload = () => setReloadToken((token) => token + 1);
  if (result && result.key === requestKey) return { state: result.state, reload };
  return { state: { status: 'loading' }, reload };
};
