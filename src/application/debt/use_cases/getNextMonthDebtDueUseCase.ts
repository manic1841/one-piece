import { getEffectiveMonthlyDue } from '@/domains/debt/debtPaymentCalculator';

import { listDebtAccountsUseCase } from './listDebtAccountsUseCase';

export interface NextMonthDebtDueResult {
  total: number;
  yearMonth: string;
}

export interface GetNextMonthDebtDueRequest {
  householdId: string;
  referenceDate?: Date;
}

const toYearMonth = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getFirstOfNextMonth = (referenceDate: Date): Date => {
  const next = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
  return next;
};

export class GetNextMonthDebtDueUseCase {
  async execute(request: GetNextMonthDebtDueRequest): Promise<NextMonthDebtDueResult> {
    const referenceDate = request.referenceDate ?? new Date();
    const nextMonth = getFirstOfNextMonth(referenceDate);

    const accounts = await listDebtAccountsUseCase.execute({ householdId: request.householdId });

    const total = accounts.reduce((sum, account) => sum + getEffectiveMonthlyDue(account, nextMonth), 0);

    return {
      total,
      yearMonth: toYearMonth(nextMonth),
    };
  }
}

export const getNextMonthDebtDueUseCase = new GetNextMonthDebtDueUseCase();
