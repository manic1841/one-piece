import { collection, doc } from 'firebase/firestore';

import { db } from '../firebase';
import { type Portfolio, PortfolioSchema } from '../schemas';
import { BaseRepository } from './baseRepository';

class PortfolioRepository extends BaseRepository<Portfolio, [string, string?]> {
  private readonly collectionName = 'portfolios';

  protected getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  protected getDocRef(householdId: string, portfolioId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, portfolioId);
  }

  protected getDomainSchema() {
    return PortfolioSchema;
  }
}

export const portfolioRepository = new PortfolioRepository(db);
