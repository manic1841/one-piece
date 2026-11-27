import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';

import { withReadPermission } from './readGuard';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: {
    assertReadPermission: vi.fn(),
  },
}));

const auth = { uid: 'user-1', isGlobalAdmin: false };

describe('withReadPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertReadPermission).mockResolvedValue(undefined);
  });

  it('starts the read without waiting for the permission check', async () => {
    const order: string[] = [];
    vi.mocked(householdPermissionService.assertReadPermission).mockImplementation(async () => {
      order.push('permission');
    });

    await withReadPermission('household-1', auth, async () => {
      order.push('read');
      return 'data';
    });

    expect(order).toEqual(['permission', 'read']);
    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith(
      'household-1',
      'user-1',
      false,
    );
  });

  it('returns the read result when both succeed', async () => {
    await expect(withReadPermission('household-1', auth, async () => 'data')).resolves.toBe('data');
  });

  it('surfaces the permission error ahead of a data error', async () => {
    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValue(
      new Error('Permission denied: not a member'),
    );

    await expect(
      withReadPermission('household-1', auth, async () => {
        throw new Error('permission-denied: missing or insufficient permissions');
      }),
    ).rejects.toThrow('Permission denied: not a member');
  });

  it('rethrows the data error when permission passes', async () => {
    await expect(
      withReadPermission('household-1', auth, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('throws the permission error even when the read succeeds', async () => {
    vi.mocked(householdPermissionService.assertReadPermission).mockRejectedValue(
      new Error('Permission denied'),
    );

    await expect(withReadPermission('household-1', auth, async () => 'data')).rejects.toThrow(
      'Permission denied',
    );
  });

  it('skips the check for callers that already authorized the household', async () => {
    await expect(
      withReadPermission('household-1', auth, async () => 'data', { skipPermissionCheck: true }),
    ).resolves.toBe('data');

    expect(householdPermissionService.assertReadPermission).not.toHaveBeenCalled();
  });
});
