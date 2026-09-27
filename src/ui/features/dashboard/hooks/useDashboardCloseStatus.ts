import { useCallback, useEffect, useState } from 'react';

import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { formatYearMonth } from '@/ui/utils';

import { mapPeriodToCloseStatusVM } from '../viewmodels/dashboardCloseStatus.vm';
import { type DashboardCloseStatusVM } from '../viewmodels/dashboardCloseStatus.vm';

const getPreviousYearMonth = (): string => {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return formatYearMonth(previous.getFullYear(), previous.getMonth() + 1);
};

export function useDashboardCloseStatus(householdId: string | undefined) {
  const [vm, setVm] = useState<DashboardCloseStatusVM | null>(null);
  const { loading, error, run } = useLoadingTask();
  const errorMessage = error === null ? null : MONTHLY_CLOSE_LABELS.LOAD_ERROR;

  const loadData = useCallback(async () => {
    if (!householdId) return;

    const yearMonth = getPreviousYearMonth();
    await run(async () => new GetFinancialPeriodUseCase().execute({ householdId, yearMonth }), {
      writeBack: (result) =>
        setVm(result.ok ? mapPeriodToCloseStatusVM(result.value, yearMonth) : null),
    });
  }, [householdId, run]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { vm, loading, error, errorMessage };
}
