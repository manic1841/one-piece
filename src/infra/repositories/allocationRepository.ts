import { collection, doc, getDocs, query, where } from 'firebase/firestore';

import { type Allocation, AllocationSchema } from '@/domains/allocation/schemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

/**
 * AllocationRepository
 * Path: households/{householdId}/allocations
 */
class AllocationRepository extends BaseRepository<Allocation, [string, string?]> {
  private readonly collectionName = 'allocations';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, allocationId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, allocationId);
  }

  protected getDomainSchema() {
    return AllocationSchema;
  }

  async getAllocationsByMonth(householdId: string, yearMonth: string): Promise<Allocation[]> {
    const q = query(this.getCollectionRef(householdId), where('yearMonth', '==', yearMonth));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => this.convertFromFirestore(doc.data()));
  }

  async listByProject(
    householdId: string,
    projectId: string,
    yearMonth?: string,
  ): Promise<Allocation[]> {
    const allocations = yearMonth
      ? await this.getAllocationsByMonth(householdId, yearMonth)
      : await this.list([householdId]);

    return allocations.filter(
      (allocation) =>
        allocation.projectIds.includes(projectId) ||
        allocation.items.some((item) => item.projectId === projectId),
    );
  }
}

export const allocationRepository = new AllocationRepository(db);
