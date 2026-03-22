/**
 * Loan Calculator Utility
 *
 * Pure front-end computation — no Firestore dependency.
 * Implements the standard equal-payment (等額還款) amortization formula.
 */

export interface LoanCalcParams {
  originalAmount: number; // Principal loan amount
  interestRate: number; // Annual interest rate in % (e.g., 2.5 for 2.5%)
  startDate: Date; // First repayment date
  endDate: Date; // Loan maturity date
  graceEndDate?: Date; // Optional grace period end date (non-repayment period)
}

export interface LoanCalcResult {
  monthlyPayment: number; // Rounded to nearest integer; after grace period if applicable
  totalMonths: number; // n (total months from startDate to endDate)
  totalInterest: number; // Total interest paid over the life of the loan
  graceMonthlyPayment?: number; // Interest-only payment during grace period (if applicable)
  graceMonths?: number; // Number of grace period months (if applicable)
  normalMonths?: number; // Number of normal repayment months (if applicable)
}

/**
 * Returns the number of whole months between two dates.
 * e.g. Jan 1 → Mar 1  = 2 months
 */
function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  return years * 12 + months;
}

/**
 * Calculate equal-payment (等額還款) loan parameters.
 *
 * Formula (when r > 0):
 *   monthlyPayment = P × r × (1+r)^n / ((1+r)^n − 1)
 *
 * Edge case (r = 0):
 *   monthlyPayment = P / n
 *
 * Grace period support:
 *   If graceEndDate is provided, calculates two payment amounts:
 *     - graceMonthlyPayment: interest-only during grace period
 *     - monthlyPayment: normal repayment after grace period end
 */
export function calculateLoan(params: LoanCalcParams): LoanCalcResult {
  const { originalAmount, interestRate, startDate, endDate, graceEndDate } = params;

  const totalMonths = monthsBetween(startDate, endDate);

  if (totalMonths <= 0) {
    return { monthlyPayment: originalAmount, totalMonths: 0, totalInterest: 0 };
  }

  // If no grace period, use original logic
  if (!graceEndDate) {
    let monthlyPayment: number;

    if (interestRate === 0) {
      monthlyPayment = originalAmount / totalMonths;
    } else {
      const r = interestRate / 100 / 12;
      const compound = Math.pow(1 + r, totalMonths);
      monthlyPayment = (originalAmount * r * compound) / (compound - 1);
    }

    const rounded = Math.round(monthlyPayment);
    const totalInterest = Math.max(0, rounded * totalMonths - originalAmount);

    return {
      monthlyPayment: rounded,
      totalMonths,
      totalInterest: Math.round(totalInterest),
    };
  }

  // Grace period calculation
  const graceMonths = monthsBetween(startDate, graceEndDate);
  const normalMonths = monthsBetween(graceEndDate, endDate);

  if (normalMonths <= 0) {
    // Grace period extends to or beyond end date
    return {
      monthlyPayment: 0,
      totalMonths,
      totalInterest: 0,
      graceMonths,
      normalMonths: 0,
      graceMonthlyPayment:
        interestRate === 0 ? 0 : Math.round(originalAmount * (interestRate / 100 / 12)),
    };
  }

  // Calculate interest-only payment during grace period
  const graceMonthlyPaymentRaw = originalAmount * (interestRate / 100 / 12);
  const graceMonthlyPaymentRounded = Math.round(graceMonthlyPaymentRaw);

  // Calculate equal-payment for normal repayment period (after grace period)
  let monthlyPayment: number;

  if (interestRate === 0) {
    monthlyPayment = originalAmount / normalMonths;
  } else {
    const r = interestRate / 100 / 12;
    const compound = Math.pow(1 + r, normalMonths);
    monthlyPayment = (originalAmount * r * compound) / (compound - 1);
  }

  const monthlyPaymentRounded = Math.round(monthlyPayment);

  // Calculate total interest: grace period interest + normal repayment interest
  const graceInterest = graceMonthlyPaymentRounded * graceMonths;
  const normalInterest = Math.max(0, monthlyPaymentRounded * normalMonths - originalAmount);
  const totalInterest = graceInterest + normalInterest;

  return {
    monthlyPayment: monthlyPaymentRounded,
    totalMonths,
    totalInterest: Math.round(totalInterest),
    graceMonthlyPayment: graceMonthlyPaymentRounded,
    graceMonths,
    normalMonths,
  };
}
