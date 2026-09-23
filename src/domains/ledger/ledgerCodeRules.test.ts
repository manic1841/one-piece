import { describe, expect, it } from 'vitest';

import { CustomLedgerCodeCreateSchema, CustomLedgerCodeSchema } from './schemas';
import {
  depthTwoCodesOfType,
  parseLedgerCode,
  validateNewLedgerCode,
  type LedgerCodeCandidate,
} from './ledgerCodeRules';

const candidates: LedgerCodeCandidate[] = [
  { code: 'asset:cash', type: 'asset', isActive: true },
  { code: 'asset:property', type: 'asset', isActive: true },
  { code: 'expense:pets', type: 'expense', isActive: true },
  { code: 'expense:retired', type: 'expense', isActive: false },
];

describe('parseLedgerCode', () => {
  it('parses a category code', () => {
    expect(parseLedgerCode('asset:property')).toEqual({
      type: 'asset',
      parent: null,
      depth: 2,
    });
  });

  it('parses a detail code and exposes its parent', () => {
    expect(parseLedgerCode('asset:property:taipei')).toEqual({
      type: 'asset',
      parent: 'asset:property',
      depth: 3,
    });
  });

  it('rejects anything deeper than a detail', () => {
    expect(parseLedgerCode('asset:property:taipei:downtown')).toBeNull();
  });

  it('rejects uppercase, spaces and missing segments', () => {
    expect(parseLedgerCode('asset:Property')).toBeNull();
    expect(parseLedgerCode('expense:my stuff')).toBeNull();
    expect(parseLedgerCode('asset')).toBeNull();
    expect(parseLedgerCode('asset::cash')).toBeNull();
  });
});

describe('validateNewLedgerCode', () => {
  it('accepts a new category code', () => {
    expect(validateNewLedgerCode('expense:travel', candidates)).toEqual({
      valid: true,
      type: 'expense',
      parent: null,
    });
  });

  it('accepts a detail under an existing active category', () => {
    expect(validateNewLedgerCode('asset:property:taipei', candidates)).toEqual({
      valid: true,
      type: 'asset',
      parent: 'asset:property',
    });
  });

  it('accepts a detail under a custom category', () => {
    expect(validateNewLedgerCode('expense:pets:food', candidates)).toEqual({
      valid: true,
      type: 'expense',
      parent: 'expense:pets',
    });
  });

  it('rejects a detail whose parent does not exist', () => {
    expect(validateNewLedgerCode('asset:land:taipei', candidates)).toEqual({
      valid: false,
      violation: 'PARENT_MISSING',
    });
  });

  it('rejects a detail whose parent is deactivated', () => {
    expect(validateNewLedgerCode('expense:retired:old', candidates)).toEqual({
      valid: false,
      violation: 'PARENT_INACTIVE',
    });
  });

  it('rejects a duplicate code', () => {
    expect(validateNewLedgerCode('asset:cash', candidates)).toEqual({
      valid: false,
      violation: 'DUPLICATE',
    });
  });

  it('rejects an unknown type prefix', () => {
    expect(validateNewLedgerCode('revenue:fees', candidates)).toEqual({
      valid: false,
      violation: 'UNKNOWN_TYPE',
    });
  });

  it('rejects a malformed code', () => {
    expect(validateNewLedgerCode('asset:propert y', candidates)).toEqual({
      valid: false,
      violation: 'INVALID_SHAPE',
    });
  });
});

describe('depthTwoCodesOfType', () => {
  it('lists only the categories of the requested type', () => {
    expect(depthTwoCodesOfType(candidates, 'asset')).toEqual(['asset:cash', 'asset:property']);
    expect(depthTwoCodesOfType(candidates, 'income')).toEqual([]);
  });
});

describe('ledger code schema', () => {
  const base = {
    label: '差旅費',
    type: 'expense' as const,
    isCustom: true as const,
    isActive: true,
    createdBy: 'user@example.com',
  };

  it('accepts category and detail codes on creation', () => {
    expect(CustomLedgerCodeCreateSchema.safeParse({ ...base, code: 'expense:travel' }).success).toBe(
      true,
    );
    expect(
      CustomLedgerCodeCreateSchema.safeParse({ ...base, code: 'expense:travel:train' }).success,
    ).toBe(true);
  });

  it('rejects deeper and malformed codes on creation', () => {
    expect(
      CustomLedgerCodeCreateSchema.safeParse({ ...base, code: 'expense:travel:train:rail' })
        .success,
    ).toBe(false);
    expect(CustomLedgerCodeCreateSchema.safeParse({ ...base, code: 'Expense:Travel' }).success).toBe(
      false,
    );
  });

  it('keeps reading tolerant of codes created before the pattern existed', () => {
    const persisted = CustomLedgerCodeSchema.safeParse({
      ...base,
      id: 'expense:legacy code',
      code: 'expense:legacy code',
      updatedBy: 'user@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(persisted.success).toBe(true);
  });
});
