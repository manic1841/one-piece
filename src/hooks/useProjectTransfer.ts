import { projectTransactionService } from '@/services/projectTransactionService';
import { ProjectTransactionType } from '@/domains/project/projectCategory';

export function useProjectTransfer(householdId: string, userEmail: string) {
  const submitTransfer = async (data: {
    fromProject: string | null;
    toProject: string;
    amount: number;
    date: Date;
    description?: string;
  }) => {
    return projectTransactionService.createProjectTransaction(
      householdId,
      {
        ...data,
        type: ProjectTransactionType.TRANSFER,
      },
      userEmail,
    );
  };

  return { submitTransfer };
}
