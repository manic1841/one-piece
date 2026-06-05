import { collection, doc, getDocs, limit, query, where } from 'firebase/firestore';

import {
  type AllocationTemplate,
  AllocationTemplateSchema,
} from '@/domains/allocation/templateSchemas';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';

class AllocationTemplateRepository extends BaseRepository<AllocationTemplate, [string, string?]> {
  private readonly collectionName = 'allocationTemplates';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, templateId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, templateId);
  }

  protected getDomainSchema() {
    return AllocationTemplateSchema;
  }

  async getByLedgerCode(
    householdId: string,
    ledgerCode: string,
  ): Promise<AllocationTemplate | null> {
    const q = query(
      this.getCollectionRef(householdId),
      where('ledgerCode', '==', ledgerCode),
      limit(1),
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const data = this.convertFromFirestore(snap.docs[0].data());
    return this.getDomainSchema().parse(data) as AllocationTemplate;
  }

  async getDefaultTemplate(householdId: string): Promise<AllocationTemplate | null> {
    const q = query(this.getCollectionRef(householdId), where('isDefault', '==', true), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const data = this.convertFromFirestore(snap.docs[0].data());
    return this.getDomainSchema().parse(data) as AllocationTemplate;
  }
}

export const allocationTemplateRepository = new AllocationTemplateRepository(db);
