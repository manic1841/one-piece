import React, { useState } from 'react';

import { Pencil, Plus, Trash2 } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { RowActions } from '@/ui/components/RowActions';
import { Skeleton } from '@/ui/components/Skeleton';
import { Toolbar } from '@/ui/components/Toolbar';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataList,
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementEventsLabels as L,
  RETIREMENT_EVENTS_COLUMN_WIDTHS,
  type RetirementEventsFilter,
  RetirementEventsFilterItems,
  RetirementTabContentLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementEventItemVM,
  type RetirementEventPhaseRowVM,
  type RetirementOneTimeEvent,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { cn } from '@/ui/utils/cn';

import { EventEntryEditor } from '../EventEntryEditor';
import { PhaseEntryEditor } from '../PhaseEntryEditor';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];
type EventItem = { domain: RetirementOneTimeEvent; vm: RetirementEventItemVM };

interface EventTabContentProps {
  currentYear: number;
  /** Region three-state (spec #301 §2.5); the page supplies the plan-level flags. */
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  eventItems: EventItem[];
  handleAddEvent: (data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleUpdateEvent: (id: string, data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
  handleAddPhase: (eventId: string, phase: RetirementEventPhase) => Promise<void>;
  handleUpdatePhase: (
    eventId: string,
    phaseIndex: number,
    phase: RetirementEventPhase,
  ) => Promise<void>;
  handleDeletePhase: (eventId: string, phaseIndex: number) => Promise<void>;
}

interface RowHandlers {
  currentYear: number;
  handleUpdateEvent: (id: string, data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
  handleAddPhase: (eventId: string, phase: RetirementEventPhase) => Promise<void>;
  handleUpdatePhase: (
    eventId: string,
    phaseIndex: number,
    phase: RetirementEventPhase,
  ) => Promise<void>;
  handleDeletePhase: (eventId: string, phaseIndex: number) => Promise<void>;
}

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/**
 * 事件列動作：**新增階段**（具名、鍵盤可達，#292 硬依賴）／編輯事件／刪除事件
 * （toast＋Undo，無 confirm）。新增階段與編輯事件共用側欄，只換 trigger。
 */
const EventRowActions: React.FC<{ event: RetirementOneTimeEvent; handlers: RowHandlers }> = ({
  event,
  handlers,
}) => (
  <div className="flex shrink-0 items-center gap-1">
    <PhaseEntryEditor
      eventName={event.name}
      currentYear={handlers.currentYear}
      onSave={(phase) => handlers.handleAddPhase(event.id, phase)}
      trigger={
        <Button variant="ghost" size="icon" aria-label={L.addPhaseAction}>
          <Plus className="h-4 w-4" />
        </Button>
      }
    />
    <RowActions
      edit={
        <EventEntryEditor
          currentYear={handlers.currentYear}
          initialData={event}
          onSave={(updates) => handlers.handleUpdateEvent(event.id, updates)}
          trigger={
            <Button variant="ghost" size="icon" aria-label={RetirementTabContentLabels.editAction}>
              <Pencil className="h-4 w-4" />
            </Button>
          }
        />
      }
      onDelete={() => handlers.handleDeleteEvent(event.id)}
      deleteLabel={RetirementTabContentLabels.deleteAction}
    />
  </div>
);

/** An event's phases as compact lines inside its expanded mobile row. */
const PhaseLines: React.FC<{
  event: RetirementOneTimeEvent;
  phases: RetirementEventPhaseRowVM[];
  handlers: RowHandlers;
}> = ({ event, phases, handlers }) => (
  <div className="space-y-2">
    {phases.map((phase) => (
      <div key={phase.index} className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {/* Secondary line is `phase.name` only — blank hides it, no fallback. */}
          {phase.name !== undefined && <div className="text-sm">{phase.name}</div>}
          <div className="font-mono text-xs tabular-nums text-muted-foreground">
            {phase.yearText} · {phase.growthText}
          </div>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">{phase.amountText}</span>
        <div className="flex shrink-0 items-center gap-1">
          <PhaseEntryEditor
            eventName={event.name}
            currentYear={handlers.currentYear}
            initialData={event.phases[phase.index]}
            onSave={(next) => handlers.handleUpdatePhase(event.id, phase.index, next)}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={L.editPhaseAction}
                className="h-7 w-7"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={L.removePhaseAction}
            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={phases.length <= 1}
            onClick={() => handlers.handleDeletePhase(event.id, phase.index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    ))}
  </div>
);

export const EventTabContent: React.FC<EventTabContentProps> = ({
  currentYear,
  loading,
  error,
  onRetry,
  eventItems,
  handleAddEvent,
  handleUpdateEvent,
  handleDeleteEvent,
  handleAddPhase,
  handleUpdatePhase,
  handleDeletePhase,
}) => {
  const [filter, setFilter] = useState<RetirementEventsFilter>('all');

  const visibleItems =
    filter === 'all' ? eventItems : eventItems.filter((item) => item.domain.type === filter);

  const handlers: RowHandlers = {
    currentYear,
    handleUpdateEvent,
    handleDeleteEvent,
    handleAddPhase,
    handleUpdatePhase,
    handleDeletePhase,
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{L.loadingLabel}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="warning">
          <AlertDescription>{L.loadError}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
            {L.retryAction}
          </Button>
        </Alert>
      );
    }

    if (eventItems.length === 0) {
      return (
        <EmptyState
          title={L.emptyTitle}
          description={L.emptyDescription}
          action={<EventEntryEditor currentYear={currentYear} onSave={handleAddEvent} />}
        />
      );
    }

    if (visibleItems.length === 0) {
      return <EmptyState title={L.filterEmptyTitle} description={L.filterEmptyDescription} />;
    }

    return (
      <>
        <DataTableScrollArea>
          <DataTable>
            <DataTableColGroup widths={RETIREMENT_EVENTS_COLUMN_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell>{L.columnName}</DataTableHeadCell>
                <DataTableHeadCell>{L.columnType}</DataTableHeadCell>
                <DataTableHeadCell>{L.columnYears}</DataTableHeadCell>
                <DataTableHeadCell align="number">{L.columnAmount}</DataTableHeadCell>
                <DataTableHeadCell className="text-right">{L.columnActions}</DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map(({ domain, vm }) => (
                <DataTableRow key={vm.id} data-testid={`event-row-${vm.id}`}>
                  <DataTableCell>
                    <div className="font-medium">{vm.name}</div>
                    {vm.note !== undefined && (
                      <div className="text-xs text-muted-foreground">{vm.note}</div>
                    )}
                  </DataTableCell>
                  <DataTableCell>{vm.typeLabel}</DataTableCell>
                  <DataTableCell className="font-mono tabular-nums text-muted-foreground">
                    {vm.yearText}
                  </DataTableCell>
                  <DataTableCell align="number">
                    <div className={cn('font-mono font-medium tabular-nums', vm.amountClassName)}>
                      {vm.amountText}
                    </div>
                    {vm.phaseCountText !== undefined && (
                      <div className="text-xs text-muted-foreground">{vm.phaseCountText}</div>
                    )}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex justify-end">
                      <EventRowActions event={domain} handlers={handlers} />
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </TableBody>
          </DataTable>
        </DataTableScrollArea>

        <MobileDataList>
          {visibleItems.map(({ domain, vm }) => (
            <MobileExpandableRow
              key={vm.id}
              data-testid={`event-row-mobile-${vm.id}`}
              summary={<span className="truncate text-sm font-medium">{vm.name}</span>}
              value={
                <span className={cn('font-mono text-sm tabular-nums', vm.amountClassName)}>
                  {vm.amountText}
                </span>
              }
              meta={
                <>
                  <span>{vm.typeLabel}</span>
                  {vm.phaseCountText !== undefined && <span>{vm.phaseCountText}</span>}
                </>
              }
              actions={<EventRowActions event={domain} handlers={handlers} />}
              details={<PhaseLines event={domain} phases={vm.phases} handlers={handlers} />}
            />
          ))}
        </MobileDataList>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <Toolbar actions={<EventEntryEditor currentYear={currentYear} onSave={handleAddEvent} />}>
        <FilterStrip
          items={RetirementEventsFilterItems}
          value={filter}
          onValueChange={(id) => setFilter(id as RetirementEventsFilter)}
          ariaLabel={L.filterAriaLabel}
        />
      </Toolbar>

      {renderContent()}
    </div>
  );
};
