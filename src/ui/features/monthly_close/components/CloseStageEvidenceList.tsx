import React from 'react';

import { AlertCircle, Check, Eye } from 'lucide-react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency } from '@/ui/utils';

import type { CloseStageEvidence } from '../viewmodels/closeEvidence.vm';

interface CloseStageEvidenceListProps {
  evidence: CloseStageEvidence;
}

const ProjectFigure: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {label}
    </p>
    <p className="font-mono text-xs tabular-nums text-foreground">{formatCurrency(value)}</p>
  </div>
);

/** Draws the stage's evidence for its kind. */
export const CloseStageEvidenceList: React.FC<CloseStageEvidenceListProps> = ({ evidence }) => {
  switch (evidence.kind) {
    case 'NONE':
      return <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>;

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
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          {evidence.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_PROJECTS}</p>
          ) : (
            evidence.rows.map((settlement) => (
              <div key={settlement.projectId} className="space-y-2 text-xs">
                <div className="flex min-w-0 items-center gap-1.5">
                  {settlement.settled ? (
                    <Check size={12} className="shrink-0 text-positive" />
                  ) : (
                    <AlertCircle size={12} className="shrink-0 text-warning" />
                  )}
                  <span className="truncate text-foreground">{settlement.projectName}</span>
                  {!settlement.settled && (
                    <span className="shrink-0 text-warning">{MONTHLY_CLOSE_LABELS.UNSETTLED}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.PROJECT_OPENING_BALANCE}
                    value={settlement.openingBalance}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.INCOME_SECTION}
                    value={settlement.income}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}
                    value={settlement.expense}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}
                    value={settlement.closingBalance}
                  />
                </div>
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
