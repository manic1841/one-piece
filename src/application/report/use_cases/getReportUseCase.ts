import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type FinancialReport, type ReportType } from '@/domains/report/schemas';
import { reportRepository } from '@/infra/repositories/reportRepository';

interface GetReportRequest {
  householdId: string;
  type: ReportType;
  year: number;
  month: number;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

class GetReportUseCase {
  async execute(request: GetReportRequest): Promise<FinancialReport | null> {
    const { householdId, type, year, month, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    return reportRepository.getReport(householdId, yearMonth, type);
  }
}

export const getReportUseCase = new GetReportUseCase();
