import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type CreateProjectionAtomicallyInput,
  type ProjectionDocument,
} from '@/infra/repositories/projectionRepository';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

const HOUSEHOLD = 'household-projection-test';
const CREATED_AT = new Date('2026-03-02T08:15:00.000Z');

const input = (overrides: Partial<CreateProjectionAtomicallyInput> = {}) => ({
  householdId: HOUSEHOLD,
  projection: {
    name: 'Baseline',
    engineVersion: 1,
    createdAt: CREATED_AT,
    createdBy: 'u1',
    retirementNetWorth: 1_000,
    finalNetWorth: 2_000,
    minNetWorth: 500,
    minNetWorthYear: 2035,
    bankruptcyYear: null,
    isBankrupt: false,
  } satisfies Omit<ProjectionDocument, 'id'>,
  config: {
    startYear: 2026,
    openingNetWorth: { amount: 10_000, source: 'manual' },
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
  results: {
    years: [
      {
        year: 2026,
        age: 36,
        isRetired: false,
        opening: 0,
        return: 0,
        inflows: 0,
        outflows: 0,
        closing: 0,
      },
    ],
  },
  ...overrides,
});

const snapshots = (householdId: string, projectionId: string) => ({
  config: doc(db, 'households', householdId, 'projections', projectionId, 'snapshots', 'config'),
  source: doc(db, 'households', householdId, 'projections', projectionId, 'snapshots', 'source'),
  annual: doc(db, 'households', householdId, 'projections', projectionId, 'results', 'annual'),
});

describe('projectionRepository persistence (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('writes all four documents atomically and stores createdAt as a Timestamp', async () => {
    const written = await projectionRepository.createProjectionAtomically(input());
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    const raw = await getDoc(doc(db, 'households', HOUSEHOLD, 'projections', written.id));
    expect(raw.data()!.createdAt.toDate().getTime()).toBe(CREATED_AT.getTime());

    for (const ref of Object.values(snapshots(HOUSEHOLD, written.id))) {
      expect((await getDoc(ref)).exists()).toBe(true);
    }
  });

  it('round-trips Date fields and nested snapshots back to domain objects', async () => {
    const written = await projectionRepository.createProjectionAtomically(input());
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    const projection = await projectionRepository.getProjection(HOUSEHOLD, written.id);
    expect(projection!.createdAt).toBeInstanceOf(Date);
    expect(projection!.createdAt.getTime()).toBe(CREATED_AT.getTime());
    expect(projection!.name).toBe('Baseline');

    const config = await projectionRepository.getProjectionConfig(HOUSEHOLD, written.id);
    expect(config!.openingNetWorth.amount).toBe(10_000);
    expect(config!.assumptions.birthYear).toBe(1990);

    const annual = await projectionRepository.getProjectionAnnual(HOUSEHOLD, written.id);
    expect(annual!.years).toHaveLength(1);
  });

  it('lists projections newest first with Date createdAt', async () => {
    const older = await projectionRepository.createProjectionAtomically(
      input({
        projection: { ...input().projection, name: 'Older', createdAt: new Date('2026-01-01') },
      }),
    );
    const newer = await projectionRepository.createProjectionAtomically(
      input({
        projection: { ...input().projection, name: 'Newer', createdAt: new Date('2026-02-01') },
      }),
    );
    expect(older.ok && newer.ok).toBe(true);

    const listed = await projectionRepository.listProjections(HOUSEHOLD);
    expect(listed.map((entry) => entry.name)).toEqual(['Newer', 'Older']);
    expect(listed[0].createdAt).toBeInstanceOf(Date);
  });

  it('renames only the main document and deletes all four', async () => {
    const written = await projectionRepository.createProjectionAtomically(input());
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    await projectionRepository.renameProjectionName(HOUSEHOLD, written.id, 'Renamed');
    expect((await projectionRepository.getProjection(HOUSEHOLD, written.id))!.name).toBe('Renamed');
    // The snapshot copy is frozen: it keeps the name it was calculated under.
    expect((await projectionRepository.getProjectionConfig(HOUSEHOLD, written.id))!.startYear).toBe(
      2026,
    );

    await projectionRepository.deleteProjection(HOUSEHOLD, written.id);

    expect(await projectionRepository.getProjection(HOUSEHOLD, written.id)).toBeNull();
    for (const ref of Object.values(snapshots(HOUSEHOLD, written.id))) {
      expect((await getDoc(ref)).exists()).toBe(false);
    }
    expect(await getDocs(collection(db, 'households', HOUSEHOLD, 'projections'))).toMatchObject({
      size: 0,
    });
  });
});
