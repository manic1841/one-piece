import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { type RetirementOneTimeEvent } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { type RetirementEventItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

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
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">One-Time Events ({eventItems.length})</h3>
        <EventDialog onSave={handleAddEvent} currentYear={currentYear} />
      </div>
      {eventItems.length === 0 ? (
        <p className="text-muted-foreground">
          No events defined yet. Click Add Event to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {eventItems.map(({ domain, vm }) => (
            <div key={vm.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{vm.name}</div>
                  <div className="text-sm text-muted-foreground">{vm.yearText}</div>
                  {vm.note && <div className="text-sm text-muted-foreground mt-1">{vm.note}</div>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-medium ${vm.amountClassName}`}>{vm.amountText}</div>
                    <div className="text-xs uppercase text-muted-foreground">{vm.typeText}</div>
                  </div>
                  <div className="flex gap-2">
                    <EventDialog
                      onSave={(updates) => handleUpdateEvent(domain.id, updates)}
                      currentYear={currentYear}
                      initialData={domain}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteEvent(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
