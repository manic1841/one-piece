import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useReportCmds(householdId: string | undefined, userEmail: string | undefined) {
  const auth = useAuthContext();
  const { loading, error, run } = useLoadingTask();

  // generateReports and saveReports were dead functions backed by removed use cases.
  // The hook is retained for its loading/error state; full removal is tracked as a follow-up.
  void householdId;
  void userEmail;
  void auth;
  void run;

  return {
    loading,
    error,
  };
}
