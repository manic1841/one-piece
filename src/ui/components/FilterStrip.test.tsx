import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilterStrip } from './FilterStrip';

const ITEMS = [
  { id: 'ALL', label: '全部' },
  { id: 'EXPENSE', label: '支出' },
];

describe('FilterStrip', () => {
  it('renders one pressed button per item inside a named group', () => {
    render(
      <FilterStrip items={ITEMS} value="ALL" onValueChange={vi.fn()} ariaLabel="交易類型篩選" />,
    );

    expect(screen.getByRole('group', { name: '交易類型篩選' })).toBeVisible();
    expect(screen.getByRole('button', { name: '全部' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '支出' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the clicked item id', () => {
    const onValueChange = vi.fn();
    render(
      <FilterStrip
        items={ITEMS}
        value="ALL"
        onValueChange={onValueChange}
        ariaLabel="交易類型篩選"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '支出' }));

    expect(onValueChange).toHaveBeenCalledWith('EXPENSE');
  });

  it('marks the selection with the shared underline tokens, not a filled surface', () => {
    render(
      <FilterStrip
        items={ITEMS}
        value="EXPENSE"
        onValueChange={vi.fn()}
        ariaLabel="交易類型篩選"
      />,
    );

    const selected = screen.getByRole('button', { name: '支出' });
    const unselected = screen.getByRole('button', { name: '全部' });

    expect(selected.className).toContain('aria-pressed:border-primary');
    expect(selected.className).toContain('-mb-px');
    expect(selected.className).not.toContain('bg-primary');
    expect(unselected.className).not.toContain('shadow');
  });
});
