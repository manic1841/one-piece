import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accessControlService } from './accessControlService';
import { accessControlRepository } from '../repositories/accessControlRepository';

// Mock AccessControlRepository
vi.mock('../repositories/accessControlRepository', () => ({
  accessControlRepository: {
    getWhitelist: vi.fn(),
    addEmailToWhitelist: vi.fn(),
    removeEmailFromWhitelist: vi.fn(),
  },
}));

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
      vi.mocked(accessControlRepository.getWhitelist).mockResolvedValue(mockEmails);

      const result = await accessControlService.getWhitelist();

      expect(result).toEqual(mockEmails);
      expect(accessControlRepository.getWhitelist).toHaveBeenCalled();
    });
  });

  describe('addEmailToWhitelist', () => {
    it('should call repository when admin', async () => {
      await accessControlService.addEmailToWhitelist('test@example.com', ADMIN_UID);
      expect(accessControlRepository.addEmailToWhitelist).toHaveBeenCalledWith(
        'test@example.com',
        ADMIN_UID,
      );
    });

    it('should throw error when not admin', async () => {
      await expect(
        accessControlService.addEmailToWhitelist('test@example.com', REGULAR_UID),
      ).rejects.toThrow('Only admin can modify whitelist');
    });
  });

  describe('removeEmailFromWhitelist', () => {
    it('should call repository when admin', async () => {
      await accessControlService.removeEmailFromWhitelist('test@example.com', ADMIN_UID);
      expect(accessControlRepository.removeEmailFromWhitelist).toHaveBeenCalledWith(
        'test@example.com',
        ADMIN_UID,
      );
    });

    it('should throw error when not admin', async () => {
      await expect(
        accessControlService.removeEmailFromWhitelist('test@example.com', REGULAR_UID),
      ).rejects.toThrow('Only admin can modify whitelist');
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
      vi.mocked(accessControlRepository.getWhitelist).mockResolvedValue(['test@example.com']);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'test@example.com');
      expect(result).toBe(true);
    });

    it('should return false for non-whitelisted email', async () => {
      vi.mocked(accessControlRepository.getWhitelist).mockResolvedValue(['other@example.com']);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'test@example.com');
      expect(result).toBe(false);
    });

    it('should handle email case insensitivity', async () => {
      vi.mocked(accessControlRepository.getWhitelist).mockResolvedValue(['test@example.com']);

      const result = await accessControlService.isUserAuthorized(REGULAR_UID, 'TEST@EXAMPLE.COM');
      expect(result).toBe(true);
    });
  });
});
