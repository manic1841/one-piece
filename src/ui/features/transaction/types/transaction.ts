import { type TransactionCreate } from '@/domains/ledger/schemas';

import { type AllocationDraftItem, type AllocationItemInput } from './allocation';

export type IntentType = Extract<
  NonNullable<TransactionCreate['intentType']>,
  'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'FINANCING' | 'MANUAL'
>;

export type TransactionFormTab =
  | 'EXPENSE'
  | 'INCOME'
  | 'INVESTMENT'
  | 'FINANCING'
  | 'ADVANCED';

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

export type InvestmentFormState = {
  amount: string;
  date: string;
  projectId: string | null;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
};

export type FinancingFormState = {
  amount: string;
  date: string;
  projectId: string | null;
  intent: string | null;
  ledgerCode: string | null;
  description: string;
};

export type AdvancedFormState = {
  amount: string;
  date: string;
  intentType: Extract<IntentType, 'MANUAL'>;
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
