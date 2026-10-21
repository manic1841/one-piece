import { useState } from 'react';

import { SelectField } from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Label } from '@/ui/components/ui/label';
import { PLAN_APPLY_LABELS, planContextCopy } from '@/ui/constants/retirement/setupLabels';
import { type PlanSummary } from '@/ui/features/retirement/hooks/usePlanLibrary';

interface ApplyPlanDialogProps {
  open: boolean;
  plans: PlanSummary[];
  loading: boolean;
  loadError: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onApply: (planId: string) => Promise<boolean>;
}

/**
 * Confirm gate for replacing the whole setup. The exact spec copy names the
 * selected plan, so the dialog preselects the first one.
 */
export function ApplyPlanDialog({
  open,
  plans,
  loading,
  loadError,
  onCancel,
  onRetry,
  onApply,
}: ApplyPlanDialogProps) {
  const [selectedId, setSelectedId] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyFailed, setApplyFailed] = useState(false);

  const effectiveId = selectedId || plans[0]?.id || '';
  const selected = plans.find((plan) => plan.id === effectiveId);

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    setSelectedId('');
    setApplyFailed(false);
    setApplying(false);
    onCancel();
  };

  const handleApply = async () => {
    if (!effectiveId) return;
    setApplying(true);
    setApplyFailed(false);
    const ok = await onApply(effectiveId);
    setApplying(false);
    if (!ok) setApplyFailed(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{PLAN_APPLY_LABELS.TITLE}</DialogTitle>
          <DialogDescription>
            {selected ? planContextCopy(selected.name) : PLAN_APPLY_LABELS.CHOOSE_PLACEHOLDER}
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">{PLAN_APPLY_LABELS.LOADING}</p>}

        {!loading && loadError && (
          <Alert variant="warning">
            <AlertDescription>{PLAN_APPLY_LABELS.LOAD_ERROR}</AlertDescription>
            <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
              {PLAN_APPLY_LABELS.RETRY}
            </Button>
          </Alert>
        )}

        {!loading && !loadError && plans.length === 0 && (
          <p className="text-sm text-muted-foreground">{PLAN_APPLY_LABELS.EMPTY}</p>
        )}

        {!loading && !loadError && plans.length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="apply-plan-select">{PLAN_APPLY_LABELS.PLAN_FIELD}</Label>
            <SelectField
              id="apply-plan-select"
              value={effectiveId}
              onChange={setSelectedId}
              options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
              disabled={applying}
            />
          </div>
        )}

        {applyFailed && (
          <Alert variant="warning">
            <AlertDescription>{PLAN_APPLY_LABELS.PLAN_NOT_FOUND}</AlertDescription>
          </Alert>
        )}

        <p className="text-sm text-muted-foreground">{PLAN_APPLY_LABELS.CONSEQUENCE}</p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={applying}>
            {PLAN_APPLY_LABELS.CANCEL}
          </Button>
          <Button onClick={handleApply} disabled={!effectiveId || applying || loading}>
            {PLAN_APPLY_LABELS.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
