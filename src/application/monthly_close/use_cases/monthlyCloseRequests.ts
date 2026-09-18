import { type AuthContext } from '@/application/types';
import { type CloseStageId } from '@/domains/financial_period/schemas';

export interface AccountBalanceInput {
  accountId: string;
  amount: number;
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
