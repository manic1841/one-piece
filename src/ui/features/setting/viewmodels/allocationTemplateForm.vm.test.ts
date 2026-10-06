import { describe, expect, it } from 'vitest';

import {
  AllocationTemplateFormSchema,
  createDefaultAllocationTemplateFormVM,
  mapAllocationTemplateVMToItems,
  toAllocationTemplateFormVM,
} from '@/ui/features/setting/viewmodels/allocationTemplateForm.vm';

const base = () => ({
  name: 'Salary',
  ledgerCode: 'income:salary',
  isDefault: false,
  items: [{ projectId: 'p1', percentage: '100' }],
});

describe('allocationTemplateForm.vm', () => {
  it('creates a default form vm with no items', () => {
    expect(createDefaultAllocationTemplateFormVM()).toEqual({
      name: '',
      ledgerCode: '',
      isDefault: false,
      items: [],
    });
  });

  it('requires at least one positive row', () => {
    const result = AllocationTemplateFormSchema.safeParse({
      ...base(),
      items: [{ projectId: 'p1', percentage: '0' }],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['items']);
  });

  it('requires the positive rows to total 100%', () => {
    const result = AllocationTemplateFormSchema.safeParse({
      ...base(),
      items: [
        { projectId: 'p1', percentage: '60' },
        { projectId: 'p2', percentage: '30' },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('100');
  });

  it('accepts a 100% total within tolerance', () => {
    const result = AllocationTemplateFormSchema.safeParse({
      ...base(),
      items: [
        { projectId: 'p1', percentage: '33.33' },
        { projectId: 'p2', percentage: '33.33' },
        { projectId: 'p3', percentage: '33.34' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('excludes unparseable rows from the total at map time', () => {
    const vm = AllocationTemplateFormSchema.parse({
      ...base(),
      items: [
        { projectId: 'p1', percentage: '100' },
        { projectId: 'p2', percentage: '' },
        { projectId: 'p3', percentage: 'abc' },
      ],
    });
    expect(mapAllocationTemplateVMToItems(vm)).toEqual([{ projectId: 'p1', percentage: 100 }]);
  });

  it('seeds the form from a persisted template', () => {
    const vm = toAllocationTemplateFormVM({
      id: 't1',
      name: 'Salary',
      ledgerCode: 'income:salary',
      isDefault: true,
      items: [{ projectId: 'p1', percentage: 100 }],
      createdBy: 'a@b.c',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(vm).toEqual({
      name: 'Salary',
      ledgerCode: 'income:salary',
      isDefault: true,
      items: [{ projectId: 'p1', percentage: '100' }],
    });
  });
});
