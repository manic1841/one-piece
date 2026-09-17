import { describe, expect, it } from 'vitest';

import { type FinancialPeriod } from '@/domains/financial_period/schemas';

import { mapPeriodToCloseStatusVM } from './dashboardCloseStatus.vm';

const buildPeriod = (status: FinancialPeriod['status']): FinancialPeriod => ({
  id: '2026-08',
  yearMonth: '2026-08',
  status,
  stages: {},
  reviewSourceStageId: null,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
});

describe('dashboardCloseStatus.vm', () => {
  it('maps CLOSED to the verified glyph with the CLOSED label', () => {
    const vm = mapPeriodToCloseStatusVM(buildPeriod('CLOSED'), '2026-08');

    expect(vm.glyphType).toBe('verified');
    expect(vm.statusText).toBe('CLOSED');
  });

  it('maps NEEDS_REVIEW to the review glyph with the NEEDS REVIEW label', () => {
    const vm = mapPeriodToCloseStatusVM(buildPeriod('NEEDS_REVIEW'), '2026-08');

    expect(vm.glyphType).toBe('review');
    expect(vm.statusText).toBe('NEEDS REVIEW');
  });

  it('maps IN_PROGRESS to the active glyph with the IN PROGRESS label', () => {
    const vm = mapPeriodToCloseStatusVM(buildPeriod('IN_PROGRESS'), '2026-08');

    expect(vm.glyphType).toBe('active');
    expect(vm.statusText).toBe('IN PROGRESS');
  });

  it('maps a missing record to the waiting glyph with NOT STARTED', () => {
    const vm = mapPeriodToCloseStatusVM(null, '2026-08');

    expect(vm.glyphType).toBe('waiting');
    expect(vm.statusText).toBe('NOT STARTED');
  });

  it('maps OPEN to the waiting glyph', () => {
    const vm = mapPeriodToCloseStatusVM(buildPeriod('OPEN'), '2026-08');

    expect(vm.glyphType).toBe('waiting');
    expect(vm.statusText).toBe('NOT STARTED');
  });

  it('formats the period text in mono style YYYY-MM', () => {
    const vm = mapPeriodToCloseStatusVM(buildPeriod('CLOSED'), '2026-08');

    expect(vm.periodText).toBe('2026-08');
  });
});
