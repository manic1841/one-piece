import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseService, type BaseEntity } from './baseService';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => ({ type: 'collection' })),
  doc: vi.fn(() => ({ id: 'new-doc-id', type: 'doc' })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
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

import { getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Concrete implementation for testing
interface TestEntity extends BaseEntity {
  name: string;
  value: number;
}

const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  createdAt: z.any().optional(),
});

class TestService extends BaseService<TestEntity> {
  constructor() {
    super('test-collection', TestSchema);
  }
}

describe('BaseService', () => {
  const service = new TestService();
  const householdId = 'test-household';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a document and return id', async () => {
      const data = { name: 'test', value: 123 };
      const result = await service.create(householdId, data);

      expect(result).toBe('new-doc-id');
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'new-doc-id' }),
        expect.objectContaining({
          ...data,
          id: 'new-doc-id',
        }),
      );
    });
  });

  describe('getAll', () => {
    it('should return all documents', async () => {
      const mockData = [
        { id: '1', name: 'test1', value: 1 },
        { id: '2', name: 'test2', value: 2 },
      ];

      vi.mocked(getDocs).mockResolvedValue({
        docs: mockData.map((d) => ({
          data: () => d,
        })),
      } as never);

      const result = await service.getAll(householdId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
    });
  });

  describe('getById', () => {
    it('should return document if exists', async () => {
      const mockData = { id: '1', name: 'test1', value: 1 };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      } as never);

      const result = await service.getById(householdId, '1');

      expect(result).toEqual(mockData);
    });

    it('should return null if not exists', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as never);

      const result = await service.getById(householdId, '1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update document', async () => {
      const updates = { name: 'updated' };
      await service.update(householdId, '1', updates);

      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining(updates));
    });

    it('should convert Date objects to Timestamps', async () => {
      const date = new Date('2023-01-01');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates = { createdAt: date } as any; // Force Date type for test

      await service.update(householdId, '1', updates);

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          createdAt: expect.any(Timestamp),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      await service.delete(householdId, '1');

      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
