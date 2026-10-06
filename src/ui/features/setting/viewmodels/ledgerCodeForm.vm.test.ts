import { describe, expect, it } from 'vitest';

import {
  LedgerCodeFormSchema,
  createDefaultLedgerCodeFormVM,
} from '@/ui/features/setting/viewmodels/ledgerCodeForm.vm';

describe('ledgerCodeForm.vm', () => {
  it('creates a default form vm with the expense type and empty fields', () => {
    expect(createDefaultLedgerCodeFormVM()).toEqual({ type: 'expense', code: '', label: '' });
  });

  it('rejects an empty code or label', () => {
    const result = LedgerCodeFormSchema.safeParse({ type: 'expense', code: '  ', label: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['code', 'label']),
    );
  });

  it('trims and lowercases the code, and trims the label', () => {
    const parsed = LedgerCodeFormSchema.parse({ type: 'asset', code: ' Travel ', label: ' 差旅 ' });
    expect(parsed).toEqual({ type: 'asset', code: 'travel', label: '差旅' });
  });
});
