import { vi } from 'vitest';

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
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    arrayUnion: vi.fn((...args) => args),
    arrayRemove: vi.fn((...args) => args),
    serverTimestamp: vi.fn(() => 'mock-timestamp'),
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
        return new this(1234567890, 0);
      }

      static fromDate(date: Date) {
        return new this(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
      }
    },
  };
});

// Mock local firebase config
vi.mock('@/firebase', () => ({
  db: {},
  auth: {},
}));
