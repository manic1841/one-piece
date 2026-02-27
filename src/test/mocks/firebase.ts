import { vi } from 'vitest';

// --- In-Memory DB Logic ---
interface MockDoc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
export const mockDb: Record<string, MockDoc> = {};

// Helper to reset the DB
export const resetMockDb = () => {
  for (const key in mockDb) delete mockDb[key];
};

// Helper to filter docs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterDocs = (collectionPath: string, constraints: any[]) => {
  return Object.entries(mockDb)
    .filter(([path]) => {
      // Simple check: is it a direct child of the collection?
      if (!path.startsWith(collectionPath + '/')) {
        return false;
      }
      const rest = path.slice(collectionPath.length + 1);
      return !rest.includes('/');
    })
    .map(([path, data]) => ({ ...data, id: path.split('/').pop() }))
    .filter((doc) => {
      if (!constraints || constraints.length === 0) return true;
      return constraints.every((c) => {
        if (c.type === 'where') {
          const { field, op, value } = c;
          const docValue = doc[field];

          // --- Improved Date/Timestamp Handling ---
          // normalize to millis if possible
          let docTime: number | undefined;
          let valTime: number | undefined;

          if (docValue && typeof docValue.toDate === 'function') {
            docTime = docValue.toDate().getTime();
          } else if (docValue instanceof Date) {
            docTime = docValue.getTime();
          }

          if (value && typeof value.toDate === 'function') {
            valTime = value.toDate().getTime();
          } else if (value instanceof Date) {
            valTime = value.getTime();
          }

          if (docTime !== undefined && valTime !== undefined) {
            if (op === '>=') return docTime >= valTime;
            if (op === '<=') return docTime <= valTime;
            if (op === '==') return docTime === valTime;
            if (op === '>') return docTime > valTime;
            if (op === '<') return docTime < valTime;
          }
          // --- End Date Handling ---

          if (op === '==') return docValue === value;
          if (op === '>=') return docValue >= value;
          if (op === '<=') return docValue <= value;
          if (op === '>') return docValue > value;
          if (op === '<') return docValue < value;
          if (op === 'array-contains') return Array.isArray(docValue) && docValue.includes(value);
          return true;
        }
        return true;
      });
    })
    .sort((a, b) => {
      // Find orderBy constraint
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sortC = constraints.find((c: any) => c.type === 'orderBy');
      if (sortC) {
        const { field, dir } = sortC;
        const va = a[field];
        const vb = b[field];
        // Handle Timestamps
        const valA = va && typeof va.toDate === 'function' ? va.toDate().getTime() : va;
        const valB = vb && typeof vb.toDate === 'function' ? vb.toDate().getTime() : vb;

        if (valA < valB) return dir === 'desc' ? 1 : -1;
        if (valA > valB) return dir === 'desc' ? -1 : 1;
        return 0;
      }
      return 0;
    });
};

// Mock Firebase App
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');

  return {
    ...actual,
    getFirestore: vi.fn(),
    collection: vi.fn((db, ...pathSegments) => ({
      type: 'collection',
      path: pathSegments.join('/'),
    })),
    doc: vi.fn((refOrDb, ...pathSegments) => {
      if (refOrDb.type === 'collection') {
        const id =
          pathSegments.length > 0
            ? pathSegments[0]
            : 'new-id-' + Math.random().toString(36).substr(2, 9);
        return { id, path: refOrDb.path + '/' + id };
      }
      const path = pathSegments.join('/');
      return { id: pathSegments[pathSegments.length - 1], path };
    }),
    getDoc: vi.fn(async (ref) => ({
      exists: () => !!mockDb[ref.path],
      data: () => mockDb[ref.path],
      id: ref.id,
    })),
    getDocs: vi.fn(async (queryOrRef) => {
      let path = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let constraints: any[] = [];

      if (queryOrRef.type === 'collection') {
        path = queryOrRef.path;
      } else if (queryOrRef.type === 'query') {
        path = queryOrRef.source.path;
        constraints = queryOrRef.constraints;
      }

      const docs = filterDocs(path, constraints);

      return {
        empty: docs.length === 0,
        docs: docs.map((d) => ({
          id: d.id,
          data: () => d,
        })),
        size: docs.length,
      };
    }),
    setDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = data;
    }),
    updateDoc: vi.fn(async (ref, data) => {
      mockDb[ref.path] = { ...mockDb[ref.path], ...data };
    }),
    deleteDoc: vi.fn(async (ref) => {
      delete mockDb[ref.path];
    }),
    addDoc: vi.fn(async (ref, data) => {
      const newId = 'new-id-' + Math.random().toString(36).substr(2, 9);
      const path = ref.path + '/' + newId;
      mockDb[path] = data;
      return { id: newId, path };
    }),
    query: vi.fn((collectionRef, ...constraints) => ({
      type: 'query',
      source: collectionRef,
      constraints,
    })),
    where: vi.fn((field, op, value) => ({ type: 'where', field, op, value })),
    orderBy: vi.fn((field, dir = 'asc') => ({ type: 'orderBy', field, dir })),
    limit: vi.fn((limitVal) => ({ type: 'limit', value: limitVal })),
    startAfter: vi.fn(),
    arrayUnion: vi.fn((...args) => args),
    arrayRemove: vi.fn((...args) => args),
    serverTimestamp: vi.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: (Date.now() % 1000) * 1000000,
    })),
    runTransaction: vi.fn(async (db, callback) => {
      const transaction = {
        get: async (ref: { path: string; id: string }) => ({
          exists: () => !!mockDb[ref.path],
          data: () => mockDb[ref.path],
          id: ref.id,
        }),
        set: (ref: { path: string }, data: unknown) => {
          mockDb[ref.path] = data as MockDoc;
        },
        update: (ref: { path: string }, data: unknown) => {
          mockDb[ref.path] = { ...(mockDb[ref.path] as object), ...(data as object) };
        },
        delete: (ref: { path: string }) => {
          delete mockDb[ref.path];
        },
      };
      return callback(transaction);
    }),
    Timestamp: class {
      seconds: number;
      nanoseconds: number;

      constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
      }

      toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
      }

      toMillis() {
        return this.seconds * 1000 + this.nanoseconds / 1000000;
      }

      static now() {
        // Return a new timestamp representing the current time
        const now = Date.now();
        return new this(Math.floor(now / 1000), (now % 1000) * 1000000);
      }

      static fromDate(date: Date) {
        return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
      }

      static fromMillis(millis: number) {
        return new this(Math.floor(millis / 1000), (millis % 1000) * 1000000);
      }

      static fromSeconds(seconds: number) {
        return new this(seconds, 0);
      }
    },
  };
});

// Mock local firebase config
vi.mock('@/firebase', () => ({
  db: {},
  auth: {},
}));
