import { describe, expect, it } from 'vitest';

import { HouseholdBackupPayloadSchema } from '@/application/household/use_cases/backupSchema';

import { buildDemoBackupPayload } from '../../scripts/qa/demoBackup';
import { buildQaSeedPlan } from '../../scripts/qa/plan';

const identity = {
  householdId: 'demo_household',
  uid: 'demo_uid',
  email: 'demo@example.com',
  householdName: 'Demo Family',
};

/** Documents the payload would write, excluding the household document itself. */
const countPayloadDocs = (payload: ReturnType<typeof buildDemoBackupPayload>) => {
  const { collections } = payload;
  const withSnapshots = (entries: ReadonlyArray<{ snapshots: readonly unknown[] }>): number =>
    entries.reduce((sum, entry) => sum + 1 + entry.snapshots.length, 0);

  return (
    withSnapshots(collections.accounts) +
    withSnapshots(collections.projects) +
    withSnapshots(collections.portfolios) +
    withSnapshots(collections.debtAccounts) +
    collections.retirementPlans.length +
    collections.projections.length * 4 + // projection + config + source + annual
    collections.transactions.length +
    collections.reports.length +
    collections.allocations.length +
    collections.allocationTemplates.length +
    collections.ledgerCodes.length +
    collections.intentMappings.length +
    (collections.financialPeriods?.length ?? 0)
  );
};

describe('buildDemoBackupPayload', () => {
  const payload = buildDemoBackupPayload(identity);

  it('produces a payload the restore schema accepts', () => {
    expect(HouseholdBackupPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it('keeps the live owner as household owner', () => {
    expect(payload.householdId).toBe(identity.householdId);
    expect(payload.household.members).toHaveProperty(identity.uid);
    expect(payload.household.members[identity.uid].role).toBe('owner');
    expect(payload.household.memberUids).toEqual([identity.uid]);
    expect(payload.household.createdBy).toBe(identity.email);
  });

  it('maps every seed document', () => {
    const seedDocs = buildQaSeedPlan(identity);
    expect(countPayloadDocs(payload)).toBe(seedDocs.length);
  });

  it('re-attaches the projection id that the persisted document omits', () => {
    expect(payload.collections.projections).toHaveLength(1);
    expect(payload.collections.projections[0].projection).toMatchObject({
      id: expect.any(String),
    });
  });
});
