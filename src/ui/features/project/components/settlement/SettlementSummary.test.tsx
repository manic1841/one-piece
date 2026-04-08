import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettlementSummary } from './SettlementSummary';

describe('SettlementSummary', () => {
  it('shows unsettled project names when report generation is blocked by missing settlements', () => {
    render(
      <SettlementSummary
        year={2026}
        month={3}
        summary={null}
        isGenerating={false}
        reportsGenerated={false}
        onGenerateReports={vi.fn()}
        unsettledProjectNames={['旅遊基金', '教育儲備']}
      />,
    );

    expect(screen.getByText('尚未結算的專案')).toBeInTheDocument();
    expect(screen.getByText('旅遊基金、教育儲備')).toBeInTheDocument();
  });

  it('does not show unsettled project names section when the list is empty', () => {
    render(
      <SettlementSummary
        year={2026}
        month={3}
        summary={null}
        isGenerating={false}
        reportsGenerated={false}
        onGenerateReports={vi.fn()}
        unsettledProjectNames={[]}
      />,
    );

    expect(screen.queryByText('尚未結算的專案')).not.toBeInTheDocument();
  });

  it('shows loading hint when summary is still being calculated', () => {
    render(
      <SettlementSummary
        year={2026}
        month={3}
        summary={null}
        isGenerating={false}
        isLoadingSummary={true}
        reportsGenerated={false}
        onGenerateReports={vi.fn()}
        unsettledProjectNames={['旅遊基金']}
      />,
    );

    expect(screen.getByText('正在更新 2026-03 月度結算摘要')).toBeInTheDocument();
    expect(screen.getByText('尚未結算的專案')).toBeInTheDocument();
    expect(screen.getByText('正在更新資料，以下清單可能是上一個月份的結果。')).toBeInTheDocument();
  });
});
