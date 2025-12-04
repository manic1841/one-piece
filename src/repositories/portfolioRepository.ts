import { collection, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PortfolioSchema, type Portfolio } from '../schemas';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type PortfolioFirestore = Omit<Portfolio, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

class PortfolioRepository extends BaseRepository<Portfolio, PortfolioFirestore, [string, string?]> {
  private readonly collectionName = 'portfolios';

  protected getCollectionRef(householdId: string) {
    return collection(db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, portfolioId: string) {
    return doc(db, 'households', householdId, this.collectionName, portfolioId);
  }

  protected toFirestore(entity: Portfolio): PortfolioFirestore {
    return {
      ...entity,
      createdAt: Timestamp.fromDate(entity.createdAt),
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: PortfolioFirestore): Portfolio {
    return PortfolioSchema.parse({
      ...data,
      createdAt: convertToDate(data.createdAt),
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const portfolioRepository = new PortfolioRepository(db);
