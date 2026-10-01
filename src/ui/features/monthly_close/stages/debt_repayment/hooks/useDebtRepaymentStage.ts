import { useCallback } from 'react';

import { type DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { previewDebtSettlementsUseCase } from '@/application/settlement/use_cases/previewDebtSettlementsUseCase';
import { type AuthContext } from '@/application/types';
import { getEffectiveMonthlyDueForBalance } from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount } from '@/domains/debt/schemas';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useConfirmStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useSeededDraft } from '@/ui/features/monthly_close/hooks/useSeededDraft';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import type { DebtSectionMetaVM } from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

export const closeMonthDate = (yearMonth: string): Date =>
  new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)) - 1, 15);

interface UseDebtRepaymentStageArgs {
  householdId: string;
  selectedYearMonth: string;
  /** Full debt documents: the monthly-due calculation reads schedule fields. */
  debtAccounts: DebtAccount[];
  confirmingStageId: string | null;
  enabled?: boolean;
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
 * opening balance, so the due and the displayed split share one basis. The
 * draft is seeded by `useSeededDraft`, so a background reload never overwrites
 * a row the user edited — the prefill used to overwrite unconditionally on
 * every reload, contradicting `docs/monthly-close.md`'s seed-once rule. Local
 * drafts are not persisted. A load failure surfaces the canned message without
 * blocking confirm.
 */
export const useDebtRepaymentStage = ({
  householdId,
  selectedYearMonth,
  debtAccounts,
  confirmingStageId,
  enabled = true,
}: UseDebtRepaymentStageArgs): CloseStageControl & {
  repayments: DebtRepaymentInput[] | null;
  setRepayments: (value: DebtRepaymentInput[]) => void;
  debtSectionMetas: DebtSectionMetaVM[];
  errorMessage: string | null;
} => {
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchDebtPrefill({ householdId, selectedYearMonth, debtAccounts, auth }),
    [auth, debtAccounts, householdId, selectedYearMonth],
  );
  // The gate carries every precondition — including `selectedYearMonth`, which
  // the old guard omitted, so a month switch could run the previous month's
  // prefill — and the loader runs the read when it flips.
  const { data, errorMessage, refresh } = useStageLoader<DebtPrefillData>({
    key: selectedYearMonth,
    enabled: enabled && householdId !== '' && selectedYearMonth !== '' && debtAccounts.length > 0,
    load,
  });
  const [repayments, setRepayments] = useSeededDraft<DebtRepaymentInput[]>(
    selectedYearMonth,
    data?.repayments ?? null,
  );

  const control = useConfirmStageControl({
    stageId: 'DEBT_REPAYMENT',
    confirmingStageId,
    buildRequest: () => ({ stageId: 'DEBT_REPAYMENT', repayments: repayments ?? [] }),
    refresh,
  });

  return {
    ...control,
    repayments,
    setRepayments,
    debtSectionMetas: data?.debtSectionMetas ?? [],
    errorMessage,
  };
};
