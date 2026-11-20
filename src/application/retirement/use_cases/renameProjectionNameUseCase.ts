import { householdPermissionService } from '@/application/household/householdPermissionService';
import { nameFailureCode } from '@/application/retirement/errors';
import { type AuthContext } from '@/application/types';
import { retirementNameSchema } from '@/domains/retirement/name';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

interface RenameProjectionNameRequest {
  householdId: string;
  projectionId: string;
  name: string;
  auth: AuthContext;
}

export type RenameProjectionNameOutcome =
  | { ok: true; name: string }
  | { ok: false; code: 'NAME_REQUIRED' | 'NAME_TOO_LONG' };

const nameSchema = retirementNameSchema;

export class RenameProjectionNameUseCase {
  async execute(request: RenameProjectionNameRequest): Promise<RenameProjectionNameOutcome> {
    const { householdId, projectionId, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const parsed = nameSchema.safeParse(request.name);
    if (!parsed.success) {
      return { ok: false, code: nameFailureCode(parsed.error.issues) ?? 'NAME_REQUIRED' };
    }

    await projectionRepository.renameProjectionName(householdId, projectionId, parsed.data);
    return { ok: true, name: parsed.data };
  }
}

export const renameProjectionNameUseCase = new RenameProjectionNameUseCase();
