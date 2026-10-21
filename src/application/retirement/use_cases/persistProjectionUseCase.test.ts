import { beforeEach, describe, expect, it, vi } from 'vitest';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type ProjectionCalculation } from '@/application/retirement/types';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

import { ProjectionCommandErrorCode } from '../errors';
import { persistProjectionUseCase } from './persistProjectionUseCase';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertWritePermission: vi.fn() },
}));

vi.mock('@/infra/repositories/projectionRepository', () => ({
  projectionRepository: { createProjectionAtomically: vi.fn() },
}));

const auth = { uid: 'u1', email: 'user@example.com', isGlobalAdmin: false };

const calculation: ProjectionCalculation = {
  input: {
    firstYear: 2026,
    lastYear: 2050,
    retirementYear: 2050,
    birthYear: 1990,
    openingNetWorth: 100_000,
    annualReturnRate: 0.05,
    years: [],
  },
  result: {
    years: [
      {
        year: 2026,
        age: 36,
        isRetired: false,
        opening: 100_000,
        return: 5_000,
        inflows: 0,
        outflows: 0,
        closing: 105_000,
      },
    ],
    summary: {
      retirementNetWorth: 105_000,
      finalNetWorth: 105_000,
      minNetWorth: 105_000,
      minNetWorthYear: 2026,
      bankruptcyYear: null,
      isBankrupt: false,
    },
  },
  warnings: [],
  config: {
    startYear: 2026,
    openingNetWorth: { amount: 100_000, source: 'manual' },
    assumptions: {
      birthYear: 1990,
      retirementAge: 60,
      lifeExpectancy: 85,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [],
    lifeEvents: [],
  },
  source: { ruleSources: [] },
  startYear: 2026,
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    householdId: 'household-1',
    auth,
    name: 'My projection',
    calculation,
    ...overrides,
  };
}

describe('persistProjectionUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdPermissionService.assertWritePermission).mockResolvedValue();
  });

  it('writes the main, config, source and results payloads in one call', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: true,
      id: 'projection-1',
    });

    const outcome = await persistProjectionUseCase.execute(request());

    expect(outcome).toMatchObject({ ok: true, id: 'projection-1' });
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'household-1',
        projection: expect.objectContaining({
          name: 'My projection',
          engineVersion: 1,
          createdBy: 'user@example.com',
        }),
        config: expect.objectContaining({
          startYear: 2026,
          openingNetWorth: { amount: 100_000, source: 'manual' },
        }),
        source: { ruleSources: [] },
        results: expect.objectContaining({ years: expect.any(Array) }),
      }),
    );
  });

  it('rejects a blank name before writing', async () => {
    const outcome = await persistProjectionUseCase.execute(request({ name: '   ' }));

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
    });
    expect(projectionRepository.createProjectionAtomically).not.toHaveBeenCalled();
  });

  it('maps document size failures to PROJECTION_TOO_LARGE', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockResolvedValue({
      ok: false,
      code: 'PROJECTION_TOO_LARGE',
      document: 'annual',
    });

    const outcome = await persistProjectionUseCase.execute(request());

    expect(outcome).toMatchObject({
      ok: false,
      code: ProjectionCommandErrorCode.PROJECTION_TOO_LARGE,
    });
  });

  it('propagates a rejected batch', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically).mockRejectedValue(
      new Error('batch failed'),
    );

    await expect(persistProjectionUseCase.execute(request())).rejects.toThrow('batch failed');
  });

  it('uses a fresh repository id on every retry', async () => {
    vi.mocked(projectionRepository.createProjectionAtomically)
      .mockResolvedValueOnce({ ok: true, id: 'projection-a' })
      .mockResolvedValueOnce({ ok: true, id: 'projection-b' });

    const first = await persistProjectionUseCase.execute(request());
    const second = await persistProjectionUseCase.execute(request());

    expect(first).toMatchObject({ ok: true, id: 'projection-a' });
    expect(second).toMatchObject({ ok: true, id: 'projection-b' });
    expect(projectionRepository.createProjectionAtomically).toHaveBeenCalledTimes(2);
  });
});
