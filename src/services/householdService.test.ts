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

import { getDoc } from 'firebase/firestore';

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
  });
});
