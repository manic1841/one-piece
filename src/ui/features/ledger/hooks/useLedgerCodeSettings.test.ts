import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLedgerCodeSettings } from './useLedgerCodeSettings';

vi.mock('@/ui/contexts/useAuthState', () => ({
  useAuthState: vi.fn(),
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

    const { useAuthState } = await import('../../../../ui/contexts/useAuthState');
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

    vi.mocked(useAuthState).mockReturnValue({
      userProfile: { householdId: 'household-1' },
      user: { uid: 'user-1', email: 'user@example.com' },
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
      result.current.setNewCode('food');
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
      result.current.setNewCode('travel');
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
      code: 'expense:travel',
      label: '差旅費',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.newCode).toBe('');
    expect(result.current.newLabel).toBe('');
    expect(result.current.error).toBe('');
  });

  it('creates a detail code under an existing category', async () => {
    const { useLedgerCodes } = await import('./useLedgerCodes');
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );

    vi.mocked(useLedgerCodes).mockReturnValue({
      codes: [
        {
          code: 'asset:property',
          label: '不動產',
          type: 'asset',
          isCustom: false,
          isActive: true,
        },
      ],
      loading: false,
      refresh,
      getLabel: vi.fn(),
    });

    const { result } = renderHook(() => useLedgerCodeSettings());

    act(() => {
      result.current.setNewType('asset');
      result.current.setNewCode('property:taipei');
      result.current.setNewLabel('台北房產');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(createCustomLedgerCodeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'asset:property:taipei', label: '台北房產' }),
    );
  });

  it('rejects a detail code whose parent does not exist and lists the usable categories', async () => {
    const { useLedgerCodes } = await import('./useLedgerCodes');
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );

    vi.mocked(useLedgerCodes).mockReturnValue({
      codes: [
        {
          code: 'asset:cash',
          label: '現金與銀行存款',
          type: 'asset',
          isCustom: false,
          isActive: true,
        },
      ],
      loading: false,
      refresh,
      getLabel: vi.fn(),
    });

    const { result } = renderHook(() => useLedgerCodeSettings());

    act(() => {
      result.current.setNewType('asset');
      result.current.setNewCode('property:taipei');
      result.current.setNewLabel('台北房產');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(result.current.error).toContain('父科目 asset:property 不存在');
    expect(result.current.error).toContain('asset:cash');
    expect(createCustomLedgerCodeUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a code that does not match the code shape', async () => {
    const { result } = renderHook(() => useLedgerCodeSettings());
    const { createCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/createCustomLedgerCodeUseCase'
    );

    act(() => {
      result.current.setNewType('expense');
      result.current.setNewCode('My Stuff');
      result.current.setNewLabel('亂七八糟');
    });

    await act(async () => {
      await result.current.handleAdd();
    });

    expect(result.current.error).toContain('科目代碼格式不正確');
    expect(createCustomLedgerCodeUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not deactivate a custom code that is already in use', async () => {
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
    expect(result.current.error).toBe('該科目已在交易中使用，無法停用。');
  });

  it('refuses to deactivate a category that still has active details', async () => {
    const { useLedgerCodes } = await import('./useLedgerCodes');
    const { checkLedgerCodeInUseUseCase } = await import(
      '../../../../application/ledger/use_cases/checkLedgerCodeInUseUseCase'
    );
    const { updateCustomLedgerCodeUseCase } = await import(
      '../../../../application/ledger/use_cases/updateCustomLedgerCodeUseCase'
    );

    vi.mocked(useLedgerCodes).mockReturnValue({
      codes: [
        {
          code: 'asset:property',
          label: '不動產',
          type: 'asset',
          isCustom: true,
          isActive: true,
        },
        {
          code: 'asset:property:taipei',
          label: '台北房產',
          type: 'asset',
          isCustom: true,
          isActive: true,
        },
      ],
      loading: false,
      refresh,
      getLabel: vi.fn(),
    });

    const { result } = renderHook(() => useLedgerCodeSettings());

    await act(async () => {
      await result.current.handleToggleActive({
        code: 'asset:property',
        isActive: true,
        isCustom: true,
      });
    });

    expect(result.current.error).toContain('請先停用它們');
    expect(checkLedgerCodeInUseUseCase.execute).not.toHaveBeenCalled();
    expect(updateCustomLedgerCodeUseCase.execute).not.toHaveBeenCalled();
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
