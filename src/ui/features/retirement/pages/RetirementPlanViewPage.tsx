import { useMemo } from 'react';

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { RetirementPlanDetail } from '@/ui/features/retirement/components/RetirementPlanDetail';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useRetirementPlanDetail } from '@/ui/features/retirement/hooks/useRetirementPlanDetail';
import { mapRetirementPlanToVM } from '@/ui/features/retirement/viewmodels/retirementPlan.vm';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

const SKELETON_ROWS = [0, 1, 2];

export default function RetirementPlanViewPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const navigate = useNavigate();
  const { plan, loading, errorMessage, notFound, reload, rename, remove } =
    useRetirementPlanDetail(householdId);
  const { canManage } = useRetirementPlanAccess(householdId);
  const vm = useMemo(() => (plan === null ? null : mapRetirementPlanToVM(plan)), [plan]);

  const backToList = () => navigate('/retirement/plans');

  const handleRename = async (name: string) => {
    const task = await rename(name);
    if (task === null) return;
    if (!task.ok) {
      toast.error(getTaskErrorMessage(task));
      return;
    }
    if (!task.value.ok) toast.error(PLAN_DETAIL_LABELS.RENAME_FAILED);
  };

  const handleDelete = async () => {
    const task = await remove();
    if (task === null) return;
    if (!task.ok) toast.error(getTaskErrorMessage(task));
  };

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{PLAN_DETAIL_LABELS.LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (errorMessage !== null && plan === null) {
    return (
      <div className="space-y-6 pb-20">
        <Button variant="ghost" size="sm" onClick={backToList} className="gap-2">
          <ArrowLeft size={16} aria-hidden="true" />
          {PLAN_DETAIL_LABELS.BACK_LABEL}
        </Button>
        <Alert variant="warning">
          <AlertDescription>{PLAN_DETAIL_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PLAN_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      </div>
    );
  }

  if (notFound || vm === null) {
    return (
      <EmptyState
        title={PLAN_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={PLAN_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={backToList}>
            {PLAN_DETAIL_LABELS.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        crumb={PLAN_DETAIL_LABELS.CRUMB}
        title={<InlineEditableTitle value={vm.name} onSave={handleRename} disabled={!canManage} />}
        onBack={backToList}
        meta={
          <p className="mt-1 text-sm text-muted-foreground">
            {PLAN_DETAIL_LABELS.UPDATED_AT}: {vm.updatedAtText}
          </p>
        }
      />

      <RetirementPlanDetail plan={vm} canDelete={canManage} onDelete={() => void handleDelete()} />
    </div>
  );
}
