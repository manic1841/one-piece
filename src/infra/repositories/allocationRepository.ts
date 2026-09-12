import { collection, doc, getDocs, query, type Transaction, where } from 'firebase/firestore';

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

  async getBySourceTransactionId(
    householdId: string,
    sourceTransactionId: string,
  ): Promise<Allocation | null> {
    const allocations = await this.listBySourceTransactionId(householdId, sourceTransactionId);
    return (
      allocations.find((allocation) => allocation.id === sourceTransactionId) ??
      allocations[0] ??
      null
    );
  }

  async listBySourceTransactionId(
    householdId: string,
    sourceTransactionId: string,
  ): Promise<Allocation[]> {
    const q = query(
      this.getCollectionRef(householdId),
      where('sourceTransactionId', '==', sourceTransactionId),
    );
    const snap = await getDocs(q);

    return snap.docs.map((allocationDoc) => {
      const allocation = this.convertFromFirestore(allocationDoc.data());
      return this.getDomainSchema().parse(allocation);
    });
  }

  async getByIds(
    householdId: string,
    allocationIds: string[],
    tx: Transaction,
  ): Promise<Allocation[]> {
    const uniqueIds = [...new Set(allocationIds.filter((allocationId) => allocationId.length > 0))];
    const allocations = await Promise.all(
      uniqueIds.map((allocationId) => this.get([householdId, allocationId], tx)),
    );
    return allocations.filter((allocation): allocation is Allocation => allocation !== null);
  }

  async listByProject(
    householdId: string,
    projectId: string,
    yearMonth?: string,
    sinceYearMonth?: string,
  ): Promise<Allocation[]> {
    const constraints = [where('projectIds', 'array-contains', projectId)];
    if (yearMonth) {
      constraints.push(where('yearMonth', '==', yearMonth));
    }
    if (sinceYearMonth) {
      constraints.push(where('yearMonth', '>=', sinceYearMonth));
    }

    return this.list([householdId], constraints);
  }
}

export const allocationRepository = new AllocationRepository(db);
