import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type RetirementOneTimeEvent, type RetirementPlan } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

import EventDialog from '../EventDialog';

interface EventTabContentProps {
  plan: RetirementPlan;
  handleAddEvent: (data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleUpdateEvent: (id: string, data: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
}

export const EventTabContent: React.FC<EventTabContentProps> = ({
  plan,
  handleAddEvent,
  handleUpdateEvent,
  handleDeleteEvent,
}) => {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">One-Time Events ({plan.events.length})</h3>
        <EventDialog onSave={handleAddEvent} currentYear={plan.currentYear} />
      </div>
      {plan.events.length === 0 ? (
        <p className="text-muted-foreground">
          No events defined yet. Click Add Event to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {plan.events.map((event) => (
            <div key={event.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{event.name}</div>
                  <div className="text-sm text-muted-foreground">Year: {event.year}</div>
                  {event.note && (
                    <div className="text-sm text-muted-foreground mt-1">{event.note}</div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div
                      className={`font-medium ${
                        event.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {event.type === 'income' ? '+' : '-'}
                      {formatCurrency(event.amount)}
                    </div>
                    <div className="text-xs uppercase text-muted-foreground">{event.type}</div>
                  </div>
                  <div className="flex gap-2">
                    <EventDialog
                      onSave={(updates) => handleUpdateEvent(event.id, updates)}
                      currentYear={plan.currentYear}
                      initialData={event}
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
                      onClick={() => handleDeleteEvent(event.id)}
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
