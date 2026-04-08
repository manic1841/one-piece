import { useCallback, useEffect, useState } from 'react';

import { getDebtSummaryUseCase } from '@/application/debt/use_cases/getDebtSummaryUseCase';
import { mapDebtSummaryToCardVM } from '@/ui/features/dashboard/viewmodels/dashboardDisplay.vm';

export interface DebtSummaryData {
  totalDebt: number;
  monthlyPaymentTotal: number;
  unpaidCount: number;
  loading: boolean;
  error: string | null;
}

export function useDebtSummary(householdId: string | undefined) {
  const [data, setData] = useState<DebtSummaryData>({
    totalDebt: 0,
    monthlyPaymentTotal: 0,
    unpaidCount: 0,
    loading: false,
    error: null,
  });

  const loadData = useCallback(async () => {
    if (!householdId) return;

    setData((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const summary = await getDebtSummaryUseCase.execute({ householdId });

      setData({
        totalDebt: summary.totalDebt,
        monthlyPaymentTotal: summary.monthlyPaymentTotal,
        unpaidCount: summary.unpaidCount,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to load debt summary:', err);
      setData((prev) => ({ ...prev, loading: false, error: '無法載入債務摘要' }));
    }
  }, [householdId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  return {
    ...data,
    cardVM: mapDebtSummaryToCardVM(data.totalDebt, data.monthlyPaymentTotal, data.unpaidCount),
    reload: loadData,
  };
}
