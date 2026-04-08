import {
  calculateGraceMonthlyPayment,
  isInGracePeriod,
} from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount } from '@/domains/debt/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { listDebtAccountsUseCase } from './listDebtAccountsUseCase';

export interface DebtSummaryResult {
  totalDebt: number;
  monthlyPaymentTotal: number;
  unpaidCount: number;
}

export interface GetDebtSummaryRequest {
  householdId: string;
  referenceDate?: Date;
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

const getPaidAccountIds = (payments: Transaction[]): Set<string> =>
  new Set(payments.map((p) => p.debtAccountId).filter((id): id is string => Boolean(id)));

const getMonthlyDue = (account: DebtAccount): number => {
  if (isInGracePeriod(account.graceEndDate)) {
    return calculateGraceMonthlyPayment(account.currentBalance, account.interestRate);
  }
  return account.monthlyPayment;
};

export class GetDebtSummaryUseCase {
  async execute(request: GetDebtSummaryRequest): Promise<DebtSummaryResult> {
    const referenceDate = request.referenceDate ?? new Date();
    const accounts = await listDebtAccountsUseCase.execute({ householdId: request.householdId });
    const payments = await transactionRepository.listDebtPaymentsByDateRange(
      request.householdId,
      startOfMonth(referenceDate),
      endOfMonth(referenceDate),
    );

    const paidAccountIds = getPaidAccountIds(payments);

    let totalDebt = 0;
    let monthlyPaymentTotal = 0;
    let unpaidCount = 0;

    for (const account of accounts) {
      totalDebt += account.currentBalance;
      monthlyPaymentTotal += getMonthlyDue(account);
      if (!paidAccountIds.has(account.id)) {
        unpaidCount += 1;
      }
    }

    return {
      totalDebt,
      monthlyPaymentTotal,
      unpaidCount,
    };
  }
}

export const getDebtSummaryUseCase = new GetDebtSummaryUseCase();
