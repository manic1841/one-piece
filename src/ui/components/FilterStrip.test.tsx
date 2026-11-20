import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('marks the selection with the shared button tokens, not a filled surface', () => {
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

    expect(selected.className).toContain('aria-pressed:text-primary');
    expect(selected.className).toContain('aria-pressed:bg-elevated');
    expect(selected.className).not.toContain('aria-pressed:border-primary');
    expect(selected.className).not.toContain('aria-pressed:font-semibold');
    expect(selected.className).toContain('border border-input');
    expect(selected.className).not.toContain('bg-primary');
    expect(unselected.className).toContain('text-muted-foreground');
    expect(unselected.className).not.toMatch(/(^|\s)bg-elevated/);
    expect(unselected.className).not.toMatch(/shadow-(sm|md|lg|xl|2xl|inner)/);
    expect(unselected.className).not.toContain('border-b-2');
  });

  it('joins the buttons with no gap and no separators inside one outline', () => {
    render(
      <FilterStrip items={ITEMS} value="ALL" onValueChange={vi.fn()} ariaLabel="交易類型篩選" />,
    );

    const group = screen.getByRole('group', { name: '交易類型篩選' });
    const first = within(group).getByRole('button', { name: '全部' });
    const last = within(group).getByRole('button', { name: '支出' });

    expect(group.className).not.toContain('gap-');
    expect(first.className).toContain('rounded-r-none');
    expect(first.className).toContain('border-r-0');
    expect(first.className).not.toContain('rounded-l-none');
    expect(last.className).toContain('rounded-l-none');
    expect(last.className).toContain('border-l-0');
    expect(last.className).not.toContain('rounded-r-none');
  });
});
