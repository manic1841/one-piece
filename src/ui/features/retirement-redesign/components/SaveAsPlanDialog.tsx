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
import {
  SAVE_AS_PLAN_ERROR_LABELS,
  SAVE_AS_PLAN_LABELS,
} from '@/ui/constants/retirement-redesign/projectionLabels';

export interface SaveAsPlanOutcomeView {
  ok: boolean;
  code?: keyof typeof SAVE_AS_PLAN_ERROR_LABELS;
}

interface SaveAsPlanDialogProps {
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<SaveAsPlanOutcomeView>;
}

/** Creates a new plan from the projection's config; the projection stays untouched. */
export function SaveAsPlanDialog({ defaultName, onCancel, onSave }: SaveAsPlanDialogProps) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim() === '') {
      setMessage(SAVE_AS_PLAN_LABELS.NAME_REQUIRED);
      return;
    }

    setMessage(null);
    setSaving(true);
    const outcome = await onSave(name.trim());
    setSaving(false);
    if (!outcome.ok) {
      setMessage(
        SAVE_AS_PLAN_ERROR_LABELS[outcome.code ?? 'WRITE_FAILED'] ?? SAVE_AS_PLAN_LABELS.FAILED,
      );
    }
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
              setMessage(null);
            }}
            disabled={saving}
            aria-invalid={message !== null}
          />
        </div>

        {message !== null && (
          <Alert variant="warning">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {SAVE_AS_PLAN_LABELS.CANCEL}
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving
              ? SAVE_AS_PLAN_LABELS.SAVING
              : message !== null
                ? SAVE_AS_PLAN_LABELS.RETRY
                : SAVE_AS_PLAN_LABELS.CONFIRM}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
