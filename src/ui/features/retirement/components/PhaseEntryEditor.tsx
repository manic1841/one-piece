import { Plus } from 'lucide-react';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import { Form } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementOneTimeEvent,
  retirementPhaseName,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { useRetirementPhaseEditor } from '../hooks/useRetirementPhaseEditor';
import { PhaseFields } from './PhaseFields';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];

interface PhaseEntryEditorProps {
  /** The owning event's name — the phase's primary name (spec #301 §5.2). */
  eventName: string;
  onSave: (phase: RetirementEventPhase) => Promise<void>;
  currentYear: number;
  initialData?: RetirementEventPhase;
  trigger?: React.ReactNode;
}

/**
 * 單一 phase 的側邊編輯器（spec #301 §2.1／§5.2），與事件編輯器共用同一 `DrawerPanel`。
 * phase 命名：**主名＝所屬 Event 名**（`title`），**副標＝`phase.name`**；`phase.name`
 * 留空時副標不顯示、不回退（`DrawerPanel` 只在 description 有值時渲染）。
 */
export function PhaseEntryEditor({
  eventName,
  onSave,
  currentYear,
  initialData,
  trigger,
}: PhaseEntryEditorProps) {
  const { confirm } = useConfirm();
  const { open, setOpen, loading, form, submitError, handleSubmit } = useRetirementPhaseEditor({
    initialData,
    currentYear,
    onSave,
  });

  const isDirty = form.formState.isDirty;

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
          <Button variant="ghost" size="icon" aria-label={L.addPhaseAction}>
            <Plus className="h-4 w-4" />
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
              title={eventName}
              description={retirementPhaseName(initialData?.name)}
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
              <div className="pt-4">
                <PhaseFields />
                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              </div>
            </DrawerPanel>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
