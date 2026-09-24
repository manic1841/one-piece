import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./getUserProfileUseCase', () => ({
  getUserProfileUseCase: { execute: vi.fn() },
}));

vi.mock('./createUserProfileUseCase', () => ({
  createUserProfileUseCase: { execute: vi.fn() },
}));

import { createUserProfileUseCase } from './createUserProfileUseCase';
import { deriveDisplayName, ensureUserProfileUseCase } from './ensureUserProfileUseCase';
import { getUserProfileUseCase } from './getUserProfileUseCase';

const existingProfile = {
  id: 'user-1',
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  householdId: 'household-1',
  createdBy: 'system',
  createdAt: new Date(),
  updatedBy: 'system',
  updatedAt: new Date(),
};

describe('deriveDisplayName', () => {
  it('prefers the identity provider name, then the email local part, then Anonymous', () => {
    expect(deriveDisplayName('Test User', 'user@example.com')).toBe('Test User');

    // Whitespace-only counts as absent.
    expect(deriveDisplayName('   ', 'user@example.com')).toBe('user');

    expect(deriveDisplayName('', '')).toBe('Anonymous');
  });
});

describe('ensureUserProfileUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a profile on first login when none exists', async () => {
    vi.mocked(getUserProfileUseCase.execute)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingProfile);
    vi.mocked(createUserProfileUseCase.execute).mockResolvedValue('user-1');

    const result = await ensureUserProfileUseCase.execute({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
    });

    expect(createUserProfileUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createUserProfileUseCase.execute).toHaveBeenCalledWith({
      profile: expect.objectContaining({
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
      }),
    });
    expect(result).toMatchObject({ uid: 'user-1' });
  });

  it('reuses an existing profile without creating a new one', async () => {
    vi.mocked(getUserProfileUseCase.execute).mockResolvedValue(existingProfile);

    const result = await ensureUserProfileUseCase.execute({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
    });

    expect(createUserProfileUseCase.execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({ uid: 'user-1', householdId: 'household-1' });
  });

  it('falls back to the email local part when the provider gives no display name', async () => {
    const created = { ...existingProfile, displayName: 'user' };
    vi.mocked(getUserProfileUseCase.execute)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    vi.mocked(createUserProfileUseCase.execute).mockResolvedValue('user-1');

    await ensureUserProfileUseCase.execute({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: '',
    });

    expect(createUserProfileUseCase.execute).toHaveBeenCalledWith({
      profile: expect.objectContaining({ displayName: 'user' }),
    });
  });

  it('propagates a creation failure to the caller', async () => {
    vi.mocked(getUserProfileUseCase.execute).mockResolvedValue(null);
    vi.mocked(createUserProfileUseCase.execute).mockRejectedValue(new Error('invalid email'));

    await expect(
      ensureUserProfileUseCase.execute({ uid: 'user-1', email: '', displayName: '' }),
    ).rejects.toThrow('invalid email');
  });
});
