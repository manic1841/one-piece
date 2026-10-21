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
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';

interface SaveProjectionDialogProps {
  open: boolean;
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<boolean>;
}

/**
 * The only write gate. Esc and backdrop are inert while saving; failure keeps
 * the dialog open with RETRY, success is closed by the caller.
 */
export function SaveProjectionDialog({
  open,
  defaultName,
  onCancel,
  onSave,
}: SaveProjectionDialogProps) {
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
      open={open}
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
          <DialogTitle>{PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_TITLE}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="projection-save-name">
            {PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME}
          </Label>
          <Input
            id="projection-save-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMissing(false);
            }}
            disabled={saving}
            aria-invalid={missing}
          />
          {missing && (
            <p className="text-xs text-negative">
              {PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME_REQUIRED}
            </p>
          )}
        </div>

        {failed && (
          <Alert variant="warning">
            <AlertDescription>{PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CANCEL}
          </Button>
          {failed ? (
            <Button onClick={submit} disabled={saving}>
              {saving
                ? PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_SAVING
                : PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_RETRY}
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving
                ? PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_SAVING
                : PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CONFIRM}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
