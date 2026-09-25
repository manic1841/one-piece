import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { type DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';
import { type AuthContext } from '@/application/types';

export interface RecordDebtRepaymentsRequest {
  householdId: string;
  yearMonth: string;
  repayments: DebtRepaymentInput[];
  userEmail: string;
  auth: AuthContext;
}

/**
 * DEBT_REPAYMENT stage action: submits every active debt (including 0-amount
 * rows, which clear that month's record) with idempotency keys keyed by period
 * × account, then settles debt accounts. Reconfirming with a changed payload
 * re-books the month's record inside the same atomic boundary.
 */
export class RecordDebtRepaymentsUseCase {
  async execute(request: RecordDebtRepaymentsRequest): Promise<void> {
    const { householdId, yearMonth, repayments, userEmail, auth } = request;

    for (const repayment of repayments) {
      await createDebtPaymentUseCase.execute({
        householdId,
        userEmail,
        auth,
        debtAccountId: repayment.debtAccountId,
        idempotencyKey: `monthly-close:${yearMonth}:${repayment.debtAccountId}`,
        totalPayment: repayment.totalPayment,
        date: repayment.date,
        description: repayment.description,
        projectId: repayment.projectId,
      });
    }

    await settleDebtAccountsUseCase.execute({ householdId, yearMonth, userEmail, auth });
  }
}
