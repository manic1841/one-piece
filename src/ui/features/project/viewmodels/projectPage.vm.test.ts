import { describe, expect, it } from 'vitest';

import { type Project } from '@/domains/project/schemas';

import { toProjectRows } from './projectPage.vm';

const project = (overrides: Partial<Project>): Project =>
  ({
    id: 'p1',
    name: 'Kitchen Remodel',
    isActive: true,
    order: 0,
    ...overrides,
  }) as Project;

describe('toProjectRows', () => {
  it('projects name, status, balance and last settled month for each project', () => {
    const rows = toProjectRows(
      [project({ id: 'p1' }), project({ id: 'p2', name: 'Garage Build', isActive: false })],
      new Map([['p1', { balance: 60000, lastSettledYearMonth: '2026-09' }]]),
      '未曾結算',
    );

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'p1',
        name: 'Kitchen Remodel',
        isActive: true,
        balanceText: 'NT$60,000',
        lastSettledMonthText: '2026-09',
      }),
      expect.objectContaining({
        id: 'p2',
        name: 'Garage Build',
        isActive: false,
        balanceText: '—',
        lastSettledMonthText: '未曾結算',
      }),
    ]);
  });
});
