import { describe, expect, it, vi } from 'vitest';

import { reportRepository } from '@/infra/repositories/reportRepository';
import { REPORT_LIST_LIMIT } from '@/shared/readLimits';
import { limitOf } from '@/test/queryConstraints';

import { listReportsUseCase } from './listReportsUseCase';

vi.mock('@/infra/repositories/reportRepository', () => ({
  reportRepository: { list: vi.fn() },
}));

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn() },
}));

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };

describe('listReportsUseCase', () => {
  it('reads newest first with a cap, so a truncation drops the oldest months', async () => {
    vi.mocked(reportRepository.list).mockResolvedValue([]);

    await listReportsUseCase.execute({ householdId: 'household-1', auth });

    const constraints = vi.mocked(reportRepository.list).mock.calls[0]?.[1] ?? [];
    expect(constraints).toHaveLength(2);
    expect(constraints[0]?.type).toBe('orderBy');
    expect(constraints[1]?.type).toBe('limit');
    expect(limitOf(constraints[1]!)).toBe(REPORT_LIST_LIMIT);
  });
});
