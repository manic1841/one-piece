import { Plus } from 'lucide-react';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import { Form, SelectField } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import {
  RetirementEventsLabels as L,
  RetirementTimelineLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementOneTimeEvent,
  retirementPhaseName,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { useRetirementPhaseEditor } from '../hooks/useRetirementPhaseEditor';
import { PhaseFields } from './PhaseFields';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];

/**
 * 行動版換 Event 的具名控制（spec #301 §5.4）：在編輯器內以「所屬 Event」select
 * 完成 Desktop 拖曳上下歸組的動作。
 */
export interface PhaseReassignControl {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (eventId: string) => void;
}

interface PhaseEntryEditorProps {
  /** The owning event's name — the phase's primary name (spec #301 §5.2). */
  eventName: string;
  onSave: (phase: RetirementEventPhase) => Promise<void>;
  currentYear: number;
  initialData?: RetirementEventPhase;
  /** Timeline 空白拖曳建立時預填的年份範圍（spec #301 §5.5）。 */
  initialRange?: { startYear: number; endYear: number };
  reassign?: PhaseReassignControl;
  /**
   * Controlled open. When set, no trigger is rendered and the caller owns
   * open/close (TimelineView opens the editor programmatically on drag/Enter).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  initialRange,
  reassign,
  open,
  onOpenChange,
  trigger,
}: PhaseEntryEditorProps) {
  const { confirm } = useConfirm();
  const {
    open: internalOpen,
    setOpen,
    loading,
    form,
    submitError,
    handleSubmit,
  } = useRetirementPhaseEditor({
    initialData,
    currentYear,
    initialRange,
    onSave,
  });

  const controlled = open !== undefined;
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

  const onSheetOpenChange = (next: boolean) => {
    if (controlled) {
      onOpenChange?.(next);
      return;
    }
    handleOpenChange(next);
  };

  return (
    <Sheet open={controlled ? open : internalOpen} onOpenChange={onSheetOpenChange}>
      {!controlled && (
        <SheetTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" aria-label={L.addPhaseAction}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </SheetTrigger>
      )}
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
              <div className="grid gap-4 pt-4">
                {reassign ? (
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">
                      {RetirementTimelineLabels.reassignLabel}
                    </span>
                    <SelectField
                      value={reassign.value}
                      options={[...reassign.options]}
                      onChange={reassign.onChange}
                      aria-label={RetirementTimelineLabels.reassignLabel}
                    />
                  </div>
                ) : null}
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
