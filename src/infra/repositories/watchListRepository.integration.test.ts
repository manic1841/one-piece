import { beforeEach, describe, expect, it } from 'vitest';

import { watchListRepository } from '@/infra/repositories/watchListRepository';
import { resetMockDb } from '@/test/mocks/firebase';

// resetMockDb deletes server-side via REST, but the shared long-lived SDK
// connection keeps stale cached snapshots (see firestore-emulator gotchas).
// Unique household IDs per test keep reads cache-cold and deterministic.
let householdSeq = 0;

describe('watch list persistence (Firestore Emulator)', () => {
  beforeEach(async () => {
    await resetMockDb();
    householdSeq += 1;
  });

  const householdId = () => `household-watchlist-${householdSeq}`;

  it('adds, lists, and removes targets across all three target types', async () => {
    const HOUSEHOLD = householdId();
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'project-1', name: '媽媽專案' },
      'user@test.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'LEDGER_CODE', targetId: 'expense:travel', name: '差旅費' },
      'user@test.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'DEBT_ACCOUNT', targetId: 'debt-1', name: '房貸' },
      'user@test.com',
    );

    const targets = await watchListRepository.listTargets(HOUSEHOLD);
    expect(targets).toHaveLength(3);
    expect(targets.map((t) => t.targetType).sort()).toEqual([
      'DEBT_ACCOUNT',
      'LEDGER_CODE',
      'PROJECT',
    ]);
    expect(targets.find((t) => t.targetType === 'LEDGER_CODE')?.targetId).toBe(
      'expense:travel',
    );

    await watchListRepository.removeTarget(HOUSEHOLD, 'PROJECT', 'project-1');
    const afterRemove = await watchListRepository.listTargets(HOUSEHOLD);
    expect(afterRemove).toHaveLength(2);
    expect(afterRemove.find((t) => t.targetType === 'PROJECT')).toBeUndefined();
  });

  it('is idempotent on re-add of the same target (upsert by type + id)', async () => {
    const HOUSEHOLD = householdId();
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'project-1', name: '媽媽專案' },
      'user@test.com',
    );
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'project-1', name: '媽媽專案' },
      'user@test.com',
    );

    const targets = await watchListRepository.listTargets(HOUSEHOLD);
    expect(targets).toHaveLength(1);
  });

  it('returns an empty list for a household without targets', async () => {
    const targets = await watchListRepository.listTargets(householdId());
    expect(targets).toEqual([]);
  });

  it('keeps watch lists scoped per household', async () => {
    const HOUSEHOLD = householdId();
    await watchListRepository.addTarget(
      HOUSEHOLD,
      { targetType: 'PROJECT', targetId: 'project-1', name: '媽媽專案' },
      'user@test.com',
    );

    const otherHousehold = await watchListRepository.listTargets(`${HOUSEHOLD}-other`);
    expect(otherHousehold).toEqual([]);
  });
});
