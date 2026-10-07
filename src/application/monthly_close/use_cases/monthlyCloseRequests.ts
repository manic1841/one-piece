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

/**
 * Every stage's confirm payload. Stages that create no data (PROJECT_SETTLEMENT,
 * COMPLETENESS_CHECK, CLOSE_PERIOD) declare an explicit empty payload so this map
 * stays total — a missing key must never stand in for "no payload".
 */
export interface StageConfirmPayloads {
  ACCOUNT_BALANCE: { accountBalances: AccountBalanceInput[] };
  SECURITIES_TRADE: {
    securities: { buys: SecuritiesTradeInput[]; sells: SecuritiesTradeInput[] };
    financing: InvestmentFinancingInput['financing'];
    /** SECURITIES_TRADE reconfirm: transaction doc IDs loaded earlier but removed from the rows. */
    removedTransactionIds?: string[];
  };
  PORTFOLIO_CASH_FLOW: {
    portfolioCashFlows: Record<string, { deposits: number; withdrawals: number }>;
  };
  PROJECT_SETTLEMENT: Record<never, never>;
  DEBT_REPAYMENT: { repayments: DebtRepaymentInput[] };
  COMPLETENESS_CHECK: Record<never, never>;
  FINANCIAL_REPORTS: { labelResolver: ReportLabelResolver };
  CLOSE_PERIOD: Record<never, never>;
}

/** One stage's confirm body: its stage id married to that stage's payload. */
export type StageConfirmRequestBody<S extends CloseStageId> = {
  stageId: S;
} & StageConfirmPayloads[S];

/**
 * The confirm body as a discriminated union. Written as a mapped type rather
 * than `StageConfirmRequestBody<CloseStageId>` because a generic parameter does
 * not distribute over a union: the latter would collapse to a single member
 * whose `stageId` is the whole union, losing the discriminant.
 */
export type MonthlyCloseConfirmBody = {
  [K in CloseStageId]: StageConfirmRequestBody<K>;
}[CloseStageId];

/**
 * A confirm request is a discriminated union on `stageId`. The base fields sit
 * *inside* every member rather than wrapping the union: `Base & Union` breaks
 * `Omit`/`Extract`, which are not distributive over a union for the keys the
 * members share.
 */
export type MonthlyCloseConfirmRequest = {
  [K in CloseStageId]: MonthlyCloseStartRequest & StageConfirmRequestBody<K>;
}[CloseStageId];

export interface MonthlyCloseResetStagesRequest extends MonthlyCloseStartRequest {
  fromStageId: CloseStageId;
}

/** The authoritative SECURITIES_TRADE rows a confirmation returns, IDs included (#250). */
export interface SecuritiesTradeConfirmResult {
  buys: ConfirmedTradeRow[];
  sells: ConfirmedTradeRow[];
  shareholderFinancing: ConfirmedTradeRow[];
  dividendPayout: ConfirmedTradeRow[];
}

/** A confirmed row carries the document ID the write landed on. */
export interface ConfirmedTradeRow extends CloseTradeInput {
  transactionId: string;
}

/** Which stages return authoritative rows, and what. */
export type StageConfirmDataMap = {
  SECURITIES_TRADE: SecuritiesTradeConfirmResult;
};

/** A stage's own slice of the confirm result; `undefined` when it returns none. */
export type StageConfirmData<K extends CloseStageId> = K extends keyof StageConfirmDataMap
  ? StageConfirmDataMap[K]
  : undefined;

/** A confirmation outcome: the stage that ran, the mutated period, and that stage's slice. */
export type MonthlyCloseConfirmResult<S extends CloseStageId = CloseStageId> = {
  [K in S]: { stageId: K; period: FinancialPeriod; data: StageConfirmData<K> };
}[S];
