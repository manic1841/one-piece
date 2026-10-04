import React from 'react';

import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { closeEyebrowClass } from '@/ui/features/monthly_close/components/CloseSectionHeading';

import type { CloseStageEvidence } from '../viewmodels/closeEvidence.vm';

interface CloseStageEvidenceListProps {
  evidence: CloseStageEvidence;
}

const ProjectFigure: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className={closeEyebrowClass}>{label}</p>
    <p className="font-mono text-xs tabular-nums text-foreground">{value}</p>
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
        <Alert variant="warning">
          <StatusGlyph type="review" label={MONTHLY_CLOSE_LABELS.ZERO_ACTIVITY} />
          <AlertDescription>
            {evidence.names.map((name) => (
              <p key={name} className="text-xs text-muted-foreground">
                {name}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      );

    case 'ADJUSTMENT':
      return (
        <Alert variant="default">
          <StatusGlyph type="inactive" label={MONTHLY_CLOSE_LABELS.ADJUSTMENT} />
          <AlertDescription>{evidence.countText}</AlertDescription>
        </Alert>
      );

    case 'PERSISTENCE':
      return (
        <Alert variant="default">
          <StatusGlyph
            type={evidence.persisted ? 'verified' : 'waiting'}
            label={MONTHLY_CLOSE_LABELS.REPORTS_PERSISTENCE}
          />
        </Alert>
      );

    case 'SETTLEMENTS':
      return (
        <div className="space-y-2">
          {evidence.rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_PROJECTS}</p>
          ) : (
            evidence.rows.map((settlement) => (
              <Alert key={settlement.projectId} variant="default" className="block space-y-2">
                <div className="flex min-w-0 items-center gap-1.5 text-xs">
                  <StatusGlyph type={settlement.settled ? 'verified' : 'review'} label="" />
                  <span className="truncate text-foreground">{settlement.projectName}</span>
                  {!settlement.settled && (
                    <span className="shrink-0 text-warning">{MONTHLY_CLOSE_LABELS.UNSETTLED}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.PROJECT_OPENING_BALANCE}
                    value={settlement.openingBalanceText}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.INCOME_SECTION}
                    value={settlement.incomeText}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}
                    value={settlement.expenseText}
                  />
                  <ProjectFigure
                    label={MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}
                    value={settlement.closingBalanceText}
                  />
                </div>
              </Alert>
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
