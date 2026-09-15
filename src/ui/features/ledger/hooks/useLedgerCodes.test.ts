import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLedgerCodes } from './useLedgerCodes';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/application/ledger/use_cases/listAllLedgerCodesUseCase', () => ({
  listAllLedgerCodesUseCase: {
    execute: vi.fn(),
  },
}));

describe('useLedgerCodes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('../../../../infra/contexts/useAuth');
    const { listAllLedgerCodesUseCase } = await import(
      '../../../../application/ledger/use_cases/listAllLedgerCodesUseCase'
    );

    vi.mocked(useAuth).mockReturnValue({
      userProfile: { householdId: 'household-1' },
      currentUser: { uid: 'user-1', email: 'user@example.com' },
      isAdmin: false,
      loading: false,
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
      refreshProfile: vi.fn(),
    } as never);

    vi.mocked(listAllLedgerCodesUseCase.execute).mockResolvedValue([
      {
        code: 'asset:cash',
        label: '現金與銀行存款',
        type: 'asset',
        isCustom: false,
        isActive: true,
      },
      {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isCustom: true,
        isActive: true,
      },
    ]);
  });

  it('loads the merged ledger code list and passes the label resolver', async () => {
    const { listAllLedgerCodesUseCase } = await import(
      '../../../../application/ledger/use_cases/listAllLedgerCodesUseCase'
    );

    const { result } = renderHook(() => useLedgerCodes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(listAllLedgerCodesUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      includeInactive: false,
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      labelResolver: expect.any(Function),
    });
    expect(result.current.codes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'asset:cash', label: '現金與銀行存款', isCustom: false }),
        expect.objectContaining({ code: 'expense:travel', label: '差旅費', isCustom: true }),
      ]),
    );
  });

  it('passes includeInactive to the use case when requested', async () => {
    const { listAllLedgerCodesUseCase } = await import(
      '../../../../application/ledger/use_cases/listAllLedgerCodesUseCase'
    );

    renderHook(() => useLedgerCodes(true));

    await waitFor(() => {
      expect(listAllLedgerCodesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ includeInactive: true }),
      );
    });
  });

  it('falls back to the default ledger label when a code is not loaded', async () => {
    const { result } = renderHook(() => useLedgerCodes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.getLabel('expense:unknown')).toBe('expense:unknown');
  });
});
