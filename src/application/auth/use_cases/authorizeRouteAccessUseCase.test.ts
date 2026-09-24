import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./isUserAuthorizedUseCase', () => ({
  isUserAuthorizedUseCase: { execute: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { isUserMember: vi.fn() },
}));

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';

import { authorizeRouteAccessUseCase } from './authorizeRouteAccessUseCase';
import { isUserAuthorizedUseCase } from './isUserAuthorizedUseCase';

const member: AuthContext = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };

const request = {
  auth: member,
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
});
