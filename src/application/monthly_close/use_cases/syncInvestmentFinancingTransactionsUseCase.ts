import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { deleteTransactionUseCase } from '@/application/ledger/use_cases/deleteTransactionUseCase';
import { updateTransactionUseCase } from '@/application/ledger/use_cases/updateTransactionUseCase';
import {
  type FinancingInput,
  type SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { type AuthContext } from '@/application/types';
import { getIntentMapping } from '@/domains/ledger/intentMapping';
import { type TransactionCreate } from '@/domains/ledger/schemas';

export interface InvestmentFinancingSyncRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  securities: {
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  };
  financing: {
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  };
  /** Transaction doc IDs loaded earlier but removed from the submitted rows; deleted on confirm. */
  removedTransactionIds?: string[];
}

export type CloseTradeIntent =
  | 'SECURITY_BUY'
  | 'SECURITY_SELL'
  | 'SHAREHOLDER_FINANCING'
  | 'DIVIDEND_PAYOUT';

interface CloseTradeRow extends SecuritiesTradeInput {
  intent: CloseTradeIntent;
}

const SYNC_INTENTS: Record<CloseTradeIntent, 'INVESTMENT' | 'FINANCING'> = {
  SECURITY_BUY: 'INVESTMENT',
  SECURITY_SELL: 'INVESTMENT',
  SHAREHOLDER_FINANCING: 'FINANCING',
  DIVIDEND_PAYOUT: 'FINANCING',
};

const asCloseTradeRow =
  (intent: CloseTradeIntent) =>
  (row: SecuritiesTradeInput): CloseTradeRow => ({ ...row, intent });

/**
 * SECURITIES_TRADE reconfirm semantics (ADR-0052 revision): diff-merge the
 * submitted rows into the month's investment and financing transactions.
 * Rows with a transaction ID update in place, new rows create transactions,
 * and loaded-but-removed IDs are deleted. Manually created transactions made
 * outside the close workflow are never touched.
 */
export class SyncInvestmentFinancingTransactionsUseCase {
  async execute(request: InvestmentFinancingSyncRequest): Promise<void> {
    const { householdId, userEmail, auth } = request;
    const rows: CloseTradeRow[] = [
      ...request.securities.buys.map(asCloseTradeRow('SECURITY_BUY')),
      ...request.securities.sells.map(asCloseTradeRow('SECURITY_SELL')),
      ...request.financing.shareholderFinancing.map(asCloseTradeRow('SHAREHOLDER_FINANCING')),
      ...request.financing.dividendPayout.map(asCloseTradeRow('DIVIDEND_PAYOUT')),
    ];

    const removedIds = request.removedTransactionIds ?? [];

    for (const row of rows) {
      if (row.transactionId) {
        await updateTransactionUseCase.execute({
          householdId,
          transactionId: row.transactionId,
          userEmail,
          auth,
          data: {
            date: row.date,
            description: row.description,
            intent: row.intent,
            intentType: SYNC_INTENTS[row.intent],
            amount: row.amount,
            projectId: row.projectId ?? null,
            fromProjectId: null,
            toProjectId: null,
            debtAccountId: null,
            entries: this.buildEntries(row),
          },
          allocation: null,
        });
      } else {
        await createTransactionUseCase.execute({
          householdId,
          userEmail,
          data: this.buildTransactionCreate(row, userEmail),
        });
      }
    }

    for (const transactionId of removedIds) {
      await deleteTransactionUseCase.execute({ householdId, transactionId, auth });
    }
  }

  /** Ledger codes resolve from the intent mapping (single source), never hardcoded here. */
  private buildEntries(row: CloseTradeRow): TransactionCreate['entries'] {
    const mapping = getIntentMapping(row.intent);
    if (!mapping) {
      throw new Error(`[${row.intent}] intent mapping is not defined`);
    }
    return [
      { ledgerCode: mapping.debitLedgerCode, debit: row.amount, credit: 0 },
      { ledgerCode: mapping.creditLedgerCode, debit: 0, credit: row.amount },
    ];
  }

  private buildTransactionCreate(row: CloseTradeRow, userEmail: string): TransactionCreate {
    return {
      date: row.date,
      description: row.description,
      intent: row.intent,
      intentType: SYNC_INTENTS[row.intent],
      amount: row.amount,
      projectId: row.projectId ?? null,
      allocationId: null,
      createdBy: userEmail,
      entries: this.buildEntries(row),
    };
  }
}

export const syncInvestmentFinancingTransactionsUseCase =
  new SyncInvestmentFinancingTransactionsUseCase();
