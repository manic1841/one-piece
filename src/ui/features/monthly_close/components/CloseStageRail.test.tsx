import { render, screen } from '@testing-library/react';

import { CLOSE_STAGE_ORDER } from '@/ui/constants/monthlyClose';
import type { CloseStageItemVM } from '../viewmodels/monthlyClose.vm';
import { CloseStageRail } from './CloseStageRail';

const stage = (stageId: string, overrides: Partial<CloseStageItemVM> = {}): CloseStageItemVM => ({
  stageId: stageId as CloseStageItemVM['stageId'],
  label: stageId,
  status: 'PENDING',
  isCompleted: false,
  isReviewSource: false,
  confirmedByText: null,
  confirmedAtText: null,
  ...overrides,
});

describe('CloseStageRail', () => {
  it('renders one rail item per stage in close order', () => {
    const stages = CLOSE_STAGE_ORDER.map((stageId) => stage(stageId));

    render(<CloseStageRail stages={stages} isClosed={false} />);

    expect(screen.getAllByTestId('close-rail-item')).toHaveLength(CLOSE_STAGE_ORDER.length);
    expect(screen.getAllByTestId('close-rail-item')[0]).toHaveTextContent('銀行帳戶餘額');
    expect(screen.getAllByTestId('close-rail-item')[8]).toHaveTextContent('Close Period');
  });

  it('emphasizes the current step as the first non-completed stage', () => {
    const stages = CLOSE_STAGE_ORDER.map((stageId, index) =>
      stage(stageId, index < 2 ? { isCompleted: true } : {}),
    );

    render(<CloseStageRail stages={stages} isClosed={false} />);

    const items = screen.getAllByTestId('close-rail-item');
    expect(items[2]).toHaveAttribute('data-current', 'true');
    expect(items[1]).toHaveAttribute('data-current', 'false');
    expect(items[3]).toHaveAttribute('data-current', 'false');
  });

  it('marks no current step once the period is closed', () => {
    const stages = CLOSE_STAGE_ORDER.map((stageId) =>
      stage(stageId, { isCompleted: true, status: 'COMPLETED' }),
    );

    render(<CloseStageRail stages={stages} isClosed={true} />);

    const items = screen.getAllByTestId('close-rail-item');
    expect(items.every((item) => item.getAttribute('data-current') === 'false')).toBe(true);
  });

  it('shows the review glyph on the paused review source stage', () => {
    const stages = CLOSE_STAGE_ORDER.map((stageId, index) =>
      stage(stageId, index === 6 ? { isReviewSource: true } : {}),
    );

    render(<CloseStageRail stages={stages} isClosed={false} />);

    expect(screen.getAllByTestId('close-rail-item')[6]).toHaveAttribute('data-review', 'true');
  });
});
