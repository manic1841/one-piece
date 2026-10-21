import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { retirementPlanRepository } from '@/infra/repositories/retirementPlanRepository';

interface SaveProjectionAsPlanRequest {
  householdId: string;
  projectionId: string;
  name: string;
  auth: AuthContext;
}

/** Creates a new, independent plan from the projection's frozen config. */
export class SaveProjectionAsPlanUseCase {
  async execute(request: SaveProjectionAsPlanRequest): Promise<string> {
    const { householdId, projectionId, name, auth } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const config = await projectionRepository.getProjectionConfig(householdId, projectionId);
    if (config === null) throw new Error('Projection configuration not found.');

    const now = new Date();
    const userEmail = auth.email ?? auth.uid;

    const written = await retirementPlanRepository.createPlan({
      householdId,
      currentYear: now.getFullYear(),
      userEmail,
      plan: {
        name: name.trim(),
        assumptions: config.assumptions,
        projectionRules: config.projectionRules,
        lifeEvents: config.lifeEvents,
        createdBy: userEmail,
        updatedBy: userEmail,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (!written.ok) throw new Error(written.code);
    return written.id;
  }
}

export const saveProjectionAsPlanUseCase = new SaveProjectionAsPlanUseCase();
