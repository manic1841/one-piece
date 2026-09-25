import { describe, expect, it } from 'vitest';

import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';

import { buildUserSelectOptions } from './userSelectOptions';

const mappingFor = (intent: string) => {
  const mapping = DEFAULT_INTENT_MAPPINGS.find((item) => item.intent === intent);
  if (!mapping) throw new Error(`Missing intent mapping: ${intent}`);
  return mapping;
};

const code = (value: string, type: string, isCustom = false, isActive = true): LedgerCodeItem => ({
  code: value,
  label: value,
  type,
  isCustom,
  isActive,
});

const allCodes: LedgerCodeItem[] = [
  code('expense:food', 'expense'),
  code('expense:other', 'expense'),
  code('expense:pets', 'expense', true),
  code('expense:pets:food', 'expense', true),
  code('income:salary', 'income'),
  code('income:other', 'income'),
  code('income:freelance', 'income', true),
  code('asset:property', 'asset'),
  code('asset:property:taipei', 'asset', true),
  code('asset:property:kaohsiung', 'asset', true),
];

describe('buildUserSelectOptions', () => {
  it('returns null for intents without a user-select side', () => {
    expect(buildUserSelectOptions(mappingFor('FOOD'), allCodes)).toBeNull();
    expect(buildUserSelectOptions(undefined, allCodes)).toBeNull();
  });

  it('lists every code under the allowed prefix', () => {
    expect(
      buildUserSelectOptions(mappingFor('REAL_ESTATE_BUY'), allCodes)?.map((item) => item.code),
    ).toEqual(['asset:property', 'asset:property:taipei', 'asset:property:kaohsiung']);
  });

  it('lists only the household custom codes plus the intent default for OTHER_EXPENSE', () => {
    expect(
      buildUserSelectOptions(mappingFor('OTHER_EXPENSE'), allCodes)?.map((item) => item.code),
    ).toEqual(['expense:other', 'expense:pets', 'expense:pets:food']);
  });

  it('lists only the household custom codes plus the intent default for OTHER_INCOME', () => {
    expect(
      buildUserSelectOptions(mappingFor('OTHER_INCOME'), allCodes)?.map((item) => item.code),
    ).toEqual(['income:other', 'income:freelance']);
  });

  it('does not repeat the system codes of other intents', () => {
    const codes = buildUserSelectOptions(mappingFor('OTHER_EXPENSE'), allCodes)?.map(
      (item) => item.code,
    );

    expect(codes).not.toContain('expense:food');
  });
});
