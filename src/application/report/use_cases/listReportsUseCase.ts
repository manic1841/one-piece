import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type FinancialReport } from '@/domains/report/types';
import { reportRepository } from '@/infra/repositories/reportRepository';

interface ListReportsRequest {
  householdId: string;
  auth: AuthContext;
}

class ListReportsUseCase {
  async execute(request: ListReportsRequest): Promise<FinancialReport[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    return reportRepository.list([householdId]);
  }
}

export const listReportsUseCase = new ListReportsUseCase();
