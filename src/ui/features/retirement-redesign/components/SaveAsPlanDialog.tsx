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
import { SAVE_AS_PLAN_LABELS } from '@/ui/constants/retirement-redesign/projectionLabels';
import { type SaveNameVM } from '@/ui/features/retirement-redesign/viewmodels/saveName.vm';

interface SaveAsPlanDialogProps {
  form: UseFormReturn<SaveNameVM>;
  submit: () => Promise<void>;
  onCancel: () => void;
}

/** Creates a new plan from the projection's config; the projection stays untouched. */
export function SaveAsPlanDialog({ form, submit, onCancel }: SaveAsPlanDialogProps) {
  const { errors, isSubmitting } = form.formState;
  const rootMessage = errors.root?.message ?? null;
  const failed = rootMessage !== null || errors.name !== undefined;

  return (
    <Dialog
      open
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
          <DialogTitle>{SAVE_AS_PLAN_LABELS.TITLE}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <FormField name="name">
            <FormItem>
              <FormLabel>{SAVE_AS_PLAN_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput disabled={isSubmitting} onChange={() => form.clearErrors()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </Form>

        {rootMessage !== null && (
          <Alert variant="warning">
            <AlertDescription>{rootMessage}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {SAVE_AS_PLAN_LABELS.CANCEL}
          </Button>
          <Button onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting
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
