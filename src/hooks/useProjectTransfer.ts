import { useMemo } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { ProjectTransactionCategory } from '@/domains/record/types';
import { projectTransactionService } from '@/services/projectTransactionService';

export function useProjectTransfer(householdId: string, userEmail: string) {
  const { currentUser, isAdmin } = useAuth();
  const auth = useMemo(
    () => ({ uid: currentUser?.uid || '', isGlobalAdmin: isAdmin }),
    [currentUser, isAdmin],
  );

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
        category: ProjectTransactionCategory.TRANSFER,
      },
      userEmail,
      auth,
    );
  };

  return { submitTransfer };
}
