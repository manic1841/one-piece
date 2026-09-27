import { useState } from 'react';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';

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
import type { RetirementOneTimeEvent } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementEventDialog } from '../hooks/useRetirementEventDialog';

const EVENT_TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

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

  const [expandedGrowth, setExpandedGrowth] = useState<Set<number>>(new Set());

  const toggleGrowth = (index: number) => {
    setExpandedGrowth((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{initialData ? 'Edit One-Time Event' : 'Add One-Time Event'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
              <FormField name="name">
                <FormItem>
                  <FormLabel required>Event Name</FormLabel>
                  <FormControl>
                    <TextInput placeholder="e.g., House Down Payment" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField name="type">
                <FormItem>
                  <FormLabel required>Type</FormLabel>
                  <FormControl>
                    <SelectField options={EVENT_TYPE_OPTIONS} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <div className="space-y-3">
                <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between bg-background/95 px-1 py-1 backdrop-blur-sm">
                  <Label>
                    Phases
                    <span className="text-destructive ml-0.5" aria-hidden="true">
                      *
                    </span>
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddPhase}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Phase
                  </Button>
                </div>

                {phaseFields.map((phase, index) => (
                  <div key={phase.id} className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <FormField name={`phases.${index}.name`}>
                        <FormItem className="flex-1">
                          <FormControl>
                            <TextInput placeholder="Phase name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove phase"
                        disabled={phaseFields.length <= 1}
                        onClick={() => handleRemovePhase(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField name={`phases.${index}.startYear`}>
                        <FormItem>
                          <FormLabel required>Start Year</FormLabel>
                          <FormControl>
                            <NumberInput min={currentYear} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                      <FormField name={`phases.${index}.endYear`}>
                        <FormItem>
                          <FormLabel required>End Year</FormLabel>
                          <FormControl>
                            <NumberInput
                              min={values.phases?.[index]?.startYear || String(currentYear)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField name={`phases.${index}.amount`}>
                        <FormItem>
                          <FormLabel required>Amount</FormLabel>
                          <FormControl>
                            <NumberInput min="0" step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleGrowth(index)}
                          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50"
                        >
                          Growth Rate
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedGrowth.has(index) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expandedGrowth.has(index) && (
                          <FormField name={`phases.${index}.growthRate`}>
                            <FormItem className="mt-2">
                              <FormControl>
                                <NumberInput step="0.01" placeholder="Inflation" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          </FormField>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <FormField name="note">
                <FormItem>
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <TextInput placeholder="Additional details..." />
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
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Event'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
