import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLedgerCodes } from './useLedgerCodes';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/application/ledger/use_cases/listCustomLedgerCodesUseCase', () => ({
  listCustomLedgerCodesUseCase: {
    execute: vi.fn(),
  },
}));

describe('useLedgerCodes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('../../infra/contexts/useAuth');
    const { listCustomLedgerCodesUseCase } = await import(
      '../../application/ledger/use_cases/listCustomLedgerCodesUseCase'
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

    vi.mocked(listCustomLedgerCodesUseCase.execute).mockResolvedValue([
      {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isActive: true,
      },
    ] as never);
  });

  it('loads system codes and active custom codes by default', async () => {
    const { listCustomLedgerCodesUseCase } = await import(
      '../../application/ledger/use_cases/listCustomLedgerCodesUseCase'
    );

    const { result } = renderHook(() => useLedgerCodes());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(listCustomLedgerCodesUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      includeInactive: false,
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
    });
    expect(result.current.codes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'expense:travel', label: '差旅費', isCustom: true }),
        expect.objectContaining({ code: 'asset:cash', isCustom: false, isActive: true }),
      ]),
    );
  });

  it('passes includeInactive to the use case when requested', async () => {
    const { listCustomLedgerCodesUseCase } = await import(
      '../../application/ledger/use_cases/listCustomLedgerCodesUseCase'
    );

    renderHook(() => useLedgerCodes(true));

    await waitFor(() => {
      expect(listCustomLedgerCodesUseCase.execute).toHaveBeenCalledWith(
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
