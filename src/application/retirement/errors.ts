import { type z } from 'zod';

import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { type ProjectionResolveError } from '@/domains/retirement/logic/projectionTypes';

export const ProjectionCommandErrorCode = {
  PROJECTION_VALIDATION_FAILED: 'PROJECTION_VALIDATION_FAILED',
  PROJECTION_RESOLVE_FAILED: 'PROJECTION_RESOLVE_FAILED',
  PROJECTION_TOO_LARGE: 'PROJECTION_TOO_LARGE',
} as const;

export type ProjectionCommandErrorCode =
  (typeof ProjectionCommandErrorCode)[keyof typeof ProjectionCommandErrorCode];

export interface ProjectionFailure {
  ok: false;
  code: ProjectionCommandErrorCode;
  issues?: z.ZodIssue[];
  errors?: ProjectionResolveError[];
  warnings?: ProjectionResolveError[];
}

export type NameFailureCode = 'NAME_REQUIRED' | 'NAME_TOO_LONG';

/** Maps a name-schema issue to its stable code; `null` means another field failed. */
export function nameFailureCode(issues: z.ZodIssue[]): NameFailureCode | null {
  const message = issues[0]?.message;
  if (message === RetirementSchemaErrorCode.NAME_REQUIRED) return 'NAME_REQUIRED';
  if (message === RetirementSchemaErrorCode.NAME_TOO_LONG) return 'NAME_TOO_LONG';
  return null;
}
