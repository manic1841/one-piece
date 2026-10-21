import { describe, expect, it } from 'vitest';

import { type ProjectionRule } from '../projectionRules';
import { baselineYearFor, netForLedgerCode } from './ledgerBaseline';

const rule = (overrides: Partial<ProjectionRule>): ProjectionRule => ({
  id: 'rule-1',
  name: 'Rent',
  ruleType: 'expense',
  enabled: true,
  source: { type: 'ledgerCode', id: 'expense:rent' },
  method: 'inflation',
  parameters: {},
  endCondition: { type: 'lifelong' },
  baselinePolicy: 'previousCompleteYear',
  ...overrides,
});

describe('netForLedgerCode', () => {
  it('nets credit against debit for the requested code only', () => {
    const transactions = [
      {
        entries: [
          { ledgerCode: 'expense:rent', debit: 1200 },
          { ledgerCode: 'expense:rent', debit: 300, credit: 100 },
          { ledgerCode: 'expense:other', debit: 999 },
        ],
      },
    ];

    expect(netForLedgerCode(transactions, 'expense:rent')).toBe(-1400);
  });

  it('returns undefined when the code has no entry', () => {
    expect(netForLedgerCode([{ entries: [] }], 'expense:rent')).toBeUndefined();
    expect(netForLedgerCode([], 'expense:rent')).toBeUndefined();
  });
});

describe('baselineYearFor', () => {
  it('uses the configured year for specificYear', () => {
    expect(
      baselineYearFor(rule({ baselinePolicy: 'specificYear', baselineYear: 2020 }), 2026),
    ).toBe(2020);
  });

  it('uses the previous complete year otherwise', () => {
    expect(baselineYearFor(rule({}), 2026)).toBe(2025);
  });
});
