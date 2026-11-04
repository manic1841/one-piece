import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { type ProjectionOpeningLookup } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { getProjectionViewUseCase } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type AuthContext } from '@/application/types';

export interface WorkspacePreload {
  data: ProjectionViewData;
  /** Only resolved for a derived opening; `null` for a manual one. */
  derived: ProjectionOpeningLookup | null;
}

/**
 * Everything the workspace needs to open a saved projection. One user action
 * maps to one call, so the preload hook never sequences use cases itself.
 */
export const openWorkspaceFromProjection = {
  async execute(request: {
    householdId: string;
    projectionId: string;
    auth: AuthContext;
  }): Promise<WorkspacePreload | null> {
    const { householdId, projectionId, auth } = request;

    const data = await getProjectionViewUseCase.execute({ householdId, projectionId, auth });
    if (data === null || data.config === null) return null;

    const derived =
      data.config.openingNetWorth.source === 'derived'
        ? await getProjectionOpeningUseCase.execute({ householdId, auth })
        : null;

    return { data, derived };
  },
};
