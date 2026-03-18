import { reportRepository } from '@/infra/repositories/reportRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type FinancialReport } from '@/domains/report/types';

interface ListReportsRequest {
  householdId: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

class ListReportsUseCase {
  async execute(request: ListReportsRequest): Promise<FinancialReport[]> {
    const { householdId, auth } = request;

    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);

    return reportRepository.list([householdId]);
  }
}

export const listReportsUseCase = new ListReportsUseCase();
