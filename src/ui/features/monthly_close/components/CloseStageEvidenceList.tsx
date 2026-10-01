import React from 'react';

import { AlertCircle, Check, Eye } from 'lucide-react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency } from '@/ui/utils';

import type { CloseStageEvidence } from '../viewmodels/closeEvidence.vm';

interface CloseStageEvidenceListProps {
  evidence: CloseStageEvidence;
}

/** Draws the stage's evidence for its kind. */
export const CloseStageEvidenceList: React.FC<CloseStageEvidenceListProps> = ({ evidence }) => {
  switch (evidence.kind) {
    case 'NONE':
      return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;

    case 'ISSUES':
      if (evidence.issues.length === 0) return null;
      return (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {MONTHLY_CLOSE_LABELS.TRANSACTION_ISSUES}
            </p>
            {evidence.issues.map((issue) => (
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
      );

    case 'ZERO_ACTIVITY':
      if (evidence.names.length === 0) return null;
      return (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {MONTHLY_CLOSE_LABELS.ZERO_ACTIVITY}
            </p>
            {evidence.names.map((name) => (
              <p key={name} className="text-xs text-muted-foreground">
                {name}
              </p>
            ))}
          </div>
        </div>
      );

    case 'ADJUSTMENT':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          <Eye size={14} className="shrink-0 text-muted-foreground" />
          <p className="text-xs text-foreground">
            {MONTHLY_CLOSE_LABELS.ADJUSTMENT}: {evidence.count.toLocaleString()}
          </p>
        </div>
      );

    case 'PERSISTENCE':
      return (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          {evidence.persisted ? (
            <Check size={14} className="shrink-0 text-positive" />
          ) : (
            <AlertCircle size={14} className="shrink-0 text-warning" />
          )}
          <StatusGlyph
            type={evidence.persisted ? 'verified' : 'waiting'}
            label={MONTHLY_CLOSE_LABELS.REPORTS_PERSISTENCE}
          />
        </div>
      );

    case 'SETTLEMENTS':
      return (
        <div className="space-y-1 rounded-lg border border-border/60 bg-muted/40 p-3">
          {evidence.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_PROJECTS}</p>
          ) : (
            evidence.rows.map((settlement) => (
              <div
                key={settlement.projectId}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {settlement.settled ? (
                    <Check size={12} className="shrink-0 text-positive" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0 text-warning" />
                  )}
                  <span className="truncate text-foreground">{settlement.projectName}</span>
                </span>
                {settlement.settled && settlement.closingBalance !== null ? (
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatCurrency(settlement.closingBalance)}
                  </span>
                ) : (
                  <span className="shrink-0 text-warning">{MONTHLY_CLOSE_LABELS.UNSETTLED}</span>
                )}
              </div>
            ))
          )}
        </div>
      );

    default: {
      const exhaustive: never = evidence;
      throw new Error(`Unhandled evidence kind: ${JSON.stringify(exhaustive)}`);
    }
  }
};
