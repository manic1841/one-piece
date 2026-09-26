/**
 * Seam tests for the pure QA seed plan builders (scripts/qa/plan).
 *
 * The plan orchestrator is the pre-agreed seam: it turns the QA fixture
 * spec into a deterministic list of Firestore documents without touching
 * Firestore. Expected values below are independent worked examples, not
 * recomputations of the builders' own arithmetic.
 */
import { describe, expect, it } from 'vitest';

import { type SeedDoc, buildQaSeedPlan } from '../../scripts/qa/plan';

const IDENTITY = { uid: 'uid-qa', email: 'qa@onepiece.test', householdId: 'qa_household' };

const docsUnder = (docs: SeedDoc[], suffix: string) =>
  docs.filter((doc) => doc.collectionPath.endsWith(suffix));

const salaryTxns = (docs: SeedDoc[]) =>
  docsUnder(docs, '/transactions').filter(
    (d) =>
      d.data.intentType === 'INCOME' &&
      (d.data.entries as { ledgerCode: string }[]).some((e) => e.ledgerCode === 'income:salary'),
  );

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
      // Salary lands in the Taishin payroll account (issue #198 Q1).
      const cashEntry = entries.find((e) => e.ledgerCode === 'asset:cash');
      expect(cashEntry?.accountId).toBe('acc_bank_main');
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
      // 50/25/10/8/7 split of 60,000 (issue #198 Q5).
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
      expect(
        Object.values(stages).every((s) => s.status === 'PENDING' || s.status === 'COMPLETED'),
      ).toBe(true);
    }

    const active = byId.get('2026-09')!.data.stages as Record<string, { status: string }>;
    expect(active.ACCOUNT_BALANCE.status).toBe('COMPLETED');
    expect(active.CLOSE_PERIOD.status).toBe('PENDING');
  });

  it('seeds the multi-account story (issue #198): 5 accounts, snapshots 2026-01..09', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const accounts = docsUnder(docs, '/accounts').filter((d) => !d.id.includes('/'));
    // 現金 + 台新薪轉 + 玉山數位 + 玉山外幣 + 券商.
    expect(accounts.map((a) => a.id).sort()).toEqual([
      'acc_bank_foreign',
      'acc_bank_main',
      'acc_bank_savings',
      'acc_cash',
      'acc_securities',
    ]);
    const foreign = accounts.find((a) => a.id === 'acc_bank_foreign')!;
    expect(foreign.data.currency).toBe('USD');
    expect(foreign.data.category).toBe('bank');

    const snapshotDocs = docsUnder(docs, '/snapshots');
    for (const accountId of [
      'acc_cash',
      'acc_bank_main',
      'acc_bank_savings',
      'acc_bank_foreign',
      'acc_securities',
    ]) {
      const months = snapshotDocs
        .filter((s) => s.data.accountId === accountId)
        .map((s) => s.id)
        .sort();
      expect(months, accountId).toEqual([
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
    }
  });

  it('derives each cash account snapshot from its own entries (reconciled chains)', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const snapshotDocs = docsUnder(docs, '/snapshots');
    for (const accountId of ['acc_cash', 'acc_bank_main', 'acc_bank_savings', 'acc_bank_foreign']) {
      const latest = snapshotDocs.find((s) => s.data.accountId === accountId && s.id === '2026-09');
      expect(latest, accountId).toBeDefined();
      expect((latest!.data.amount as number) >= 0).toBe(true);
    }
    // Foreign account freezes the remittance rate: 1,800 USD × 31.2 = 56,160.
    const foreign = snapshotDocs.find((s) => s.data.accountId === 'acc_bank_foreign')!;
    expect(foreign.data.originalAmount).toBe(1800);
    expect(foreign.data.exchangeRate).toBe(31.2);
    expect(foreign.data.amount).toBe(56160);
  });

  it('seeds nine months of leveraged brokerage holdings summing to the account snapshot', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const snapshotDocs = docsUnder(docs, '/snapshots');
    for (const month of [
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]) {
      const securities = snapshotDocs.find(
        (s) => s.data.accountId === 'acc_securities' && s.id === month,
      );
      expect(securities, month).toBeDefined();
      const holdings = securities!.data.holdings as {
        symbol: string;
        marketValue: number;
        leverage: number;
      }[];
      expect(holdings.length).toBeGreaterThan(0);
      expect(
        holdings.reduce((sum, h) => sum + h.marketValue, 0),
        `${month} holdings vs snapshot`,
      ).toBe(securities!.data.amount);
      // Different leverage levels across the portfolio (issue #198 Q4).
      expect(holdings.some((h) => h.leverage === 1)).toBe(true);
      if (month >= '2026-05') expect(holdings.some((h) => h.leverage === 2)).toBe(true);
    }
  });

  it('seeds the car loan lifecycle: drawdown, purchase, five payments (issue #198 Q6)', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const txns = docsUnder(docs, '/transactions');
    const borrow = txns.find((t) => t.id === 'txn_borrow_car');
    expect(borrow).toBeDefined();
    expect(borrow!.data.amount).toBe(450000);
    expect(borrow!.data.debtAccountId).toBe('debt_car_loan');
    const purchase = txns.find((t) => t.id === 'txn_purchase_car');
    expect(purchase!.data.amount).toBe(450000);

    const payments = txns
      .filter((t) => t.data.debtAccountId === 'debt_car_loan')
      .filter((t) => (t.data.intentType as string) === 'DEBT_PAYMENT');
    expect(payments.map((t) => t.id).sort()).toEqual([
      'txn_cardebtpay_2026-05',
      'txn_cardebtpay_2026-06',
      'txn_cardebtpay_2026-07',
      'txn_cardebtpay_2026-08',
      'txn_cardebtpay_2026-09',
    ]);

    const snapshots = docsUnder(docs, '/debtAccounts/debt_car_loan/snapshots');
    expect(snapshots).toHaveLength(5);
    const closing = snapshots.find((s) => s.id === '2026-09')!;
    expect((closing.data.closingBalance as number) > 0).toBe(true);
    // Balance chain: closing = 450,000 minus the seeded principal repayments.
    const principalPaid = snapshots.reduce((sum, s) => sum + (s.data.principalPaid as number), 0);
    expect(closing.data.closingBalance).toBeCloseTo(450000 - principalPaid, 2);
  });

  it('tags every asset:cash entry with a seeded physical account (no untagged cash legs)', () => {
    const docs = buildQaSeedPlan(IDENTITY);
    const seededAccounts = new Set([
      'acc_cash',
      'acc_bank_main',
      'acc_bank_savings',
      'acc_bank_foreign',
      'acc_securities',
    ]);
    for (const txn of docsUnder(docs, '/transactions')) {
      for (const entry of txn.data.entries as { ledgerCode: string; accountId?: string }[]) {
        if (entry.ledgerCode === 'asset:cash') {
          expect(seededAccounts.has(entry.accountId ?? ''), `${txn.id} untagged asset:cash`).toBe(
            true,
          );
        }
      }
    }
  });
});
