import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type StatementRow, StatementTable } from './StatementTable';

const rows: StatementRow[] = [
  {
    key: 'section:income',
    label: '收入',
    amountText: null,
    tone: 'section',
    level: 0,
    children: [
      {
        key: 'income:salary',
        label: '薪資',
        amountText: 'NT$50,000',
        tone: 'group',
        level: 1,
        children: [
          {
            key: 'income:salary:charles',
            label: '薪資 › Charles',
            amountText: 'NT$50,000',
            tone: 'detail',
            level: 2,
            children: [],
          },
        ],
      },
    ],
  },
  {
    key: 'total:income',
    label: '收入合計',
    amountText: 'NT$50,000',
    tone: 'subtotal',
    level: 0,
    children: [],
  },
  {
    key: 'terminus:netIncome',
    label: '本期淨利',
    amountText: 'NT$20,000',
    tone: 'terminus',
    level: 0,
    children: [],
  },
];

const renderTable = (overrides: Partial<React.ComponentProps<typeof StatementTable>> = {}) =>
  render(
    <StatementTable
      rows={rows}
      collapsed={new Set()}
      onToggle={vi.fn()}
      testId="statement-table"
      {...overrides}
    />,
  );

describe('StatementTable', () => {
  it('renders every row label and its amount, including nested rows', () => {
    renderTable();

    expect(screen.getByText('收入')).toBeInTheDocument();
    expect(screen.getByText('薪資')).toBeInTheDocument();
    expect(screen.getByText('薪資 › Charles')).toBeInTheDocument();
    expect(screen.getByText('收入合計')).toBeInTheDocument();
    expect(screen.getByText('本期淨利')).toBeInTheDocument();
    expect(screen.getAllByText('NT$50,000')).toHaveLength(3);
  });

  it('renders an empty amount cell for a row without an amount', () => {
    renderTable();

    const sectionRow = screen.getByText('收入').closest('tr');
    expect(sectionRow?.querySelectorAll('td')).toHaveLength(2);
    expect(sectionRow?.querySelectorAll('td')[1]?.textContent).toBe('');
  });

  it('renders a warning-coloured amount when the row is flagged', () => {
    renderTable({
      rows: [
        {
          key: 'drifted',
          label: '薪資',
          amountText: 'NT$40,000 -> NT$50,000',
          amountWarning: true,
          tone: 'group',
          level: 1,
          children: [],
        },
      ],
    });

    expect(screen.getByText('NT$40,000 -> NT$50,000').className).toContain('text-warning');
  });

  it('renders each semantic role with its distinguishing tone', () => {
    renderTable();

    // Section header label is a small-caps eyebrow and its row is tinted.
    expect(screen.getByText('收入').className).toContain('uppercase');
    expect(screen.getByText('收入').closest('tr')?.className).toContain('bg-muted/40');

    // A subtotal closes its block with a stronger top rule.
    expect(screen.getByText('收入合計').closest('tr')?.className).toContain('border-border-strong');

    // The terminus (final result) row is the tall emphasized row.
    expect(screen.getByText('本期淨利').closest('tr')?.className).toContain('h-16');
  });

  it('indents each row by its hierarchy level', () => {
    renderTable();

    // Level 0 (sections, totals, terminus) sits flush.
    expect(screen.getByText('收入').closest('div')?.className).not.toMatch(/pl-(4|8|12)/);
    // Level 1 (group) is one step in from the left edge.
    expect(screen.getByText('薪資').closest('div')?.className).toContain('pl-4');
    // Level 2 (detail) is one step further.
    expect(screen.getByText('薪資 › Charles').closest('div')?.className).toContain('pl-8');
  });

  it('hides children of a collapsed row and shows them when expanded', () => {
    const { rerender } = renderTable({ collapsed: new Set(['section:income']) });

    expect(screen.queryByText('薪資')).not.toBeInTheDocument();

    rerender(
      <StatementTable
        rows={rows}
        collapsed={new Set()}
        onToggle={vi.fn()}
        testId="statement-table"
      />,
    );

    expect(screen.getByText('薪資')).toBeInTheDocument();
  });

  it('reports the toggled row key and its expanded state', () => {
    const onToggle = vi.fn();
    renderTable({ onToggle });

    const chevron = screen.getByRole('button', { name: '收入' });
    expect(chevron).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(chevron);

    expect(onToggle).toHaveBeenCalledWith('section:income');
  });

  it('gives no chevron to a row without children', () => {
    renderTable();

    expect(screen.queryByRole('button', { name: '收入合計' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '本期淨利' })).not.toBeInTheDocument();
  });
});
