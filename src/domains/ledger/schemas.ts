import { z } from 'zod';

import { IntentType } from '@/domains/ledger/constants';
import { LEDGER_CODE_PATTERN } from '@/domains/ledger/ledgerCodeRules';
import { BaseSchema } from '@/shared/schemas/base';

export type LedgerCode = string; // e.g. "asset:cash", "income:salary"

export const LedgerType = z.enum(['asset', 'liability', 'income', 'expense', 'equity']);
export type LedgerType = z.infer<typeof LedgerType>;

export const CustomLedgerCodeCreateSchema = z.object({
  // `type:category` or `type:category:detail` (ADR-0009).
  code: z
    .string()
    .regex(
      LEDGER_CODE_PATTERN,
      'LedgerCode 格式須為 type:category 或 type:category:detail（小寫英數字與底線）',
    ),
  label: z.string(), // e.g. "台北房產"
  type: LedgerType,
  isCustom: z.literal(true),
  isActive: z.boolean().default(true),
  createdBy: z.string(),
});
export type CustomLedgerCodeCreate = z.infer<typeof CustomLedgerCodeCreateSchema>;

// Persisted codes keep a lax `code` on purpose: the strict pattern gates creation,
// while reading must still tolerate codes created before the pattern existed.
export const CustomLedgerCodeSchema = BaseSchema.extend({
  ...CustomLedgerCodeCreateSchema.shape,
  code: z.string(),
});
export type CustomLedgerCode = z.infer<typeof CustomLedgerCodeSchema>;

export const IntentMappingCreateSchema = z.object({
  intent: z.string(),
  debitLedgerCode: z.string(),
  creditLedgerCode: z.string(),
  debitUserSelect: z.boolean().optional(),
  creditUserSelect: z.boolean().optional(),
  allowedDebitPrefix: z.string().optional(),
  allowedCreditPrefix: z.string().optional(),
  // When set, the selectable set is the mapping's own code plus the household's
  // custom codes of that type — system codes are reached through their own intent.
  debitCustomOnly: z.boolean().optional(),
  creditCustomOnly: z.boolean().optional(),
});
export type IntentMappingCreate = z.infer<typeof IntentMappingCreateSchema>;

export const IntentMappingSchema = BaseSchema.extend(IntentMappingCreateSchema.shape);
export type IntentMapping = z.infer<typeof IntentMappingSchema>;

export const JournalEntryLineSchema = z.object({
  ledgerCode: z.string(),
  accountId: z.string().optional(), // Optional for lines that don't involve physical accounts (e.g. pure income/expense categories if tracked separately)
  debit: z.number(),
  credit: z.number(),
  investmentDetail: z
    .object({
      assetId: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
    .optional(),
});
export type JournalEntryLine = z.infer<typeof JournalEntryLineSchema>;

export const TransactionCreateSchema = z.object({
  date: z.date(),
  description: z.string().optional(),
  intentType: z.enum(IntentType).optional(),
  intent: z.string().optional(),
  amount: z.number().optional(),
  projectId: z.string().nullable().optional(),
  fromProjectId: z.string().nullable().optional(),
  toProjectId: z.string().nullable().optional(),
  allocationId: z.string().nullable().optional(),
  debtAccountId: z.string().nullable().optional(), // Index for DEBT_PAYMENT transactions
  createdBy: z.string(),
  entries: z.array(JournalEntryLineSchema),
  ledgerCodes: z.array(z.string()).optional(), // Denormalization index
});
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

export const TransactionSchema = BaseSchema.extend(TransactionCreateSchema.shape);
export type Transaction = z.infer<typeof TransactionSchema>;
