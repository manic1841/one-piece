import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RetirementPlanCreate } from '@/domains/retirement/types';

import { retirementPlanRepository } from './retirementPlanRepository';

const state = vi.hoisted(() => ({ sequence: 0, calls: [] as string[] }));

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
    serverTimestamp: vi.fn(() => new MockTimestamp(new Date('2026-01-01T00:00:00.000Z'))),
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
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((ref: unknown, ...constraints: unknown[]) => ({ ref, constraints })),
    orderBy: vi.fn((field: string, direction: string) => ({ field, direction })),
  };
});

const { Timestamp, getDoc, getDocs, setDoc, updateDoc, deleteDoc } = await import(
  'firebase/firestore'
);

function validPlan(overrides: Record<string, unknown> = {}): RetirementPlanCreate {
  return {
    name: 'Plan',
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
        ruleType: 'expense',
        method: 'fixedAmount',
        parameters: { amount: 100 },
        endCondition: { type: 'lifelong' },
        enabled: true,
      },
    ],
    lifeEvents: [
      {
        id: 'event-1',
        name: 'Event',
        type: 'expense',
        enabled: true,
        phases: [{ startYear: 2030, endYear: 2030, amount: 1 }],
      },
    ],
    createdBy: 'creator@test.com',
    updatedBy: 'creator@test.com',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as RetirementPlanCreate;
}

/** Firestore hands timestamps back, not Dates. */
function storedPlan(overrides: Record<string, unknown> = {}) {
  const plan = validPlan(overrides);
  return {
    ...plan,
    id: 'plan-1',
    createdAt: Timestamp.fromDate(plan.createdAt),
    updatedAt: Timestamp.fromDate(plan.updatedAt),
  };
}

const existingSnapshot = (overrides: Record<string, unknown> = {}) => ({
  exists: () => true,
  id: 'plan-1',
  data: () => storedPlan(overrides),
});

describe('retirementPlanRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.sequence = 0;
    state.calls = [];
  });

  it('writes a plan under retirementPlans with base audit fields', async () => {
    await retirementPlanRepository.createPlan({
      householdId: 'household-1',
      plan: validPlan(),
      userEmail: 'author@test.com',
    });

    expect(setDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = vi.mocked(setDoc).mock.calls[0];
    expect((ref as unknown as { path: string }).path).toBe(
      'households/household-1/retirementPlans/generated-1',
    );
    expect(payload).toMatchObject({
      id: 'generated-1',
      name: 'Plan',
      createdBy: 'author@test.com',
      updatedBy: 'author@test.com',
    });
  });

  it('rejects a plan over the per-document size limit without writing', async () => {
    const result = await retirementPlanRepository.createPlan({
      householdId: 'household-1',
      plan: validPlan({
        lifeEvents: [
          {
            id: 'event-1',
            name: 'x'.repeat(950_000),
            type: 'expense',
            enabled: true,
            phases: [{ startYear: 2030, endYear: 2030, amount: 1 }],
          },
        ],
      }),
      userEmail: 'author@test.com',
    });

    expect(result).toEqual({ ok: false, code: 'PLAN_TOO_LARGE' });
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('updates a plan without writing birthYear', async () => {
    const result = await retirementPlanRepository.updatePlan({
      householdId: 'household-1',
      planId: 'plan-1',
      userEmail: 'author@test.com',
      plan: {
        ...validPlan(),
        assumptions: {
          retirementAge: 65,
          lifeExpectancy: 85,
          inflationRate: 0.02,
          annualReturnRate: 0.05,
        },
      } as never,
    });

    expect(result).toEqual({ ok: true });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = vi.mocked(updateDoc).mock.calls[0];
    expect((ref as unknown as { path: string }).path).toBe(
      'households/household-1/retirementPlans/plan-1',
    );
    expect(payload).not.toHaveProperty('birthYear');
    expect((payload as { assumptions: Record<string, unknown> }).assumptions).not.toHaveProperty(
      'birthYear',
    );
  });

  it('rejects an oversized update without writing', async () => {
    const result = await retirementPlanRepository.updatePlan({
      householdId: 'household-1',
      planId: 'plan-1',
      userEmail: 'author@test.com',
      plan: validPlan({
        lifeEvents: [
          {
            id: 'event-1',
            name: 'x'.repeat(950_000),
            type: 'expense',
            enabled: true,
            phases: [{ startYear: 2030, endYear: 2030, amount: 1 }],
          },
        ],
      }) as never,
    });

    expect(result).toEqual({ ok: false, code: 'PLAN_TOO_LARGE' });
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('hard deletes a plan', async () => {
    await retirementPlanRepository.deletePlan('household-1', 'plan-1');

    expect(deleteDoc).toHaveBeenCalledTimes(1);
    expect((vi.mocked(deleteDoc).mock.calls[0][0] as unknown as { path: string }).path).toBe(
      'households/household-1/retirementPlans/plan-1',
    );
  });

  it('lists plans ordered by updatedAt desc', async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [] } as never);

    await retirementPlanRepository.listPlans('household-1');

    const queryArg = vi.mocked(getDocs).mock.calls[0][0] as unknown as {
      constraints: Array<{ field: string; direction: string }>;
    };
    expect(queryArg.constraints).toEqual([{ field: 'updatedAt', direction: 'desc' }]);
  });

  it('reads a plan by id with the document id attached', async () => {
    vi.mocked(getDoc).mockResolvedValue(existingSnapshot() as never);

    const plan = await retirementPlanRepository.getPlan('household-1', 'plan-1');

    expect(plan?.id).toBe('plan-1');
    expect(plan?.name).toBe('Plan');
    expect(plan?.assumptions.birthYear).toBe(1990);
    expect(plan?.createdAt).toBeInstanceOf(Date);
  });

  it('lists plans with timestamps converted back to Dates', async () => {
    vi.mocked(getDocs).mockResolvedValue({ docs: [existingSnapshot()] } as never);

    const [plan] = await retirementPlanRepository.listPlans('household-1');

    expect(plan.updatedAt).toBeInstanceOf(Date);
  });
});
