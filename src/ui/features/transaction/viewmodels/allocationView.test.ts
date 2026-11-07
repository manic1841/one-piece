import { describe, expect, it } from 'vitest';

import { type TransactionFormProjectOption } from '../types/transaction';
import { appendShares, buildAllocationSlices, equalPercentages } from './allocationView';

const color = (index: number) => `color-${index}`;

const projects: TransactionFormProjectOption[] = [
  { id: 'p1', name: '旅遊基金' },
  { id: 'p2', name: '房屋頭期' },
];

describe('equalPercentages', () => {
  it('puts the rounding remainder on the last row so the total is 100', () => {
    expect(equalPercentages(2)).toEqual(['50', '50']);
    expect(equalPercentages(3)).toEqual(['33.3', '33.3', '33.4']);
  });
});

describe('appendShares', () => {
  it('divides 100 across the added projects when nothing is selected yet', () => {
    expect(appendShares([], 2)).toEqual(['50', '50']);
  });

  it('shares only what is left, keeping the edited percentages', () => {
    expect(appendShares(['70'], 2)).toEqual(['15', '15']);
  });

  it('gives zero when the selection already totals 100', () => {
    expect(appendShares(['70', '30'], 1)).toEqual(['0']);
  });
});

describe('buildAllocationSlices', () => {
  it('orders by share, largest first, and colors by selection order', () => {
    const slices = buildAllocationSlices({
      selectedIds: ['p2', 'p1'],
      items: [
        { projectId: 'p2', percentage: '30' },
        { projectId: 'p1', percentage: '70' },
      ],
      projects,
      color,
    });

    expect(slices).toEqual([
      { id: 'p1', name: '旅遊基金', percentage: 70, color: 'color-1', inactive: false },
      { id: 'p2', name: '房屋頭期', percentage: 30, color: 'color-0', inactive: false },
    ]);
  });

  it('keeps an unknown project as an inactive row instead of dropping it', () => {
    const slices = buildAllocationSlices({
      selectedIds: ['gone'],
      items: [],
      projects,
      color,
    });

    expect(slices).toEqual([
      { id: 'gone', name: '已停用專案', percentage: 100, color: 'color-0', inactive: true },
    ]);
  });

  it('keeps a direct project link at a full share', () => {
    const slices = buildAllocationSlices({ selectedIds: ['p1'], items: [], projects, color });

    expect(slices[0]?.percentage).toBe(100);
  });
});
