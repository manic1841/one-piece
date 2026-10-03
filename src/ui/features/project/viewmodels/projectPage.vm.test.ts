import { describe, expect, it } from 'vitest';

import { type Project } from '@/domains/project/schemas';

import { toProjectRows, toProjectSnapshotTotals } from './projectPage.vm';

const project = (overrides: Partial<Project>): Project =>
  ({
    id: 'p1',
    name: 'Kitchen Remodel',
    isActive: true,
    order: 0,
    ...overrides,
  }) as Project;

describe('toProjectSnapshotTotals', () => {
  it('sums income and expense across snapshots', () => {
    expect(
      toProjectSnapshotTotals([
        { income: 100000, expense: 60000 },
        { income: 50000, expense: 30000 },
      ]),
    ).toEqual({ income: 150000, expense: 90000 });
  });

  it('treats a project with no snapshots as zero', () => {
    expect(toProjectSnapshotTotals([])).toEqual({ income: 0, expense: 0 });
  });
});

describe('toProjectRows', () => {
  it('projects name, status and signed net for each project', () => {
    const rows = toProjectRows(
      [project({ id: 'p1' }), project({ id: 'p2', name: 'Garage Build', isActive: false })],
      new Map([['p1', { income: 150000, expense: 90000 }]]),
    );

    expect(rows).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Kitchen Remodel', isActive: true, net: 60000 }),
      expect.objectContaining({
        id: 'p2',
        name: 'Garage Build',
        isActive: false,
        income: 0,
        expense: 0,
        net: 0,
      }),
    ]);
  });
});
