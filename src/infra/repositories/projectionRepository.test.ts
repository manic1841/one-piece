import { beforeEach, describe, expect, it, vi } from 'vitest';

import { projectionRepository } from './projectionRepository';

const state = vi.hoisted(() => ({ sequence: 0, calls: [] as string[], batch: null as unknown }));

vi.mock('@/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    private readonly date: Date;

    constructor(date: Date) {
      this.date = date;
    }

    static fromDate(date: Date) {
      return new MockTimestamp(date);
    }

    toDate() {
      return this.date;
    }
  }

  return {
    Timestamp: MockTimestamp,
    collection: vi.fn((...args: unknown[]) => {
      const path = args.slice(1).join('/');
      state.calls.push(`collection:${path}`);
      return { path };
    }),
    doc: vi.fn((...args: unknown[]) => {
      if (args.length === 1) {
        const collectionRef = args[0] as { path: string };
        const id = `generated-${++state.sequence}`;
        state.calls.push(`doc:${collectionRef.path}/${id}`);
        return { path: `${collectionRef.path}/${id}`, id };
      }

      const path = args.slice(1).join('/');
      state.calls.push(`doc:${path}`);
      return { path, id: path.split('/').at(-1) };
    }),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
    orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
    writeBatch: vi.fn(() => {
      state.calls.push('writeBatch');
      const batch = {
        set: vi.fn((ref: { path: string }) => state.calls.push(`set:${ref.path}`)),
        delete: vi.fn((ref: { path: string }) => state.calls.push(`delete:${ref.path}`)),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      state.batch = batch;
      return batch;
    }),
  };
});

const { getDoc, getDocs, writeBatch } = await import('firebase/firestore');

type MockBatch = {
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
};
const batch = () => state.batch as MockBatch;

const baseProjection = {
  name: 'Projection',
  engineVersion: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdBy: 'author@test.com',
  retirementNetWorth: null,
  finalNetWorth: 1,
  minNetWorth: 0,
  minNetWorthYear: null,
  bankruptcyYear: null,
  isBankrupt: false,
};

const baseConfig = {
  startYear: 2026,
  openingNetWorth: { amount: 100, source: 'manual' as const },
  assumptions: {
    birthYear: 1990,
    retirementAge: 65,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [
    {
      id: 'rule-1',
      name: 'Fixed',
      ruleType: 'expense' as const,
      method: 'fixedAmount' as const,
      parameters: { amount: 100 },
      endCondition: { type: 'lifelong' as const },
      enabled: true,
    },
  ],
  lifeEvents: [
    {
      id: 'event-1',
      name: 'Event',
      type: 'expense' as const,
      enabled: true,
      phases: [{ startYear: 2030, endYear: 2030, amount: 1 }],
    },
  ],
};

const baseSource = {
  ruleSources: [
    {
      ruleId: 'rule-1',
      sourceType: 'ledgerCode' as const,
      sourceId: 'expense:food',
      baselineYear: 2025,
      baselineAmount: 100,
    },
  ],
};

const baseAnnual = {
  years: [
    {
      year: 2026,
      age: 36,
      isRetired: false,
      opening: 100,
      return: 1,
      inflows: 0,
      outflows: 0,
      closing: 101,
    },
  ],
};

const input = (overrides: Record<string, unknown> = {}) => ({
  householdId: 'household-1',
  projection: baseProjection,
  config: baseConfig,
  source: baseSource,
  results: baseAnnual,
  ...overrides,
});

describe('projectionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sequence = 0;
    state.calls = [];
    state.batch = null;
  });

  it('writes all four documents in one batch to the exact paths', async () => {
    const result = await projectionRepository.createProjectionAtomically(input());

    expect(result).toEqual({ ok: true, id: 'generated-1' });
    expect(batch().set).toHaveBeenCalledTimes(4);
    expect(state.calls).toEqual([
      'collection:households/household-1/projections',
      'doc:households/household-1/projections/generated-1',
      'writeBatch',
      'set:households/household-1/projections/generated-1',
      'doc:households/household-1/projections/generated-1/snapshots/config',
      'set:households/household-1/projections/generated-1/snapshots/config',
      'doc:households/household-1/projections/generated-1/snapshots/source',
      'set:households/household-1/projections/generated-1/snapshots/source',
      'doc:households/household-1/projections/generated-1/results/annual',
      'set:households/household-1/projections/generated-1/results/annual',
    ]);
    expect(batch().commit).toHaveBeenCalledTimes(1);
  });

  it('generates the id before creating the batch', async () => {
    await projectionRepository.createProjectionAtomically(input());

    expect(state.calls.indexOf('doc:households/household-1/projections/generated-1')).toBeLessThan(
      state.calls.indexOf('writeBatch'),
    );
  });

  it.each([
    ['main', { projection: { ...baseProjection, name: 'x'.repeat(950_000) } }],
    [
      'config',
      {
        config: {
          ...baseConfig,
          lifeEvents: [{ ...baseConfig.lifeEvents[0], name: 'x'.repeat(950_000) }],
        },
      },
    ],
    [
      'source',
      {
        source: { ruleSources: [{ ...baseSource.ruleSources[0], sourceId: 'x'.repeat(950_000) }] },
      },
    ],
    [
      'annual',
      {
        results: {
          years: Array.from({ length: 20_000 }, (_, index) => ({
            ...baseAnnual.years[0],
            year: 1900 + index,
          })),
        },
      },
    ],
  ])('rejects an oversized %s document without committing', async (document, overrides) => {
    const result = await projectionRepository.createProjectionAtomically(
      input(overrides as Record<string, unknown>),
    );

    expect(result).toEqual({ ok: false, code: 'PROJECTION_TOO_LARGE', document });
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('deletes children first and then the main document in one batch', async () => {
    await projectionRepository.deleteProjection('household-1', 'projection-1');

    expect(state.calls).toEqual([
      'writeBatch',
      'doc:households/household-1/projections/projection-1/results/annual',
      'delete:households/household-1/projections/projection-1/results/annual',
      'doc:households/household-1/projections/projection-1/snapshots/source',
      'delete:households/household-1/projections/projection-1/snapshots/source',
      'doc:households/household-1/projections/projection-1/snapshots/config',
      'delete:households/household-1/projections/projection-1/snapshots/config',
      'doc:households/household-1/projections/projection-1',
      'delete:households/household-1/projections/projection-1',
    ]);
    expect(batch().commit).toHaveBeenCalledTimes(1);
  });

  it('does not expose an update method', () => {
    expect('update' in projectionRepository).toBe(false);
    expect('updateProjection' in projectionRepository).toBe(false);
  });

  it('lists projections ordered by createdAt desc', async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await projectionRepository.listProjections('household-1');

    const queryArg = vi.mocked(getDocs).mock.calls[0][0] as unknown as {
      constraints: Array<{ field: string; direction: string }>;
    };
    expect(queryArg.constraints).toEqual([{ field: 'createdAt', direction: 'desc' }]);
  });

  it('reads the main document and its children from the exact paths', async () => {
    vi.mocked(getDoc).mockImplementation(async (ref) => {
      const path = (ref as unknown as { path: string }).path;
      const data = path.endsWith('/config')
        ? baseConfig
        : path.endsWith('/source')
          ? baseSource
          : path.endsWith('/annual')
            ? baseAnnual
            : baseProjection;

      return { exists: () => true, id: path.split('/').at(-1), data: () => data } as never;
    });

    const projection = await projectionRepository.getProjection('household-1', 'projection-1');
    const config = await projectionRepository.getProjectionConfig('household-1', 'projection-1');
    const source = await projectionRepository.getProjectionSource('household-1', 'projection-1');
    const annual = await projectionRepository.getProjectionAnnual('household-1', 'projection-1');

    expect(projection?.id).toBe('projection-1');
    expect(config?.startYear).toBe(2026);
    expect(source?.ruleSources[0].sourceId).toBe('expense:food');
    expect(annual?.years[0].closing).toBe(101);
    expect(
      vi.mocked(getDoc).mock.calls.map(([ref]) => (ref as unknown as { path: string }).path),
    ).toEqual([
      'households/household-1/projections/projection-1',
      'households/household-1/projections/projection-1/snapshots/config',
      'households/household-1/projections/projection-1/snapshots/source',
      'households/household-1/projections/projection-1/results/annual',
    ]);
  });
});
