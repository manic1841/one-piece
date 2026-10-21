import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import { Form } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { EVENT_LABELS } from '@/ui/constants/retirement-redesign/eventLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { LifeEventRow } from '@/ui/features/retirement-redesign/components/LifeEventRow';
import {
  type EventType,
  type EventsForm,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
} from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';
import { type EventErrorsById } from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';

interface LifeEventsSectionProps {
  form: UseFormReturn<EventsForm>;
  events: LifeEventDraftVM[];
  errors: EventErrorsById;
  readOnly: boolean;
  focusRequest: PhaseFocusRequest | null;
  add: () => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<Omit<LifeEventDraftVM, 'phases'>>) => void;
  setType: (id: string, type: EventType) => void;
  addPhase: (eventId: string) => void;
  removePhase: (eventId: string, phaseId: string) => void;
  updatePhase: (eventId: string, phaseId: string, patch: Partial<PhaseDraftVM>) => void;
}

/** The life-event list; rules stay their own list above. */
export function LifeEventsSection({
  form,
  events,
  errors,
  readOnly,
  focusRequest,
  add,
  remove,
  toggle,
  update,
  setType,
  addPhase,
  removePhase,
  updatePhase,
}: LifeEventsSectionProps) {
  const isEmpty = events.length === 0;

  const allMessages = Object.values(errors).flatMap((eventErrors) => [
    eventErrors.name,
    eventErrors.type,
    eventErrors.phases,
    ...Object.values(eventErrors.phaseErrors ?? {}).flatMap((phaseErrors) =>
      Object.values(phaseErrors),
    ),
  ]);

  return (
    <Form {...form}>
      <PageSection
        number="03"
        title={PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION}
        spacing="compact"
        action={
          !readOnly &&
          !isEmpty && (
            <Button variant="outline" size="sm" onClick={add}>
              {EVENT_LABELS.ADD}
            </Button>
          )
        }
      >
        {isEmpty ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{EVENT_LABELS.EMPTY}</p>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={add}>
                {EVENT_LABELS.ADD}
              </Button>
            )}
          </div>
        ) : (
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
    </Form>
  );
}
