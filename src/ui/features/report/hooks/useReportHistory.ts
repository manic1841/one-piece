import { useCallback, useEffect, useMemo, useState } from 'react';

import { ListFinancialPeriodsUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type FinancialReport } from '@/domains/report/schemas';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

import {
  type ReportGranularity,
  type ReportHistoryVM,
  buildReportHistoryVM,
} from '../viewmodels/reportHistory.vm';

interface ReportHistoryData {
  reports: FinancialReport[];
  periods: FinancialPeriod[];
}

const EMPTY: ReportHistoryData = { reports: [], periods: [] };

/**
 * 報表歷史的資料來源：一次讀取已產生報表集合與財務期間，歷史骨幹取兩者的聯集。
 * 年度的聚合在記憶體完成，不新增後端查詢。
 */
export function useReportHistory(householdId: string, granularity: ReportGranularity) {
  const [data, setData] = useState<ReportHistoryData>(EMPTY);
  const { loading, errorMessage, run } = useLoadingTask({ initiallyLoading: true });
  const auth = useAuthIdentity();

  const load = useCallback(async () => {
    await run(
      async (): Promise<ReportHistoryData> => {
        if (!householdId) return EMPTY;
        const [reports, periods] = await Promise.all([
          listReportsUseCase.execute({ householdId, auth }),
          new ListFinancialPeriodsUseCase().execute({ householdId }),
        ]);
        return { reports, periods };
      },
      { writeBack: (result) => result.ok && setData(result.value) },
    );
  }, [householdId, auth, run]);

  useEffect(() => {
    void load();
  }, [load]);

  const vm: ReportHistoryVM = useMemo(
    () => buildReportHistoryVM(data.reports, data.periods, granularity),
    [data, granularity],
  );

  return { vm, loading, errorMessage, reload: load };
}
