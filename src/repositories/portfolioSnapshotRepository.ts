import { collection, doc } from 'firebase/firestore';

import { db } from '../firebase';
import { type PortfolioSnapshot, PortfolioSnapshotSchema } from '../schemas';
import { BaseRepository } from './baseRepository';

class PortfolioSnapshotRepository extends BaseRepository<
  PortfolioSnapshot,
  [string, string, string?]
> {
  protected getCollectionRef(householdId: string, portfolioId: string) {
    return collection(this.db, 'households', householdId, 'portfolios', portfolioId, 'snapshots');
  }

  protected getDocRef(householdId: string, portfolioId: string, snapshotId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      'portfolios',
      portfolioId,
      'snapshots',
      snapshotId,
    );
  }

  protected getDomainSchema() {
    return PortfolioSnapshotSchema;
  }

  buildId(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

export const portfolioSnapshotRepository = new PortfolioSnapshotRepository(db);
