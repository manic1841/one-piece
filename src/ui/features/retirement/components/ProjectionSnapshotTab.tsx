import { Fragment } from 'react';

import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { LifeEventTimeline } from '@/ui/features/retirement/components/LifeEventTimeline';
import { type ProjectionViewVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { cn } from '@/ui/utils/cn';

const RULE_COLUMN_WIDTHS = [15, 14, 9, 17, 8, 12, 25] as const;

interface ProjectionSnapshotTabProps {
  view: ProjectionViewVM;
}

/** Muted trailing count / range next to a section heading. */
const trailing = (text: string) => (
  <span className="font-mono text-[11px] text-muted-foreground">{text}</span>
);

/**
 * Settings snapshot: one job — let the reader verify how the projection started
 * and which assumptions fed it. Opening facts first, assumptions as one metric
 * row, then the long-tail rule and source tables and the event timeline.
 * Read-only.
 */
export function ProjectionSnapshotTab({ view }: ProjectionSnapshotTabProps) {
  const { snapshot } = view;

  return (
    <div data-testid="projection-snapshot-tab">
      {snapshot.opening !== null && (
        <PageSection spacing="compact">
          <p className={eyebrowClass}>{PROJECTION_VIEW_LABELS.CALCULATION_OPENING_AMOUNT}</p>
          <FinancialNumber value={snapshot.opening.amountText} size="large" className="mt-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {snapshot.opening.sourceText}
            {snapshot.opening.anchorText !== null && ` · ${snapshot.opening.anchorText}`}
          </p>
        </PageSection>
      )}

      <PageSection
        spacing="compact"
        title={PROJECTION_VIEW_LABELS.ASSUMPTIONS_HEADING}
        action={
          snapshot.assumptions.length === 0
            ? undefined
            : trailing(PROJECTION_VIEW_LABELS.PARAMETERS_TRAILING(snapshot.assumptions.length))
        }
      >
        {snapshot.assumptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{PROJECTION_VIEW_LABELS.EMPTY_CONFIG}</p>
        ) : (
          <MetricGroup columns={5} lastSpansFull className="-mx-3 md:-mx-5">
            {snapshot.assumptions.map((item) => (
              <Metric key={item.label} label={item.label} value={item.value} />
            ))}
          </MetricGroup>
        )}
      </PageSection>

      <PageSection
        spacing="compact"
        title={PROJECTION_VIEW_LABELS.RULES_HEADING}
        action={
          snapshot.ruleCount === 0
            ? undefined
            : trailing(PROJECTION_VIEW_LABELS.RULES_TRAILING(snapshot.ruleCount))
        }
      >
        {snapshot.ruleCount === 0 ? (
          <p className="text-sm text-muted-foreground">{PROJECTION_VIEW_LABELS.NO_RULES}</p>
        ) : (
          <>
            <MobileDataList>
              {snapshot.ruleGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <p className="text-[11px] font-semibold text-foreground">{group.title}</p>
                  {group.rows.map((rule) => (
                    <MobileDataRow key={rule.id}>
                      <p className="text-sm">
                        {rule.name}
                        {rule.isDisabled && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {PROJECTION_VIEW_LABELS.EVENT_DISABLED}
                          </span>
                        )}
                      </p>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_METHOD}>
                        <span className="text-sm">{rule.methodText}</span>
                      </MobileDataField>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_PARAMETERS}>
                        <span className="font-mono text-sm tabular-nums">
                          {rule.parametersText}
                        </span>
                      </MobileDataField>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_END_CONDITION}>
                        <span className="text-sm">{rule.endConditionText}</span>
                      </MobileDataField>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_KEEPS_PACE}>
                        <span className="text-sm">{rule.keepsPaceText}</span>
                      </MobileDataField>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_BASELINE_POLICY}>
                        <span className="text-sm">{rule.baselineText}</span>
                      </MobileDataField>
                      <MobileDataField label={PROJECTION_VIEW_LABELS.COLUMN_SOURCE_REF}>
                        <span className="text-sm">{rule.sourceText}</span>
                        {rule.sourceBaselineText !== PROJECTION_COMMON_LABELS.DASH && (
                          <span className="mt-0.5 block font-mono text-xs text-muted-foreground tabular-nums">
                            {rule.sourceBaselineText}
                          </span>
                        )}
                      </MobileDataField>
                    </MobileDataRow>
                  ))}
                </div>
              ))}
            </MobileDataList>

            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={RULE_COLUMN_WIDTHS} />
                <TableHeader>
                  <DataTableHeadRow>
                    <DataTableHeadCell>{PROJECTION_VIEW_LABELS.COLUMN_RULE_NAME}</DataTableHeadCell>
                    <DataTableHeadCell>{PROJECTION_VIEW_LABELS.COLUMN_METHOD}</DataTableHeadCell>
                    <DataTableHeadCell align="number">
                      {PROJECTION_VIEW_LABELS.COLUMN_PARAMETERS}
                    </DataTableHeadCell>
                    <DataTableHeadCell>
                      {PROJECTION_VIEW_LABELS.COLUMN_END_CONDITION}
                    </DataTableHeadCell>
                    <DataTableHeadCell>
                      {PROJECTION_VIEW_LABELS.COLUMN_KEEPS_PACE}
                    </DataTableHeadCell>
                    <DataTableHeadCell>
                      {PROJECTION_VIEW_LABELS.COLUMN_BASELINE_POLICY}
                    </DataTableHeadCell>
                    <DataTableHeadCell>
                      {PROJECTION_VIEW_LABELS.COLUMN_SOURCE_REF}
                    </DataTableHeadCell>
                  </DataTableHeadRow>
                </TableHeader>
                <TableBody>
                  {snapshot.ruleGroups.map((group) => (
                    <Fragment key={group.key}>
                      <DataTableRow className="h-auto bg-muted/40">
                        <DataTableCell
                          colSpan={RULE_COLUMN_WIDTHS.length}
                          className="py-1.5 text-[11px] font-semibold text-foreground"
                        >
                          {group.title}
                          <span className="ml-2 font-mono font-normal text-muted-foreground">
                            {group.rows.length}
                          </span>
                        </DataTableCell>
                      </DataTableRow>
                      {group.rows.map((rule) => (
                        <DataTableRow key={rule.id} className={cn(rule.isDisabled && 'opacity-60')}>
                          <DataTableCell>
                            {rule.name}
                            {rule.isDisabled && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {PROJECTION_VIEW_LABELS.EVENT_DISABLED}
                              </span>
                            )}
                          </DataTableCell>
                          <DataTableCell>{rule.methodText}</DataTableCell>
                          <DataTableCell align="number">{rule.parametersText}</DataTableCell>
                          <DataTableCell>{rule.endConditionText}</DataTableCell>
                          <DataTableCell>{rule.keepsPaceText}</DataTableCell>
                          <DataTableCell>{rule.baselineText}</DataTableCell>
                          <DataTableCell>
                            {rule.sourceText}
                            {rule.sourceBaselineText !== PROJECTION_COMMON_LABELS.DASH && (
                              <span className="mt-0.5 block font-mono text-xs text-muted-foreground tabular-nums">
                                {rule.sourceBaselineText}
                              </span>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </DataTable>
            </DataTableScrollArea>
          </>
        )}
      </PageSection>

      <PageSection
        spacing="compact"
        title={PROJECTION_VIEW_LABELS.EVENTS_HEADING}
        action={
          snapshot.events.length === 0
            ? undefined
            : trailing(
                PROJECTION_VIEW_LABELS.EVENTS_TRAILING(
                  snapshot.events.length,
                  snapshot.eventRangeText,
                ),
              )
        }
        className="border-b-0"
      >
        {snapshot.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{PROJECTION_VIEW_LABELS.NO_EVENTS}</p>
        ) : (
          <LifeEventTimeline
            events={snapshot.events}
            startYear={snapshot.startYear}
            endYear={view.planEndYear}
            retirementYear={snapshot.retirementYear}
          />
        )}
      </PageSection>
    </div>
  );
}
