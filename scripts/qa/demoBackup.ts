/**
 * Pure builder for the live demo backup payload.
 *
 * Turns the deterministic QA plan (scripts/qa/plan) into the `schemaVersion: 2`
 * shape the household restore path accepts. Kept apart from the CLI so a unit
 * test can lock the plan→payload mapping without touching the filesystem.
 *
 * No Firebase import: the payload is written to JSON and imported by the user,
 * so no service account, admin SDK or emulator host is involved.
 */
import { HouseholdBackupPayloadSchema } from '@/application/household/use_cases/backupSchema';
import { type HouseholdBackupPayload } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import { RoleEnum } from '@/domains/household/role';

import { type SeedDoc, buildQaSeedPlan } from './plan';
import { QA_SEED_FIXED_NOW } from './plan/shared';

export interface DemoBackupIdentity {
  householdId: string;
  uid: string;
  email: string;
  householdName: string;
}

type SnapshotBucket = { snapshots: Map<string, unknown> };

/** Collections whose documents carry a snapshot subcollection. */
const ENTITY_KEY = {
  accounts: 'account',
  projects: 'project',
  portfolios: 'portfolio',
  debtAccounts: 'debtAccount',
} as const;

type EntityCollection = keyof typeof ENTITY_KEY;
type EntityBucket = SnapshotBucket & Record<string, unknown>;

const slot = <T extends object>(buckets: Map<string, T>, id: string, make: () => T): T => {
  let bucket = buckets.get(id);
  if (!bucket) {
    bucket = make();
    buckets.set(id, bucket);
  }
  return bucket;
};

/**
 * Groups flat seed docs into the backup payload shape. Paths carry no
 * household segment once split: `accounts/acc_cash/snapshots/2026-08` becomes
 * a snapshot on account `acc_cash`.
 */
const toCollections = (docs: SeedDoc[], householdId: string) => {
  const entities: Record<EntityCollection, Map<string, EntityBucket>> = {
    accounts: new Map(),
    projects: new Map(),
    portfolios: new Map(),
    debtAccounts: new Map(),
  };
  const projections = new Map<
    string,
    { projection?: unknown; config?: unknown; source?: unknown; annual?: unknown }
  >();

  const retirementPlans: unknown[] = [];
  const transactions: unknown[] = [];
  const reports: unknown[] = [];
  const allocations: unknown[] = [];
  const allocationTemplates: unknown[] = [];
  const ledgerCodes: unknown[] = [];
  const intentMappings: unknown[] = [];
  const financialPeriods: unknown[] = [];

  const prefix = `households/${householdId}/`;

  for (const doc of docs) {
    if (!doc.collectionPath.startsWith(prefix)) {
      throw new Error(`Seed doc outside household ${householdId}: ${doc.collectionPath}`);
    }
    const parts = doc.collectionPath.slice(prefix.length).split('/');
    const collection = parts[0];
    const childCollection = parts[2];
    // A top-level doc (parts.length === 1) is the entity itself; otherwise the
    // entity id is the segment before the child collection.
    const entityId = childCollection ? parts[1] : doc.id;

    if (Object.hasOwn(ENTITY_KEY, collection)) {
      const kind = collection as EntityCollection;
      const bucket = slot(entities[kind], entityId, () => ({ snapshots: new Map() }));
      if (!childCollection) bucket[ENTITY_KEY[kind]] = doc.data;
      else bucket.snapshots.set(doc.id, doc.data);
      continue;
    }

    switch (collection) {
      case 'projections': {
        const bucket = slot(projections, entityId, () => ({}));
        // Persisted projection docs carry no id; the repository re-attaches it
        // on read, and the backup schema expects it.
        if (!childCollection) bucket.projection = { ...doc.data, id: entityId };
        // Fixed child ids: snapshots/config, snapshots/source, results/annual.
        else if (childCollection === 'snapshots' && doc.id === 'config') bucket.config = doc.data;
        else if (childCollection === 'snapshots' && doc.id === 'source') bucket.source = doc.data;
        else if (childCollection === 'results' && doc.id === 'annual') bucket.annual = doc.data;
        else throw new Error(`Unknown projection child path: ${doc.collectionPath}/${doc.id}`);
        break;
      }
      case 'retirementPlans':
        retirementPlans.push(doc.data);
        break;
      case 'transactions':
        transactions.push(doc.data);
        break;
      case 'reports':
        reports.push(doc.data);
        break;
      case 'allocations':
        allocations.push(doc.data);
        break;
      case 'allocationTemplates':
        allocationTemplates.push(doc.data);
        break;
      case 'ledgerCodes':
        ledgerCodes.push(doc.data);
        break;
      case 'intent_mappings':
        intentMappings.push(doc.data);
        break;
      case 'financialPeriods':
        financialPeriods.push(doc.data);
        break;
      default:
        throw new Error(`Unmapped seed collection: ${doc.collectionPath}`);
    }
  }

  const byId = (a: string, b: string) => a.localeCompare(b);
  const snapshotArray = (map: Map<string, unknown>) =>
    [...map.keys()].sort(byId).map((id) => map.get(id));

  // Each entity keeps its payload key (`{ account, snapshots }`, …), which is
  // why the key name is passed in rather than spreading the entity.
  const bucketsToArray = (kind: EntityCollection) =>
    [...entities[kind].keys()].sort(byId).map((id) => {
      const bucket = entities[kind].get(id)!;
      return {
        [ENTITY_KEY[kind]]: bucket[ENTITY_KEY[kind]],
        snapshots: snapshotArray(bucket.snapshots),
      };
    });

  return {
    accounts: bucketsToArray('accounts'),
    projects: bucketsToArray('projects'),
    portfolios: bucketsToArray('portfolios'),
    debtAccounts: bucketsToArray('debtAccounts'),
    retirementPlans,
    projections: [...projections.keys()].sort(byId).map((id) => {
      const { projection, config, source, annual } = projections.get(id)!;
      return { projection, config, source, annual };
    }),
    transactions,
    reports,
    allocations,
    allocationTemplates,
    ledgerCodes,
    intentMappings,
    financialPeriods,
  };
};

/**
 * Builds and validates the payload. Validation runs before the caller writes
 * anything, so plan/schema drift fails loudly with no partial file.
 */
export const buildDemoBackupPayload = (identity: DemoBackupIdentity): HouseholdBackupPayload => {
  const { householdId, uid, email, householdName } = identity;
  const docs = buildQaSeedPlan({ uid, email, householdId });

  const payload: HouseholdBackupPayload = {
    schemaVersion: 2,
    exportedAt: QA_SEED_FIXED_NOW.toISOString(),
    householdId,
    // The live owner, not the emulator QA identity: importing overwrites the
    // household document, so members must survive the round trip.
    household: {
      id: householdId,
      name: householdName,
      memberUids: [uid],
      members: { [uid]: { role: RoleEnum.OWNER, joinedAt: QA_SEED_FIXED_NOW } },
      createdBy: email,
      createdAt: QA_SEED_FIXED_NOW,
      updatedBy: email,
      updatedAt: QA_SEED_FIXED_NOW,
    },
    collections: toCollections(docs, householdId),
  };

  return HouseholdBackupPayloadSchema.parse(payload) as unknown as HouseholdBackupPayload;
};
