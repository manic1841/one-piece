import { useState } from 'react';
import { settlementService } from '@/domains/project/settlementService';

export const DebtSettlementStatus = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type DebtSettlementStatusType = (typeof DebtSettlementStatus)[keyof typeof DebtSettlementStatus];

export function useDebtSettlement(
  householdId: string,
  userEmail: string,
  onSuccess?: () => void
) {
  const [status, setStatus] = useState<DebtSettlementStatusType>(DebtSettlementStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const settle = async () => {
    if (!householdId || !userEmail) {
      setError('遺失家用 ID 或使用者資訊');
      return;
    }

    setStatus(DebtSettlementStatus.PROCESSING);
    setError(null);

    try {
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      await settlementService.settleDebtAccounts(householdId, yearMonth, userEmail);
      setStatus(DebtSettlementStatus.SUCCESS);
      onSuccess?.();
    } catch (err) {
      console.error('Debt settlement failed:', err);
      setError(err instanceof Error ? err.message : '結算失敗，請稍後再試');
      setStatus(DebtSettlementStatus.ERROR);
    }
  };

  const reset = () => {
    setStatus(DebtSettlementStatus.IDLE);
    setError(null);
  };

  return {
    status,
    error,
    year,
    month,
    setYear,
    setMonth,
    settle,
    reset,
  };
}
