import { describe, expect, it } from 'vitest';

import {
  createDefaultProjectFormVM,
  mapProjectVMToDomain,
  parseProjectFormVM,
} from '@/ui/features/project/viewmodels/projectForm.vm';

describe('projectForm.vm', () => {
  it('creates default form vm', () => {
    const vm = createDefaultProjectFormVM();
    expect(vm.name).toBe('');
    expect(vm.color).toBe('#3B82F6');
    expect(vm.order).toBe(0);
    expect(vm.isActive).toBe(true);
  });

  it('rejects empty name', () => {
    expect(() =>
      parseProjectFormVM({
        name: '',
        color: '#3B82F6',
        icon: '📊',
        order: 0,
        description: '',
        category: 'OPERATING',
        isActive: true,
      }),
    ).toThrow('專案名稱不能為空');
  });

  it('maps vm to domain payload', () => {
    const vm = parseProjectFormVM({
      name: '生活費',
      color: '#111111',
      icon: '🏠',
      order: 2,
      description: '家庭開支',
      category: 'OPERATING',
      isActive: true,
    });

    const domain = mapProjectVMToDomain(vm);
    expect(domain.name).toBe('生活費');
    expect(domain.order).toBe(2);
    expect(domain.category).toBe('OPERATING');
  });
});
