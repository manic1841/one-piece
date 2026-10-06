import { describe, expect, it } from 'vitest';

import {
  MemberFormSchema,
  createDefaultMemberFormVM,
} from '@/ui/features/setting/viewmodels/memberForm.vm';

describe('memberForm.vm', () => {
  it('defaults to an empty email and the member role', () => {
    expect(createDefaultMemberFormVM()).toEqual({ email: '', role: 'member' });
  });

  it('requires a non-empty email', () => {
    const result = MemberFormSchema.safeParse({ email: '  ', role: 'member' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['email']);
  });

  it('requires a valid email shape', () => {
    const result = MemberFormSchema.safeParse({ email: 'not-an-email', role: 'member' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('valid email');
  });

  it('trims and accepts a valid email', () => {
    const parsed = MemberFormSchema.parse({ email: '  a@b.co ', role: 'admin' });
    expect(parsed).toEqual({ email: 'a@b.co', role: 'admin' });
  });
});
