import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accessControlRepository } from './accessControlRepository';
import {
  getDoc,
  setDoc,
  updateDoc,
  doc,
  type DocumentSnapshot,
  type DocumentReference,
} from 'firebase/firestore';

describe('accessControlRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock doc to return a reference
    vi.mocked(doc).mockReturnValue({ id: 'config' } as DocumentReference);
  });

  describe('getWhitelist', () => {
    it('should return whitelisted emails', async () => {
      const mockEmails = ['test@example.com', 'user@example.com'];

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          whitelistedEmails: mockEmails,
        }),
        id: 'config',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await accessControlRepository.getWhitelist();

      expect(result).toEqual(mockEmails);
    });

    it('should return empty array when document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
        id: 'config',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      const result = await accessControlRepository.getWhitelist();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Firestore error'));

      const result = await accessControlRepository.getWhitelist();

      expect(result).toEqual([]);
    });
  });

  describe('addEmailToWhitelist', () => {
    it('should update existing document', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: 'config',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      await accessControlRepository.addEmailToWhitelist('test@example.com', 'admin-uid');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          whitelistedEmails: ['test@example.com'],
          updatedBy: 'admin-uid',
        }),
      );
    });

    it('should create new document if not exists', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        id: 'config',
        ref: {} as unknown,
        metadata: {} as unknown,
      } as unknown as DocumentSnapshot);

      await accessControlRepository.addEmailToWhitelist('test@example.com', 'admin-uid');

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          whitelistedEmails: ['test@example.com'],
          updatedBy: 'admin-uid',
        }),
      );
    });
  });

  describe('removeEmailFromWhitelist', () => {
    it('should remove email from whitelist', async () => {
      await accessControlRepository.removeEmailFromWhitelist('test@example.com', 'admin-uid');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          whitelistedEmails: ['test@example.com'],
          updatedBy: 'admin-uid',
        }),
      );
    });
  });
});
