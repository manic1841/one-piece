import React from 'react';

import { AlertTriangle } from 'lucide-react';

import { type WatchListTargetType } from '@/domains/watch_list/schemas';
import { Button } from '@/ui/components/ui/button';
import {
  COMPLETENESS_LABELS,
  getCompletenessTargetLabel,
} from '@/ui/constants/settlementCompletenessLabels';
import { type CompletenessAnomalyVM } from '@/ui/features/project/viewmodels/settlementPreview.vm';

interface SettlementCompletenessGateProps {
  anomalies: CompletenessAnomalyVM[];
  completenessError: string;
  onConfirm: (targetType: WatchListTargetType, targetId: string) => void;
}

/**
 * Inline soft-gate warning for the settlement selection step (ADR-0048).
 * Zero activity never claims a missed entry; each anomaly needs an explicit
 * per-item confirmation before the wizard advances to the preview, and shows
 * the month's count/amount summary (issue #94). The raw check error stays in
 * the console; users only see the fixed constants wording.
 */
const SettlementCompletenessGate: React.FC<SettlementCompletenessGateProps> = ({
  anomalies,
  completenessError,
  onConfirm,
}) => {
  if (anomalies.length === 0 && !completenessError) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm space-y-3"
    >
      {completenessError && (
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p className="font-medium">{COMPLETENESS_LABELS.checkFailed}</p>
        </div>
      )}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{COMPLETENESS_LABELS.gateTitle}</p>
              <p>{COMPLETENESS_LABELS.gateDescription}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {anomalies.map((anomaly) => (
              <li
                key={anomaly.key}
                className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {getCompletenessTargetLabel(anomaly.targetType)}／{anomaly.name}
                  </p>
                  <p className="text-xs opacity-80">
                    {COMPLETENESS_LABELS.activityHint(
                      anomaly.activityCount,
                      anomaly.activityAmount,
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  aria-label={`${COMPLETENESS_LABELS.confirmButton} ${getCompletenessTargetLabel(anomaly.targetType)} ${anomaly.name}`}
                  onClick={() => onConfirm(anomaly.targetType, anomaly.targetId)}
                >
                  {COMPLETENESS_LABELS.confirmButton}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SettlementCompletenessGate;
