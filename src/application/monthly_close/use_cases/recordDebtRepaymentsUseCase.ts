import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';
import { type AuthContext } from '@/application/types';
import { type DebtRepaymentInput } from '@/application/monthly_close/use_cases/monthlyCloseRequests';

export interface RecordDebtRepaymentsRequest {
  householdId: string;
  yearMonth: string;
  repayments: DebtRepaymentInput[];
  userEmail: string;
  auth: AuthContext;
}

/**
 * DEBT_REPAYMENT stage action (spec 05 stage 03): submits the repayments array
 * with idempotency keys (changed amount = new idempotency key = new
 * transaction), then settles debt accounts.
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
        idempotencyKey: `monthly-close:${yearMonth}:${repayment.debtAccountId}:${repayment.totalPayment}:${repayment.date.toISOString()}`,
        totalPayment: repayment.totalPayment,
        date: repayment.date,
        description: repayment.description,
        projectId: repayment.projectId,
      });
    }

    await settleDebtAccountsUseCase.execute({ householdId, yearMonth, userEmail, auth });
  }
}
