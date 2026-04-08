import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLedgerCodeSettings } from './useLedgerCodeSettings';

vi.mock('@/infra/contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/ui/features/ledger/hooks/useLedgerCodes', () => ({
  useLedgerCodes: vi.fn(),
}));

vi.mock('@/application/ledger/use_cases/createCustomLedgerCodeUseCase', () => ({
  createCustomLedgerCodeUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/ledger/use_cases/updateCustomLedgerCodeUseCase', () => ({
  updateCustomLedgerCodeUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/ledger/use_cases/checkLedgerCodeInUseUseCase', () => ({
  checkLedgerCodeInUseUseCase: {
    execute: vi.fn(),
  },
}));

describe('useLedgerCodeSettings', () => {
  const refresh = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('../../../../infra/contexts/useAuth');
    const { useLedgerCodes } = await import('./useLedgerCodes');
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );
    const { updateCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/updateCustomLedgerCodeUseCase'
    );
    const { checkLedgerCodeInUseUseCase } = await import(
      '../../../../application/ledger/use_cases/checkLedgerCodeInUseUseCase'
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

    vi.mocked(useLedgerCodes).mockReturnValue({
      codes: [
        {
          code: 'expense:food',
          label: '餐飲',
          type: 'expense',
          isCustom: false,
          isActive: true,
        },
      ],
      loading: false,
      refresh,
      getLabel: vi.fn(),
    });

    vi.mocked(createCustomLedgerCodeUseCase.execute).mockResolvedValue(undefined);
    vi.mocked(updateCustomLedgerCodeUseCase.execute).mockResolvedValue(undefined);
    vi.mocked(checkLedgerCodeInUseUseCase.execute).mockResolvedValue(false);
  });

  it('prevents adding duplicate ledger codes', async () => {
    const { result } = renderHook(() => useLedgerCodeSettings());
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );

    act(() => {
      result.current.setNewType('expense');
      result.current.setNewCategory('food');
      result.current.setNewLabel('重複餐飲');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(result.current.error).toBe('科目代碼 expense:food 已存在。');
    expect(createCustomLedgerCodeUseCase.execute).not.toHaveBeenCalled();
  });

  it('creates a custom ledger code and resets form fields', async () => {
    const { result } = renderHook(() => useLedgerCodeSettings());
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );

    act(() => {
      result.current.setNewType('expense');
      result.current.setNewCategory('travel');
      result.current.setNewLabel('差旅費');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(createCustomLedgerCodeUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      userEmail: 'user@example.com',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      data: {
        code: 'expense:travel',
        label: '差旅費',
        type: 'expense',
        isCustom: true,
        isActive: true,
        createdBy: 'user@example.com',
      },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.newCategory).toBe('');
    expect(result.current.newLabel).toBe('');
    expect(result.current.error).toBe('');
  });

  it('does not deactivate a custom code that is already in use', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const { result } = renderHook(() => useLedgerCodeSettings());
    const { checkLedgerCodeInUseUseCase } = await import(
      '../../../../application/ledger/use_cases/checkLedgerCodeInUseUseCase'
    );
    const { updateCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/updateCustomLedgerCodeUseCase'
    );

    vi.mocked(checkLedgerCodeInUseUseCase.execute).mockResolvedValue(true);

    await act(async () => {
      await result.current.handleToggleActive({
        code: 'expense:travel',
        isActive: true,
        isCustom: true,
      });
    });

    expect(checkLedgerCodeInUseUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      ledgerCode: 'expense:travel',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
    });
    expect(updateCustomLedgerCodeUseCase.execute).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('該科目已在交易中使用，無法停用。');

    alertSpy.mockRestore();
  });

  it('saves edited label and clears editing state', async () => {
    const { result } = renderHook(() => useLedgerCodeSettings());
    const { updateCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/updateCustomLedgerCodeUseCase'
    );

    act(() => {
      result.current.startEdit('expense:travel', '舊標籤');
      result.current.setEditValue('新標籤');
    });

    await act(async () => {
      await result.current.saveEdit();
    });

    expect(updateCustomLedgerCodeUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      ledgerCode: 'expense:travel',
      userEmail: 'user@example.com',
      auth: {
        uid: 'user-1',
        email: 'user@example.com',
        isGlobalAdmin: false,
      },
      data: { label: '新標籤' },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.editingCode).toBeNull();
      expect(result.current.editValue).toBe('');
    });
  });
});
