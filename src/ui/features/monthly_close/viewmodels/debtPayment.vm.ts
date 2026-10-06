import {
  type DebtPaymentCalculation,
  DebtPaymentError,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import { formatCurrency } from '@/ui/utils';

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
  interestRateText: string;
  openingBalanceText: string;
  monthlyDueText: string;
  principalText: string;
  interestText: string;
  closingBalanceText: string;
}

type DebtPaymentFiguresVM = Omit<
  DebtPaymentSectionVM,
  | 'interestRateText'
  | 'openingBalanceText'
  | 'monthlyDueText'
  | 'principalText'
  | 'interestText'
  | 'closingBalanceText'
>;

/**
 * Mirrors the write path's split (spec 195: UI preview and write share one
 * calculation path). A payment whose principal would exceed the opening
 * balance is rejected by `calculateDebtPayment` on the write path, so the
 * preview surfaces it as a blocked section instead of rendering the throw.
 */
const resolveFigures = (meta: DebtSectionMetaVM, totalPayment: number): DebtPaymentFiguresVM => {
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

const formatFigures = (figures: DebtPaymentFiguresVM): DebtPaymentSectionVM => ({
  ...figures,
  interestRateText: `${figures.interestRate}%`,
  openingBalanceText: formatCurrency(figures.openingBalance),
  monthlyDueText: formatCurrency(figures.monthlyDue),
  principalText: formatCurrency(figures.principal),
  interestText: formatCurrency(figures.interest),
  closingBalanceText: formatCurrency(figures.closingBalance),
});

const buildSection = (meta: DebtSectionMetaVM, totalPayment: number): DebtPaymentSectionVM =>
  formatFigures(resolveFigures(meta, totalPayment));

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

export interface DebtPaymentTotalVM {
  principal: number;
  interest: number;
  total: number;
  principalText: string;
  interestText: string;
  totalText: string;
}

export const buildDebtPaymentTotal = (sections: DebtPaymentSectionVM[]): DebtPaymentTotalVM => {
  const principal = sections.reduce((sum, section) => sum + section.principal, 0);
  const interest = sections.reduce((sum, section) => sum + section.interest, 0);
  const total = principal + interest;
  return {
    principal,
    interest,
    total,
    principalText: formatCurrency(principal),
    interestText: formatCurrency(interest),
    totalText: formatCurrency(total),
  };
};
