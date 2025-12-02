import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// Helper schema for Firestore Timestamp
export const TimestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp, {
  message: 'Must be a Firestore Timestamp',
});

// Helper schema for Date that can be Timestamp or Date
export const DateOrTimestampSchema = z.union([
  TimestampSchema,
  z.date(),
  z.string().transform((str) => new Date(str)),
]);
