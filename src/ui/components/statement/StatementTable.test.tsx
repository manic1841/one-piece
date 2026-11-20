import { fireEvent, render, screen, within } from '@testing-library/react';
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

/**
 * The table's narrow-screen representation duplicates every row, so the
 * desktop-structure assertions have to read the table element, not the whole
 * render tree.
 */
const desktop = () => within(screen.getByTestId('statement-table'));
const mobileList = () => screen.getByTestId('statement-table-mobile');

describe('StatementTable', () => {
  it('renders every row label and its amount, including nested rows', () => {
    renderTable();

    expect(desktop().getByText('收入')).toBeInTheDocument();
    expect(desktop().getByText('薪資')).toBeInTheDocument();
    expect(desktop().getByText('薪資 › Charles')).toBeInTheDocument();
    expect(desktop().getByText('收入合計')).toBeInTheDocument();
    expect(desktop().getByText('本期淨利')).toBeInTheDocument();
    expect(desktop().getAllByText('NT$50,000')).toHaveLength(3);
  });

  it('renders an empty amount cell for a row without an amount', () => {
    renderTable();

    const sectionRow = desktop().getByText('收入').closest('tr');
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

    expect(desktop().getByText('NT$40,000 -> NT$50,000').className).toContain('text-warning');
  });

  it('renders each semantic role with its distinguishing tone', () => {
    renderTable();

    // Section header label is a small-caps eyebrow and its row is tinted.
    expect(desktop().getByText('收入').className).toContain('uppercase');
    expect(desktop().getByText('收入').closest('tr')?.className).toContain('bg-muted/40');

    // A subtotal closes its block with a stronger top rule.
    expect(desktop().getByText('收入合計').closest('tr')?.className).toContain(
      'border-border-strong',
    );

    // The terminus (final result) row is the tall emphasized row, in primary;
    // the row height is content-driven now, so the height lives on its cells.
    const terminusRow = desktop().getByText('本期淨利').closest('tr');
    expect(terminusRow?.querySelector('td > div > div')?.className).toContain('min-h-16');
    expect(terminusRow?.className).toContain('border-primary');
    expect(desktop().getByText('本期淨利').className).toContain('text-primary');
  });

  it('indents each row by its hierarchy level', () => {
    renderTable();

    // Level 0 (sections, totals, terminus) sits flush.
    expect(desktop().getByText('收入').closest('div')?.className).not.toMatch(/pl-(4|8|12)/);
    // Level 1 (group) is one step in from the left edge.
    expect(desktop().getByText('薪資').closest('div')?.className).toContain('pl-4');
    // Level 2 (detail) is one step further.
    expect(desktop().getByText('薪資 › Charles').closest('div')?.className).toContain('pl-8');
  });

  it('collapses children of a collapsed row without unmounting them', () => {
    const { rerender } = renderTable({ collapsed: new Set(['section:income']) });

    // The subtree stays mounted so the collapse can animate out (M05).
    const collapsedRow = desktop().getByText('薪資').closest('tr');
    expect(collapsedRow).toHaveAttribute('data-state', 'closed');
    expect(collapsedRow?.className).not.toContain('h-[54px]');
    // Grandchildren inherit the hidden state, not just direct children.
    const hiddenCell = desktop().getByText('薪資').closest('td')?.firstElementChild;
    expect(hiddenCell).toHaveAttribute('inert');
    expect(desktop().getByText('薪資 › Charles').closest('tr')).toHaveAttribute(
      'data-state',
      'closed',
    );

    rerender(
      <StatementTable
        rows={rows}
        collapsed={new Set()}
        onToggle={vi.fn()}
        testId="statement-table"
      />,
    );

    const expandedRow = desktop().getByText('薪資').closest('tr');
    expect(expandedRow).toHaveAttribute('data-state', 'open');
    expect(expandedRow).not.toHaveAttribute('inert');
  });

  it('pairs the expand and collapse animations on each cell (M05)', () => {
    renderTable();

    const cell = desktop().getByText('收入').closest('td')?.firstElementChild;
    expect(cell?.className).toContain('data-[state=closed]:animate-disclosure-up');
    expect(cell?.className).toContain('data-[state=open]:animate-disclosure-down');
    // Height must be the interpolable keyword pair, not the row's fixed 54px.
    expect(cell?.className).toContain('data-[state=closed]:h-0');
    expect(cell?.className).toContain('data-[state=open]:h-auto');
    expect(cell?.className).toContain('interpolate-size:allow-keywords');
  });

  it('reports the toggled row key and its expanded state', () => {
    const onToggle = vi.fn();
    renderTable({ onToggle });

    const chevron = desktop().getByRole('button', { name: '收入' });
    expect(chevron).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(chevron);

    expect(onToggle).toHaveBeenCalledWith('section:income');
  });

  it('gives no chevron to a row without children', () => {
    renderTable();

    expect(desktop().queryByRole('button', { name: '收入合計' })).not.toBeInTheDocument();
    expect(desktop().queryByRole('button', { name: '本期淨利' })).not.toBeInTheDocument();
  });

  it("restores the terminus rules that TableBody's last-child reset would zero", () => {
    renderTable();

    const table = screen.getByTestId('statement-table');
    // Top matches the shared frame's neutral 1px line, so restore the terminus's
    // heavier 2px top; the bottom is the table's frame line, bumped to 2px so the
    // terminus is framed symmetrically (colour comes from the row's border-primary).
    expect(table.className).toContain('[&_tbody>tr:last-child]:border-t-2');
    expect(table.className).toContain('[&_tbody>tr:last-child]:border-b-2');
    // The last row is the terminus row and keeps its top rule class.
    expect(desktop().getByText('本期淨利').closest('tr')?.className).toContain('border-t-2');
  });
});

describe('StatementTable mobile list', () => {
  it('swaps the fixed table for a list below md, and back above it', () => {
    renderTable();

    expect(mobileList().className).toContain('md:hidden');
    // Above md the table enters the shared scroll area, which owns the md:block switch.
    const scrollArea = screen.getByTestId('statement-table').closest('div[class*="md:block"]');
    expect(scrollArea).not.toBeNull();
    expect(scrollArea?.className).toContain('overflow-x-auto');
  });

  it('renders the same rows, indentation and amounts as the table', () => {
    renderTable();

    expect(within(mobileList()).getByText('薪資 › Charles')).toBeInTheDocument();
    expect(within(mobileList()).getByText('薪資').closest('div[class*="pl-4"]')).not.toBeNull();
    expect(
      within(mobileList()).getByText('薪資 › Charles').closest('div[class*="pl-8"]'),
    ).not.toBeNull();
  });

  it('keeps the terminus emphasized in the list', () => {
    renderTable();

    const label = within(mobileList()).getByText('本期淨利');
    expect(label.className).toContain('text-primary');
    // The frame rule only reaches `tbody`; the list has to carry both 2px rules itself.
    const row = label.closest('[data-state]');
    expect(row?.className).toContain('border-t-2');
    expect(row?.className).toContain('border-b-2');
    expect(row?.className).toContain('border-primary');
  });

  it('gives the expand control a 44px hit area on both surfaces', () => {
    renderTable();

    const mobileChevron = within(mobileList()).getByRole('button', { name: '收入' });
    expect(mobileChevron.className).toContain('h-11');
    expect(mobileChevron.className).toContain('w-11');

    const desktopChevron = within(screen.getByTestId('statement-table')).getByRole('button', {
      name: '收入',
    });
    expect(desktopChevron.className).toContain('h-11');
    expect(desktopChevron.className).toContain('w-11');
  });

  it('prints the amount and its prepared second line on both surfaces', () => {
    renderTable({
      rows: [
        {
          key: 'drifted',
          label: '負債',
          amountText: 'NT$8,146,124',
          amountWarning: true,
          amountDetail: '期初 NT$8,199,124 → 期末 NT$8,146,124',
          tone: 'group',
          level: 1,
          children: [],
        },
      ],
    });

    const surfaces = [
      within(mobileList()).getByText('負債').closest('div')?.parentElement,
      within(screen.getByTestId('statement-table')).getByText('負債').closest('tr'),
    ];
    surfaces.forEach((surface) => {
      expect(surface?.textContent).toContain('NT$8,146,124');
      expect(surface?.textContent).toContain('期初 NT$8,199,124 → 期末 NT$8,146,124');
    });
  });

  it('collapses the children in the list, not only in the table', () => {
    renderTable({ collapsed: new Set(['section:income']) });

    const chevron = within(mobileList()).getByRole('button', { name: '收入' });
    expect(chevron).toHaveAttribute('aria-expanded', 'false');
    // The child row stays mounted for the motion, so the clip is what hides it.
    const child = within(mobileList()).getByText('薪資').closest('[data-state]');
    expect(child).toHaveAttribute('data-state', 'closed');
    expect(child?.className).toContain('data-[state=closed]:h-0');
    // The shell owns its own border and padding, so a closed row must shed both —
    // otherwise a collapsed branch keeps painting a rule and a gap under the clip.
    expect(child?.className).toContain('border-t-0');
    expect(child?.className).toContain('pt-0');
  });

  it('leaves no inter-row gap in the list, so closed rows cannot hold one open', () => {
    renderTable();

    expect(mobileList().className).toContain('space-y-0');
  });
});
