import { PageSection } from '@/ui/components/PageSection';
import { Button } from '@/ui/components/ui/button';
import { EVENT_LABELS } from '@/ui/constants/retirement-redesign/eventLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { LifeEventRow } from '@/ui/features/retirement-redesign/components/LifeEventRow';
import {
  type EventType,
  type LifeEventDraftVM,
  type PhaseDraftVM,
  type PhaseFocusRequest,
} from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';
import { type EventErrorsById } from '@/ui/features/retirement-redesign/hooks/useLifeEventDrafts';

interface LifeEventsSectionProps {
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

  return (
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
          {events.map((event) => (
            <LifeEventRow
              key={event.id}
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
    </PageSection>
  );
}
