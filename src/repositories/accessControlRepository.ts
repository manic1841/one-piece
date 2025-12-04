import { doc, Timestamp, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { type AccessControl, AccessControlSchema } from '../schemas';
import { convertToDate } from '@/utils/dateUtils';
import { BaseRepository } from './baseRepository';

type AccessControlFirestore = {
  whitelistedEmails: string[];
  updatedAt: Timestamp;
  updatedBy: string;
};

class AccessControlRepository extends BaseRepository<AccessControl, AccessControlFirestore, []> {
  private readonly collectionName = 'access_control';
  private readonly docId = 'config';

  protected getCollectionRef() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef() {
    return doc(this.getCollectionRef(), this.docId);
  }

  protected toFirestore(entity: AccessControl): AccessControlFirestore {
    return {
      ...entity,
      updatedAt: Timestamp.fromDate(entity.updatedAt),
    };
  }

  protected fromFirestore(data: AccessControlFirestore): AccessControl {
    return AccessControlSchema.parse({
      ...data,
      updatedAt: convertToDate(data.updatedAt),
    });
  }
}

export const accessControlRepository = new AccessControlRepository(db);
