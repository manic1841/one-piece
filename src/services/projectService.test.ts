import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from './projectService';
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

describe('projectService', () => {
    const householdId = 'test-household';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('recordSnapshot', () => {
        it('should record a project snapshot', async () => {
            const snapshotData = {
                year: 2023,
                month: 10,
                openingBalance: 1000,
                income: 500,
                expense: 200,
                closingBalance: 1300,
            };

            const result = await projectService.recordSnapshot(
                householdId,
                'proj-1',
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
                    openingBalance: 1000,
                    income: 500,
                    expense: 200,
                    closingBalance: 1300,
                    createdAt: Timestamp.now(),
                },
                {
                    id: 'snap-2',
                    year: 2023,
                    month: 9,
                    openingBalance: 800,
                    income: 300,
                    expense: 100,
                    closingBalance: 1000,
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

            const result = await projectService.getSnapshots(householdId, 'proj-1');

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
                    openingBalance: 1000,
                    income: 500,
                    expense: 200,
                    closingBalance: 1300,
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

            const result = await projectService.getSnapshots(householdId, 'proj-1', 2023);

            expect(result).toHaveLength(1);
            expect(result[0].year).toBe(2023);
        });

        it('should filter snapshots by year and month', async () => {
            const mockSnapshots = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    openingBalance: 1000,
                    income: 500,
                    expense: 200,
                    closingBalance: 1300,
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

            const result = await projectService.getSnapshots(householdId, 'proj-1', 2023, 10);

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

            const result = await projectService.getSnapshots(householdId, 'proj-1');

            expect(result).toEqual([]);
        });

        it('should handle snapshots with zero values', async () => {
            const mockSnapshots = [
                {
                    id: 'snap-1',
                    year: 2023,
                    month: 10,
                    openingBalance: 0,
                    income: 0,
                    expense: 0,
                    closingBalance: 0,
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

            const result = await projectService.getSnapshots(householdId, 'proj-1');

            expect(result).toHaveLength(1);
            expect(result[0].closingBalance).toBe(0);
        });
    });
});
