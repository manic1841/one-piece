import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Household } from '@/domains/household/schemas';

import { getHouseholdUseCase, invalidateHouseholdCache } from './getHouseholdUseCase';
import { updateHouseholdUseCase } from './updateHouseholdUseCase';

const { get, update } = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infra/repositories/householdRepository', () => ({
  householdRepository: { get, update },
}));

const household = {
  id: 'hh-1',
  name: 'Family',
  members: { 'u-1': { role: 'owner' } },
  memberUids: ['u-1'],
} as unknown as Household;

const request = { householdId: 'hh-1' };

describe('getHouseholdUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateHouseholdCache();
  });

  it('shares one read between concurrent callers', async () => {
    get.mockResolvedValue(household);

    const [first, second] = await Promise.all([
      getHouseholdUseCase.execute(request),
      getHouseholdUseCase.execute(request),
    ]);

    expect(first).toBe(household);
    expect(second).toBe(household);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('serves a repeated read from the cache instead of Firestore', async () => {
    get.mockResolvedValue(household);

    await getHouseholdUseCase.execute(request);
    await getHouseholdUseCase.execute(request);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('re-reads after the TTL expires', async () => {
    vi.useFakeTimers();
    try {
      get.mockResolvedValue(household);

      await getHouseholdUseCase.execute(request);
      vi.advanceTimersByTime(15_001);
      await getHouseholdUseCase.execute(request);

      expect(get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops the cache when the household is written', async () => {
    get.mockResolvedValue(household);

    await getHouseholdUseCase.execute(request);
    await updateHouseholdUseCase.execute({
      householdId: 'hh-1',
      updates: { name: 'Renamed' },
      userEmail: 'admin@example.com',
    });
    await getHouseholdUseCase.execute(request);

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does not restore a stale in-flight value after a write invalidates it', async () => {
    let resolveFirst!: (value: Household) => void;
    get.mockImplementationOnce(
      () =>
        new Promise<Household>((resolve) => {
          resolveFirst = resolve;
        }),
    );

    const staleRead = getHouseholdUseCase.execute(request);
    await updateHouseholdUseCase.execute({
      householdId: 'hh-1',
      updates: { name: 'Renamed' },
      userEmail: 'admin@example.com',
    });

    const current = { ...household, name: 'Renamed' } as Household;
    get.mockResolvedValueOnce(current);
    resolveFirst(household);
    await staleRead;
    await getHouseholdUseCase.execute(request);
    await getHouseholdUseCase.execute(request);

    expect(get).toHaveBeenCalledTimes(2);
    await expect(getHouseholdUseCase.execute(request)).resolves.toBe(current);
  });
});
