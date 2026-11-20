/**
 * Golden-dataset invariants.
 *
 * These read the deterministic QA seed plan (`pnpm qa:seed`, builders in
 * `scripts/qa/plan`) and verify the four structural invariants documented in
 * `docs/testing.md §不變量` by *recomputing* each derived value through a
 * different production path than the one that produced the seeded document:
 *
 *   1. every transaction's debits equal its credits (see `qaSeedPlan.test.ts`)
 *   2. a project's balance recomputes from transactions + allocations
 *   3. a debt account's `currentBalance` recomputes from its entry lines
 *   4. the balance sheet always balances (assets = liabilities + equity)
 *
 * Deterministic round-trips only — no property-based framework.
 */
import { describe, expect, it } from 'vitest';

import { parseDebtPaymentEntries } from '@/domains/debt/debtPaymentCalculator';
import { calculateProjectBalance } from '@/domains/project/calculators/projectBalanceCalculator';
import { ReportType } from '@/domains/report/schemas';

import { type SeedDoc, buildQaSeedPlan } from '../../scripts/qa/plan';

const IDENTITY = { uid: 'uid-qa', email: 'qa@onepiece.test', householdId: 'qa_household' };

const docsUnder = (docs: SeedDoc[], suffix: string) =>
  docs.filter((doc) => doc.collectionPath.endsWith(suffix));

interface SeedTransaction {
  id: string;
  intentType: string;
  intent?: string | null;
  amount: number;
  projectId: string | null;
  fromProjectId: string | null;
  toProjectId: string | null;
  debtAccountId: string | null;
  entries: { ledgerCode: string; debit: number; credit: number }[];
}

interface SeedAllocation {
  sourceTransactionId: string;
  direction: 'INCOME' | 'EXPENSE';
  items: { projectId: string; amount: number }[];
}

const transactionsOf = (docs: SeedDoc[]): SeedTransaction[] =>
  docsUnder(docs, '/transactions').map((doc) => doc.data as unknown as SeedTransaction);

describe('golden-dataset invariants', () => {
  const docs = buildQaSeedPlan(IDENTITY);

  it('recomputes every project balance from transactions and allocations', () => {
    const transactions = transactionsOf(docs);
    const allocations = docsUnder(docs, '/allocations').map(
      (doc) => doc.data as unknown as SeedAllocation,
    );

    // Project ids come from the persisted snapshot paths, not a hardcoded list.
    const projectIds = Array.from(
      new Set(
        docsUnder(docs, '/snapshots')
          .map((doc) => /\/projects\/([^/]+)\/snapshots$/.exec(doc.collectionPath)?.[1])
          .filter((id): id is string => Boolean(id)),
      ),
    );
    expect(projectIds.length).toBeGreaterThan(0);

    for (const projectId of projectIds) {
      const latestSnapshot = docsUnder(docs, '/snapshots')
        .filter((doc) => doc.collectionPath.includes(`/projects/${projectId}/snapshots`))
        .sort((a, c) => a.id.localeCompare(c.id))
        .at(-1);
      expect(latestSnapshot, `no snapshot for ${projectId}`).toBeDefined();
      const closingBalance = latestSnapshot!.data.closingBalance as number;

      const recomputed = calculateProjectBalance({
        projectId,
        baseBalance: 0,
        transactions: transactions.filter((t) => t.projectId === projectId),
        transfers: transactions.filter((t) => t.fromProjectId || t.toProjectId),
        allocations,
      });

      expect(recomputed, `${projectId} snapshot=${closingBalance} recomputed=${recomputed}`).toBe(
        closingBalance,
      );
    }
  });

  it('recomputes every debt account balance from its payment entries', () => {
    const transactions = transactionsOf(docs);
    const debtAccounts = docsUnder(docs, '/debtAccounts').filter((doc) =>
      doc.collectionPath.endsWith('/debtAccounts'),
    );
    expect(debtAccounts.length).toBeGreaterThan(0);

    // Only accounts with in-window entries are entry-derivable. `debt_loan_personal`
    // is settled (isActive=false, closedAt) before the seed window, so it carries a
    // zero balance no in-window entry can explain.
    const derivable = debtAccounts.filter((doc) =>
      transactions.some((t) => t.debtAccountId === (doc.data as unknown as { id: string }).id),
    );
    expect(derivable.length).toBeGreaterThan(0);

    for (const account of derivable) {
      const data = account.data as unknown as {
        id: string;
        originalAmount: number;
        currentBalance: number;
        linkedLedgerCode: string;
      };

      const principalRepaid = transactions
        .filter((t) => t.intentType === 'DEBT_PAYMENT' && t.debtAccountId === data.id)
        .reduce(
          (sum, t) =>
            sum +
            parseDebtPaymentEntries(t.entries, { linkedLedgerCode: data.linkedLedgerCode })
              .principal,
          0,
        );

      expect(
        data.currentBalance,
        `${data.id}: original=${data.originalAmount} repaid=${principalRepaid}`,
      ).toBeCloseTo(data.originalAmount - principalRepaid, 2);

      // The persisted snapshot chain must land on the same derived balance.
      const latestSnapshot = docsUnder(docs, '/snapshots')
        .filter((doc) => doc.collectionPath.includes(`/debtAccounts/${data.id}/snapshots`))
        .sort((a, c) => a.id.localeCompare(c.id))
        .at(-1);
      expect(latestSnapshot?.data.closingBalance).toBeCloseTo(data.currentBalance, 2);
    }
  });

  it('keeps every balance sheet balanced (assets = liabilities + equity)', () => {
    const balanceSheets = docsUnder(docs, '/reports').filter(
      (doc) => (doc.data as { type: string }).type === ReportType.BALANCE_SHEET,
    );
    expect(balanceSheets.length).toBeGreaterThan(0);

    for (const report of balanceSheets) {
      const { assets, liabilities, equity } = (report.data as { data: unknown }).data as {
        assets: { total: number };
        liabilities: { total: number };
        equity: { total: number };
      };
      expect(
        assets.total,
        `${report.id}: assets=${assets.total} liabilities=${liabilities.total} equity=${equity.total}`,
      ).toBeCloseTo(liabilities.total + equity.total, 2);
    }
  });
});
