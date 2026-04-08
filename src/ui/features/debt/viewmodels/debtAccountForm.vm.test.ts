import { describe, expect, it } from 'vitest';

import {
  mapDebtAccountVMToCreateMeta,
  mapDebtAccountVMToDomain,
  parseDebtAccountFormVM,
} from './debtAccountForm.vm';

const createValidInput = () => ({
  name: '房貸 A',
  type: 'mortgage',
  repaymentType: 'equal_payment',
  originalAmount: '1000000',
  currentBalance: '900000',
  interestRate: '2.35',
  startDate: '2026-01-01',
  endDate: '2056-01-01',
  graceEndDate: '',
  disbursementDate: '2026-01-01',
  disbursementDescription: '房貸撥款',
  monthlyPayment: '25000',
  linkedProjectId: 'project-1',
  note: 'note',
});

describe('debtAccountForm.vm', () => {
  it('parses valid input in create mode', () => {
    const vm = parseDebtAccountFormVM(createValidInput(), true);
    expect(vm.name).toBe('房貸 A');
    expect(vm.type).toBe('mortgage');
  });

  it('requires disbursementDate in create mode', () => {
    const input = createValidInput();
    input.disbursementDate = '';

    expect(() => parseDebtAccountFormVM(input, true)).toThrow('必填');
  });

  it('rejects invalid date range', () => {
    const input = createValidInput();
    input.endDate = '2025-12-31';

    expect(() => parseDebtAccountFormVM(input, true)).toThrow('結束日須晚於開始日');
  });

  it('maps vm to domain payload', () => {
    const vm = parseDebtAccountFormVM(createValidInput(), true);
    const domain = mapDebtAccountVMToDomain(vm);

    expect(domain.name).toBe('房貸 A');
    expect(domain.originalAmount).toBe(1000000);
    expect(domain.currentBalance).toBe(900000);
    expect(domain.interestRate).toBe(2.35);
    expect(domain.monthlyPayment).toBe(25000);
    expect(domain.linkedProjectId).toBe('project-1');
    expect(domain.isActive).toBe(true);
  });

  it('maps create meta from vm', () => {
    const vm = parseDebtAccountFormVM(createValidInput(), true);
    const meta = mapDebtAccountVMToCreateMeta(vm);

    expect(meta).not.toBeNull();
    expect(meta?.disbursementDate.getFullYear()).toBe(2026);
    expect(meta?.disbursementDescription).toBe('房貸撥款');
  });
});
