import { PageSection } from '@/ui/components/PageSection';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { type DefinitionSectionVM } from '@/ui/features/retirement/viewmodels/projectionViewVm';

interface DefinitionListProps {
  items: DefinitionSectionVM['items'];
}

function DefinitionList({ items }: DefinitionListProps) {
  return (
    <dl className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4"
        >
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="break-words text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ProjectionSourceTabProps {
  sourceSections: DefinitionSectionVM[];
  configSections: DefinitionSectionVM[];
}

/** Source tab: baseline references and the frozen config, always expanded. */
export function ProjectionSourceTab({ sourceSections, configSections }: ProjectionSourceTabProps) {
  return (
    <div className="space-y-2" data-testid="projection-source-tab">
      {sourceSections.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{PROJECTION_VIEW_LABELS.EMPTY_SOURCE}</p>
      ) : (
        sourceSections.map((section) => (
          <PageSection key={section.title} title={section.title} spacing="compact">
            <DefinitionList items={section.items} />
          </PageSection>
        ))
      )}

      {configSections.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{PROJECTION_VIEW_LABELS.EMPTY_CONFIG}</p>
      ) : (
        configSections.map((section) => (
          <PageSection key={section.title} title={section.title} spacing="compact">
            <DefinitionList items={section.items} />
          </PageSection>
        ))
      )}
    </div>
  );
}
