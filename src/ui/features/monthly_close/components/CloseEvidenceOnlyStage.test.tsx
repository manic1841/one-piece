import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NO_EVIDENCE } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';

import { CloseEvidenceOnlyStage } from './CloseEvidenceOnlyStage';

const settlementEvidence = {
  kind: 'SETTLEMENTS' as const,
  rows: [
    {
      projectId: 'p1',
      projectName: '裝修',
      settled: true,
      income: 5000,
      expense: 3000,
      closingBalance: 2000,
    },
  ],
};

const renderStage = (props?: Partial<Parameters<typeof CloseEvidenceOnlyStage>[0]>) =>
  render(
    <CloseEvidenceOnlyStage
      stepText="專案結算"
      progressText="04 / 08"
      confirmedAtText={null}
      confirming={false}
      isReviewing={false}
      isConfirmable={true}
      isReadOnly={false}
      evidence={NO_EVIDENCE}
      onConfirm={() => {}}
      onBackToCurrent={() => {}}
      {...props}
    />,
  );

describe('CloseEvidenceOnlyStage', () => {
  it('renders the shared chrome with the step header', () => {
    renderStage();

    expect(screen.getByText('當前步驟')).toBeInTheDocument();
    expect(screen.getByText('專案結算')).toBeInTheDocument();
  });

  it('shows a no-data note when the evidence is empty', () => {
    renderStage();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the evidence list rows', () => {
    renderStage({ evidence: settlementEvidence });

    expect(screen.getByText(/裝修/)).toBeInTheDocument();
  });
});
