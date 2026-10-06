import { Plus, Trash2 } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import { Label } from '@/ui/components/ui/label';
import { RetirementEventDialogLabels as L } from '@/ui/constants/retirement/eventDialogLabels';
import type { RetirementOneTimeEvent } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementEventDialog } from '../hooks/useRetirementEventDialog';

const EVENT_TYPE_OPTIONS = [
  { value: 'income', label: L.typeIncome },
  { value: 'expense', label: L.typeExpense },
];

/**
 * Desktop column template for the phase repeater: name, two 4-digit years, amount,
 * growth, remove. Years stay narrow because they never exceed four digits.
 */
const PHASE_COLUMNS = 'md:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6.5rem_5rem_2.5rem]';
/** Phase row: stacked two-column block below `md`, aligned row from `md` up. */
const PHASE_ROW_GRID = `grid grid-cols-2 items-center gap-3 ${PHASE_COLUMNS}`;
/** Column captions exist only where the columns do; below `md` each field labels itself. */
const PHASE_HEADER_GRID = `hidden items-center gap-3 pb-2 text-xs font-medium text-muted-foreground md:grid ${PHASE_COLUMNS}`;
/** Labels are visible while stacked; the `md` header row supplies them instead. */
const PHASE_FIELD_LABEL = 'md:sr-only';
const PHASE_FIELD_ITEM = 'min-w-0 space-y-1 md:space-y-0';
/** Remove heads its phase block on mobile; at `md` it closes the row. */
const PHASE_REMOVE =
  'col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:justify-self-auto';

interface EventDialogProps {
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementOneTimeEvent;
  trigger?: React.ReactNode;
}

export default function EventDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
}: EventDialogProps) {
  const {
    open,
    setOpen,
    loading,
    form,
    values,
    phaseFields,
    handleAddPhase,
    handleRemovePhase,
    handleSubmit,
  } = useRetirementEventDialog({
    initialData,
    currentYear,
    onSave,
  });

  // Phase rows hide their inline messages (sr-only) so a long repeater does not
  // grow tall; the distinct messages are summarised once below the list.
  const phaseErrors = form.formState.errors.phases;
  const phaseErrorMessages = Array.from(
    new Set(
      (Array.isArray(phaseErrors) ? phaseErrors : [])
        .flatMap((entry) => Object.values((entry ?? {}) as Record<string, { message?: string }>))
        .map((error) => error?.message)
        .filter((message): message is string => typeof message === 'string'),
    ),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {L.addEventAction}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{initialData ? L.editTitle : L.createTitle}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField name="name">
                  <FormItem>
                    <FormLabel required>{L.nameLabel}</FormLabel>
                    <FormControl>
                      <TextInput placeholder={L.namePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField name="type">
                  <FormItem>
                    <FormLabel required>{L.typeLabel}</FormLabel>
                    <FormControl>
                      <SelectField options={EVENT_TYPE_OPTIONS} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    {L.phasesLabel}
                    <span className="text-destructive ml-0.5" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddPhase}>
                    <Plus className="mr-2 h-4 w-4" />
                    {L.addPhaseAction}
                  </Button>
                </div>

                <div className="border-y border-border py-3">
                  <div className="max-h-80 overflow-y-auto">
                    <div className={PHASE_HEADER_GRID}>
                      <span>{L.phaseColumn}</span>
                      <span>{L.startYear}</span>
                      <span>{L.endYear}</span>
                      <span>{L.amount}</span>
                      <span>{L.growthRate}</span>
                      <span className="sr-only">{L.removePhaseAction}</span>
                    </div>

                    <div className="divide-y divide-border">
                      {phaseFields.map((phase, index) => (
                        <div key={phase.id} className={`${PHASE_ROW_GRID} py-2`}>
                          <FormField name={`phases.${index}.name`}>
                            <FormItem className={PHASE_FIELD_ITEM}>
                              <FormLabel className={PHASE_FIELD_LABEL}>
                                {L.phaseNamePlaceholder}
                              </FormLabel>
                              <FormControl>
                                <TextInput placeholder={L.phaseNamePlaceholder} />
                              </FormControl>
                              <FormMessage className="sr-only" />
                            </FormItem>
                          </FormField>

                          <FormField name={`phases.${index}.startYear`}>
                            <FormItem className={PHASE_FIELD_ITEM}>
                              <FormLabel className={PHASE_FIELD_LABEL}>{L.startYear}</FormLabel>
                              <FormControl>
                                <NumberInput min={currentYear} />
                              </FormControl>
                              <FormMessage className="sr-only" />
                            </FormItem>
                          </FormField>

                          <FormField name={`phases.${index}.endYear`}>
                            <FormItem className={PHASE_FIELD_ITEM}>
                              <FormLabel className={PHASE_FIELD_LABEL}>{L.endYear}</FormLabel>
                              <FormControl>
                                <NumberInput
                                  min={values.phases?.[index]?.startYear || String(currentYear)}
                                />
                              </FormControl>
                              <FormMessage className="sr-only" />
                            </FormItem>
                          </FormField>

                          <FormField name={`phases.${index}.amount`}>
                            <FormItem className={PHASE_FIELD_ITEM}>
                              <FormLabel className={PHASE_FIELD_LABEL}>{L.amount}</FormLabel>
                              <FormControl>
                                <NumberInput min="0" step="0.01" />
                              </FormControl>
                              <FormMessage className="sr-only" />
                            </FormItem>
                          </FormField>

                          <FormField name={`phases.${index}.growthRate`}>
                            <FormItem className={PHASE_FIELD_ITEM}>
                              <FormLabel className={PHASE_FIELD_LABEL}>{L.growthRate}</FormLabel>
                              <FormControl>
                                <NumberInput step="0.01" placeholder={L.growthPlaceholder} />
                              </FormControl>
                              <FormMessage className="sr-only" />
                            </FormItem>
                          </FormField>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={PHASE_REMOVE}
                            aria-label={L.removePhaseAction}
                            disabled={phaseFields.length <= 1}
                            onClick={() => handleRemovePhase(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {phaseErrorMessages.map((message) => (
                  <p key={message} className="text-destructive text-sm font-medium">
                    {message}
                  </p>
                ))}

                <FormField name="phases">
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <FormField name="note">
                <FormItem>
                  <FormLabel>{L.noteLabel}</FormLabel>
                  <FormControl>
                    <TextInput placeholder={L.notePlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                {L.cancelAction}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? L.savingAction : initialData ? L.saveChangesAction : L.addEventAction}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
