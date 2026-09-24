import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./isUserAuthorizedUseCase', () => ({
  isUserAuthorizedUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { isUserMember: vi.fn() },
}));

import { householdPermissionService } from '@/application/household/householdPermissionService';

import { authorizeRouteAccessUseCase } from './authorizeRouteAccessUseCase';
import { isUserAuthorizedUseCase } from './isUserAuthorizedUseCase';

const request = {
  email: 'user@example.com',
  uid: 'user-1',
  isAdmin: false,
  householdId: 'household-1',
  requireHousehold: false,
};

describe('authorizeRouteAccessUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(true);
    vi.mocked(householdPermissionService.isUserMember).mockResolvedValue(true);
  });

  it('allows a whitelisted user on a route that does not require a household', async () => {
    await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toEqual({
      outcome: 'allow',
    });
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('denies a user who is not on the app whitelist', async () => {
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(false);

    await expect(authorizeRouteAccessUseCase.execute(request)).resolves.toEqual({
      outcome: 'access-denied',
    });
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('forwards a missing email to the whitelist check rather than inventing one', async () => {
    vi.mocked(isUserAuthorizedUseCase.execute).mockResolvedValue(false);

    await expect(authorizeRouteAccessUseCase.execute({ ...request, email: null })).resolves.toEqual({
      outcome: 'access-denied',
    });
    expect(isUserAuthorizedUseCase.execute).toHaveBeenCalledWith({ email: null });
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('lets a global admin through without reading the whitelist or the household', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, isAdmin: true, requireHousehold: true }),
    ).resolves.toEqual({ outcome: 'allow' });
    expect(isUserAuthorizedUseCase.execute).not.toHaveBeenCalled();
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('allows a whitelisted household member onto a household route', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, requireHousehold: true }),
    ).resolves.toEqual({ outcome: 'allow' });
    expect(householdPermissionService.isUserMember).toHaveBeenCalledWith('household-1', 'user-1');
  });

  it('sends a whitelisted user without a household to onboarding', async () => {
    await expect(
      authorizeRouteAccessUseCase.execute({
        ...request,
        householdId: null,
        requireHousehold: true,
      }),
    ).resolves.toEqual({ outcome: 'onboarding' });
    expect(householdPermissionService.isUserMember).not.toHaveBeenCalled();
  });

  it('sends a whitelisted user who is not a household member to onboarding', async () => {
    vi.mocked(householdPermissionService.isUserMember).mockResolvedValue(false);

    await expect(
      authorizeRouteAccessUseCase.execute({ ...request, requireHousehold: true }),
    ).resolves.toEqual({ outcome: 'onboarding' });
  });
});
