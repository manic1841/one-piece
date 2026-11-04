import { z } from 'zod';

import { RetirementSchemaErrorCode } from './errorCodes';

/** Shared plan/projection name rule; both stable codes come from here. */
export const retirementNameSchema = z
  .string()
  .trim()
  .min(1, RetirementSchemaErrorCode.NAME_REQUIRED)
  .max(100, RetirementSchemaErrorCode.NAME_TOO_LONG);
