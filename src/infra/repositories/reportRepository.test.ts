import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportType } from '@/domains/report/schemas';

import { reportRepository } from './reportRepository';

// Mock only the BaseRepository methods that saveReport should NOT call (get, list)
// and the ones it SHOULD call (set). We spy on the instance methods directly.
vi.mock('@/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({})),
  Timestamp: { fromDate: vi.fn(() => ({})) },
}));

describe('reportRepository.saveReport — no read-before-write', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call get or list before writing', async () => {
    const setSpy = vi.spyOn(reportRepository, 'set').mockResolvedValue(undefined);
    const getSpy = vi.spyOn(reportRepository, 'get' as never).mockResolvedValue(null);
    const listSpy = vi.spyOn(reportRepository, 'list' as never).mockResolvedValue([]);

    await reportRepository.saveReport(
      'household-1',
      {
        householdId: 'household-1',
        type: ReportType.INCOME_STATEMENT,
        yearMonth: '2026-03',
        data: { yearMonth: '2026-03' } as never,
        createdBy: 'user@example.com',
        updatedBy: 'user@example.com',
      },
      'user@example.com',
    );

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0][0]).toEqual(['household-1', '2026-03-INCOME_STATEMENT']);
    expect(setSpy.mock.calls[0][2]).toBe('user@example.com');
    expect(getSpy).not.toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('writes to the deterministic ID', async () => {
    const setSpy = vi.spyOn(reportRepository, 'set').mockResolvedValue(undefined);

    await reportRepository.saveReport(
      'household-1',
      {
        householdId: 'household-1',
        type: ReportType.BALANCE_SHEET,
        yearMonth: '2026-03',
        data: { yearMonth: '2026-03' } as never,
        createdBy: 'user@example.com',
        updatedBy: 'user@example.com',
      },
      'user@example.com',
    );

    expect(setSpy.mock.calls[0][0]).toEqual(['household-1', '2026-03-BALANCE_SHEET']);
  });
});
