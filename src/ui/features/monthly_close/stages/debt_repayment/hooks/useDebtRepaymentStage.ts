import { useCallback, useEffect, useRef, useState } from 'react';

import { type DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type AuthContext } from '@/application/types';
import { getEffectiveMonthlyDueForBalance } from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount } from '@/domains/debt/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import type { DebtSectionMetaVM } from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

export const closeMonthDate = (yearMonth: string): Date =>
  new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)) - 1, 15);

interface UseDebtRepaymentStageArgs {
  householdId: string;
  selectedYearMonth: string;
  /** Full debt documents: the monthly-due calculation reads schedule fields. */
  debtAccounts: DebtAccount[];
  auth: AuthContext;
  confirmingStageId: string | null;
}

const LOAD_ERROR = '無法載入債務還款試算，請稍後再試。';

interface DebtPrefillData {
  repayments: DebtRepaymentInput[];
  debtSectionMetas: DebtSectionMetaVM[];
}

/**
 * Loads the month's debt settlement preview and derives the prefill rows and
 * per-section metas from it. A read failure throws the canned message so the
 * surface shows copy the consumer owns instead of an empty, unlabelled list.
 */
const fetchDebtPrefill = async ({
  householdId,
  selectedYearMonth,
  debtAccounts,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  debtAccounts: DebtAccount[];
  auth: AuthContext;
}): Promise<DebtPrefillData> => {
  const date = closeMonthDate(selectedYearMonth);
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const preview = await previewDebtSettlementsUseCase.execute({
      householdId,
      year,
      month,
      auth,
    });

    const snapshotItems = new Map(preview.items.map((item) => [item.debtAccountId, item] as const));
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

    return {
      debtSectionMetas: preview.items.map((item) => ({
        debtAccountId: item.debtAccountId,
        debtAccountName: item.debtAccountName,
        interestRate:
          debtAccounts.find((debtAccount) => debtAccount.id === item.debtAccountId)?.interestRate ??
          0,
        openingBalance: item.openingBalance,
        monthlyDue: dueByAccount.get(item.debtAccountId) ?? 0,
      })),
      repayments: debtAccounts
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
    };
  } catch (caught) {
    logger.warn('Failed to load debt settlement preview', 'useDebtRepaymentStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/**
 * Stage controller for DEBT_REPAYMENT: owns the repayment draft and the
 * preview prefill that seeds it (absorbed from useDebtRepaymentPrefill).
 * Every active debt gets a draft row: a month with recorded payments prefills
 * the booked amount, an unrecorded month prefills the system-calculated
 * monthly due (interest amount during the grace period) against the preview's
 * opening balance, so the due and the displayed split share one basis. Local
 * drafts are not persisted. A load failure surfaces the canned message without
 * blocking confirm.
 */
export const useDebtRepaymentStage = ({
  householdId,
  selectedYearMonth,
  debtAccounts,
  auth,
  confirmingStageId,
}: UseDebtRepaymentStageArgs): CloseStageControl & {
  repayments: DebtRepaymentInput[];
  setRepayments: React.Dispatch<React.SetStateAction<DebtRepaymentInput[]>>;
  debtSectionMetas: DebtSectionMetaVM[];
  errorMessage: string | null;
} => {
  const [repayments, setRepayments] = useState<DebtRepaymentInput[]>([]);
  const [debtSectionMetas, setDebtSectionMetas] = useState<DebtSectionMetaVM[]>([]);
  const { errorMessage, run } = useLoadingTask();
  // A slow load for a month the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!householdId || debtAccounts.length === 0) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchDebtPrefill({ householdId, selectedYearMonth, debtAccounts, auth }), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setDebtSectionMetas(result.value.debtSectionMetas);
        setRepayments(result.value.repayments);
      },
    });
  }, [auth, debtAccounts, householdId, run, selectedYearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const control = useConfirmStageControl({
    stageId: 'DEBT_REPAYMENT',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments }),
    resetDraft: () => {
      setRepayments([]);
      setDebtSectionMetas([]);
    },
    refresh: load,
  });

  return { ...control, repayments, setRepayments, debtSectionMetas, errorMessage };
};
