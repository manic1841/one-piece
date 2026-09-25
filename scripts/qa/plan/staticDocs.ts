/**
 * Global setting docs: household-scoped fixtures every other builder reads
 * by ID (projects, accounts, ledgerCodes, intent_mappings,
 * allocationTemplates) plus the standalone portfolio/debt docs seeded as
 * part of the global setup (see docs/qa-seed-data.md §3).
 */
import { AccountSchema } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { AllocationTemplateSchema } from '@/domains/allocation/templateSchemas';
import { DebtAccountSchema } from '@/domains/debt/schemas';
import { LEDGER_CODES } from '@/domains/ledger/constants';
import { CustomLedgerCodeSchema, IntentMappingSchema } from '@/domains/ledger/schemas';
import { PortfolioSchema } from '@/domains/portfolio/schemas';
import { ProjectSchema } from '@/domains/project/schemas';

import { type Builder, audit, emit, hh } from './shared';

export const STATIC_PROJECT_IDS = [
  'proj_daily',
  'proj_housing',
  'proj_leisure',
  'proj_pet',
  'proj_allowance',
  'proj_legacy',
];

export const STATIC_ACCOUNTS = [
  { id: 'acc_cash', name: '現金帳戶', category: AccountCategory.CASH },
  { id: 'acc_securities', name: '券商帳戶', category: AccountCategory.SECURITIES },
];

export const buildStaticDocs = (b: Builder) => {
  const { identity } = b;

  const projects = [
    { id: 'proj_daily', name: '日常開銷', isActive: true },
    { id: 'proj_housing', name: '居住房貸', isActive: true },
    { id: 'proj_leisure', name: '休閒娛樂', isActive: true },
    { id: 'proj_pet', name: '毛孩開銷', isActive: true },
    { id: 'proj_allowance', name: '零用錢', isActive: true },
    { id: 'proj_legacy', name: '已停用專案', isActive: false },
  ];
  projects.forEach((p, index) => {
    emit(b, ProjectSchema, hh(identity, 'projects'), p.id, {
      id: p.id,
      name: p.name,
      order: index + 1,
      isActive: p.isActive,
      ...audit(identity),
    });
  });

  const accounts = STATIC_ACCOUNTS;
  accounts.forEach((a, index) => {
    emit(b, AccountSchema, hh(identity, 'accounts'), a.id, {
      id: a.id,
      name: a.name,
      category: a.category,
      currency: CurrencyType.TWD,
      order: index + 1,
      isActive: true,
      ...audit(identity),
    });
  });

  emit(b, CustomLedgerCodeSchema, hh(identity, 'ledgerCodes'), 'expense:pets', {
    id: 'expense:pets',
    code: 'expense:pets',
    label: '毛孩開銷',
    type: 'expense',
    isCustom: true,
    isActive: true,
    ...audit(identity),
  });

  emit(b, IntentMappingSchema, hh(identity, 'intent_mappings'), 'imp_pet_expense', {
    id: 'imp_pet_expense',
    intent: 'PET_EXPENSE',
    debitLedgerCode: 'expense:pets',
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditUserSelect: false,
    ...audit(identity),
  });

  emit(b, AllocationTemplateSchema, hh(identity, 'allocationTemplates'), 'tmpl_salary_default', {
    id: 'tmpl_salary_default',
    name: '薪資預設分配',
    ledgerCode: LEDGER_CODES.INCOME_SALARY,
    isDefault: true,
    items: [
      { projectId: 'proj_daily', percentage: 60 },
      { projectId: 'proj_housing', percentage: 25 },
      { projectId: 'proj_leisure', percentage: 15 },
    ],
    ...audit(identity),
  });

  emit(b, PortfolioSchema, hh(identity, 'portfolios'), 'pf_core', {
    id: 'pf_core',
    name: '核心投資組合',
    securitiesAccountId: 'acc_securities',
    bankAccountId: 'acc_cash',
    isActive: true,
    order: 1,
    ...audit(identity),
  });

  // Settled consumer loan: exercises Active=false + closedAt (ADR-0032 import filter).
  emit(b, DebtAccountSchema, hh(identity, 'debtAccounts'), 'debt_loan_personal', {
    id: 'debt_loan_personal',
    name: '已結清信貸',
    type: 'loan',
    repaymentType: 'equal_payment',
    originalAmount: 300_000,
    currentBalance: 0,
    interestRate: 3.5,
    startDate: new Date(2025, 2, 1),
    endDate: new Date(2026, 5, 15),
    monthlyPayment: 10_500,
    linkedLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
    isActive: false,
    closedAt: new Date(2026, 5, 15),
    ...audit(identity),
  });
};
