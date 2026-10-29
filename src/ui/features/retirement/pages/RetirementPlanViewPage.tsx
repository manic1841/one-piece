import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { PLAN_DETAIL_LABELS } from '@/ui/constants/retirement/planLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { PlanLoadStates } from '@/ui/features/retirement/components/PlanLoadStates';
import { RetirementPlanDetail } from '@/ui/features/retirement/components/RetirementPlanDetail';
import { PLAN_LIST_HREF } from '@/ui/features/retirement/hooks/usePlanResource';
import { useRetirementPlanAccess } from '@/ui/features/retirement/hooks/useRetirementPlanAccess';
import { useRetirementPlanDetail } from '@/ui/features/retirement/hooks/useRetirementPlanDetail';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

export default function RetirementPlanViewPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const navigate = useNavigate();
  const { vm, loading, errorMessage, notFound, reload, rename, remove } =
    useRetirementPlanDetail(householdId);
  const { canManage } = useRetirementPlanAccess(householdId);

  const backToList = () => navigate(PLAN_LIST_HREF);

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

  return (
    <PlanLoadStates
      loading={loading}
      errorMessage={errorMessage}
      notFound={notFound || vm === null}
      reload={() => void reload()}
      onBack={backToList}
      labels={PLAN_DETAIL_LABELS}
    >
      {vm !== null && (
        <div className="space-y-8">
          <PageHeader
            crumb={PLAN_DETAIL_LABELS.CRUMB}
            title={
              <InlineEditableTitle value={vm.name} onSave={handleRename} disabled={!canManage} />
            }
            description={vm.narrative.descriptionText}
            onBack={backToList}
            backLabel={PLAN_DETAIL_LABELS.BACK_LABEL}
            meta={
              <p className="mt-1 text-sm text-muted-foreground">
                {PLAN_DETAIL_LABELS.UPDATED_AT}: {vm.updatedAtText}
              </p>
            }
            actions={
              <>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/retirement/plans/${vm.id}/edit`)}
                  >
                    {PLAN_DETAIL_LABELS.EDIT_ACTION}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate(`/retirement/new?plan=${vm.id}`)}
                >
                  <Play size={16} aria-hidden="true" />
                  {PLAN_DETAIL_LABELS.USE_ACTION}
                </Button>
              </>
            }
          />

          <RetirementPlanDetail
            plan={vm}
            canDelete={canManage}
            onDelete={() => void handleDelete()}
          />
        </div>
      )}
    </PlanLoadStates>
  );
}
