import { useState } from 'react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { SAVE_AS_PLAN_LABELS } from '@/ui/constants/retirement-redesign/projectionLabels';

interface SaveAsPlanDialogProps {
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<boolean>;
}

/** Creates a new plan from the projection's config; the projection stays untouched. */
export function SaveAsPlanDialog({ defaultName, onCancel, onSave }: SaveAsPlanDialogProps) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [missing, setMissing] = useState(false);

  const submit = async () => {
    if (name.trim() === '') {
      setMissing(true);
      return;
    }

    setMissing(false);
    setSaving(true);
    setFailed(false);
    const ok = await onSave(name.trim());
    setSaving(false);
    if (!ok) setFailed(true);
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (next || saving) return;
        onCancel();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{SAVE_AS_PLAN_LABELS.TITLE}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="save-as-plan-name">{SAVE_AS_PLAN_LABELS.NAME}</Label>
          <Input
            id="save-as-plan-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMissing(false);
            }}
            disabled={saving}
            aria-invalid={missing}
          />
          {missing && <p className="text-xs text-negative">{SAVE_AS_PLAN_LABELS.NAME_REQUIRED}</p>}
        </div>

        {failed && (
          <Alert variant="warning">
            <AlertDescription>{SAVE_AS_PLAN_LABELS.FAILED}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {SAVE_AS_PLAN_LABELS.CANCEL}
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving
              ? SAVE_AS_PLAN_LABELS.SAVING
              : failed
                ? SAVE_AS_PLAN_LABELS.RETRY
                : SAVE_AS_PLAN_LABELS.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
