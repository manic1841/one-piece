import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PortfolioSnapshotSchema, type PortfolioSnapshot } from '../schemas';
import { toDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type PortfolioSnapshotFirestore = Omit<PortfolioSnapshot, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class PortfolioSnapshotRepository extends BaseRepository<
  PortfolioSnapshot,
  PortfolioSnapshotFirestore,
  [string, string, string?]
> {
  protected getCollectionRef(householdId: string, portfolioId: string) {
    return collection(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots');
  }

  protected getDocRef(householdId: string, portfolioId: string, snapshotId: string) {
    return doc(db, 'households', householdId, 'portfolios', portfolioId, 'snapshots', snapshotId);
  }

  protected toFirestore(entity: PortfolioSnapshot): PortfolioSnapshotFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: PortfolioSnapshotFirestore): PortfolioSnapshot {
    return PortfolioSnapshotSchema.parse({
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

export const portfolioSnapshotRepository = new PortfolioSnapshotRepository(db);
