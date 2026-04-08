import { runTransaction } from 'firebase/firestore';
import { db } from '@/firebase';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type FinancialReport } from '@/domains/report/types';

interface SaveReportsRequest {
  householdId: string;
  reports: FinancialReport[];
  userEmail: string;
  auth: {
    uid: string;
    isGlobalAdmin: boolean;
  };
}

class SaveReportsUseCase {
  async execute(request: SaveReportsRequest): Promise<void> {
    const { householdId, reports, userEmail, auth } = request;

    await runTransaction(db, async (tx) => {
      await householdPermissionService.assertWritePermission(
        householdId,
        auth.uid,
        auth.isGlobalAdmin,
        tx,
      );

      for (const report of reports) {
        await reportRepository.create([householdId], report, userEmail, tx, report.id);
      }
    });
  }
}

export const saveReportsUseCase = new SaveReportsUseCase();
