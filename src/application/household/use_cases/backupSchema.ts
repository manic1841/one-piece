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
import { BaseSchema } from '@/shared/schemas/base';

/**
 * Import-side validation for the household backup payload (issue #256):
 * mirrors the persisted document shapes the export side reads.
 *
 * Timestamps: a backup file is JSON, so every timestamp arrives as an ISO
 * string even though it was a Date in memory. The domain schemas already model
 * that with the shared TimestampSchema (src/shared/schemas/date.ts), which
 * accepts both forms and normalizes to Date — so validation itself performs the
 * revival and its parsed output is what the import writes back. Fields that are
 * genuinely strings (e.g. retirementPlans[].incomes[].calculatedFrom.importedAt)
 * keep z.string() and are deliberately left untouched.
 *
 * Legacy rows may lack createdBy/updatedBy, so those stay optional.
 */
const BackupBaseSchema = BaseSchema.partial({ createdBy: true, updatedBy: true });

const withBackupBase = <T extends z.ZodRawShape>(shape: T) => BackupBaseSchema.extend(shape);

const AccountDocumentSchema = withBackupBase(AccountSchema.shape);
const AccountSnapshotDocumentSchema = withBackupBase(AccountSnapshotSchema.shape);
const ProjectDocumentSchema = withBackupBase(ProjectSchema.shape);
const ProjectSnapshotDocumentSchema = withBackupBase(ProjectSnapshotSchema.shape);
const PortfolioDocumentSchema = withBackupBase(PortfolioSchema.shape);
const PortfolioSnapshotDocumentSchema = withBackupBase(PortfolioSnapshotSchema.shape);
const DebtAccountDocumentSchema = withBackupBase(DebtAccountSchema.shape);
const DebtSnapshotDocumentSchema = withBackupBase(DebtSnapshotSchema.shape);
const RetirementPlanDocumentSchema = withBackupBase(RetirementPlanSchema.shape);
const TransactionDocumentSchema = withBackupBase(TransactionSchema.shape);
const AllocationDocumentSchema = withBackupBase(AllocationSchema.shape);
const AllocationTemplateDocumentSchema = withBackupBase(AllocationTemplateSchema.shape);
const LedgerCodeDocumentSchema = withBackupBase(CustomLedgerCodeSchema.shape);
const IntentMappingDocumentSchema = withBackupBase(IntentMappingSchema.shape);

/** FinancialPeriod docs revive from the persisted create shape plus doc metadata. */
const FinancialPeriodDocumentSchema = withBackupBase(FinancialPeriodCreateSchema.shape);

const HouseholdDocumentSchema = HouseholdSchema;

/** Reports revive from the persisted discriminated union (yearMonth, uppercase type). */
const ReportDocumentSchema = z.discriminatedUnion('type', [
  withBackupBase({
    householdId: z.string(),
    yearMonth: z.string(),
    type: z.literal(ReportType.INCOME_STATEMENT),
    data: IncomeStatementDataSchema,
  }),
  withBackupBase({
    householdId: z.string(),
    yearMonth: z.string(),
    type: z.literal(ReportType.BALANCE_SHEET),
    data: BalanceSheetDataSchema,
  }),
  withBackupBase({
    householdId: z.string(),
    yearMonth: z.string(),
    type: z.literal(ReportType.CASH_FLOW),
    data: CashFlowDataSchema,
  }),
]);

export const HouseholdBackupPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  householdId: z.string(),
  household: HouseholdDocumentSchema,
  /**
   * Only live collections are declared. Zod objects drop undeclared keys, so a
   * collection retired from the app but still present in an older
   * schemaVersion-1 payload is ignored on import rather than rejected or
   * restored. The retired collection is named in ADR-0080, the single source of
   * that decision; do not restate it here.
   */
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
  }),
});
