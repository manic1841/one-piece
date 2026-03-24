import { useCallback, useEffect, useState } from 'react';
import { where } from 'firebase/firestore';

import { IntentType } from '@/domains/ledger/constants';
import { isInGracePeriod, calculateGraceMonthlyPayment } from '@/domains/debt/debtPaymentCalculator';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

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
      const accounts = await listDebtAccountsUseCase.execute({ householdId });
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Fetch all debt payments for this month in the household
      const payments = await transactionRepository.list(
        [householdId],
        [
          where('intentType', '==', IntentType.DEBT_PAYMENT),
          where('date', '>=', startOfMonth),
          where('date', '<', endOfMonth),
        ]
      );

      const paidAccountIds = new Set(payments.map(p => p.debtAccountId).filter(Boolean));

      let totalDebt = 0;
      let monthlyPaymentTotal = 0;
      let unpaidCount = 0;

      accounts.forEach((acc) => {
        totalDebt += acc.currentBalance;
        
        // Calculate monthly due based on grace period logic
        if (isInGracePeriod(acc.graceEndDate)) {
          monthlyPaymentTotal += calculateGraceMonthlyPayment(acc.currentBalance, acc.interestRate);
        } else {
          monthlyPaymentTotal += acc.monthlyPayment;
        }

        // Check if unpaid this month
        if (!paidAccountIds.has(acc.id)) {
          unpaidCount++;
        }
      });

      setData({
        totalDebt,
        monthlyPaymentTotal,
        unpaidCount,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to load debt summary:', err);
      setData((prev) => ({ ...prev, loading: false, error: '無法載入債務摘要' }));
    }
  }, [householdId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { ...data, reload: loadData };
}
