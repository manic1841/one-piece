/**
 * Seam tests for the pure QA seed plan builders (scripts/qa/plan).
 *
 * The plan orchestrator is the pre-agreed seam: it turns the QA fixture
 * spec into a deterministic list of Firestore documents without touching
 * Firestore. Expected values below are independent worked examples, not
 * recomputations of the builders' own arithmetic.
 */
import { describe, expect, it } from 'vitest';

import { buildQaSeedPlan, type SeedDoc } from '../../scripts/qa/plan';

const IDENTITY = { uid: 'uid-qa', email: 'qa@onepiece.test', householdId: 'qa_household' };

const docsUnder = (docs: SeedDoc[], suffix: string) =>
  docs.filter((doc) => doc.collectionPath.endsWith(suffix));

const salaryTxns = (docs: SeedDoc[]) =>
  docsUnder(docs, '/transactions').filter((d) => d.data.intentType === 'INCOME');

describe('QA seed plan builder', () => {
  it('is deterministic across calls', () => {
    const first = buildQaSeedPlan(IDENTITY);
    const second = buildQaSeedPlan(IDENTITY);
    const keys = (docs: SeedDoc[]) => docs.map((d) => `${d.collectionPath}/${d.id}`).sort();
    expect(keys(first)).toEqual(keys(second));
    expect(first.length).toBeGreaterThan(0);
  });

  it('emits one salary per month for the fixed window 2025-01 through 2026-09', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const salaries = salaryTxns(docs);
    // 12 (2025) + 9 (2026) months of salary, each 60,000 credit to income:salary.
    expect(salaries).toHaveLength(21);
    for (const salary of salaries) {
      const entries = salary.data.entries as { debit: number; credit: number }[];
      expect(entries.reduce((sum, e) => sum + e.credit, 0)).toBe(60000);
    }
  });

  it('keeps every seeded transaction journal balanced (debit total equals credit total)', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const transactions = docsUnder(docs, '/transactions');
    expect(transactions.length).toBeGreaterThan(0);
    for (const txn of transactions) {
      const entries = txn.data.entries as { debit: number; credit: number }[];
      const debit = entries.reduce((sum, e) => sum + e.debit, 0);
      const credit = entries.reduce((sum, e) => sum + e.credit, 0);
      expect(`${txn.id}: ${debit}=${credit}`).toBe(`${txn.id}: ${credit}=${credit}`);
    }
  });

  it('keeps every emitted transaction doc inside the fixed seed window', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const transactions = docsUnder(docs, '/transactions');
    expect(transactions.length).toBeGreaterThan(0);
    // Covers every emit path, including DEBT_PAYMENT transactions from the
    // mortgage builder that the journal-only window assertion cannot see.
    for (const txn of transactions) {
      const date = txn.data.date as Date | undefined;
      expect(date, `missing date on ${txn.id}`).toBeInstanceOf(Date);
      const yearMonth = `${date!.getFullYear()}-${String(date!.getMonth() + 1).padStart(2, '0')}`;
      expect(
        yearMonth >= '2025-01' && yearMonth <= '2026-09',
        `${txn.id}(${yearMonth}) outside 2025-01..2026-09`,
      ).toBe(true);
    }
  });

  it('denormalizes ledgerCodes to exactly the set of entry ledger codes', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    for (const txn of docsUnder(docs, '/transactions')) {
      const entries = txn.data.entries as { ledgerCode: string }[];
      const fromEntries = Array.from(new Set(entries.map((e) => e.ledgerCode))).sort();
      expect(txn.data.ledgerCodes as string[]).toEqual(fromEntries);
    }
  });

  it('links every salary transaction to a same-id allocation bidirectionally', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const allocations = docsUnder(docs, '/allocations');
    const allocationById = new Map(allocations.map((a) => [a.id, a]));
    const salaries = salaryTxns(docs);
    expect(salaries).toHaveLength(21);
    for (const salary of salaries) {
      expect(salary.data.allocationId).toBe(salary.id);
      const allocation = allocationById.get(salary.id as string);
      expect(allocation, `allocation for ${salary.id}`).toBeDefined();
      expect(allocation!.data.sourceTransactionId).toBe(salary.id);
      const items = allocation!.data.items as { amount: number; percentage: number }[];
      // 60/25/15 split of 60,000: 36,000 + 15,000 + 9,000.
      expect(items.reduce((sum, i) => sum + i.amount, 0)).toBe(60000);
      expect(items.reduce((sum, i) => sum + i.percentage, 0)).toBe(100);
    }
  });

  it('seeds the four-shape monthly close matrix', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const periods = docsUnder(docs, '/financialPeriods');
    // 2026-06 paused, 2026-07/08 closed, 2026-09 active; nothing earlier.
    expect(periods.map((p) => p.id).sort()).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);

    const byId = new Map(periods.map((p) => [p.id, p]));
    expect(byId.get('2026-06')!.data.status).toBe('NEEDS_REVIEW');
    expect(byId.get('2026-06')!.data.reviewSourceStageId).toBe('COMPLETENESS_CHECK');
    expect(byId.get('2026-07')!.data.status).toBe('CLOSED');
    expect(byId.get('2026-08')!.data.status).toBe('CLOSED');
    expect(byId.get('2026-09')!.data.status).toBe('IN_PROGRESS');

    for (const period of periods) {
      const stages = period.data.stages as Record<string, { status: string; confirmedBy?: string }>;
      expect(Object.keys(stages).sort()).toEqual([
        'ACCOUNT_BALANCE',
        'CLOSE_PERIOD',
        'COMPLETENESS_CHECK',
        'DEBT_REPAYMENT',
        'FINANCIAL_REPORTS',
        'PORTFOLIO_CASH_FLOW',
        'PROJECT_SETTLEMENT',
        'SECURITIES_TRADE',
        'TRANSACTION_VALIDATION',
      ]);
      expect(Object.values(stages).every((s) => s.status === 'PENDING' || s.status === 'COMPLETED')).toBe(true);
    }

    const active = byId.get('2026-09')!.data.stages as Record<string, { status: string }>;
    expect(active.ACCOUNT_BALANCE.status).toBe('COMPLETED');
    expect(active.CLOSE_PERIOD.status).toBe('PENDING');
  });
});
