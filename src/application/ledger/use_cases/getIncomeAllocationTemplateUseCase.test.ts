import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIncomeAllocationTemplateUseCase } from './getIncomeAllocationTemplateUseCase';

const mockedRepo = vi.hoisted(() => ({
  getByLedgerCode: vi.fn(),
  getDefaultTemplate: vi.fn(),
}));

vi.mock('@/infra/repositories/allocationTemplateRepository', () => ({
  allocationTemplateRepository: {
    getByLedgerCode: mockedRepo.getByLedgerCode,
    getDefaultTemplate: mockedRepo.getDefaultTemplate,
  },
}));

describe('getIncomeAllocationTemplateUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns exact template when ledgerCode matches', async () => {
    mockedRepo.getByLedgerCode.mockResolvedValue({
      id: 'template-1',
      ledgerCode: 'income:salary:charles',
    } as never);

    const result = await getIncomeAllocationTemplateUseCase.execute({
      householdId: 'household-1',
      ledgerCode: 'income:salary:charles',
    });

    expect(mockedRepo.getByLedgerCode).toHaveBeenCalledWith('household-1', 'income:salary:charles');
    expect(mockedRepo.getDefaultTemplate).not.toHaveBeenCalled();
    expect(result?.id).toBe('template-1');
  });

  it('falls back to default template when exact template is missing', async () => {
    mockedRepo.getByLedgerCode.mockResolvedValue(null);
    mockedRepo.getDefaultTemplate.mockResolvedValue({
      id: 'default-template',
      ledgerCode: 'income:default',
    } as never);

    const result = await getIncomeAllocationTemplateUseCase.execute({
      householdId: 'household-1',
      ledgerCode: 'income:bonus',
    });

    expect(mockedRepo.getDefaultTemplate).toHaveBeenCalledWith('household-1');
    expect(result?.id).toBe('default-template');
  });
});
