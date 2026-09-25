import { type AuthContext } from '@/application/types';
import { type Holding } from '@/domains/account/types/account';
import { type CloseStageId } from '@/domains/financial_period/schemas';

export interface AccountBalanceInput {
  accountId: string;
  /** Snapshot observation in TWD; converted value for foreign-currency accounts. */
  amount: number;
  /** Foreign-currency amount, stored alongside when the account is non-TWD. */
  originalAmount?: number;
  /** Exchange rate frozen at snapshot input (CONTEXT.md: 匯率). */
  exchangeRate?: number;
  /** Securities holdings for securities accounts (CONTEXT.md: Holdings). */
  holdings?: Holding[];
}

/**
 * One row type for both securities and financing close trades; the submit side
 * (`SecuritiesTradeInput` / `FinancingInput`) names the bucket it lands in.
 */
export interface CloseTradeInput {
  amount: number;
  date: Date;
  description?: string;
  projectId?: string | null;
  /** Transaction doc ID when the row was loaded from Firestore; undefined for new rows. */
  transactionId?: string;
}

export type SecuritiesTradeInput = CloseTradeInput;

export type FinancingInput = CloseTradeInput;

export interface InvestmentFinancingInput {
  financing: {
    shareholderFinancing: FinancingInput[];
    dividendPayout: FinancingInput[];
  };
}

export interface DebtRepaymentInput {
  debtAccountId: string;
  totalPayment: number;
  date: Date;
  description?: string;
  projectId?: string | null;
}

export interface MonthlyCloseStartRequest {
  householdId: string;
  yearMonth: string;
  userEmail: string;
  auth: AuthContext;
}

export interface MonthlyCloseConfirmRequest extends MonthlyCloseStartRequest {
  stageId: CloseStageId;
  accountBalances?: AccountBalanceInput[];
  securities?: {
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  };
  financing?: InvestmentFinancingInput['financing'];
  portfolioCashFlows?: Record<string, { deposits: number; withdrawals: number }>;
  repayments?: DebtRepaymentInput[];
  /** SECURITIES_TRADE reconfirm: transaction doc IDs loaded earlier but removed from the rows. */
  removedTransactionIds?: string[];
}
