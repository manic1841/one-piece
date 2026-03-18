import { collection, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { BaseRepository } from '@/infra/repositories/baseRepository';
import { type AccessControlWhitelist } from '@/domains/access_control/types';
import { AccessControlWhitelistSchema } from '@/domains/access_control/schemas';

class AccessControlRepository extends BaseRepository<AccessControlWhitelist, [string?]> {
  private readonly collectionName = 'access_control';
  private readonly whitelistDocId = 'whitelist';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(docId: string = this.whitelistDocId) {
    return doc(this.getCollectionRef(), docId);
  }

  protected getDomainSchema() {
    return AccessControlWhitelistSchema;
  }
  
  async getWhitelist(): Promise<AccessControlWhitelist | null> {
    return this.get([this.whitelistDocId]);
  }

  async saveWhitelist(data: Omit<AccessControlWhitelist, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userEmail: string): Promise<void> {
    await this.create([], data, userEmail, undefined, this.whitelistDocId);
  }
}

export const accessControlRepository = new AccessControlRepository(db);
