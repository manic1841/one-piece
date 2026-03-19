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
}

export interface LoanCalcResult {
  monthlyPayment: number; // Rounded to nearest integer
  totalMonths: number; // n
  totalInterest: number; // Total interest paid over the life of the loan
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
 */
export function calculateLoan(params: LoanCalcParams): LoanCalcResult {
  const { originalAmount, interestRate, startDate, endDate } = params;

  const n = monthsBetween(startDate, endDate);

  if (n <= 0) {
    return { monthlyPayment: originalAmount, totalMonths: 0, totalInterest: 0 };
  }

  let monthlyPayment: number;

  if (interestRate === 0) {
    monthlyPayment = originalAmount / n;
  } else {
    const r = interestRate / 100 / 12;
    const compound = Math.pow(1 + r, n);
    monthlyPayment = (originalAmount * r * compound) / (compound - 1);
  }

  const rounded = Math.round(monthlyPayment);
  const totalInterest = Math.max(0, rounded * n - originalAmount);

  return {
    monthlyPayment: rounded,
    totalMonths: n,
    totalInterest: Math.round(totalInterest),
  };
}
