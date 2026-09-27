import {
  type DebtPaymentCalculation,
  DebtPaymentError,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';

export type { DebtPaymentCalculation };

/** Read-only inputs one debt section shows: rate, opening balance, and the
 * system-calculated monthly due the section was prefilled with. */
export interface DebtSectionMetaVM {
  debtAccountId: string;
  debtAccountName: string;
  interestRate: number;
  openingBalance: number;
  monthlyDue: number;
}

export interface DebtPaymentSectionVM extends DebtSectionMetaVM {
  totalPayment: number;
  principal: number;
  interest: number;
  closingBalance: number;
  /** Present only when the total does not cover the month's remaining interest. */
  warning: string | null;
  /** Present only when the write path would reject the payment outright. */
  blockedReason: string | null;
}

/**
 * Mirrors the write path's split (spec 195: UI preview and write share one
 * calculation path). A payment whose principal would exceed the opening
 * balance is rejected by `calculateDebtPayment` on the write path, so the
 * preview surfaces it as a blocked section instead of rendering the throw.
 */
const buildSection = (meta: DebtSectionMetaVM, totalPayment: number): DebtPaymentSectionVM => {
  if (totalPayment <= 0) {
    return {
      ...meta,
      totalPayment: 0,
      principal: 0,
      interest: 0,
      closingBalance: meta.openingBalance,
      warning: null,
      blockedReason: null,
    };
  }

  try {
    const calculation = calculateDebtPayment({
      currentBalance: meta.openingBalance,
      interestRate: meta.interestRate,
      totalPayment,
      paymentDate: new Date(),
      startDate: new Date(),
      graceEndDate: null,
    });

    return {
      ...meta,
      totalPayment,
      principal: calculation.principal,
      interest: calculation.interest,
      closingBalance: meta.openingBalance - calculation.principal,
      warning: calculation.warning ?? null,
      blockedReason: null,
    };
  } catch (error) {
    if (!(error instanceof DebtPaymentError)) throw error;
    return {
      ...meta,
      totalPayment,
      principal: 0,
      interest: 0,
      closingBalance: meta.openingBalance,
      warning: null,
      blockedReason: error.message,
    };
  }
};

export const buildDebtPaymentSections = ({
  debtAccounts,
  repayments,
}: {
  debtAccounts: DebtSectionMetaVM[];
  repayments: { debtAccountId: string; totalPayment: number }[];
}): DebtPaymentSectionVM[] =>
  debtAccounts.map((meta) => {
    const totalPayment =
      repayments.find((item) => item.debtAccountId === meta.debtAccountId)?.totalPayment ?? 0;
    return buildSection(meta, totalPayment);
  });

export const buildDebtPaymentTotal = (
  sections: DebtPaymentSectionVM[],
): { principal: number; interest: number; total: number } => {
  const principal = sections.reduce((sum, section) => sum + section.principal, 0);
  const interest = sections.reduce((sum, section) => sum + section.interest, 0);
  return { principal, interest, total: principal + interest };
};
