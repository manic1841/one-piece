import { z } from 'zod';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

interface RenameProjectionNameRequest {
  householdId: string;
  projectionId: string;
  name: string;
  auth: AuthContext;
}

export type RenameProjectionNameOutcome =
  | { ok: true; name: string }
  | { ok: false; code: 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'WRITE_FAILED' };

const nameSchema = z
  .string()
  .trim()
  .min(1, RetirementSchemaErrorCode.NAME_REQUIRED)
  .max(100, RetirementSchemaErrorCode.NAME_TOO_LONG);

export class RenameProjectionNameUseCase {
  async execute(request: RenameProjectionNameRequest): Promise<RenameProjectionNameOutcome> {
    const { householdId, projectionId, auth } = request;

    const parsed = nameSchema.safeParse(request.name);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message;
      return {
        ok: false,
        code:
          message === RetirementSchemaErrorCode.NAME_TOO_LONG ? 'NAME_TOO_LONG' : 'NAME_REQUIRED',
      };
    }

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    try {
      await projectionRepository.renameProjectionName(householdId, projectionId, parsed.data);
      return { ok: true, name: parsed.data };
    } catch {
      return { ok: false, code: 'WRITE_FAILED' };
    }
  }
}

export const renameProjectionNameUseCase = new RenameProjectionNameUseCase();
