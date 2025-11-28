import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accessControlService } from './accessControlService';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn((value) => value),
  arrayRemove: vi.fn((value) => value),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

import { getDoc } from 'firebase/firestore';

describe('accessControlService', () => {
  const ADMIN_UID = 'rnSCoxeAl0bmc9NQeHSzFR5gYUB3';
  const REGULAR_UID = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('should return true for admin UID', () => {
      const result = accessControlService.isAdmin(ADMIN_UID);
      expect(result).toBe(true);
    });

    it('should return false for non-admin UID', () => {
      const result = accessControlService.isAdmin(REGULAR_UID);
      expect(result).toBe(false);
    });
  });

  describe('getWhitelist', () => {
    it('should return whitelisted emails', async () => {
      const mockEmails = ['test@example.com', 'user@example.com'];

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          whitelistedEmails: mockEmails,
        }),
      } as never);

      const result = await accessControlService.getWhitelist();

      expect(result).toEqual(mockEmails);
    });

    it('should return empty array when document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      } as never);

      const result = await accessControlService.getWhitelist();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Firestore error'));

      const result = await accessControlService.getWhitelist();

      expect(result).toEqual([]);
    });
  });

  describe('isUserAuthorized', () => {
    it('should return true for admin', async () => {
      const result = await accessControlService.isUserAuthorized(ADMIN_UID, 'admin@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email is null', async () => {
      const result = await accessControlService.isUserAuthorized(REGULAR_UID, null);

      expect(result).toBe(false);
    });

    it('should return true for whitelisted email', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          whitelistedEmails: ['test@example.com'],
        }),
      } as never);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'test@example.com');

      expect(result).toBe(true);
    });

    it('should return false for non-whitelisted email', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          whitelistedEmails: ['other@example.com'],
        }),
      } as never);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'test@example.com');

      expect(result).toBe(false);
    });

    it('should handle email case insensitivity', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          whitelistedEmails: ['test@example.com'],
        }),
      } as never);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'TEST@EXAMPLE.COM');

      expect(result).toBe(true);
    });
  });
});
