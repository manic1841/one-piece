import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { type AuthContext } from '@/application/types';
import { getIntentMapping } from '@/domains/ledger/intentMapping';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import {
  type FinancingInput,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';

export interface CreateInvestmentFinancingTransactionsRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  securities?: {
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  };
  financing?: {
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  };
}

/**
 * SECURITIES_TRADE stage action (spec 05 stage 02/04): creates SECURITY_BUY/
 * SELL (INVESTMENT) and SHAREHOLDER_FINANCING/DIVIDEND_PAYOUT (FINANCING)
 * transactions from the monthly-close inputs. These are plain Transactions,
 * not separate entities.
 */
export class CreateInvestmentFinancingTransactionsUseCase {
  async execute(request: CreateInvestmentFinancingTransactionsRequest): Promise<void> {
    const { householdId, userEmail, securities, financing } = request;

    if (securities) {
      for (const buy of securities.buys) {
        await this.createSecuritiesTransaction(householdId, userEmail, 'SECURITY_BUY', buy);
      }
      for (const sell of securities.sells) {
        await this.createSecuritiesTransaction(householdId, userEmail, 'SECURITY_SELL', sell);
      }
    }

    if (financing) {
      for (const input of financing.shareholderFinancing) {
        await this.createFinancingTransaction(householdId, userEmail, 'SHAREHOLDER_FINANCING', input);
      }
      for (const input of financing.dividendPayout) {
        await this.createFinancingTransaction(householdId, userEmail, 'DIVIDEND_PAYOUT', input);
      }
    }
  }

  private async createSecuritiesTransaction(
    householdId: string,
    userEmail: string,
    intent: 'SECURITY_BUY' | 'SECURITY_SELL',
    trade: SecuritiesTradeInput,
  ): Promise<void> {
    await createTransactionUseCase.execute({
      householdId,
      userEmail,
      data: this.buildTransactionData(intent, 'INVESTMENT', trade.amount, trade.date, trade.description, null, userEmail),
    });
  }

  private async createFinancingTransaction(
    householdId: string,
    userEmail: string,
    intent: 'SHAREHOLDER_FINANCING' | 'DIVIDEND_PAYOUT',
    input: FinancingInput,
  ): Promise<void> {
    await createTransactionUseCase.execute({
      householdId,
      userEmail,
      data: this.buildTransactionData(intent, 'FINANCING', input.amount, input.date, input.description, input.projectId, userEmail),
    });
  }

  /** Ledger codes resolve from the intent mapping (single source), never hardcoded here. */
  private buildTransactionData(
    intent: string,
    intentType: 'INVESTMENT' | 'FINANCING',
    amount: number,
    date: Date,
    description: string | undefined,
    projectId: string | null | undefined,
    userEmail: string,
  ): TransactionCreate {
    const mapping = getIntentMapping(intent);
    if (!mapping) {
      throw new Error(`[${intent}] intent mapping is not defined`);
    }

    return {
      date,
      description,
      intent,
      intentType,
      amount,
      projectId: projectId ?? null,
      allocationId: null,
      createdBy: userEmail,
      entries: [
        { ledgerCode: mapping.debitLedgerCode, debit: amount, credit: 0 },
        { ledgerCode: mapping.creditLedgerCode, debit: 0, credit: amount },
      ],
    };
  }
}
