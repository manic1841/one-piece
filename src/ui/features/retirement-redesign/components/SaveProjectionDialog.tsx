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

export interface SaveNameOutcome {
  ok: boolean;
  messages?: string[];
}

interface SaveProjectionDialogProps {
  open: boolean;
  title?: string;
  nameLabel?: string;
  requiredMessage?: string;
  confirmLabel?: string;
  savingLabel?: string;
  defaultName: string;
  onCancel: () => void;
  onSave: (name: string) => Promise<SaveNameOutcome>;
}

/**
 * The only write gate. Esc and backdrop are inert while saving; failure keeps
 * the dialog open with every validation message listed.
 */
export function SaveProjectionDialog({
  open,
  title = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_TITLE,
  nameLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME,
  requiredMessage = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME_REQUIRED,
  confirmLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CONFIRM,
  savingLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_SAVING,
  defaultName,
  onCancel,
  onSave,
}: SaveProjectionDialogProps) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (name.trim() === '') {
      setMessages([requiredMessage]);
      return;
    }

    setMessages([]);
    setSaving(true);
    const outcome = await onSave(name.trim());
    setSaving(false);
    if (!outcome.ok) {
      setFailed(true);
      setMessages(outcome.messages ?? [PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_FAILED]);
    }
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="projection-save-name">{nameLabel}</Label>
          <Input
            id="projection-save-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMessages([]);
              setFailed(false);
            }}
            disabled={saving}
            aria-invalid={messages.length > 0}
          />
        </div>

        {messages.length > 0 && (
          <Alert variant="warning">
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4" data-testid="save-error-list">
                {messages.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CANCEL}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving
              ? savingLabel
              : failed
                ? PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_RETRY
                : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
