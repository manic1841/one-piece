import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  type ProjectionAnnual,
  type ProjectionConfig,
  type ProjectionDocument,
  type ProjectionSource,
} from '@/domains/retirement/logic/projectionDocuments';
import { projectionRepository } from '@/infra/repositories/projectionRepository';

export type {
  ProjectionAnnual,
  ProjectionConfig,
  ProjectionDocument,
  ProjectionSource,
} from '@/domains/retirement/logic/projectionDocuments';

interface GetProjectionViewRequest {
  householdId: string;
  projectionId: string;
  auth: AuthContext;
}

export interface ProjectionViewData {
  projection: ProjectionDocument;
  config: ProjectionConfig | null;
  source: ProjectionSource | null;
  annual: ProjectionAnnual | null;
}

/** Main document plus its three fixed snapshots; a missing child stays null. */
export class GetProjectionViewUseCase {
  async execute(request: GetProjectionViewRequest): Promise<ProjectionViewData | null> {
    const { householdId, projectionId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const projection = await projectionRepository.getProjection(householdId, projectionId);
    if (projection === null) return null;

    const [config, source, annual] = await Promise.all([
      projectionRepository.getProjectionConfig(householdId, projectionId),
      projectionRepository.getProjectionSource(householdId, projectionId),
      projectionRepository.getProjectionAnnual(householdId, projectionId),
    ]);

    return { projection, config, source, annual };
  }
}

export const getProjectionViewUseCase = new GetProjectionViewUseCase();
