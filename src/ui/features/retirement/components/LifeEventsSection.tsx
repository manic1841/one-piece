import { useState } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { Form } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';
import { EVENT_LABELS } from '@/ui/constants/retirement/eventLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  WORKSPACE_ACTION_LABELS,
  WORKSPACE_SECTION_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
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

interface LifeEventsSectionProps {
  form: UseFormReturn<EventsForm>;
  events: LifeEventDraftVM[];
  errors: EventErrorsById;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  projectionStartYear: number;
  birthYear: number;
  lifeExpectancy: number;
  retirementYear: number | null;
  revealYear: number | null;
  add: () => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  setType: (id: string, type: EventType) => void;
  addPhase: (eventId: string) => void;
  addPhaseAt: (eventId: string, startYear: number, endYear: number) => string;
  addEventWithPhase: (startYear: number, endYear: number) => TimelineSelection;
  removePhase: (eventId: string, phaseId: string) => void;
  updatePhase: (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => void;
  onGestureStart: () => void;
  onRangeChange: (
    eventId: string,
    phaseId: string,
    targetEventId: string,
    startYear: number,
    endYear: number,
  ) => void;
}

/**
 * Life events as a timeline plus an inspector. The timeline is the default on
 * narrow screens because dragging beats typing there; the list stays available
 * for precise input, and the timeline is anchored to the retirement year. A
 * phase click selects it; on mobile the inspector opens in a sheet instead of a
 * column.
 */
export function LifeEventsSection({
  form,
  events,
  errors,
  readOnly,
  focusRequest,
  projectionStartYear,
  birthYear,
  lifeExpectancy,
  retirementYear,
  revealYear,
  add,
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
}: LifeEventsSectionProps) {
  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'timeline'>(() =>
    window.innerWidth < 768 ? 'timeline' : 'list',
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const isEmpty = events.length === 0;
  const selectedEvent = events.find((event) => event.id === selection?.eventId) ?? null;
  const selectedPhase =
    selectedEvent?.phases.find((phase) => phase.id === selection?.phaseId) ?? null;
  const selectedIndex = selectedEvent === null ? -1 : events.indexOf(selectedEvent);

  const allMessages = Object.values(errors).flatMap((eventErrors) => [
    eventErrors.name,
    eventErrors.type,
    eventErrors.phases,
    ...Object.values(eventErrors.phaseErrors ?? {}).flatMap((phaseErrors) =>
      Object.values(phaseErrors),
    ),
  ]);

  const createAt = (startYear: number, endYear: number) => {
    // A click on an empty year adds a phase to the current event; with nothing
    // selected it lands on the first event, and only a fully empty section
    // needs a whole new event.
    const target =
      selection !== null && events.some((event) => event.id === selection.eventId)
        ? selection.eventId
        : (events[0]?.id ?? null);

    if (target !== null) {
      const phaseId = addPhaseAt(target, startYear, endYear);
      setSelection({ eventId: target, phaseId });
      return;
    }

    setSelection(addEventWithPhase(startYear, endYear));
  };

  const select = (next: TimelineSelection) => {
    setSelection(next);
    if (window.innerWidth < 768) setSheetOpen(true);
  };

  const inspector =
    selectedEvent !== null && selectedPhase !== null && selectedIndex >= 0 ? (
      <LifeEventInspector
        event={selectedEvent}
        phase={selectedPhase}
        eventIndex={selectedIndex}
        readOnly={readOnly}
        errors={{
          ...(errors[selectedEvent.id]?.name === undefined
            ? {}
            : { name: errors[selectedEvent.id]?.name }),
          ...(errors[selectedEvent.id]?.phaseErrors?.[selectedPhase.id] ?? {}),
        }}
        updateEvent={(patch) => update(selectedEvent.id, patch)}
        updatePhase={(patch) => updatePhase(selectedEvent.id, selectedPhase.id, patch)}
        removePhase={() => removePhase(selectedEvent.id, selectedPhase.id)}
      />
    ) : (
      <p className="text-[13px] text-muted-foreground">{WORKSPACE_ACTION_LABELS.NO_SELECTION}</p>
    );

  return (
    <Form {...form}>
      <PageSection
        number={WORKSPACE_SECTION_LABELS.NUMBER_EVENTS}
        title={PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION}
        action={
          <div className="flex items-center gap-2">
            <span className={eyebrowClass} data-testid="event-status">
              {events.length}
            </span>
            {!readOnly && (
              <Button variant="text" size="sm" onClick={add}>
                {EVENT_LABELS.ADD}
              </Button>
            )}
          </div>
        }
      >
        {isEmpty ? (
          <p className="text-[13px] text-muted-foreground">{EVENT_LABELS.EMPTY}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
            <div className="grid gap-3">
              <div className="flex items-center gap-1 md:hidden">
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

              <div className={cn(mobileView === 'list' ? 'block md:hidden' : 'hidden')}>
                <ul className="grid grid-cols-1 gap-4">
                  {events.map((event, index) => (
                    <LifeEventRow
                      key={event.id}
                      index={index}
                      event={event}
                      errors={errors[event.id] ?? {}}
                      readOnly={readOnly}
                      focusRequest={focusRequest}
                      update={(patch) => update(event.id, patch)}
                      remove={() => remove(event.id)}
                      toggle={() => toggle(event.id)}
                      addPhase={() => addPhase(event.id)}
                      removePhase={(phaseId) => removePhase(event.id, phaseId)}
                      updatePhase={(phaseId, patch) => updatePhase(event.id, phaseId, patch)}
                      setType={(type) => setType(event.id, type)}
                    />
                  ))}
                </ul>
              </div>
            </div>

            <div className="hidden border-l border-border pl-4 md:block">{inspector}</div>
          </div>
        )}

        {allMessages.length > 0 && (
          <ul className="mt-3 space-y-1" data-testid="event-error-summary">
            {allMessages.map((message, index) => (
              <li key={`${message}-${index}`} className="text-destructive text-sm font-medium">
                {message}
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto md:hidden">
          <SheetHeader>
            <SheetTitle>{WORKSPACE_ACTION_LABELS.INSPECTOR}</SheetTitle>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>
    </Form>
  );
}
