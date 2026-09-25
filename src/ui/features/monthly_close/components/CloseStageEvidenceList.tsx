import React from 'react';

import { AlertCircle, Check, Eye } from 'lucide-react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import type { CloseStageEvidence } from '../viewmodels/monthlyClose.vm';

interface CloseStageEvidenceListProps {
  evidence: CloseStageEvidence;
}

export const CloseStageEvidenceList: React.FC<CloseStageEvidenceListProps> = ({ evidence }) => {
  if (evidence.kind === 'NONE') {
    return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;
  }

  return (
    <div className="space-y-2">
      {evidence.kind === 'TRANSACTION_VALIDATION' && evidence.transactionIssues.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {MONTHLY_CLOSE_LABELS.TRANSACTION_ISSUES}
            </p>
            {evidence.transactionIssues.map((issue) => (
              <p
                key={`${issue.transactionId}-${issue.reason}`}
                className="text-xs text-muted-foreground"
              >
                {issue.description ? `${issue.description}：` : ''}
                {issue.reason}
              </p>
            ))}
          </div>
        </div>
      )}

      {evidence.zeroActivityNames.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {MONTHLY_CLOSE_LABELS.ZERO_ACTIVITY}
            </p>
            {evidence.zeroActivityNames.map((name) => (
              <p key={name} className="text-xs text-muted-foreground">
                {name}
              </p>
            ))}
          </div>
        </div>
      )}

      {evidence.kind === 'CASH_FLOW_ADJUSTMENTS' && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          <Eye size={14} className="shrink-0 text-muted-foreground" />
          <p className="text-xs text-foreground">
            {MONTHLY_CLOSE_LABELS.ADJUSTMENT}: {evidence.cashFlowAdjustments.toLocaleString()}
          </p>
        </div>
      )}

      {evidence.kind === 'REPORT_PERSISTENCE' && (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          {evidence.reportsPersisted ? (
            <Check size={14} className="shrink-0 text-positive" />
          ) : (
            <AlertCircle size={14} className="shrink-0 text-warning" />
          )}
          <StatusGlyph
            type={evidence.reportsPersisted ? 'verified' : 'waiting'}
            label={MONTHLY_CLOSE_LABELS.REPORTS_PERSISTENCE}
          />
        </div>
      )}
    </div>
  );
};
