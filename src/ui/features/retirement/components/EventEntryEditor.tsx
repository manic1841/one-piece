import { Plus, Trash2 } from 'lucide-react';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import type { RetirementOneTimeEvent } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementEventEditor } from '../hooks/useRetirementEventEditor';
import { PhaseFields } from './PhaseFields';

const EVENT_TYPE_OPTIONS = [
  { value: 'income', label: L.typeIncome },
  { value: 'expense', label: L.typeExpense },
];

interface EventEntryEditorProps {
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementOneTimeEvent;
  trigger?: React.ReactNode;
}

/**
 * 人生事件的側邊編輯器（spec #301 §2.1），取代舊 `EventDialog`。落點為 `ui/sheet`：
 * 行動版全螢幕 bottom sheet、桌面版右側面板，皆只用 `DrawerPanel`（不新建 SidePanel）。
 * 事件欄位與 phase repeater 共用 RHF 表單（ADR-0064）；repeater 即 phase 欄位分支。
 */
export function EventEntryEditor({
  onSave,
  currentYear,
  initialData,
  trigger,
}: EventEntryEditorProps) {
  const { confirm } = useConfirm();
  const {
    open,
    setOpen,
    loading,
    form,
    phaseFields,
    handleAddPhase,
    handleRemovePhase,
    submitError,
    handleSubmit,
  } = useRetirementEventEditor({ initialData, currentYear, onSave });

  // Read during render so the Proxy subscribes; the handler sees the latest value.
  const isDirty = form.formState.isDirty;
  const title = initialData ? L.titleEventEdit : L.titleEventAdd;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      return;
    }
    if (!isDirty) {
      setOpen(false);
      return;
    }
    void confirm({
      title: L.discardTitle,
      context: L.discardContext,
      consequence: L.discardConsequence,
      confirmLabel: L.discardConfirm,
      cancelLabel: L.discardCancel,
      confirmTone: 'destructive',
    }).then((confirmed) => {
      if (confirmed) setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {L.addEventAction}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="h-[100dvh] overflow-y-auto rounded-none sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-w-md sm:rounded-none sm:border-l"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          form.setFocus('name');
        }}
      >
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col gap-4 py-2">
            <DrawerPanel
              title={title}
              description={L.description}
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    {L.cancelAction}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? L.savingAction : L.saveAction}
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 pt-4">
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{L.phasesLabel}</span>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPhase}>
                      <Plus className="mr-2 h-4 w-4" />
                      {L.addPhaseAction}
                    </Button>
                  </div>

                  {phaseFields.map((phase, index) => (
                    <div key={phase.id} className="space-y-3 rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {L.phaseNamePlaceholder}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={L.removePhaseAction}
                          disabled={phaseFields.length <= 1}
                          onClick={() => handleRemovePhase(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <PhaseFields namePrefix={`phases.${index}.`} />
                    </div>
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

                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              </div>
            </DrawerPanel>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
