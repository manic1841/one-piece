import React from 'react';

import { Pencil } from 'lucide-react';

import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { RowActions } from '@/ui/components/RowActions';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementTabContentLabels,
  RetirementWorkspaceTermLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementEventItemVM,
  type RetirementOneTimeEvent,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { cn } from '@/ui/utils/cn';

import EventDialog from '../EventDialog';

interface EventTabContentProps {
  currentYear: number;
  eventItems: Array<{ domain: RetirementOneTimeEvent; vm: RetirementEventItemVM }>;
  handleAddEvent: (data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleUpdateEvent: (id: string, data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
}

export const EventTabContent: React.FC<EventTabContentProps> = ({
  currentYear,
  eventItems,
  handleAddEvent,
  handleUpdateEvent,
  handleDeleteEvent,
}) => {
  return (
    <div>
      <ListSectionHeader
        className="mb-4"
        title={RetirementWorkspaceTermLabels.retirementEvents}
        count={eventItems.length}
        actions={<EventDialog onSave={handleAddEvent} currentYear={currentYear} />}
      />
      {eventItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{RetirementTabContentLabels.eventEmpty}</p>
      ) : (
        <div className="divide-y divide-border">
          {eventItems.map(({ domain, vm }) => (
            <div key={vm.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{vm.name}</div>
                <div className="font-mono text-sm tabular-nums text-muted-foreground">
                  {vm.yearText}
                </div>
                {vm.note && <div className="mt-1 text-sm text-muted-foreground">{vm.note}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className={cn('font-mono font-medium tabular-nums', vm.amountClassName)}>
                    {vm.amountText}
                  </div>
                  <div className="text-xs uppercase text-muted-foreground">{vm.typeText}</div>
                  {vm.phaseCountText && (
                    <div className="text-xs text-muted-foreground">{vm.phaseCountText}</div>
                  )}
                </div>
                <RowActions
                  edit={
                    <EventDialog
                      onSave={(updates) => handleUpdateEvent(domain.id, updates)}
                      currentYear={currentYear}
                      initialData={domain}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={RetirementTabContentLabels.editAction}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                  }
                  onDelete={() => handleDeleteEvent(domain.id)}
                  deleteLabel={RetirementTabContentLabels.deleteAction}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
