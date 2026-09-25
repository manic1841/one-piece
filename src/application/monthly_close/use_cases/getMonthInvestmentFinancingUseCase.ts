import { IntentType } from '@/domains/ledger/constants/intentType';
import { type Transaction } from '@/domains/ledger/schemas';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface MonthInvestmentFinancing {
  yearMonth: string;
  buys: Transaction[];
  sells: Transaction[];
  shareholderFinancing: Transaction[];
  dividendPayout: Transaction[];
}

/**
 * Read side of the SECURITIES_TRADE stage: the month's existing investment
 * and financing transactions, for prefilling the stage tables. Read-only.
 */
export class GetMonthInvestmentFinancingUseCase {
  async execute(params: {
    householdId: string;
    year: number;
    month: number;
  }): Promise<MonthInvestmentFinancing> {
    const { householdId, year, month } = params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const transactions = await transactionRepository.listByDateRange(
      householdId,
      startDate,
      endDate,
    );

    const isInvestment = (transaction: Transaction): boolean =>
      transaction.intentType === IntentType.INVESTMENT;
    const isFinancing = (transaction: Transaction): boolean =>
      transaction.intentType === IntentType.FINANCING;

    return {
      yearMonth: `${year}-${String(month).padStart(2, '0')}`,
      buys: transactions.filter(
        (transaction) => isInvestment(transaction) && transaction.intent === 'SECURITY_BUY',
      ),
      sells: transactions.filter(
        (transaction) => isInvestment(transaction) && transaction.intent === 'SECURITY_SELL',
      ),
      shareholderFinancing: transactions.filter(
        (transaction) => isFinancing(transaction) && transaction.intent === 'SHAREHOLDER_FINANCING',
      ),
      dividendPayout: transactions.filter(
        (transaction) => isFinancing(transaction) && transaction.intent === 'DIVIDEND_PAYOUT',
      ),
    };
  }
}

export const getMonthInvestmentFinancingUseCase = new GetMonthInvestmentFinancingUseCase();
