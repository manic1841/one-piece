import { describe, expect, it } from 'vitest';

import {
  PortfolioFormSchema,
  createDefaultPortfolioFormVM,
  mapPortfolioToFormVM,
  mapPortfolioVMToDomain,
} from './portfolioForm.vm';

describe('portfolioForm.vm', () => {
  it('parses and maps portfolio form to domain input', () => {
    const vm = PortfolioFormSchema.parse({
      name: 'Retirement',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
      isActive: true,
      order: 1,
    });

    const domain = mapPortfolioVMToDomain(vm);

    expect(domain).toEqual({
      name: 'Retirement',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
      isActive: true,
      order: 1,
    });
  });

  it('trims the name and rejects a blank one', () => {
    const parsed = PortfolioFormSchema.parse({
      name: '  Retirement  ',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
      isActive: true,
      order: 0,
    });

    expect(parsed.name).toBe('Retirement');
    expect(
      PortfolioFormSchema.safeParse({
        name: '   ',
        securitiesAccountId: 'a1',
        bankAccountId: 'a2',
        isActive: true,
        order: 0,
      }).success,
    ).toBe(false);
  });

  it('requires both account links', () => {
    const result = PortfolioFormSchema.safeParse({
      name: 'Retirement',
      securitiesAccountId: '',
      bankAccountId: '',
      isActive: true,
      order: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      '請選擇證券帳戶',
      '請選擇銀行帳戶',
    ]);
  });

  it('defaults to an active portfolio with no links', () => {
    expect(createDefaultPortfolioFormVM()).toEqual({
      name: '',
      securitiesAccountId: '',
      bankAccountId: '',
      isActive: true,
      order: 0,
    });

    expect(mapPortfolioToFormVM()).toEqual(createDefaultPortfolioFormVM());
  });

  it('hydrates an edited portfolio without collapsing a zero order', () => {
    expect(
      mapPortfolioToFormVM({
        id: 'p1',
        name: 'Retirement',
        securitiesAccountId: 'a1',
        bankAccountId: 'a2',
        isActive: false,
        order: 0,
      }),
    ).toEqual({
      name: 'Retirement',
      securitiesAccountId: 'a1',
      bankAccountId: 'a2',
      isActive: false,
      order: 0,
    });
  });
});
