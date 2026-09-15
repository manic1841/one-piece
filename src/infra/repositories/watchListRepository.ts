import { collection, doc } from 'firebase/firestore';

import {
  type WatchListTarget,
  type WatchListTargetCreate,
  WatchListTargetSchema,
  buildWatchListDocId,
} from '@/domains/watch_list/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

/**
 * WatchListRepository
 * Path: households/{householdId}/watchList/{docId}
 * The doc ID is namespaced by target type (buildWatchListDocId) so all three
 * watched-object kinds share one collection without colliding.
 */
class WatchListRepository extends BaseRepository<WatchListTarget, [string, string?]> {
  private readonly collectionName = 'watchList';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, docId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, docId);
  }

  protected getDomainSchema() {
    return WatchListTargetSchema;
  }

  async listTargets(householdId: string): Promise<WatchListTarget[]> {
    return this.list([householdId]);
  }

  async addTarget(
    householdId: string,
    target: WatchListTargetCreate,
    userEmail: string,
  ): Promise<void> {
    await this.set(
      [householdId, buildWatchListDocId(target.targetType, target.targetId)],
      target,
      userEmail,
    );
  }

  async removeTarget(
    householdId: string,
    targetType: WatchListTarget['targetType'],
    targetId: string,
  ): Promise<void> {
    await this.delete([householdId, buildWatchListDocId(targetType, targetId)]);
  }
}

export const watchListRepository = new WatchListRepository(db);
