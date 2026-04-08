import { useState } from 'react';

import {
  type PreviewDebtSettlementsResult,
  previewDebtSettlementsUseCase,
} from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';

export const DebtSettlementStatus = {
  SELECTION: 'selection',
  PREVIEW: 'preview',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type DebtSettlementStatusType =
  (typeof DebtSettlementStatus)[keyof typeof DebtSettlementStatus];

export function useDebtSettlement(householdId: string, userEmail: string, onSuccess?: () => void) {
  const [status, setStatus] = useState<DebtSettlementStatusType>(DebtSettlementStatus.SELECTION);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [preview, setPreview] = useState<PreviewDebtSettlementsResult | null>(null);

  const toPreview = async () => {
    if (!householdId || !userEmail) {
      setError('遺失家用 ID 或使用者資訊');
      return;
    }

    setStatus(DebtSettlementStatus.PROCESSING);
    setError(null);

    try {
      const result = await previewDebtSettlementsUseCase.execute({ householdId, year, month });
      setPreview(result);
      setStatus(DebtSettlementStatus.PREVIEW);
    } catch (err) {
      console.error('Debt settlement preview failed:', err);
      setError(err instanceof Error ? err.message : '預覽結算失敗，請稍後再試');
      setStatus(DebtSettlementStatus.ERROR);
    }
  };

  const settle = async (forceWithoutRepayment: boolean) => {
    if (!householdId || !userEmail) {
      setError('遺失家用 ID 或使用者資訊');
      return;
    }

    if (!preview) {
      setError('請先預覽結算內容');
      setStatus(DebtSettlementStatus.SELECTION);
      return;
    }

    if (preview.hasMissingRepayments && !forceWithoutRepayment) {
      setError('當月存在無還款紀錄的債務帳戶，請確認後再執行結算');
      setStatus(DebtSettlementStatus.PREVIEW);
      return;
    }

    setStatus(DebtSettlementStatus.PROCESSING);
    setError(null);

    try {
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      await settleDebtAccountsUseCase.execute({ householdId, yearMonth, userEmail });
      setStatus(DebtSettlementStatus.SUCCESS);
      onSuccess?.();
    } catch (err) {
      console.error('Debt settlement failed:', err);
      setError(err instanceof Error ? err.message : '結算失敗，請稍後再試');
      setStatus(DebtSettlementStatus.ERROR);
    }
  };

  const back = () => {
    setStatus(DebtSettlementStatus.SELECTION);
    setError(null);
  };

  const reset = () => {
    setStatus(DebtSettlementStatus.SELECTION);
    setError(null);
    setPreview(null);
  };

  return {
    status,
    error,
    year,
    month,
    setYear,
    setMonth,
    preview,
    toPreview,
    settle,
    back,
    reset,
  };
}
