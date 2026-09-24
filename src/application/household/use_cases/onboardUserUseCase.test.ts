import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HouseholdNotFoundError, InvalidHouseholdInputError } from '@/domains/household/errors';
import { type UserProfile } from '@/domains/auth/user/types';

vi.mock('./joinHouseholdUseCase', () => ({
  joinHouseholdUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('./createHouseholdUseCase', () => ({
  createHouseholdUseCase: {
    execute: vi.fn(),
  },
}));

vi.mock('@/application/auth/use_cases/updateUserProfileUseCase', () => ({
  updateUserProfileUseCase: {
    execute: vi.fn(),
  },
}));

const userProfile: UserProfile = {
  id: 'user-1',
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  photoURL: undefined,
  householdId: undefined,
  createdBy: 'system',
  createdAt: new Date(),
  updatedBy: 'system',
  updatedAt: new Date(),
};

describe('OnboardUserUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('joins an existing household for a non-admin user', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

    vi.mocked(joinHouseholdUseCase.execute).mockResolvedValue(undefined);

    await onboardUserUseCase.execute({
      input: 'household-1',
      userProfile,
      userEmail: 'user@example.com',
      isAdmin: false,
    });

    expect(joinHouseholdUseCase.execute).toHaveBeenCalledWith({
      householdId: 'household-1',
      user: userProfile,
    });
    expect(createHouseholdUseCase.execute).not.toHaveBeenCalled();
  });

  // --- Non-admin: all join failure categories must propagate distinctly ---

  it.each([
    ['not-found', new HouseholdNotFoundError()],
    ['permission', new Error('You are not a member of this household.')],
    ['network', new Error('Network request failed')],
    ['unknown', new Error('Something unexpected happened')],
  ])(
    're-throws a %s join error for a non-admin without creating a household',
    async (_label, joinError) => {
      const { onboardUserUseCase } = await import('./onboardUserUseCase');
      const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
      const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

      vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(joinError);

      await expect(
        onboardUserUseCase.execute({
          input: 'missing-household',
          userProfile,
          userEmail: 'user@example.com',
          isAdmin: false,
        }),
      ).rejects.toThrow(joinError);

      expect(createHouseholdUseCase.execute).not.toHaveBeenCalled();
    },
  );

  // --- Admin household creation: only for verified not-found ---

  it('creates a household for an admin when join fails with not-found', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');
    const { updateUserProfileUseCase } = await import(
      '@/application/auth/use_cases/updateUserProfileUseCase'
    );

    vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(
      new HouseholdNotFoundError(),
    );
    vi.mocked(createHouseholdUseCase.execute).mockResolvedValue('new-household-id');

    await onboardUserUseCase.execute({
      input: 'my-household',
      userProfile,
      userEmail: 'user@example.com',
      isAdmin: true,
    });

    expect(createHouseholdUseCase.execute).toHaveBeenCalledTimes(1);
    // #35: memberUids is derived by the use case, not required from the caller.
    // Assert the caller-provided shape (name + members) without pinning derived fields.
    expect(createHouseholdUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'my-household',
          members: {
            'user-1': { role: 'owner', joinedAt: expect.any(Date) },
          },
        }),
        userEmail: 'user@example.com',
      }),
    );
    expect(updateUserProfileUseCase.execute).toHaveBeenCalledWith({
      uid: 'user-1',
      updates: { householdId: 'new-household-id' },
    });
  });

  it('creates a household for an admin when join fails with invalid-household', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

    vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(
      new InvalidHouseholdInputError(),
    );
    vi.mocked(createHouseholdUseCase.execute).mockResolvedValue('new-household-id');

    await onboardUserUseCase.execute({
      input: 'my-household',
      userProfile,
      userEmail: 'user@example.com',
      isAdmin: true,
    });

    expect(createHouseholdUseCase.execute).toHaveBeenCalledTimes(1);
  });

  // --- Regression: admin must NOT create household for non-not-found errors ---

  it('does NOT create a household when join fails with a permission error', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

    const permissionError = new Error(
      'You are not a member of this household. Please ask an owner to add your email first.',
    );
    vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(permissionError);

    await expect(
      onboardUserUseCase.execute({
        input: 'existing-household',
        userProfile,
        userEmail: 'user@example.com',
        isAdmin: true,
      }),
    ).rejects.toThrow(permissionError);

    expect(createHouseholdUseCase.execute).not.toHaveBeenCalled();
  });

  it('does NOT create a household when join fails with a network error', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

    const networkError = new Error('Network request failed');
    vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(networkError);

    await expect(
      onboardUserUseCase.execute({
        input: 'household-1',
        userProfile,
        userEmail: 'user@example.com',
        isAdmin: true,
      }),
    ).rejects.toThrow(networkError);

    expect(createHouseholdUseCase.execute).not.toHaveBeenCalled();
  });

  it('does NOT create a household when join fails with an unknown error', async () => {
    const { onboardUserUseCase } = await import('./onboardUserUseCase');
    const { joinHouseholdUseCase } = await import('./joinHouseholdUseCase');
    const { createHouseholdUseCase } = await import('./createHouseholdUseCase');

    const unknownError = new Error('Something unexpected happened');
    vi.mocked(joinHouseholdUseCase.execute).mockRejectedValue(unknownError);

    await expect(
      onboardUserUseCase.execute({
        input: 'household-1',
        userProfile,
        userEmail: 'user@example.com',
        isAdmin: true,
      }),
    ).rejects.toThrow(unknownError);

    expect(createHouseholdUseCase.execute).not.toHaveBeenCalled();
  });
});
