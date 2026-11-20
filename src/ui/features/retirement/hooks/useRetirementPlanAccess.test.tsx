import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuthState } from '@/ui/contexts/useAuthState';

import { useRetirementPlanAccess } from './useRetirementPlanAccess';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { isUserAdmin: vi.fn() },
}));

const mockUseAuth = vi.mocked(useAuthState);
const mockIsAdmin = vi.mocked(householdPermissionService.isUserAdmin);

const auth = (isAdmin = false) =>
  ({
    user: { uid: 'u1' },
    userProfile: { householdId: 'h1' },
    isAdmin,
  }) as never;

describe('useRetirementPlanAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants management to a household admin', async () => {
    mockUseAuth.mockReturnValue(auth());
    mockIsAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useRetirementPlanAccess('h1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canManage).toBe(true);
    expect(mockIsAdmin).toHaveBeenCalledWith('h1', 'u1');
  });

  it('denies management to a regular member', async () => {
    mockUseAuth.mockReturnValue(auth());
    mockIsAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useRetirementPlanAccess('h1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canManage).toBe(false);
  });

  it('grants management to a global admin without reading the household role', async () => {
    mockUseAuth.mockReturnValue(auth(true));

    const { result } = renderHook(() => useRetirementPlanAccess('h1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canManage).toBe(true);
    expect(mockIsAdmin).not.toHaveBeenCalled();
  });

  it('denies management when no household is selected', async () => {
    mockUseAuth.mockReturnValue(auth());

    const { result } = renderHook(() => useRetirementPlanAccess(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.canManage).toBe(false);
  });
});
