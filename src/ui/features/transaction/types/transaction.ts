import { type TransactionCreate } from '@/domains/ledger/schemas';

export type IntentType = Extract<
  NonNullable<TransactionCreate['intentType']>,
  'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'FINANCING' | 'TRANSFER' | 'MANUAL' | 'DEBT_PAYMENT'
>;

export type TransactionFormTab =
  | 'EXPENSE'
  | 'INCOME'
  | 'INVESTMENT'
  | 'FINANCING'
  | 'TRANSFER'
  | 'ADVANCED'
  | 'DEBT_PAYMENT';

export type ExpenseFormState = {
  amount: string;
  date: string;
  projectId: string | null;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
  triggerAllocation: boolean;
  allocationItems: AllocationDraftItem[];
};

export type IncomeFormState = {
  amount: string;
  date: string;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
  triggerAllocation: boolean;
  allocationItems: AllocationDraftItem[];
};

export type AllocationDraftItem = {
  projectId: string;
  percentage: string;
};

export type AllocationItemInput = {
  projectId: string;
  percentage: number;
};

export type InvestmentFormState = {
  amount: string;
  date: string;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
};

export type FinancingFormState = {
  amount: string;
  date: string;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
};

export type ProjectTransferFormState = {
  amount: string;
  fromProjectId: string | null;
  toProjectId: string | null;
  description: string;
};

export type AdvancedFormState = {
  amount: string;
  date: string;
  intentType: Extract<IntentType, 'TRANSFER' | 'MANUAL'>;
  projectId: string | null;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
};

export type TransactionFormOutput = {
  intentType: IntentType;
  intent?: string;
  date: string;
  amount: number;
  projectId?: string;
  ledgerCode?: string;
  description?: string;
  triggerAllocation?: boolean;
  allocationItems?: AllocationItemInput[];
  allocationDirection?: 'INCOME' | 'EXPENSE';
  fromProjectId?: string;
  toProjectId?: string;
  // DEBT_PAYMENT specific
  debtAccountId?: string;
  principal?: number;
  interest?: number;
};

export type TransactionFormCategoryOption = {
  value: string;
  label: string;
};

export type TransactionFormProjectOption = {
  id: string;
  name: string;
  icon?: string;
};
