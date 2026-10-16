import React, { useState } from 'react';

import { FilterStrip } from '@/ui/components/FilterStrip';
import { Toolbar } from '@/ui/components/Toolbar';
import {
  type RetirementLifeEventsView,
  RetirementLifeEventsViewItems,
  RetirementLifeEventsViewLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import type {
  RetirementEventItemVM,
  RetirementOneTimeEvent,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import type { TimelineRange } from '@/ui/features/retirement/viewmodels/retirementTimeline.vm';

import { EventTabContent } from './EventTabContent';
import { TimelineView } from './TimelineView';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];
type EventItem = { domain: RetirementOneTimeEvent; vm: RetirementEventItemVM };

interface LifeEventsSectionProps {
  currentYear: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  range: TimelineRange;
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
  handleTimelineUpdatePhase: (
    eventId: string,
    phaseIndex: number,
    patch: { startYear: number; endYear: number; targetEventId?: string },
  ) => Promise<void>;
}

/**
 * Life Events 區域（spec #301 §5.1）：**Data Table** 與 **Timeline** 為區域內互斥切換
 * （一次只顯示一種視圖、非並排）。切換器為一組帶 `aria-pressed` 的按鈕（`FilterStrip`）。
 * 兩個視圖共用同一份事件資料與 mutation 接線；各自負責自身三態。
 */
export const LifeEventsSection: React.FC<LifeEventsSectionProps> = ({
  currentYear,
  loading,
  error,
  onRetry,
  range,
  eventItems,
  handleAddEvent,
  handleUpdateEvent,
  handleDeleteEvent,
  handleAddPhase,
  handleUpdatePhase,
  handleDeletePhase,
  handleTimelineUpdatePhase,
}) => {
  const [view, setView] = useState<RetirementLifeEventsView>('timeline');

  return (
    <div className="space-y-4">
      <Toolbar>
        <FilterStrip
          items={RetirementLifeEventsViewItems}
          value={view}
          onValueChange={(id) => setView(id as RetirementLifeEventsView)}
          ariaLabel={RetirementLifeEventsViewLabels.ariaLabel}
        />
      </Toolbar>

      {view === 'table' ? (
        <EventTabContent
          currentYear={currentYear}
          loading={loading}
          error={error}
          onRetry={onRetry}
          eventItems={eventItems}
          handleAddEvent={handleAddEvent}
          handleUpdateEvent={handleUpdateEvent}
          handleDeleteEvent={handleDeleteEvent}
          handleAddPhase={handleAddPhase}
          handleUpdatePhase={handleUpdatePhase}
          handleDeletePhase={handleDeletePhase}
        />
      ) : (
        <TimelineView
          currentYear={currentYear}
          range={range}
          eventItems={eventItems}
          loading={loading}
          error={error}
          onRetry={onRetry}
          onAddEvent={handleAddEvent}
          onAddPhase={handleAddPhase}
          onUpdatePhase={handleUpdatePhase}
          onTimelineUpdatePhase={handleTimelineUpdatePhase}
        />
      )}
    </div>
  );
};
