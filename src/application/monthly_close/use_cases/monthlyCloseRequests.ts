import { type AuthContext } from '@/application/types';
import { type CloseStageId } from '@/domains/financial_period/schemas';
import { type Holding } from '@/domains/account/types/account';

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

export interface SecuritiesTradeInput {
  amount: number;
  date: Date;
  description?: string;
}

export interface FinancingInput {
  amount: number;
  date: Date;
  description?: string;
  projectId?: string | null;
}

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
}
