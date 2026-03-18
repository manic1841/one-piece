import { collection, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { type PortfolioSnapshot, PortfolioSnapshotSchema } from '@/infra/schemas/portfolio';

/**
 * PortfolioSnapshotRepository
 * Path: households/{householdId}/portfolios/{portfolioId}/snapshots
 */
class PortfolioSnapshotRepository extends BaseRepository<PortfolioSnapshot, [string, string, string?]> {
  private readonly collectionName = 'snapshots';

  protected getCollectionRef(householdId: string, portfolioId: string) {
    return collection(this.db, 'households', householdId, 'portfolios', portfolioId, this.collectionName);
  }

  protected getDocRef(householdId: string, portfolioId: string, snapshotId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      'portfolios',
      portfolioId,
      this.collectionName,
      snapshotId
    );
  }

  protected getDomainSchema() {
    return PortfolioSnapshotSchema;
  }

  buildId(year: number, month: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }
}

export const portfolioSnapshotRepository = new PortfolioSnapshotRepository(db);
