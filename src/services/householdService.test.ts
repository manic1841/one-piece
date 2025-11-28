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
  where: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
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

import { getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

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
      // Mock query to return empty (unique name)
      vi.mocked(getDocs).mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
      } as never);

      const result = await householdService.createHousehold('New Household', mockUser);

      expect(result).toBe('new-household-id');
      expect(setDoc).toHaveBeenCalledTimes(2); // 1 for household, 1 for user profile
    });

    it('should join existing household if name already exists', async () => {
      // Mock query to return existing household
      const existingHousehold = {
        id: 'existing-id',
        name: 'Existing Household',
        members: {},
        createdAt: Timestamp.now(),
      };

      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'existing-id',
            data: () => existingHousehold,
          },
        ],
      } as never);

      // Mock getDoc for joinHousehold check
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingHousehold,
      } as never);

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
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingHousehold,
      } as never);

      await householdService.joinHousehold('existing-id', mockUser);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [`members.${mockUser.uid}`]: expect.anything(),
        }),
      );
    });

    it('should join household by Name', async () => {
      // First getDoc (by ID) fails
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as never);

      // Query by name succeeds
      const existingHousehold = {
        id: 'found-by-name-id',
        name: 'Found By Name',
        members: {},
      };

      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'found-by-name-id',
            data: () => existingHousehold,
          },
        ],
      } as never);

      // Second getDoc (inside joinHousehold logic after finding by name, actually it uses the doc from query)
      // Wait, the code uses querySnapshot.docs[0] directly.

      await householdService.joinHousehold('Found By Name', mockUser);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error if household not found', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as never);

      vi.mocked(getDocs).mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
      } as never);

      await expect(householdService.joinHousehold('Non Existent', mockUser)).rejects.toThrow(
        'Household not found',
      );
    });

    it('should not update if user is already a member', async () => {
      const existingHousehold = {
        id: 'existing-id',
        members: {
          [mockUser.uid]: { role: 'member' },
        },
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingHousehold,
      } as never);

      await householdService.joinHousehold('existing-id', mockUser);

      expect(updateDoc).not.toHaveBeenCalled();
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
            role: 'member',
            joinedAt: new Timestamp(1234567890, 0),
          },
        },
        createdAt: new Timestamp(1234567890, 0),
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockHousehold,
      } as never);

      const result = await householdService.getHousehold('household-1');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Household');
    });

    it('should return null when household does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => undefined,
      } as never);

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
        members: {},
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingHousehold,
      } as never);

      const result = await householdService.createOrJoinHousehold('existing-id', mockUser);

      expect(result).toBe('existing-id');
    });

    it('should join by Name if found', async () => {
      // ID lookup fails
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as never);

      // Name lookup succeeds
      const existingHousehold = {
        id: 'found-id',
        name: 'Found Name',
        members: {},
      };

      vi.mocked(getDocs).mockResolvedValue({
        empty: false,
        size: 1,
        docs: [
          {
            id: 'found-id',
            data: () => existingHousehold,
          },
        ],
      } as never);

      // Mock getDoc for joinHousehold internal check (since we pass ID to joinHousehold)
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => existingHousehold,
      } as never);

      const result = await householdService.createOrJoinHousehold('Found Name', mockUser);

      expect(result).toBe('found-id');
    });

    it('should create new household if not found by ID or Name', async () => {
      // ID lookup fails
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as never);

      // Name lookup fails
      vi.mocked(getDocs).mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
      } as never);

      const result = await householdService.createOrJoinHousehold('New Unique Name', mockUser);

      expect(result).toBe('new-household-id');
      expect(setDoc).toHaveBeenCalled();
    });
  });
});
