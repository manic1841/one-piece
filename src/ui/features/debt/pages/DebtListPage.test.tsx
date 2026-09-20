import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

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
    expect(screen.getByText('Mortgage A')).toBeInTheDocument();
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

    fireEvent.click(screen.getByText('Mortgage A'));
    expect(navigate).toHaveBeenCalledWith('/debt/d1');
  });
});
