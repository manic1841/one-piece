import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

import { invalidateRouteAccessCache } from '../routeAccessCache';
import { authorizeRouteAccessUseCase } from './authorizeRouteAccessUseCase';
import { isUserAuthorizedUseCase } from './isUserAuthorizedUseCase';

vi.mock('./isUserAuthorizedUseCase', () => ({
  isUserAuthorizedUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { isUserMember: vi.fn() },
}));

const member: AuthContext = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };

const request = {
  auth: member,
  householdId: 'household-1',
  requireHousehold: false,
};

describe('authorizeRouteAccessUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateRouteAccessCache();
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(true);
    vi.mocked(householdPermissionService.isUserMember).mockResolvedValue(true);
  });

  it('allows a whitelisted user on a route that does not require a household', async () => {
    await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('allow');
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('denies a user who is not on the app whitelist', async () => {
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(false);

    await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('access-denied');
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('forwards a missing email to the whitelist check rather than inventing one', async () => {
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(false);

    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, auth: { uid: 'user-1' } }),
    ).resolves.toBe('access-denied');
    expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledWith({ email: null });
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('lets a global admin skip the whitelist on a plain route', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({
        ...request,
        auth: { ...member, isGlobalAdmin: true },
      }),
    ).resolves.toBe('allow');
    expect(isUserAuthorizedUseCase.execute).not.toHaveBeenCalled();
  });

  it('lets a global admin skip the membership check on a household route', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({
        ...request,
        auth: { ...member, isGlobalAdmin: true },
        requireHousehold: true,
      }),
    ).resolves.toBe('allow');
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('sends a global admin with no household to onboarding, since they have nowhere to land', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({
        ...request,
        auth: { ...member, isGlobalAdmin: true },
        householdId: null,
        requireHousehold: true,
      }),
    ).resolves.toBe('onboarding');
  });

  it('allows a whitelisted household member onto a household route', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, requireHousehold: true }),
    ).resolves.toBe('allow');
    expect(householdPermissionService.isUserMember).toHaveBeenCalledWith('household-1', 'user-1');
  });

  it('sends a whitelisted user without a household to onboarding', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({
        ...request,
        householdId: null,
        requireHousehold: true,
      }),
    ).resolves.toBe('onboarding');
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('sends a whitelisted user who is not a household member to onboarding', async () => {
    vi.mocked(householdPermissionService.isUserMember).mockResolvedValue(false);

    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, requireHousehold: true }),
    ).resolves.toBe('onboarding');
  });

  describe('decision reuse', () => {
    it('reuses a decision for the same inputs instead of re-reading', async () => {
      await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('allow');
      await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('allow');

      expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('decides once across six navigations without logging errors', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        for (let navigation = 0; navigation < 6; navigation += 1) {
          await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('allow');
        }

        expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(1);
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });

    it('keeps separate slots per household, so switching households re-reads', async () => {
      await authorizeRouteAccessUseCase.execute({ ...request, requireHousehold: true });
      await authorizeRouteAccessUseCase.execute({
        ...request,
        householdId: 'household-2',
        requireHousehold: true,
      });

      expect(householdPermissionService.isUserMember).toHaveBeenCalledTimes(2);
      expect(householdPermissionService.isUserMember).toHaveBeenLastCalledWith(
        'household-2',
        'user-1',
      );
    });

    it('keeps separate slots per user', async () => {
      await authorizeRouteAccessUseCase.execute(request);
      await authorizeRouteAccessUseCase.execute({
        ...request,
        auth: { uid: 'user-2', email: 'other@example.com', isGlobalAdmin: false },
      });

      expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('re-reads after the cache is invalidated', async () => {
      await authorizeRouteAccessUseCase.execute(request);
      invalidateRouteAccessCache();
      await authorizeRouteAccessUseCase.execute(request);

      expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(2);
    });

    it('shares one read between concurrent calls for the same inputs', async () => {
      const [first, second] = await Promise.all([
        authorizeRouteAccessUseCase.execute(request),
        authorizeRouteAccessUseCase.execute(request),
      ]);

      expect([first, second]).toEqual(['allow', 'allow']);
      expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('re-reads once the decision outlives its TTL', async () => {
      const now = vi.spyOn(Date, 'now');
      try {
        now.mockReturnValue(1_000);
        await authorizeRouteAccessUseCase.execute(request);

        now.mockReturnValue(1_000 + 30_000);
        await authorizeRouteAccessUseCase.execute(request);

        expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledTimes(2);
      } finally {
        now.mockRestore();
      }
    });

    it('does not reuse a failed decision', async () => {
      vi.mocked(isUserAuthorizedUseCase.execute).mockRejectedValueOnce(new Error('offline'));

      await expect(authorizeRouteAccessUseCase.execute(request)).rejects.toThrow('offline');
      await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toBe('allow');
    });
  });
});
