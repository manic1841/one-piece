import { useAuth } from '@/infra/contexts/useAuth';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useReportCmds(householdId: string | undefined, userEmail: string | undefined) {
  const { currentUser, isAdmin } = useAuth();
  const { loading, error, run } = useLoadingTask();

  // generateReports and saveReports were dead functions backed by removed use cases.
  // The hook is retained for its loading/error state; full removal is tracked as a follow-up.
  void householdId;
  void userEmail;
  void currentUser;
  void isAdmin;
  void run;

  return {
    loading,
    error,
  };
}
