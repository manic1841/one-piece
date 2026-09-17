import { useCallback, useEffect, useState } from 'react';

import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const yearMonth = getPreviousYearMonth();
      const period = await new GetFinancialPeriodUseCase().execute({
        householdId,
        yearMonth,
      });
      setVm(mapPeriodToCloseStatusVM(period, yearMonth));
      setError(null);
    } catch (err) {
      console.error('Failed to load monthly close status:', err);
      setVm(null);
      setError(MONTHLY_CLOSE_LABELS.LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  return { vm, loading, error };
}
