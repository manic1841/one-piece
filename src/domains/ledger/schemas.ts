import { z } from 'zod';

import { BaseSchema } from '@/infra/schemas/base';

export type LedgerCode = string; // e.g. "asset:cash", "income:salary"

export const LedgerType = z.enum(['asset', 'liability', 'income', 'expense', 'equity']);
export type LedgerType = z.infer<typeof LedgerType>;

export const CustomLedgerCodeCreateSchema = z.object({
  code: z.string(), // e.g. "asset:property:taipei"
  label: z.string(), // e.g. "台北房產"
  type: LedgerType,
  isCustom: z.literal(true),
  createdBy: z.string(),
});
export type CustomLedgerCodeCreate = z.infer<typeof CustomLedgerCodeCreateSchema>;

export const CustomLedgerCodeSchema = BaseSchema.extend(CustomLedgerCodeCreateSchema.shape);
export type CustomLedgerCode = z.infer<typeof CustomLedgerCodeSchema>;

export const IntentMappingCreateSchema = z.object({
  intent: z.string(),
  debitLedgerCode: z.string(),
  creditLedgerCode: z.string(),
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
  intentType: z
    .enum([
      'EXPENSE',
      'INCOME',
      'INVESTMENT',
      'FINANCING',
      'TRANSFER',
      'ASSET_PURCHASE',
      'LIABILITY_BORROW',
      'LIABILITY_PAYMENT',
      'INVESTMENT',
      'MANUAL',
      'PROJECT_TRANSFER',
    ])
    .optional(),
  intent: z.string().optional(),
  amount: z.number().optional(),
  projectId: z.string().nullable().optional(),
  fromProjectId: z.string().nullable().optional(),
  toProjectId: z.string().nullable().optional(),
  allocationId: z.string().nullable().optional(),
  createdBy: z.string(),
  entries: z.array(JournalEntryLineSchema),
  ledgerCodes: z.array(z.string()).optional(), // Denormalization index
});
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;

export const TransactionSchema = BaseSchema.extend(TransactionCreateSchema.shape);
export type Transaction = z.infer<typeof TransactionSchema>;
