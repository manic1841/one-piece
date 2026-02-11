import { collection, doc, Timestamp } from 'firebase/firestore';

import { toDate } from '@/utils/dateUtils';

import { db } from '../firebase';
import { PortfolioSchema, type Portfolio } from '../schemas';

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

  protected toFirestore(entity: Portfolio): Partial<PortfolioFirestore> {
    return {
      ...entity,
      createdAt: entity.createdAt ? Timestamp.fromDate(entity.createdAt) : undefined,
      updatedAt: entity.updatedAt ? Timestamp.fromDate(entity.updatedAt) : undefined,
    };
  }

  protected fromFirestore(data: PortfolioFirestore): Portfolio {
    return PortfolioSchema.parse({
      ...data,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

export const portfolioRepository = new PortfolioRepository(db);
