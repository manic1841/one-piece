import { describe, expect, it } from 'vitest';

import { buildSourceInventory } from './sourceInventory.vm';

const codes = [
  { id: 'income:salary', label: 'Salary', type: 'income' as const },
  { id: 'expense:rent', label: 'Rent', type: 'expense' as const },
  { id: 'expense:food', label: 'Food', type: 'expense' as const },
];

describe('buildSourceInventory', () => {
  it('counts distinct used sources and lists the unassigned ones', () => {
    const inventory = buildSourceInventory(
      [
        { sourceType: 'ledgerCode', sourceId: 'expense:rent' },
        { sourceType: 'ledgerCode', sourceId: 'expense:rent' },
      ],
      codes,
    );

    expect(inventory.usedCount).toBe(1);
    expect(inventory.unassigned.map((source) => source.label)).toEqual(['Food', 'Salary']);
  });

  it('ignores rule sources but counts debt accounts', () => {
    const inventory = buildSourceInventory(
      [
        { sourceType: 'rule', sourceId: 'expense:rent' },
        { sourceType: 'debtAccount', sourceId: 'debt-1' },
      ],
      [...codes, { id: 'debt-1', label: 'Mortgage', type: 'debt' as const }],
    );

    expect(inventory.usedCount).toBe(1);
    expect(inventory.unassigned.map((source) => source.label)).toEqual(['Food', 'Rent', 'Salary']);
  });

  it('treats a blank source id as unused', () => {
    expect(
      buildSourceInventory([{ sourceType: 'ledgerCode', sourceId: '' }], codes).usedCount,
    ).toBe(0);
  });
});
