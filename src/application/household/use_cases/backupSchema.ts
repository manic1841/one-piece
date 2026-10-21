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
import { BaseSchema } from '@/shared/schemas/base';
import { TimestampSchema } from '@/shared/schemas/date';

/**
 * Import-side validation for the household backup payload (issue #256):
 * mirrors the persisted document shapes the export side reads.
 *
 * Timestamps: a backup file is JSON, so every timestamp arrives as an ISO
 * string even though it was a Date in memory. The domain schemas already model
 * that with the shared TimestampSchema (src/shared/schemas/date.ts), which
 * accepts both forms and normalizes to Date — so validation itself performs the
 * revival and its parsed output is what the import writes back. Retirement
 * plans travel as `unknown[]`; their audit timestamps are revived at write time.
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

/**
 * Projection main document. Summary fields are pinned so a truncated entry is
 * rejected; `passthrough` keeps any future field intact through validation.
 * `createdAt` revives from ISO on the JSON hop like every other audit field.
 */
const ProjectionDocumentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    engineVersion: z.number(),
    retirementNetWorth: z.number().nullable(),
    finalNetWorth: z.number(),
    minNetWorth: z.number(),
    minNetWorthYear: z.number().nullable(),
    bankruptcyYear: z.number().nullable(),
    isBankrupt: z.boolean(),
    createdBy: z.string(),
    createdAt: TimestampSchema,
  })
  .passthrough();

/** The three fixed projection child documents travel under explicit keys. */
const ProjectionBundleSchema = z.object({
  projection: ProjectionDocumentSchema,
  config: z.record(z.string(), z.unknown()),
  source: z.record(z.string(), z.unknown()),
  annual: z.record(z.string(), z.unknown()),
});

export const HouseholdBackupPayloadSchema = z.object({
  schemaVersion: z.literal(2),
  exportedAt: z.string(),
  householdId: z.string(),
  household: HouseholdDocumentSchema,
  /**
   * Only live collections are declared. Zod objects drop undeclared keys, so a
   * collection retired from the app but still present in an old payload is
   * ignored on import rather than rejected or restored. The retired collection
   * is named in ADR-0080, the single source of that decision; do not restate it
   * here.
   *
   * Retirement plans are `unknown[]`: their shape is already validated at the
   * write boundary, and a projection reuses the document verbatim (ADR-0084).
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
    retirementPlans: z.array(z.unknown()),
    projections: z.array(ProjectionBundleSchema),
    transactions: z.array(TransactionDocumentSchema),
    reports: z.array(ReportDocumentSchema),
    allocations: z.array(AllocationDocumentSchema),
    allocationTemplates: z.array(AllocationTemplateDocumentSchema),
    ledgerCodes: z.array(LedgerCodeDocumentSchema),
    intentMappings: z.array(IntentMappingDocumentSchema),
    financialPeriods: z.array(FinancialPeriodDocumentSchema).optional(),
  }),
});
