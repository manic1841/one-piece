/**
 * QA seed plan orchestrator.
 *
 * Calls every builder in dependency order (docs/qa-seed-data.md §3) and
 * asserts the fixed data window invariant over the assembled journal.
 * Builders are pure and mutually independent: they never import each
 * other, and the orchestrator owns the mutable journal state.
 */
import { AllocationSchema } from '@/domains/allocation/schemas';

import { buildAccountSnapshotDocs, buildMortgageDocs } from './accountDocs';
import { buildPortfolioSnapshotDocs, buildProjectSnapshotDocs } from './projectDocs';
import { buildMonthlyCloseDocs, buildReportDocs } from './reportDocs';
import { buildRetirementDocs } from './retirementDocs';
import {
  type AllocationJournal,
  type InternalTxn,
  type QaSeedIdentity,
  type SeedDoc,
  inSeedWindow,
} from './shared';
import { buildStaticDocs } from './staticDocs';
import { buildExpenseAndSpecialDocs, buildSalaryDocs } from './transactionDocs';

export type { QaSeedIdentity, SeedDoc } from './shared';
export { buildQaSeedPlan };

// The allocations journal is assembled from the emitted Allocation docs so
// the project snapshot builder receives it as an explicit argument instead
// of sniffing b.docs (Feature Envy fix, review finding).
const collectAllocations = (docs: SeedDoc[]): AllocationJournal[] =>
  docs
    .filter((d) => d.collectionPath.endsWith('/allocations'))
    .map((d) => AllocationSchema.parse(d.data) as unknown as AllocationJournal);

const buildQaSeedPlan = (identity: QaSeedIdentity): SeedDoc[] => {
  const b = { identity, docs: [] };
  const txns: InternalTxn[] = [];

  buildStaticDocs(b);
  buildSalaryDocs(b, txns);
  buildExpenseAndSpecialDocs(b, txns);
  const mortgage = buildMortgageDocs(b, txns);
  buildAccountSnapshotDocs(b, txns);
  buildProjectSnapshotDocs(b, txns, collectAllocations(b.docs));
  buildPortfolioSnapshotDocs(b);
  buildRetirementDocs(b, mortgage);
  buildReportDocs(b, txns, mortgage.closingByMonth);
  buildMonthlyCloseDocs(b);

  assertJournalInsideSeedWindow(txns);

  return b.docs;
};

// Fixed data window invariant (docs/qa-seed-data.md §2): every journal
// entry must fall inside 2025-01 through 2026-09. A builder emitting a
// transaction outside the window fails the seed loudly before any write.
const assertJournalInsideSeedWindow = (txns: InternalTxn[]) => {
  const outside = txns.filter((t) => !inSeedWindow(t.yearMonth));
  if (outside.length > 0) {
    throw new Error(
      `journal entries outside the seed window 2025-01..2026-09: ${outside
        .map((t) => `${t.id}(${t.yearMonth})`)
        .join(', ')}`,
    );
  }
  if (txns.length === 0) {
    throw new Error('journal is empty; the seed window builders emitted no transactions');
  }
};
