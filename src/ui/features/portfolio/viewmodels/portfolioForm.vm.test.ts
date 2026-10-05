import { describe, expect, it } from 'vitest';

import {
  PortfolioFormSchema,
  createDefaultPortfolioFormVM,
  mapPortfolioVMToDomain,
} from './portfolioForm.vm';

describe('portfolioForm.vm', () => {
  it('parses and maps a create form to a domain payload', () => {
    const vm = PortfolioFormSchema.parse({
      name: 'Retirement',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
    });

    expect(mapPortfolioVMToDomain(vm)).toEqual({
      name: 'Retirement',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
      isActive: true,
      order: 0,
    });
  });

  it('trims the name and rejects a blank one', () => {
    const parsed = PortfolioFormSchema.parse({
      name: '  Retirement  ',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
    });

    expect(parsed.name).toBe('Retirement');
    expect(
      PortfolioFormSchema.safeParse({
        name: '   ',
        securitiesAccountId: 'a1',
        bankAccountId: 'a2',
      }).success,
    ).toBe(false);
  });

  it('requires both account links', () => {
    const result = PortfolioFormSchema.safeParse({
      name: 'Retirement',
      securitiesAccountId: '',
      bankAccountId: '',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      '請選擇證券帳戶',
      '請選擇銀行帳戶',
    ]);
  });

  it('has no editable lifecycle or order field', () => {
    expect(createDefaultPortfolioFormVM()).toEqual({
      name: '',
      securitiesAccountId: '',
      bankAccountId: '',
    });
  });
});
