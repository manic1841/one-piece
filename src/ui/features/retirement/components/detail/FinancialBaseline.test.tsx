import { type ComponentProps } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';
import { RetirementBaselineLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';

import {
  type RetirementBaselineItem,
  mapRetirementExpenseToBaselineRow,
  mapRetirementIncomeToBaselineRow,
} from '../../viewmodels/retirementBaseline.vm';
import { FinancialBaseline } from './FinancialBaseline';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

const anchor = { currentYear: 2026, birthYear: 1986, retirementAge: 60, planInflationRate: 2 };

const incomeItem = (): RetirementBaselineItem => ({
  kind: 'income',
  domain: {
    id: 'i1',
    name: '薪資',
    type: 'salary',
    lifelong: false,
    startYear: 2026,
    endYear: 2046,
    currentAnnual: 120000,
    growthRate: 2,
    incomeCategory: 'income:salary',
  },
  vm: mapRetirementIncomeToBaselineRow(
    {
      id: 'i1',
      name: '薪資',
      type: 'salary',
      lifelong: false,
      startYear: 2026,
      endYear: 2046,
      currentAnnual: 120000,
      growthRate: 2,
      incomeCategory: 'income:salary',
    },
    2046,
  ),
});

const debtItem = (): RetirementBaselineItem => ({
  kind: 'expense',
  domain: {
    id: 'd1',
    name: '房貸',
    type: 'debt_payment',
    sourceDebtAccountId: 'debt-1',
    includesPrincipal: true,
    interestOnly: false,
    currentAnnual: 240000,
    retirementMultiplier: 1,
    startYear: 2026,
    endYear: 2035,
  },
  vm: mapRetirementExpenseToBaselineRow(
    {
      id: 'd1',
      name: '房貸',
      type: 'debt_payment',
      sourceDebtAccountId: 'debt-1',
      includesPrincipal: true,
      interestOnly: false,
      currentAnnual: 240000,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: 2035,
    },
    2046,
  ),
});

const legacyItem = (): RetirementBaselineItem => ({
  kind: 'income',
  domain: {
    id: 'i2',
    name: 'Legacy',
    type: 'other',
    lifelong: true,
    startYear: 2026,
    currentAnnual: null,
  },
  vm: mapRetirementIncomeToBaselineRow(
    {
      id: 'i2',
      name: 'Legacy',
      type: 'other',
      lifelong: true,
      startYear: 2026,
      currentAnnual: null,
    },
    2046,
  ),
});

function renderBaseline(overrides: Partial<ComponentProps<typeof FinancialBaseline>> = {}) {
  const props = {
    ...anchor,
    items: [incomeItem(), debtItem()],
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onImportFromLedger: vi.fn(),
    onImportDebtRepayments: vi.fn(),
    onUpdateIncome: vi.fn().mockResolvedValue(undefined),
    onUpdateExpense: vi.fn().mockResolvedValue(undefined),
    onDeleteIncome: vi.fn().mockResolvedValue(undefined),
    onDeleteExpense: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ConfirmDialogProvider>
      <FinancialBaseline {...props} />
    </ConfirmDialogProvider>,
  );
  return props;
}

describe('FinancialBaseline', () => {
  it('renders the six baseline columns', () => {
    renderBaseline();

    expect(screen.getByText(L.columnName)).toBeInTheDocument();
    expect(screen.getByText(L.columnSource)).toBeInTheDocument();
    expect(screen.getByText(L.columnBaseAmount)).toBeInTheDocument();
    expect(screen.getByText(L.columnGrowth)).toBeInTheDocument();
    expect(screen.getByText(L.columnEndCondition)).toBeInTheDocument();
    expect(screen.getByText(L.columnActions)).toBeInTheDocument();
  });

  it('renders a row with its source, derived amount, growth and end condition', () => {
    renderBaseline();

    const row = screen.getByTestId('baseline-row-i1');
    expect(within(row).getByText('薪資')).toBeInTheDocument();
    expect(within(row).getByText('income:salary')).toBeInTheDocument();
    expect(within(row).getByText(/120,000/)).toBeInTheDocument();
    expect(within(row).getByText('2% growth')).toBeInTheDocument();
    expect(within(row).getByText('退休時結束')).toBeInTheDocument();
  });

  it('renders desktop rows before the mobile list, with distinct testids', () => {
    renderBaseline();

    const desktop = screen.getByTestId('baseline-row-i1');
    const mobile = screen.getByTestId('baseline-row-mobile-i1');
    expect(desktop.compareDocumentPosition(mobile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows only delete (no edit) for a row with no import source', () => {
    renderBaseline({ items: [legacyItem()] });

    const row = screen.getByTestId('baseline-row-i2');
    expect(within(row).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('wires the toolbar import actions', () => {
    const props = renderBaseline();

    fireEvent.click(screen.getByRole('button', { name: 'Import from Ledger' }));
    fireEvent.click(screen.getByRole('button', { name: '匯入債務還款' }));

    expect(props.onImportFromLedger).toHaveBeenCalledTimes(1);
    expect(props.onImportDebtRepayments).toHaveBeenCalledTimes(1);
  });

  it('narrows rows through the filter strip and shows a filter-empty state', () => {
    renderBaseline({ items: [incomeItem()] });

    fireEvent.click(screen.getByRole('button', { name: '債務' }));

    expect(screen.queryByTestId('baseline-row-i1')).not.toBeInTheDocument();
    expect(screen.getByText(L.filterEmptyTitle)).toBeInTheDocument();
  });

  it('points the empty state primary CTA at Import from Ledger', () => {
    const props = renderBaseline({ items: [] });

    const empty = screen.getByText(L.emptyTitle).closest('div') as HTMLElement;
    fireEvent.click(within(empty).getByRole('button', { name: 'Import from Ledger' }));

    expect(props.onImportFromLedger).toHaveBeenCalledTimes(1);
  });

  it('deletes a row without a confirm modal', () => {
    const props = renderBaseline();

    const row = screen.getByTestId('baseline-row-i1');
    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    expect(props.onDeleteIncome).toHaveBeenCalledWith('i1');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('exposes a loading state', () => {
    renderBaseline({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('exposes an error state with a retry action', () => {
    const props = renderBaseline({ error: new Error('boom') });

    fireEvent.click(screen.getByRole('button', { name: L.retryAction }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });
});
