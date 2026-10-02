import { z } from 'zod';

import { AccountSchema, AccountSnapshotSchema } from '@/domains/account/types/account';
import { AllocationSchema } from '@/domains/allocation/schemas';
import { AllocationTemplateSchema } from '@/domains/allocation/templateSchemas';
import { DebtAccountSchema, DebtSnapshotSchema } from '@/domains/debt/schemas';
import { FinancialPeriodCreateSchema } from '@/domains/financial_period/schemas';
import { HouseholdSchema } from '@/domains/household/schemas';
import { CustomLedgerCodeSchema, IntentMappingSchema } from '@/domains/ledger/schemas';
import { TransactionSchema } from '@/domains/ledger/schemas';
import { PortfolioSchema, PortfolioSnapshotSchema } from '@/domains/portfolio/schemas';
import { ProjectSchema, ProjectSnapshotSchema } from '@/domains/project/schemas';
import {
  BalanceSheetDataSchema,
  CashFlowDataSchema,
  IncomeStatementDataSchema,
  ReportType,
} from '@/domains/report/schemas';
import { RetirementPlanSchema } from '@/domains/retirement/schemas';
import { WatchListTargetSchema } from '@/domains/watch_list/schemas';

/**
 * Import-side validation for the household backup payload (issue #256):
 * mirrors the persisted document shapes the export side reads. Backups are
 * JSON-serialized, so timestamps revive from ISO strings; legacy rows may
 * lack createdBy/updatedBy, so those stay optional.
 */
const RevivedDate = z.union([z.date(), z.string()]);

const BackupBaseSchema = z.object({
  id: z.string(),
  createdBy: z.string().optional(),
  createdAt: RevivedDate,
  updatedBy: z.string().optional(),
  updatedAt: RevivedDate,
});

const withRevivedBase = <T extends z.ZodRawShape>(shape: T) => BackupBaseSchema.extend(shape);

const AccountDocumentSchema = withRevivedBase(AccountSchema.shape);
const AccountSnapshotDocumentSchema = withRevivedBase(AccountSnapshotSchema.shape);
const ProjectDocumentSchema = withRevivedBase(ProjectSchema.shape);
const ProjectSnapshotDocumentSchema = withRevivedBase(ProjectSnapshotSchema.shape);
const PortfolioDocumentSchema = withRevivedBase(PortfolioSchema.shape);
const PortfolioSnapshotDocumentSchema = withRevivedBase(PortfolioSnapshotSchema.shape);
const DebtAccountDocumentSchema = withRevivedBase(DebtAccountSchema.shape);
const DebtSnapshotDocumentSchema = withRevivedBase(DebtSnapshotSchema.shape);
const RetirementPlanDocumentSchema = withRevivedBase(RetirementPlanSchema.shape);
const TransactionDocumentSchema = withRevivedBase(TransactionSchema.shape);
const AllocationDocumentSchema = withRevivedBase(AllocationSchema.shape);
const AllocationTemplateDocumentSchema = withRevivedBase(AllocationTemplateSchema.shape);
const LedgerCodeDocumentSchema = withRevivedBase(CustomLedgerCodeSchema.shape);
const IntentMappingDocumentSchema = withRevivedBase(IntentMappingSchema.shape);
const WatchListDocumentSchema = withRevivedBase(WatchListTargetSchema.shape);

/** FinancialPeriod docs revive from the persisted create shape plus doc metadata. */
const FinancialPeriodDocumentSchema = withRevivedBase(FinancialPeriodCreateSchema.shape);

const HouseholdDocumentSchema = HouseholdSchema.extend({
  createdAt: RevivedDate,
  updatedAt: RevivedDate,
});

/** Reports revive from the persisted discriminated union (yearMonth, uppercase type). */
const ReportDocumentSchema = z.discriminatedUnion('type', [
  z
    .object({
      id: z.string(),
      householdId: z.string(),
      yearMonth: z.string(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      createdAt: RevivedDate,
      updatedAt: RevivedDate,
    })
    .extend({
      type: z.literal(ReportType.INCOME_STATEMENT),
      data: IncomeStatementDataSchema,
    }),
  z
    .object({
      id: z.string(),
      householdId: z.string(),
      yearMonth: z.string(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      createdAt: RevivedDate,
      updatedAt: RevivedDate,
    })
    .extend({
      type: z.literal(ReportType.BALANCE_SHEET),
      data: BalanceSheetDataSchema,
    }),
  z
    .object({
      id: z.string(),
      householdId: z.string(),
      yearMonth: z.string(),
      createdBy: z.string().optional(),
      updatedBy: z.string().optional(),
      createdAt: RevivedDate,
      updatedAt: RevivedDate,
    })
    .extend({
      type: z.literal(ReportType.CASH_FLOW),
      data: CashFlowDataSchema,
    }),
]);

export const HouseholdBackupPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  householdId: z.string(),
  household: HouseholdDocumentSchema,
  collections: z.object({
    accounts: z.array(
      z.object({
        account: AccountDocumentSchema,
        snapshots: z.array(AccountSnapshotDocumentSchema),
      }),
    ),
    projects: z.array(
      z.object({
        project: ProjectDocumentSchema,
        snapshots: z.array(ProjectSnapshotDocumentSchema),
      }),
    ),
    portfolios: z.array(
      z.object({
        portfolio: PortfolioDocumentSchema,
        snapshots: z.array(PortfolioSnapshotDocumentSchema),
      }),
    ),
    debtAccounts: z.array(
      z.object({
        debtAccount: DebtAccountDocumentSchema,
        snapshots: z.array(DebtSnapshotDocumentSchema),
      }),
    ),
    retirementPlans: z.array(RetirementPlanDocumentSchema),
    transactions: z.array(TransactionDocumentSchema),
    reports: z.array(ReportDocumentSchema),
    allocations: z.array(AllocationDocumentSchema),
    allocationTemplates: z.array(AllocationTemplateDocumentSchema),
    ledgerCodes: z.array(LedgerCodeDocumentSchema),
    intentMappings: z.array(IntentMappingDocumentSchema),
    financialPeriods: z.array(FinancialPeriodDocumentSchema).optional(),
    watchList: z.array(WatchListDocumentSchema).optional(),
  }),
});
