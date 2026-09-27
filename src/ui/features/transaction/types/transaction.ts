import { type TransactionCreate } from '@/domains/ledger/schemas';

import { type AllocationItemInput } from './allocation';

export type IntentType = Extract<
  NonNullable<TransactionCreate['intentType']>,
  'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'FINANCING' | 'MANUAL'
>;

export type TransactionFormTab = 'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'FINANCING' | 'ADVANCED';

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
