import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  ProjectionCommandErrorCode,
  type ProjectionFailure,
} from '@/application/retirement/errors';
import { type ProjectionCalculation } from '@/application/retirement/types';
import { type AuthContext } from '@/application/types';
import {
  type CreateProjectionAtomicallyInput,
  type ProjectionAnnual,
} from '@/domains/retirement/logic/projectionDocuments';
import { ENGINE_VERSION } from '@/domains/retirement/logic/projectionEngine';
import { retirementNameSchema } from '@/domains/retirement/name';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

export interface PersistProjectionRequest {
  householdId: string;
  auth: AuthContext;
  name: string;
  calculation: ProjectionCalculation;
}

export type PersistProjectionOutcome = { ok: true; id: string } | ProjectionFailure;

const nameSchema = retirementNameSchema;
/** Name-only write of the frozen calculation produced by CALCULATE. */
export class PersistProjectionUseCase {
  async execute(request: PersistProjectionRequest): Promise<PersistProjectionOutcome> {
    const { householdId, auth, calculation } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const parsedName = nameSchema.safeParse(request.name);
    if (!parsedName.success) {
      return {
        ok: false,
        code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
        issues: parsedName.error.issues,
      };
    }

    const now = new Date();
    const userEmail = auth.email ?? auth.uid;
    const input: CreateProjectionAtomicallyInput = {
      householdId,
      projection: {
        name: parsedName.data,
        engineVersion: ENGINE_VERSION,
        createdAt: now,
        createdBy: userEmail,
        ...calculation.result.summary,
      },
      config: calculation.config,
      source: calculation.source,
      results: { years: calculation.result.years } satisfies ProjectionAnnual,
    };

    const written = await projectionRepository.createProjectionAtomically(input);
    if (!written.ok) {
      return { ok: false, code: ProjectionCommandErrorCode.PROJECTION_TOO_LARGE };
    }
    return { ok: true, id: written.id };
  }
}

export const persistProjectionUseCase = new PersistProjectionUseCase();
