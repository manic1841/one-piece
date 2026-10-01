import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NO_EVIDENCE } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';

import { CloseEvidenceOnlyStage } from './CloseEvidenceOnlyStage';

const transactionIssueEvidence = {
  kind: 'ISSUES' as const,
  issues: [{ transactionId: 'tx-1', description: '分類遺漏', reason: '缺少分類' }],
};

const renderStage = (props?: Partial<Parameters<typeof CloseEvidenceOnlyStage>[0]>) =>
  render(
    <CloseEvidenceOnlyStage
      stepText="交易驗證"
      progressText="02 / 09"
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
    expect(screen.getByText('交易驗證')).toBeInTheDocument();
  });

  it('shows a no-data note when the evidence is empty', () => {
    renderStage();

    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the evidence list rows', () => {
    renderStage({ evidence: transactionIssueEvidence });

    expect(screen.getByText(/分類遺漏/)).toBeInTheDocument();
  });
});
