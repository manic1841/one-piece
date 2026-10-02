import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef, type SetStateAction, useState } from 'react';

import type { AccountBalanceInput } from '@/application/monthly_close/use_cases/monthlyCloseWorkflowUseCase';
import type { Account, AccountSnapshot } from '@/domains/account/types/account';

import { CloseAccountBalanceInputs } from './CloseAccountBalanceInputs';

vi.mock('@/ui/hooks/useExchangeRate', () => ({
  useExchangeRate: vi.fn(),
}));

beforeEach(async () => {
  const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
  vi.mocked(useExchangeRate).mockReturnValue({
    getRate: vi.fn().mockResolvedValue({ ok: false, kind: 'failed', error: new Error('no rate') }),
    loading: false,
    error: null,
    errorMessage: null,
  } as never);
});

const account = (overrides: Partial<Account> & { id: string; name: string }): Account =>
  ({
    category: 'cash',
    currency: 'TWD',
    order: 0,
    isActive: true,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Account;

const snapshot = (
  overrides: Partial<AccountSnapshot> & { id: string; accountId: string },
): AccountSnapshot =>
  ({
    year: 2026,
    month: 8,
    amount: 50000,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as AccountSnapshot;

const input = (
  overrides: Partial<AccountBalanceInput> & { accountId: string },
): AccountBalanceInput => ({
  amount: 0,
  ...overrides,
});

const renderSections = (
  overrides: {
    accounts?: Account[];
    snapshots?: Map<string, AccountSnapshot>;
    inputs?: AccountBalanceInput[];
    onInputsChange?: (inputs: AccountBalanceInput[]) => void;
  } = {},
) => {
  // Mirrors useSeededDraft: the callback observes the composed array, not the raw updater.
  const Harness = () => {
    const [inputs, setInputs] = useState<AccountBalanceInput[] | null>(overrides.inputs ?? []);
    const reportedRef = useRef<AccountBalanceInput[] | null>(overrides.inputs ?? null);

    const handleInputsChange = (updater: SetStateAction<AccountBalanceInput[] | null>): void => {
      setInputs((previous) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: AccountBalanceInput[] | null) => AccountBalanceInput[] | null)(
                previous,
              )
            : updater;
        reportedRef.current = next;
        return next;
      });
    };

    useEffect(() => {
      if (reportedRef.current !== null) overrides.onInputsChange?.(reportedRef.current);
    });

    return (
      <CloseAccountBalanceInputs
        accounts={overrides.accounts ?? [account({ id: 'cash-1', name: '現金帳戶' })]}
        snapshots={overrides.snapshots ?? new Map()}
        inputs={inputs}
        onInputsChange={handleInputsChange}
      />
    );
  };

  render(<Harness />);
};

describe('CloseAccountBalanceInputs', () => {
  it('renders TWD accounts with a read-only previous balance and an editable ending balance', () => {
    renderSections({
      accounts: [
        account({ id: 'cash-1', name: '現金帳戶' }),
        account({ id: 'bank-1', name: '台新銀行', category: 'bank' }),
      ],
      snapshots: new Map([
        ['cash-1', snapshot({ id: '2026-08', accountId: 'cash-1', amount: 50000 })],
      ]),
      inputs: [input({ accountId: 'cash-1', amount: 52000 })],
    });

    expect(screen.getByText('現金 / 銀行')).toBeInTheDocument();
    expect(screen.getAllByText('前期餘額').length).toBe(3);
    expect(screen.getAllByText('NT$50,000').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('期末餘額 現金帳戶')[0]).toHaveValue(52000);
    expect(screen.queryByText('WAITING')).toBeNull();
    expect(screen.queryByText('狀態')).toBeNull();
  });

  it('shows an em dash when the previous-month snapshot is missing', () => {
    renderSections();

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('submits a TWD ending balance edit as the account input', async () => {
    const onInputsChange = vi.fn<(inputs: AccountBalanceInput[]) => void>();
    renderSections({ onInputsChange });

    fireEvent.change(screen.getAllByLabelText('期末餘額 現金帳戶')[0], {
      target: { value: '52000' },
    });

    await waitFor(() => {
      expect(onInputsChange).toHaveBeenCalledWith([input({ accountId: 'cash-1', amount: 52000 })]);
    });
  });

  it('renders foreign accounts with amount, rate, and a calculated (non-input) TWD value', () => {
    renderSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
      snapshots: new Map([
        [
          'usd-1',
          snapshot({
            id: '2026-08',
            accountId: 'usd-1',
            amount: 312500,
            originalAmount: 10000,
            exchangeRate: 31.25,
          }),
        ],
      ]),
      inputs: [
        input({ accountId: 'usd-1', amount: 375000, originalAmount: 12000, exchangeRate: 31.25 }),
      ],
    });

    expect(screen.getByText('外幣')).toBeInTheDocument();
    expect(screen.getAllByText('前期餘額').length).toBeGreaterThan(0);
    expect(screen.getAllByText('US$10,000').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('外幣金額 USD Account')[0]).toHaveValue(12000);
    expect(screen.getAllByLabelText('匯率 USD Account').length).toBe(2);
    const twdValue = screen.getAllByTestId('twd-value-usd-1')[0].textContent ?? '';
    expect(twdValue).toContain('NT$375,000');
    expect(screen.queryByLabelText('TWD 價值')).toBeNull();
  });

  it('auto-fetches the exchange rate on mount and keeps manual input as fallback', async () => {
    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
    // Mirrors useLoadingTask.run: the writeBack carries the outcome.
    const getRate = vi.fn().mockImplementation(
      (
        _from: string,
        _to: string,
        options?: { writeBack?: (result: { ok: true; value: number }) => void },
      ) => {
        options?.writeBack?.({ ok: true, value: 31.4 });
        return Promise.resolve({ ok: true, value: 31.4 });
      },
    );
    vi.mocked(useExchangeRate).mockReturnValue({
      getRate,
      loading: false,
      error: null,
      errorMessage: null,
    } as never);

    const onInputsChange = vi.fn<(inputs: AccountBalanceInput[]) => void>();
    renderSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
      onInputsChange,
    });

    await waitFor(() => {
      expect(onInputsChange).toHaveBeenCalledWith([
        input({ accountId: 'usd-1', amount: 0, exchangeRate: 31.4 }),
      ]);
    });
    expect(getRate).toHaveBeenCalledWith('USD', 'TWD', expect.anything());
  });

  it('does not overwrite an existing exchange rate on mount', async () => {
    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
    const getRate = vi.fn().mockResolvedValue({ ok: true, value: 31.4 });
    vi.mocked(useExchangeRate).mockReturnValue({
      getRate,
      loading: false,
      error: null,
      errorMessage: null,
    } as never);

    renderSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
      inputs: [
        input({ accountId: 'usd-1', amount: 375000, originalAmount: 12000, exchangeRate: 31.25 }),
      ],
    });

    await waitFor(() => {
      expect(getRate).not.toHaveBeenCalled();
    });
  });

  it('renders securities accounts with a holdings table and an import button', () => {
    renderSections({
      accounts: [account({ id: 'sec-1', name: 'Securities Account', category: 'securities' })],
      snapshots: new Map([
        [
          'sec-1',
          snapshot({
            id: '2026-08',
            accountId: 'sec-1',
            amount: 710000,
            holdings: [
              { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
            ],
          }),
        ],
      ]),
      inputs: [
        input({
          accountId: 'sec-1',
          amount: 1680000,
          holdings: [
            { symbol: '2330', name: 'TSMC', cost: 620000, marketValue: 710000, leverage: 1 },
            { symbol: '0050', name: 'ETF', cost: 500000, marketValue: 560000, leverage: 1 },
          ],
        }),
      ],
    });

    expect(screen.getByText('證券')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '匯入上月持倉' })).toBeEnabled();
    expect(screen.getByText('Symbol')).toBeInTheDocument();
    expect(screen.getByText('市值')).toBeInTheDocument();
    expect(screen.getByText('NT$1,270,000')).toBeInTheDocument();
  });

  it('disables the import button when previous holdings are missing', () => {
    renderSections({
      accounts: [account({ id: 'sec-1', name: 'Securities Account', category: 'securities' })],
    });

    expect(screen.getByRole('button', { name: '匯入上月持倉' })).toBeDisabled();
  });

  it('shows exchange rate and calculated TWD value for non-TWD securities accounts', async () => {
    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
    const getRate = vi.fn().mockResolvedValue({ ok: true, value: 31.4 });
    vi.mocked(useExchangeRate).mockReturnValue({
      getRate,
      loading: false,
      error: null,
      errorMessage: null,
    } as never);

    renderSections({
      accounts: [
        account({ id: 'sec-usd', name: 'USD Brokerage', category: 'securities', currency: 'USD' }),
      ],
      inputs: [
        input({
          accountId: 'sec-usd',
          amount: 0,
          exchangeRate: 31.25,
          holdings: [
            { symbol: 'NVDA', name: 'NVIDIA', cost: 300000, marketValue: 410000, leverage: 1 },
          ],
        }),
      ],
    });

    expect(screen.getByLabelText('匯率 USD Brokerage')).toHaveValue(31.25);
    const twdValue = screen.getByText('TWD 價值').parentElement?.textContent ?? '';
    expect(twdValue).toContain('NT$12,812,500');
  });

  it('keeps inputs editable after the stage is completed', () => {
    renderSections({
      inputs: [input({ accountId: 'cash-1', amount: 52000 })],
    });

    expect(screen.getAllByLabelText('期末餘額 現金帳戶')[0]).toBeEnabled();
    expect(screen.queryByText('VERIFIED')).toBeNull();
    expect(screen.queryByText('WAITING')).toBeNull();
  });

  it('does not render an inline required hint for a TWD account without an ending balance', () => {
    renderSections();

    expect(screen.queryByText('需期末餘額')).toBeNull();
  });

  it('does not render an inline required hint for a foreign account without amount and rate', () => {
    renderSections({
      accounts: [account({ id: 'usd-1', name: 'USD Account', currency: 'USD' })],
    });

    expect(screen.queryByText('需金額與匯率')).toBeNull();
  });

  it('does not render a required hint once the inputs are present', () => {
    renderSections({
      inputs: [input({ accountId: 'cash-1', amount: 52000 })],
    });

    expect(screen.queryByText('需期末餘額')).toBeNull();
  });

  it('auto-fills every foreign account rate when responses land out of order', async () => {
    const { useExchangeRate } = await import('@/ui/hooks/useExchangeRate');
    const deferred: Array<{
      resolve: (rate: { ok: true; value: number }) => void;
      options?: { writeBack?: (result: { ok: true; value: number }) => void };
    }> = [];
    const getRate = vi.fn().mockImplementation(
      (_from: string, _to: string, options?: { writeBack?: (result: { ok: true; value: number }) => void }) => {
        return new Promise<{ ok: true; value: number }>((resolve) => {
          deferred.push({ resolve, options });
        });
      },
    );
    vi.mocked(useExchangeRate).mockReturnValue({
      getRate,
      loading: false,
      error: null,
      errorMessage: null,
    } as never);

    const onInputsChange = vi.fn<(inputs: AccountBalanceInput[]) => void>();
    renderSections({
      accounts: [
        account({ id: 'usd-1', name: 'USD Account', currency: 'USD' }),
        account({ id: 'jpy-1', name: 'JPY Account', currency: 'JPY' }),
        account({ id: 'eur-1', name: 'EUR Account', currency: 'EUR' }),
        account({ id: 'hkd-1', name: 'HKD Account', currency: 'HKD' }),
      ],
      onInputsChange,
    });

    await waitFor(() => expect(getRate).toHaveBeenCalledTimes(4));

    // Responses land in reverse order, the way real network timing does.
    act(() => {
      deferred[3].resolve({ ok: true, value: 4.05 });
      deferred[3].options?.writeBack?.({ ok: true, value: 4.05 });
    });
    act(() => {
      deferred[2].resolve({ ok: true, value: 35.2 });
      deferred[2].options?.writeBack?.({ ok: true, value: 35.2 });
    });
    act(() => {
      deferred[1].resolve({ ok: true, value: 0.21 });
      deferred[1].options?.writeBack?.({ ok: true, value: 0.21 });
    });
    act(() => {
      deferred[0].resolve({ ok: true, value: 31.4 });
      deferred[0].options?.writeBack?.({ ok: true, value: 31.4 });
    });

    await waitFor(() => {
      expect(onInputsChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ accountId: 'usd-1', exchangeRate: 31.4 }),
          expect.objectContaining({ accountId: 'jpy-1', exchangeRate: 0.21 }),
          expect.objectContaining({ accountId: 'eur-1', exchangeRate: 35.2 }),
          expect.objectContaining({ accountId: 'hkd-1', exchangeRate: 4.05 }),
        ]),
      );
    });
    expect(onInputsChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.anything(), expect.anything(), expect.anything(), expect.anything()]));
  });
});
