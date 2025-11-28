import { describe, it, expect, vi, beforeEach } from 'vitest';
import { accountService } from './accountService';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'new-snapshot-id' })),
    setDoc: vi.fn(),
    getDocs: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
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

import { getDocs, setDoc } from 'firebase/firestore';

describe('accountService', () => {
    const householdId = 'test-household';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('recordSnapshot', () => {
        it('should record an account snapshot', async () => {
            const snapshotData = {
                year: 2023,
                month: 10,
                amount: 5000,
                createdBy: 'user-1',
            };

            const result = await accountService.recordSnapshot(
                householdId,
                'acc-1',
                snapshotData
            );

            expect(result).toBe('new-snapshot-id');
            expect(setDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    ...snapshotData,
                    id: 'new-snapshot-id',
                    createdAt: 'mock-timestamp',
                })
            );
        });
    });

    describe('getSnapshots', () => {
        it('should return snapshots sorted by year and month', async () => {
            const mockSnapshots = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    amount: 5000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
                {
                    id: 'snap-2',
                    year: 2023,
                    month: 9,
                    amount: 4500,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs).mockResolvedValue({
                docs: mockSnapshots.map((s) => ({
                    id: s.id,
                    data: () => s,
                })),
                empty: false,
                size: mockSnapshots.length,
            } as never);

            const result = await accountService.getSnapshots(householdId, 'acc-1');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('snap-1');
            expect(result[1].id).toBe('snap-2');
        });

        it('should filter snapshots by year', async () => {
            const mockSnapshots = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    amount: 5000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs).mockResolvedValue({
                docs: mockSnapshots.map((s) => ({
                    id: s.id,
                    data: () => s,
                })),
                empty: false,
                size: mockSnapshots.length,
            } as never);

            const result = await accountService.getSnapshots(householdId, 'acc-1', 2023);

            expect(result).toHaveLength(1);
            expect(result[0].year).toBe(2023);
        });

        it('should filter snapshots by year and month', async () => {
            const mockSnapshots = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    amount: 5000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs).mockResolvedValue({
                docs: mockSnapshots.map((s) => ({
                    id: s.id,
                    data: () => s,
                })),
                empty: false,
                size: mockSnapshots.length,
            } as never);

            const result = await accountService.getSnapshots(householdId, 'acc-1', 2023, 10);

            expect(result).toHaveLength(1);
            expect(result[0].year).toBe(2023);
            expect(result[0].month).toBe(10);
        });

        it('should return empty array when no snapshots exist', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [],
                empty: true,
                size: 0,
            } as never);

            const result = await accountService.getSnapshots(householdId, 'acc-1');

            expect(result).toEqual([]);
        });
    });

    describe('getLatestSnapshots', () => {
        it('should return latest snapshot for each account', async () => {
            const mockAccounts = [
                {
                    id: 'acc-1',
                    name: 'Bank Account',
                    type: 'bank' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
                {
                    id: 'acc-2',
                    name: 'Cash',
                    type: 'cash' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
            ];

            const mockSnapshots1 = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    amount: 5000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            const mockSnapshots2 = [
                {
                    id: 'snap-2',
                    year: 2023,
                    month: 10,
                    amount: 1000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs)
                .mockResolvedValueOnce({
                    docs: mockAccounts.map((a) => ({
                        id: a.id,
                        data: () => a,
                    })),
                    empty: false,
                    size: mockAccounts.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: mockSnapshots1.map((s) => ({
                        id: s.id,
                        data: () => s,
                    })),
                    empty: false,
                    size: mockSnapshots1.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: mockSnapshots2.map((s) => ({
                        id: s.id,
                        data: () => s,
                    })),
                    empty: false,
                    size: mockSnapshots2.length,
                } as never);

            const result = await accountService.getLatestSnapshots(householdId);

            expect(result.size).toBe(2);
            expect(result.get('acc-1')?.amount).toBe(5000);
            expect(result.get('acc-2')?.amount).toBe(1000);
        });

        it('should skip accounts without snapshots', async () => {
            const mockAccounts = [
                {
                    id: 'acc-1',
                    name: 'Bank Account',
                    type: 'bank' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
                {
                    id: 'acc-2',
                    name: 'Cash',
                    type: 'cash' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs)
                .mockResolvedValueOnce({
                    docs: mockAccounts.map((a) => ({
                        id: a.id,
                        data: () => a,
                    })),
                    empty: false,
                    size: mockAccounts.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: [],
                    empty: true,
                    size: 0,
                } as never)
                .mockResolvedValueOnce({
                    docs: [
                        {
                            id: 'snap-2',
                            data: () => ({
                                id: 'snap-2',
                                year: 2023,
                                month: 10,
                                amount: 1000,
                                createdBy: 'user-1',
                                createdAt: Timestamp.now(),
                            }),
                        },
                    ],
                    empty: false,
                    size: 1,
                } as never);

            const result = await accountService.getLatestSnapshots(householdId);

            expect(result.size).toBe(1);
            expect(result.has('acc-1')).toBe(false);
            expect(result.has('acc-2')).toBe(true);
        });

        it('should return empty map when no accounts exist', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [],
                empty: true,
                size: 0,
            } as never);

            const result = await accountService.getLatestSnapshots(householdId);

            expect(result.size).toBe(0);
        });
    });

    describe('getTotalAssets', () => {
        it('should calculate total assets from all account snapshots', async () => {
            const mockAccounts = [
                {
                    id: 'acc-1',
                    name: 'Bank Account',
                    type: 'bank' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
                {
                    id: 'acc-2',
                    name: 'Cash',
                    type: 'cash' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
            ];

            const mockSnapshots1 = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    amount: 5000,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            const mockSnapshots2 = [
                {
                    id: 'snap-2',
                    year: 2023,
                    month: 10,
                    amount: 1500,
                    createdBy: 'user-1',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs)
                .mockResolvedValueOnce({
                    docs: mockAccounts.map((a) => ({
                        id: a.id,
                        data: () => a,
                    })),
                    empty: false,
                    size: mockAccounts.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: mockSnapshots1.map((s) => ({
                        id: s.id,
                        data: () => s,
                    })),
                    empty: false,
                    size: mockSnapshots1.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: mockSnapshots2.map((s) => ({
                        id: s.id,
                        data: () => s,
                    })),
                    empty: false,
                    size: mockSnapshots2.length,
                } as never);

            const result = await accountService.getTotalAssets(householdId);

            expect(result).toBe(6500); // 5000 + 1500
        });

        it('should return 0 when no snapshots exist', async () => {
            const mockAccounts = [
                {
                    id: 'acc-1',
                    name: 'Bank Account',
                    type: 'bank' as const,
                    currency: 'TWD',
                    createdAt: Timestamp.now(),
                },
            ];

            vi.mocked(getDocs)
                .mockResolvedValueOnce({
                    docs: mockAccounts.map((a) => ({
                        id: a.id,
                        data: () => a,
                    })),
                    empty: false,
                    size: mockAccounts.length,
                } as never)
                .mockResolvedValueOnce({
                    docs: [],
                    empty: true,
                    size: 0,
                } as never);

            const result = await accountService.getTotalAssets(householdId);

            expect(result).toBe(0);
        });

        it('should return 0 when no accounts exist', async () => {
            vi.mocked(getDocs).mockResolvedValue({
                docs: [],
                empty: true,
                size: 0,
            } as never);

            const result = await accountService.getTotalAssets(householdId);

            expect(result).toBe(0);
        });
    });
});
