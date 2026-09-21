import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CLOSE_STAGE_IDS } from '@/domains/financial_period/schemas';

import { CloseStageList } from './CloseStageList';

import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';

const buildStage = (stageId: CloseStageItemVM['stageId']): CloseStageItemVM => ({
  stageId,
  label: stageId,
  status: 'PENDING',
  isCompleted: false,
  isReviewSource: false,
  confirmedByText: null,
  confirmedAtText: null,
});

const renderList = (overrides: { isPaused?: boolean; isClosed?: boolean } = {}) => {
  const stages = CLOSE_STAGE_IDS.map((stageId, index) => ({
    ...buildStage(stageId),
    isReviewSource: overrides.isPaused === true && index === 0,
  }));
  return render(
    <CloseStageList
      stages={stages}
      confirmingStageId={null}
      isClosed={overrides.isClosed ?? false}
      isPaused={overrides.isPaused ?? false}
      onConfirmStage={vi.fn()}
      renderEvidence={() => <p>stage evidence</p>}
      renderInputs={() => null}
    />,
  );
};

describe('CloseStageList mobile pipeline', () => {
  it('renders all nine system stages without Card wrapping', () => {
    renderList();

    expect(screen.getAllByText('stage evidence')).toHaveLength(CLOSE_STAGE_IDS.length);
    for (const glyph of ['●', '✓', '○', '!', '×']) {
      expect(screen.queryAllByText(glyph).length).toBeGreaterThanOrEqual(0);
    }
    expect(document.querySelector('.bg-card')).toBeNull();
  });

  it('exposes a confirm button per pending stage with the CONTINUE label', () => {
    renderList();

    const continueButtons = screen.getAllByRole('button', { name: /continue/i });
    expect(continueButtons).toHaveLength(CLOSE_STAGE_IDS.length);
    for (const button of continueButtons) {
      expect(button).toHaveTextContent('CONTINUE');
      expect(button).toHaveTextContent('→');
    }
  });

  it('marks the first non-completed stage as the current step', () => {
    renderList();

    const current = screen.getAllByTestId('close-list-current');
    expect(current).toHaveLength(1);
  });

  it('keeps the paused badge on the review-source stage', () => {
    renderList({ isPaused: true });

    expect(screen.getAllByText('已暫停，待審閱')).toHaveLength(1);
  });

  it('hides confirm actions once the period is closed', () => {
    renderList({ isClosed: true });

    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });
});
