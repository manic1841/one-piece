import { z } from 'zod';
import { AccessControlWhitelistSchema } from './schemas';

export type AccessControlWhitelist = z.infer<typeof AccessControlWhitelistSchema>;
