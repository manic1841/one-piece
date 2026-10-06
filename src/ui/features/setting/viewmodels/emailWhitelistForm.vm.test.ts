import { describe, expect, it } from 'vitest';

import {
  EmailWhitelistFormSchema,
  createDefaultEmailWhitelistFormVM,
} from '@/ui/features/setting/viewmodels/emailWhitelistForm.vm';

describe('emailWhitelistForm.vm', () => {
  it('creates a default form vm', () => {
    expect(createDefaultEmailWhitelistFormVM()).toEqual({ email: '' });
  });

  it('requires a non-empty email', () => {
    const result = EmailWhitelistFormSchema.safeParse({ email: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('enter an email');
  });

  it('rejects an invalid email shape', () => {
    const result = EmailWhitelistFormSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('valid email');
  });

  it('trims and lowercases a valid email', () => {
    expect(EmailWhitelistFormSchema.parse({ email: '  New@Example.com ' })).toEqual({
      email: 'new@example.com',
    });
  });
});
