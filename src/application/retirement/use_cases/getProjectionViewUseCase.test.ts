import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

import { getProjectionViewUseCase } from './getProjectionViewUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn() },
}));

vi.mock('@/infra/repositories/projectionRepository', () => ({
  projectionRepository: {
    getProjection: vi.fn(),
    getProjectionConfig: vi.fn(),
    getProjectionSource: vi.fn(),
    getProjectionAnnual: vi.fn(),
  },
}));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const projection = {
  id: 'p1',
  name: 'Projection',
  engineVersion: 1,
  createdAt: new Date('2026-01-01'),
  createdBy: 'u1',
  retirementNetWorth: null,
  finalNetWorth: 1,
  minNetWorth: 1,
  minNetWorthYear: null,
  bankruptcyYear: null,
  isBankrupt: false,
};

const config = {
  startYear: 2026,
  openingNetWorth: { amount: 1000, source: 'manual' as const },
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [],
};

describe('getProjectionViewUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertReadPermission).mockResolvedValue();
  });

  it('returns null for a missing projection without reading the children', async () => {
    vi.mocked(projectionRepository.getProjection).mockResolvedValue(null);

    const result = await getProjectionViewUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      auth,
    });

    expect(result).toBeNull();
    expect(projectionRepository.getProjectionConfig).not.toHaveBeenCalled();
  });

  it('returns the main document with each missing child kept as null', async () => {
    vi.mocked(projectionRepository.getProjection).mockResolvedValue(projection);
    vi.mocked(projectionRepository.getProjectionConfig).mockResolvedValue(null);
    vi.mocked(projectionRepository.getProjectionSource).mockResolvedValue(null);
    vi.mocked(projectionRepository.getProjectionAnnual).mockResolvedValue(null);

    const result = await getProjectionViewUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      auth,
    });

    expect(result).toEqual({ projection, config: null, source: null, annual: null });
    expect(householdPermissionService.assertReadPermission).toHaveBeenCalledWith('h1', 'u1', false);
  });

  it('re-validates the stored config against the current clock', async () => {
    vi.mocked(projectionRepository.getProjection).mockResolvedValue(projection);
    vi.mocked(projectionRepository.getProjectionConfig).mockResolvedValue(config);
    vi.mocked(projectionRepository.getProjectionSource).mockResolvedValue(null);
    vi.mocked(projectionRepository.getProjectionAnnual).mockResolvedValue(null);

    const result = await getProjectionViewUseCase.execute({
      householdId: 'h1',
      projectionId: 'p1',
      auth,
    });

    expect(result?.config?.startYear).toBe(2026);
  });

  it('throws when a derived opening lost its anchor year-month', async () => {
    vi.mocked(projectionRepository.getProjection).mockResolvedValue(projection);
    vi.mocked(projectionRepository.getProjectionConfig).mockResolvedValue({
      ...config,
      openingNetWorth: { amount: 1000, source: 'derived' },
    });
    vi.mocked(projectionRepository.getProjectionSource).mockResolvedValue(null);
    vi.mocked(projectionRepository.getProjectionAnnual).mockResolvedValue(null);

    await expect(
      getProjectionViewUseCase.execute({ householdId: 'h1', projectionId: 'p1', auth }),
    ).rejects.toThrow();
  });
});
