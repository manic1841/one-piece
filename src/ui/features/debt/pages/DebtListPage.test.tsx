import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DEBT_STATUS_GRACE_PERIOD_LABEL } from '@/ui/constants/debtStatusLabels';
import { useDebtPage } from '@/ui/features/debt/hooks/useDebtPage';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { type DebtAccountDisplayVM } from '@/ui/features/debt/viewmodels/debtDisplay.vm';

vi.mock('@/ui/features/debt/hooks/useDebtPage');
vi.mock('@/ui/features/debt/hooks/useDebtAccountCmds');
vi.mock('@/ui/features/app/confirm/ConfirmDialog');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseDebtPage = vi.mocked(useDebtPage);
const mockUseDebtAccountCmds = vi.mocked(useDebtAccountCmds);
const mockUseConfirm = vi.mocked(useConfirm);
const mockUseNavigate = vi.mocked(useNavigate);

import DebtListPage from './DebtListPage';

const buildDebtVM = (overrides: Partial<DebtAccountDisplayVM> = {}): DebtAccountDisplayVM => ({
  id: 'd1',
  name: 'Mortgage A',
  type: 'mortgage',
  originalAmount: 5000000,
  currentBalance: 4800000,
  interestRate: 2.1,
  monthlyPayment: 25000,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2044-01-01'),
  isActive: true,
  linkedProjectId: null,
  closedAt: null,
  graceEndDate: null,
  payoffDate: new Date('2044-01-01'),
  repaidPercent: 4,
  projectName: null,
  typeLabel: '房貸',
  inGracePeriod: false,
  graceEndYearMonthText: '',
  monthlyDueAmount: 25000,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2026-09-01'),
  ...overrides,
} as DebtAccountDisplayVM);

const controllerBase = {
  loading: false,
  error: null,
  debtAccountViews: [buildDebtVM()],
  projects: [],
  totalDebt: 4800000,
  totalMonthlyPayment: 25000,
  getPaymentHistory: vi.fn().mockResolvedValue([]),
  reload: vi.fn(),
};

describe('DebtListPage table', () => {
  it('renders summary and Loan Name | Type | Outstanding Balance | Monthly Payment | As of columns', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loan Name')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Outstanding Balance')).toBeInTheDocument();
    expect(screen.getByText('Monthly Payment')).toBeInTheDocument();
    expect(screen.getByText('As of')).toBeInTheDocument();
    expect(screen.getAllByText('Mortgage A').length).toBe(2);
  });

  it('does not render persistent edit or delete actions in list rows', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByTitle('編輯')).not.toBeInTheDocument();
    expect(screen.queryByTitle('停用/刪除')).not.toBeInTheDocument();
    expect(screen.queryByText('✏️')).not.toBeInTheDocument();
    expect(screen.queryByText('🗑')).not.toBeInTheDocument();
  });

  it('navigates to the debt detail page on row click', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('debt-row-d1'));
    expect(navigate).toHaveBeenCalledWith('/debt/d1');
  });

  it('renders the settled filter as a compact text toggle next to the total outstanding summary', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole('button', { name: '顯示已結清' });
    expect(toggle.hasAttribute('title')).toBe(false);

    const summary = screen.getByText('TOTAL OUTSTANDING').parentElement!;
    expect(summary.contains(toggle)).toBe(true);

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '隱藏已結清' })).toBeInTheDocument();
  });

  it('renders the grace period status as a glyph + text status, not a colored badge', () => {
    mockUseDebtPage.mockReturnValue({
      ...controllerBase,
      debtAccountViews: [buildDebtVM({ inGracePeriod: true })],
    });
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    const status = screen.getAllByText(DEBT_STATUS_GRACE_PERIOD_LABEL).map((label) =>
      label.closest('span')!.parentElement!,
    );
    expect(status.length).toBe(2);
    status.forEach((glyph) => {
      expect(glyph.textContent).toContain('!');
      expect(glyph.querySelector('.text-warning')).not.toBeNull();
    });
    const nameCells = screen
      .getAllByText('Mortgage A')
      .map((name) => name.closest('td'))
      .filter((cell): cell is HTMLElement => cell !== null);
    expect(nameCells.length).toBeGreaterThanOrEqual(1);
    nameCells.forEach((cell) => {
      expect(cell.querySelector('span.bg-destructive')).toBeNull();
    });
  });

  it('hides settled loans by default and reveals them via the toggle without changing data', () => {
    mockUseDebtPage.mockReturnValue({
      ...controllerBase,
      debtAccountViews: [
        buildDebtVM({ id: 'd1', name: 'Active Loan', isActive: true }),
        buildDebtVM({ id: 'd2', name: 'Settled Loan', isActive: false, currentBalance: 0 }),
      ],
      totalDebt: 4800000,
    });
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('TOTAL OUTSTANDING')).toBeInTheDocument();
    expect(screen.queryAllByText('Settled Loan')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '顯示已結清' }));

    expect(screen.getAllByText('Settled Loan')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '隱藏已結清' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('debt-row-d2'));
    expect(navigate).toHaveBeenCalledWith('/debt/d2');

    fireEvent.click(screen.getByRole('button', { name: '隱藏已結清' }));
    expect(screen.queryAllByText('Settled Loan')).toHaveLength(0);
  });

  it('renders mobile compact rows with name + outstanding, type/monthly/as-of metadata', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    const compactRow = screen.getByTestId('debt-row-mobile-d1');
    expect(compactRow.className).toContain('md:hidden');
    expect(compactRow.textContent).toContain('Mortgage A');
    expect(compactRow.textContent).toContain('4,800,000');
    expect(compactRow.textContent).toContain('房貸');
    expect(compactRow.textContent).toContain('25,000');
    expect(compactRow.textContent).toContain('截至');

    fireEvent.click(compactRow);
    expect(navigate).toHaveBeenCalledWith('/debt/d1');
  });

  it('keeps the desktop table hidden on mobile with md:hidden table + mobile list', () => {
    mockUseDebtPage.mockReturnValue(controllerBase);
    mockUseDebtAccountCmds.mockReturnValue({ removeDebtAccount: vi.fn() } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseNavigate.mockReturnValue(vi.fn());

    const { container } = render(
      <MemoryRouter>
        <DebtListPage />
      </MemoryRouter>,
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table!.className).toContain('hidden');
    expect(table!.className).toContain('md:table');
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });
});
