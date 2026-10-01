import { type AuthContext } from '@/application/types';
import { type Holding } from '@/domains/account/types/account';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { type ReportLabelResolver } from '@/domains/report/reportCalculations';

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
  /** 0 clears the month's record (no repayment). */
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
  /** Report display labels: static catalog first, then household custom codes. */
  labelResolver?: ReportLabelResolver;
}

export interface MonthlyCloseResetStagesRequest extends MonthlyCloseStartRequest {
  fromStageId: CloseStageId;
}

/**
 * The authoritative SECURITIES_TRADE rows after a confirmation: the loaded rows
 * updated in place and the new rows created, each carrying its Firestore
 * document ID. The stage adopts these to stay idempotent — a re-confirmation
 * updates by ID instead of duplicating (#250).
 */
export interface SecuritiesTradeConfirmResult {
  buys: SecuritiesTradeInput[];
  sells: SecuritiesTradeInput[];
  shareholderFinancing: FinancingInput[];
  dividendPayout: FinancingInput[];
}

/**
 * What a stage confirmation returns: the mutated period plus the stage's
 * authoritative rows when it produces any. The write path carries them back
 * rather than the UI re-reading: under the "a reload never overwrites an edited
 * draft" rule, a post-confirm reload could not deliver IDs into a frozen draft.
 */
export interface MonthlyCloseConfirmResult {
  period: FinancialPeriod;
  securities?: SecuritiesTradeConfirmResult;
}
