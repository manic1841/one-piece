import React from 'react';

import { type WatchListTargetType } from '@/domains/watch_list/schemas';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import SettlementCompletenessGate from '@/ui/features/project/components/settlement/SettlementCompletenessGate';
import { type CompletenessAnomalyVM } from '@/ui/features/project/viewmodels/settlementPreview.vm';

interface SettlementSelectionProps {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  error?: string;
  pendingAnomalies?: CompletenessAnomalyVM[];

  completenessError?: string;
  onConfirmAnomaly?: (targetType: WatchListTargetType, targetId: string) => void;
}

export const SettlementSelection: React.FC<SettlementSelectionProps> = ({
  year,
  month,
  setYear,
  setMonth,
  error,
  pendingAnomalies = [],
  completenessError = '',
  onConfirmAnomaly,
}) => {
  return (
    <div className="space-y-4 py-4">
      <p className="text-muted-foreground">
        Select the month you want to settle. This will create snapshots for all active projects.
      </p>

      {/* Year & Month */}
      <YearMonthPicker
        year={year}
        month={month}
        onYearChange={(y) => setYear(parseInt(y) || 0)}
        onMonthChange={(m) => setMonth(parseInt(m) || 1)}
      />

      {onConfirmAnomaly && (
        <SettlementCompletenessGate
          anomalies={pendingAnomalies}
          completenessError={completenessError}
          onConfirm={onConfirmAnomaly}
        />
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
};
