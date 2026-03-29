import { beforeEach, describe, expect, it, vi } from 'vitest';

import { saveAllocationTemplateUseCase } from './saveAllocationTemplateUseCase';

const mockedRepo = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/infra/repositories/allocationTemplateRepository', () => ({
  allocationTemplateRepository: {
    list: mockedRepo.list,
    create: mockedRepo.create,
    update: mockedRepo.update,
  },
}));

describe('saveAllocationTemplateUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new template when id is not provided', async () => {
    mockedRepo.list.mockResolvedValue([] as never);
    mockedRepo.create.mockResolvedValue('template-1');

    const result = await saveAllocationTemplateUseCase.execute({
      householdId: 'household-1',
      userEmail: 'admin@example.com',
      data: {
        name: 'Salary',
        ledgerCode: 'income:salary:charles',
        isDefault: false,
        items: [{ projectId: 'p1', percentage: 60 }],
      },
    });

    expect(mockedRepo.create).toHaveBeenCalled();
    expect(result).toBe('template-1');
  });

  it('unsets other defaults before saving new default template', async () => {
    mockedRepo.list.mockResolvedValue([
      {
        id: 'template-old-default',
        ledgerCode: 'income:salary:old',
        isDefault: true,
      },
    ] as never);
    mockedRepo.create.mockResolvedValue('template-2');

    await saveAllocationTemplateUseCase.execute({
      householdId: 'household-1',
      userEmail: 'admin@example.com',
      data: {
        name: 'Default Template',
        ledgerCode: 'income:salary:new',
        isDefault: true,
        items: [{ projectId: 'p1', percentage: 100 }],
      },
    });

    expect(mockedRepo.update).toHaveBeenCalledWith(
      ['household-1', 'template-old-default'],
      { isDefault: false },
      'admin@example.com',
    );
    expect(mockedRepo.create).toHaveBeenCalled();
  });
});
