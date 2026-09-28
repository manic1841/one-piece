import { useEffect, useState } from 'react';

import { type DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type AuthContext } from '@/application/types';
import { getEffectiveMonthlyDueForBalance } from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount } from '@/domains/debt/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import type { DebtSectionMetaVM } from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';

export const closeMonthDate = (yearMonth: string): Date =>
  new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)) - 1, 15);

interface UseDebtRepaymentStageArgs {
  householdId: string;
  selectedYearMonth: string;
  /** Full debt documents: the monthly-due calculation reads schedule fields. */
  debtAccounts: DebtAccount[];
  auth: AuthContext;
  confirmingStageId: string | null;
  /** Bumped after a relevant confirm so the preview prefill re-runs. */
  refreshKey?: number;
}

/**
 * Stage controller for DEBT_REPAYMENT: owns the repayment draft and the
 * preview prefill that seeds it (absorbed from useDebtRepaymentPrefill).
 * Every active debt gets a draft row: a month with recorded payments prefills
 * the booked amount, an unrecorded month prefills the system-calculated
 * monthly due (interest amount during the grace period) against the preview's
 * opening balance, so the due and the displayed split share one basis. Local
 * drafts are not persisted.
 */
export const useDebtRepaymentStage = ({
  householdId,
  selectedYearMonth,
  debtAccounts,
  auth,
  confirmingStageId,
  refreshKey = 0,
}: UseDebtRepaymentStageArgs): CloseStageControl & {
  repayments: DebtRepaymentInput[];
  setRepayments: React.Dispatch<React.SetStateAction<DebtRepaymentInput[]>>;
  debtSectionMetas: DebtSectionMetaVM[];
} => {
  const [repayments, setRepayments] = useState<DebtRepaymentInput[]>([]);
  const [debtSectionMetas, setDebtSectionMetas] = useState<DebtSectionMetaVM[]>([]);

  useEffect(() => {
    if (!householdId || debtAccounts.length === 0) return;
    let cancelled = false;

    const loadPrefill = async () => {
      const date = closeMonthDate(selectedYearMonth);
      const year = Number(selectedYearMonth.slice(0, 4));
      const month = Number(selectedYearMonth.slice(5, 7));
      const preview = await previewDebtSettlementsUseCase.execute({
        householdId,
        year,
        month,
        auth,
      });

      const snapshotItems = new Map(
        preview.items.map((item) => [item.debtAccountId, item] as const),
      );

      if (cancelled) return;
      const dueByAccount = new Map(
        preview.items.map((item) => {
          const debtAccount = debtAccounts.find((debt) => debt.id === item.debtAccountId);
          return [
            item.debtAccountId,
            debtAccount
              ? getEffectiveMonthlyDueForBalance(debtAccount, item.openingBalance, date)
              : 0,
          ] as const;
        }),
      );
      setDebtSectionMetas(
        preview.items.map((item) => ({
          debtAccountId: item.debtAccountId,
          debtAccountName: item.debtAccountName,
          interestRate:
            debtAccounts.find((debtAccount) => debtAccount.id === item.debtAccountId)
              ?.interestRate ?? 0,
          openingBalance: item.openingBalance,
          monthlyDue: dueByAccount.get(item.debtAccountId) ?? 0,
        })),
      );
      setRepayments(
        debtAccounts
          .filter((debtAccount) => snapshotItems.has(debtAccount.id))
          .map((debtAccount) => {
            const item = snapshotItems.get(debtAccount.id);
            if (!item) return null;
            return {
              debtAccountId: debtAccount.id,
              totalPayment: item.hasRepaymentRecord
                ? item.repaymentAmount
                : (dueByAccount.get(debtAccount.id) ?? 0),
              date,
            } satisfies DebtRepaymentInput;
          })
          .filter((row): row is DebtRepaymentInput => row !== null),
      );
    };

    void loadPrefill();
    return () => {
      cancelled = true;
    };
  }, [auth, debtAccounts, householdId, selectedYearMonth, refreshKey]);

  const control = useConfirmStageControl({
    stageId: 'DEBT_REPAYMENT',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments }),
    resetDraft: () => {
      setRepayments([]);
      setDebtSectionMetas([]);
    },
  });

  return { ...control, repayments, setRepayments, debtSectionMetas };
};
