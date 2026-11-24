import { useRef, useState } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import { Form, formMessageClass } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent } from '@/ui/components/ui/sheet';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_SECTION_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';
import { LifeEventInspector } from '@/ui/features/retirement/components/LifeEventInspector';
import { LifeEventRow } from '@/ui/features/retirement/components/LifeEventRow';
import {
  LifeEventTimelineEditor,
  type TimelineSelection,
} from '@/ui/features/retirement/components/LifeEventTimelineEditor';
import {
  type EventErrorsById,
  type EventType,
  type EventsForm,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
} from '@/ui/features/retirement/viewmodels/lifeEventForm.vm';
import { cn } from '@/ui/utils/cn';

/** `duration-slow` (400ms, `tailwind.config.js`) plus a frame; focus settles after the close. */
const SLOW_MS = 400;
const FOCUS_AFTER_CLOSE_MS = SLOW_MS + 50;

/**
 * Actions under the inspector fields. ADD PHASE lives here because the list's
 * own ADD sits behind the sheet on a phone and is hidden on desktop entirely.
 */
function InspectorFooter({
  onAddPhase,
  onDeletePhase,
  onDeleteEvent,
}: {
  onAddPhase: () => void;
  onDeletePhase: () => void;
  onDeleteEvent: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={onAddPhase}>
        {EVENT_LABELS.ADD_PHASE}
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDeletePhase}>
          {EVENT_LABELS.DELETE_PHASE}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDeleteEvent}>
          {EVENT_LABELS.DELETE}
        </Button>
      </div>
    </div>
  );
}

/**
 * The open phase's errors, split the way the inspector takes them, plus whether
 * they hold the sheet open. Everything commits as it is typed, so closing is the
 * confirm gesture: it is held back while the phase is still invalid.
 */
function selectionGate(errors: EventErrorsById, selection: TimelineSelection | null) {
  const event = selection === null ? {} : (errors[selection.eventId] ?? {});
  const phase = selection === null ? {} : (event.phaseErrors?.[selection.phaseId] ?? {});
  const blocked = Object.keys(event).some((field) => field !== 'phaseErrors');
  return { event, phase, blocked: blocked || Object.keys(phase).length > 0 };
}

interface LifeEventsSectionProps {
  form: UseFormReturn<EventsForm>;
  events: LifeEventDraftVM[];
  /** Revealed errors, used for the row counters and the summary list. */
  errors: EventErrorsById;
  /** Every error, revealed or not: the sheet gate and the inspector's field messages. */
  editErrors: EventErrorsById;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  projectionStartYear: number;
  birthYear: number;
  lifeExpectancy: number;
  retirementYear: number | null;
  revealYear: number | null;
  canUndo: boolean;
  onUndo: () => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  setType: (id: string, type: EventType) => void;
  addPhase: (eventId: string, year: number) => string;
  addPhaseAt: (eventId: string, startYear: number, endYear: number) => string;
  addEventWithPhase: (startYear: number, endYear: number) => TimelineSelection;
  removePhase: (eventId: string, phaseId: string) => string;
  updatePhase: (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => void;
  onGestureStart: () => void;
  /** The drop settlement: owner is resolved by phase id, so no origin event. */
  onRangeChange: (
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => void;
  /** Same-row drags edit the span; this is the keyboard equivalent of a cross-row drag. */
  reparent: (phaseId: string, targetEventId: string) => void;
  /** Band state and reason; only reported when an event is invalid. */
  status?: 'error';
  hint?: string;
}

/**
 * Life events as a timeline plus an inspector. The list is the default on
 * narrow screens because precise year input beats dragging there; the timeline
 * stays one tap away and is anchored to the retirement year.
 *
 * On narrow screens the list is two-level and collapsed: an event is a summary
 * line (name, type, phase count, enabled) that opens to phase summary lines,
 * and a phase click opens the inspector in a sheet. The fields therefore exist
 * only in the sheet — a long event list stays a list instead of turning into a
 * stack of forms. The event holding the selection stays open, and so does any
 * event carrying an error, so no message hides behind a fold.
 *
 * The inspector sits directly beneath the timeline rather than in a side
 * column, so the timeline — the one thing here that scales with width — gets
 * the whole column.
 *
 * The sheet is mounted only below the breakpoint, and only while open: at
 * desktop width two live inspectors would register every field twice, and a
 * closed panel left in the tree keeps its focus trap. Closing clears the
 * selection too, so no invisible phase keeps receiving edits from the timeline.
 *
 * With no events the timeline is withheld: the empty state owns the only ADD,
 * and that ADD lands on a phase that is already editable.
 */
export function LifeEventsSection({
  form,
  events,
  errors,
  editErrors,
  readOnly,
  focusRequest,
  projectionStartYear,
  birthYear,
  lifeExpectancy,
  retirementYear,
  revealYear,
  canUndo,
  onUndo,
  remove,
  toggle,
  update,
  setType,
  addPhase,
  addPhaseAt,
  addEventWithPhase,
  removePhase,
  updatePhase,
  onGestureStart,
  onRangeChange,
  reparent,
  status,
  hint,
}: LifeEventsSectionProps) {
  // Only the phase id is state: its event is derived, so a drag that reparents
  // the phase keeps the inspector on it without a syncing effect.
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  // Collapsed is the default: an event with several phases is one line until
  // someone opens it. Selecting a phase pins its event open.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const [mobileView, setMobileView] = useState<'list' | 'timeline'>('list');
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const addRef = useRef<HTMLButtonElement>(null);
  const { confirm } = useConfirm();

  const isEmpty = events.length === 0;
  const selectedEvent =
    events.find((event) => event.phases.some((phase) => phase.id === selectedPhaseId)) ?? null;
  const selectedPhase = selectedEvent?.phases.find((phase) => phase.id === selectedPhaseId) ?? null;
  const selection: TimelineSelection | null =
    selectedPhaseId === null || selectedEvent === null
      ? null
      : { eventId: selectedEvent.id, phaseId: selectedPhaseId };
  const selectionErrors = selectionGate(editErrors, selection);

  const allMessages = Object.values(errors)
    .flatMap((eventErrors) => [
      eventErrors.name === undefined ? [] : [`${EVENT_LABELS.NAME}：${eventErrors.name}`],
      eventErrors.type === undefined ? [] : [`${EVENT_LABELS.TYPE}：${eventErrors.type}`],
      eventErrors.phases === undefined ? [] : [eventErrors.phases],
      ...Object.entries(eventErrors.phaseErrors ?? {}).flatMap(([phaseId, phaseErrors]) => {
        const phaseIndex =
          events
            .find((event) => event.phases.some((phase) => phase.id === phaseId))
            ?.phases.findIndex((phase) => phase.id === phaseId) ?? 0;
        const name = `Phase ${phaseIndex + 1}`;
        return Object.values(phaseErrors).map((message) => `${name}：${message}`);
      }),
    ])
    .flat();

  /** Every path that selects a phase also brings it into view on narrow screens. */
  const openSelection = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
    const owner = events.find((event) => event.phases.some((phase) => phase.id === phaseId));
    if (owner !== undefined) {
      setExpandedIds((previous) =>
        previous.has(owner.id) ? previous : new Set(previous).add(owner.id),
      );
    }
    if (!isDesktop) setSheetOpen(true);
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(eventId)) next.add(eventId);
      return next;
    });
  };

  const createDefault = () =>
    openSelection(
      addEventWithPhase(
        retirementYear ?? projectionStartYear,
        retirementYear ?? projectionStartYear,
      ).phaseId,
    );

  /**
   * A click on an empty year adds a phase to the row it landed on. Outside any
   * row (the axis strip) it uses the selection, then the first event; only a
   * fully empty section needs a whole new event.
   */
  const createAt = (startYear: number, endYear: number, eventId: string | null) => {
    const target = eventId ?? selectedEvent?.id ?? events[0]?.id ?? null;

    if (target !== null) {
      openSelection(addPhaseAt(target, startYear, endYear));
      return;
    }

    openSelection(addEventWithPhase(startYear, endYear).phaseId);
  };

  const select = (next: TimelineSelection) => openSelection(next.phaseId);

  /**
   * Closes the sheet and lands focus on the section's ADD. The phase bar that
   * opened it is often gone by then, and the sheet's focus scope hands focus
   * back on its way out, so placement runs a beat after the close.
   */
  const closeSheet = () => {
    setSelectedPhaseId(null);
    setSheetOpen(false);
    window.setTimeout(() => addRef.current?.focus(), FOCUS_AFTER_CLOSE_MS);
  };

  /**
   * Deleting closes regardless; the plain close is the confirm gesture and is
   * held back while the open phase still has errors, which is the only moment
   * the user can be told which field is wrong.
   */
  const requestClose = () => {
    if (selectionErrors.blocked) return;
    closeSheet();
  };

  /**
   * Removes a phase. Deleting the last one replaces it, so the sheet stays open
   * and focus has somewhere to land; otherwise the selection goes with it and
   * focus returns to the section's ADD.
   */
  const removeAndForget = (eventId: string, phaseId: string) => {
    const next = removePhase(eventId, phaseId);
    if (phaseId !== selectedPhaseId) return;
    if (next !== phaseId) {
      setSelectedPhaseId(next);
      return;
    }
    if (sheetOpen) {
      closeSheet();
      return;
    }
    setSelectedPhaseId(null);
    window.setTimeout(() => addRef.current?.focus(), 0);
  };

  const deletePhase = () => {
    if (selectedEvent === null || selectedPhase === null) return;
    removeAndForget(selectedEvent.id, selectedPhase.id);
  };

  /**
   * Deleting an event takes every phase with it, so it asks first. The
   * selection cannot survive it; focus falls back to the section's ADD, or to
   * the empty state's ADD when that was the last event.
   */
  const deleteEvent = async () => {
    if (selectedEvent === null) return;
    const name = selectedEvent.name.trim() === '' ? undefined : selectedEvent.name;
    const confirmed = await confirm({
      title: EVENT_LABELS.DELETE_EVENT_TITLE,
      context: name,
      consequence: EVENT_LABELS.DELETE_EVENT_CONSEQUENCE,
      confirmLabel: EVENT_LABELS.DELETE_CONFIRM,
    });
    if (!confirmed) return;
    remove(selectedEvent.id);
    if (sheetOpen) {
      closeSheet();
      return;
    }
    setSelectedPhaseId(null);
    window.setTimeout(() => addRef.current?.focus(), 0);
  };

  const inspector = (inline: boolean) =>
    selectedEvent !== null && selectedPhase !== null ? (
      <DrawerPanel
        inline={inline}
        title={WORKSPACE_ACTION_LABELS.INSPECTOR}
        footer={
          !readOnly && (
            <div className="grid w-full gap-2">
              {selectionErrors.blocked && (
                <p className={formMessageClass} data-testid="phase-blocked-hint">
                  {EVENT_LABELS.SHEET_BLOCKED}
                </p>
              )}
              <InspectorFooter
                onAddPhase={() =>
                  openSelection(addPhase(selectedEvent.id, retirementYear ?? projectionStartYear))
                }
                onDeletePhase={deletePhase}
                onDeleteEvent={() => void deleteEvent()}
              />
            </div>
          )
        }
      >
        <LifeEventInspector
          event={selectedEvent}
          phase={selectedPhase}
          readOnly={readOnly}
          focusRequest={isDesktop || sheetOpen ? focusRequest : null}
          eventErrors={selectionErrors.event}
          errors={selectionErrors.phase}
          eventOptions={events.map((event) => ({ value: event.id, label: event.name }))}
          updateEvent={(patch) => update(selectedEvent.id, patch)}
          updatePhase={(patch) => updatePhase(selectedEvent.id, selectedPhase.id, patch)}
          setType={(type) => setType(selectedEvent.id, type)}
          onReparent={(targetEventId) => {
            // The current event is listed too, so re-picking it is a no-op.
            if (targetEventId === selectedEvent.id) return;
            reparent(selectedPhase.id, targetEventId);
          }}
        />
      </DrawerPanel>
    ) : (
      <p className="text-sm text-muted-foreground">{WORKSPACE_ACTION_LABELS.NO_SELECTION}</p>
    );

  return (
    <Form {...form}>
      <PageSection
        number={WORKSPACE_SECTION_LABELS.NUMBER_EVENTS}
        title={`${PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION} · ${events.length}`}
        status={status}
        hint={hint}
        testId="section-events"
        action={
          <div className="flex items-center gap-2">
            {!readOnly && !isEmpty && (
              <>
                {/* Undo only rewinds a timeline drag, so it belongs to this
                    section rather than the workspace-wide footer. */}
                <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo}>
                  {WORKSPACE_ACTION_LABELS.UNDO}
                </Button>
                <Button ref={addRef} variant="outline" size="sm" onClick={createDefault}>
                  {EVENT_LABELS.ADD}
                </Button>
              </>
            )}
          </div>
        }
      >
        {isEmpty ? (
          <div className="grid justify-items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">{EVENT_LABELS.EMPTY}</p>
            {!readOnly && (
              <Button ref={addRef} variant="outline" size="sm" onClick={createDefault}>
                {EVENT_LABELS.ADD}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <div
              className={cn('flex items-center gap-1 md:hidden', events.length === 1 && 'hidden')}
            >
              <Button
                variant={mobileView === 'list' ? 'outline' : 'text'}
                size="sm"
                onClick={() => setMobileView('list')}
              >
                {WORKSPACE_ACTION_LABELS.VIEW_LIST}
              </Button>
              <Button
                variant={mobileView === 'timeline' ? 'outline' : 'text'}
                size="sm"
                onClick={() => setMobileView('timeline')}
              >
                {WORKSPACE_ACTION_LABELS.VIEW_TIMELINE}
              </Button>
            </div>

            <div className={cn(mobileView === 'list' ? 'hidden md:block' : 'block')}>
              <LifeEventTimelineEditor
                events={events}
                readOnly={readOnly}
                projectionStartYear={projectionStartYear}
                birthYear={birthYear}
                lifeExpectancy={lifeExpectancy}
                retirementYear={retirementYear}
                selection={selection}
                revealYear={revealYear}
                onSelect={select}
                onCreate={createAt}
                onGestureStart={onGestureStart}
                onRangeChange={onRangeChange}
              />
            </div>

            {isDesktop && (
              <div className="grid gap-3 border-t border-border pt-4">{inspector(true)}</div>
            )}

            <div className={cn(mobileView === 'list' ? 'block md:hidden' : 'hidden')}>
              <ul className="grid grid-cols-1 gap-3">
                {events.map((event) => (
                  <LifeEventRow
                    key={event.id}
                    event={event}
                    errors={errors[event.id] ?? {}}
                    readOnly={readOnly}
                    // An errored event stays open, so no message hides behind a fold.
                    expanded={
                      expandedIds.has(event.id) || Object.keys(errors[event.id] ?? {}).length > 0
                    }
                    selectedPhaseId={selectedPhaseId}
                    onToggleExpand={() => toggleExpanded(event.id)}
                    onSelectPhase={openSelection}
                    remove={() => remove(event.id)}
                    toggle={() => toggle(event.id)}
                    addPhase={() =>
                      openSelection(addPhase(event.id, retirementYear ?? projectionStartYear))
                    }
                  />
                ))}
              </ul>
            </div>
          </div>
        )}

        {allMessages.length > 0 && (
          <ul className="mt-3 space-y-1 text-center" data-testid="event-error-summary">
            {allMessages.map((message, index) => (
              <li key={`${message}-${index}`} className={formMessageClass}>
                {message}
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      {!isDesktop && sheetOpen && (
        <Sheet open onOpenChange={(next) => !next && requestClose()}>
          <SheetContent side="bottom" className="max-h-[80vh]">
            {inspector(false)}
          </SheetContent>
        </Sheet>
      )}
    </Form>
  );
}
