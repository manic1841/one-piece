import { describe, it, expect, vi, beforeEach } from 'vitest';
import { householdService } from './householdService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => ({ type: 'collection' })),
  doc: vi.fn(() => ({ id: 'new-household-id', type: 'doc' })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  Timestamp: class {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }
    toMillis() {
      return this.seconds * 1000 + this.nanoseconds / 1000000;
    }
    static fromDate(date: Date) {
      return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }
    static now() {
      return this.fromDate(new Date());
    }
  },
}));

vi.mock('../firebase', () => ({
  db: {},
}));

// Mock the repository
vi.mock('../repositories/householdRepository', () => ({
  householdRepository: {
    create: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { householdRepository } from '../repositories/householdRepository';

describe('householdService', () => {
  const mockUser = {
    uid: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: undefined,
    role: 'member' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createHousehold', () => {
    it('should create a new household if name is unique', async () => {
      // Mock repository to return empty array (unique name)
      vi.mocked(householdRepository.getAll).mockResolvedValue([]);
      vi.mocked(householdRepository.create).mockResolvedValue('new-household-id');

      const result = await householdService.createHousehold('New Household', mockUser);

      expect(result).toBe('new-household-id');
      expect(householdRepository.create).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(1); // Only for user profile
    });

    it('should join existing household if name already exists', async () => {
      // Mock repository to return existing household
      const existingHousehold = {
        id: 'existing-id',
        name: 'Existing Household',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getAll).mockResolvedValue([existingHousehold]);
      vi.mocked(householdRepository.getById).mockResolvedValue(existingHousehold);

      const result = await householdService.createHousehold('Existing Household', mockUser);

      expect(result).toBe('existing-id');
      // Should call updateDoc to add member (via joinHousehold)
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('joinHousehold', () => {
    it('should join household by ID', async () => {
      const existingHousehold = {
        id: 'existing-id',
        name: 'Existing Household',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getById).mockResolvedValue(existingHousehold);

      await householdService.joinHousehold('existing-id', mockUser);

      expect(householdRepository.update).toHaveBeenCalledWith(
        'existing-id',
        expect.objectContaining({
          [`members.${mockUser.uid}`]: expect.anything(),
        }),
      );
    });

    it('should join household by Name', async () => {
      // First getById (by ID) fails
      vi.mocked(householdRepository.getById).mockResolvedValueOnce(null);

      // getAll by name succeeds
      const existingHousehold = {
        id: 'found-by-name-id',
        name: 'Found By Name',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getAll).mockResolvedValue([existingHousehold]);

      await householdService.joinHousehold('Found By Name', mockUser);

      expect(householdRepository.update).toHaveBeenCalled();
    });

    it('should throw error if household not found', async () => {
      vi.mocked(householdRepository.getById).mockResolvedValue(null);
      vi.mocked(householdRepository.getAll).mockResolvedValue([]);

      await expect(householdService.joinHousehold('Non Existent', mockUser)).rejects.toThrow(
        'Household not found',
      );
    });

    it('should not update if user is already a member', async () => {
      const existingHousehold = {
        id: 'existing-id',
        name: 'Test Household',
        members: {
          [mockUser.uid]: {
            role: 'member' as const,
            joinedAt: Timestamp.now(),
          },
        },
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getById).mockResolvedValue(existingHousehold);

      await householdService.joinHousehold('existing-id', mockUser);

      expect(householdRepository.update).not.toHaveBeenCalled();
      // But it should still update user profile
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('getHousehold', () => {
    it('should return household when it exists', async () => {
      const mockHousehold = {
        id: 'household-1',
        name: 'Test Household',
        members: {
          'user-1': {
            role: 'member' as const,
            joinedAt: new Timestamp(1234567890, 0),
          },
        },
        createdAt: new Timestamp(1234567890, 0),
      };

      vi.mocked(householdRepository.getById).mockResolvedValue(mockHousehold);

      const result = await householdService.getHousehold('household-1');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Household');
    });

    it('should return null when household does not exist', async () => {
      vi.mocked(householdRepository.getById).mockResolvedValue(null);

      const result = await householdService.getHousehold('non-existent');

      expect(result).toBe(null);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when it exists', async () => {
      const mockProfile = {
        uid: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: '',
        role: 'member',
        householdId: 'household-1',
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      } as never);

      const result = await householdService.getUserProfile('user-1');

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      } as never);

      const result = await householdService.getUserProfile('non-existent');

      expect(result).toBe(null);
    });
  });

  describe('createOrJoinHousehold', () => {
    it('should throw error for empty input', async () => {
      await expect(householdService.createOrJoinHousehold('', mockUser)).rejects.toThrow(
        'Please enter a household name or ID',
      );
    });

    it('should join by ID if found', async () => {
      const existingHousehold = {
        id: 'existing-id',
        name: 'Existing',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getById).mockResolvedValue(existingHousehold);

      const result = await householdService.createOrJoinHousehold('existing-id', mockUser);

      expect(result).toBe('existing-id');
    });

    it('should join by Name if found', async () => {
      // ID lookup fails
      vi.mocked(householdRepository.getById).mockResolvedValue(null);

      // Name lookup succeeds
      const existingHousehold = {
        id: 'found-id',
        name: 'Found Name',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(householdRepository.getAll).mockResolvedValue([existingHousehold]);

      const result = await householdService.createOrJoinHousehold('Found Name', mockUser);

      expect(result).toBe('found-id');
    });

    it('should create new household if not found by ID or Name', async () => {
      // ID lookup fails
      vi.mocked(householdRepository.getById).mockResolvedValue(null);
      // Name lookup fails
      vi.mocked(householdRepository.getAll).mockResolvedValue([]);
      // Create succeeds
      vi.mocked(householdRepository.create).mockResolvedValue('new-household-id');

      const result = await householdService.createOrJoinHousehold('New Unique Name', mockUser);

      expect(result).toBe('new-household-id');
      expect(householdRepository.create).toHaveBeenCalled();
    });
  });
});
