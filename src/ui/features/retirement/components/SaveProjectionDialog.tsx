import { type UseFormReturn } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  type NameFieldVM,
  type SaveNameOutcome,
} from '@/ui/features/retirement/hooks/useNameField';

interface SaveProjectionDialogProps {
  open: boolean;
  title?: string;
  nameLabel?: string;
  confirmLabel?: string;
  savingLabel?: string;
  form: UseFormReturn<NameFieldVM>;
  submit: () => Promise<SaveNameOutcome>;
  onCancel: () => void;
}

/**
 * Dumb save gate. All form state lives in the controller; Esc and backdrop are
 * inert while saving, and a failure keeps the dialog open with every message.
 * Closing is reported through `onCancel` only — the field resets itself.
 */
export function SaveProjectionDialog({
  open,
  title = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_TITLE,
  nameLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_NAME,
  confirmLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CONFIRM,
  savingLabel = PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_SAVING,
  form,
  submit,
  onCancel,
}: SaveProjectionDialogProps) {
  const { errors, isSubmitting } = form.formState;
  const messages = errors.root?.message?.split('\n') ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next || isSubmitting) return;
        onCancel();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <FormField name="name">
            <FormItem>
              <FormLabel>{nameLabel}</FormLabel>
              <FormControl>
                <TextInput disabled={isSubmitting} onChange={() => form.clearErrors()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </Form>

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
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_CANCEL}
          </Button>
          <Button onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting
              ? savingLabel
              : messages.length > 0
                ? PROJECTION_WORKSPACE_LABELS.SAVE_DIALOG_RETRY
                : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
