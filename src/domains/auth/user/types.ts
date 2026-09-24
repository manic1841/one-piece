import { z } from 'zod';
import { UserProfileCreateSchema, UserProfileSchema } from './schemas';

export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
