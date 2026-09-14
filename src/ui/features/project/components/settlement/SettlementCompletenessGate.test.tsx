import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type CompletenessAnomalyVM } from '@/ui/features/project/viewmodels/settlementPreview.vm';

import SettlementCompletenessGate from './SettlementCompletenessGate';

const anomaly = (
  targetType: 'PROJECT' | 'LEDGER_CODE' | 'DEBT_ACCOUNT',
  targetId: string,
  name: string,
): CompletenessAnomalyVM => ({
  key: `${targetType}:${targetId}`,
  targetType,
  targetId,
  name,
  activityCount: 0,
  activityAmount: 0,
});

describe('SettlementCompletenessGate', () => {
  it('renders nothing when there are no anomalies', () => {
    const { container } = render(
      <SettlementCompletenessGate anomalies={[]} completenessError="" onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each anomaly with its type label and a confirm button', () => {
    render(
      <SettlementCompletenessGate
        anomalies={[
          anomaly('PROJECT', 'p1', '媽媽專案'),
          anomaly('LEDGER_CODE', 'expense:food', '餐飲'),
        ]}
        completenessError=""
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('結算前完整性檢查')).toBeInTheDocument();
    expect(screen.getByText(/專案／媽媽專案/)).toBeInTheDocument();
    expect(screen.getByText(/會計科目／餐飲/)).toBeInTheDocument();
    // Each row shows its month activity summary (issue #94).
    expect(screen.getAllByText('當月活動：0 筆，合計 0')).toHaveLength(2);
  });

  it('confirms each anomaly individually', () => {
    const onConfirm = vi.fn();
    render(
      <SettlementCompletenessGate
        anomalies={[
          anomaly('PROJECT', 'p1', '媽媽專案'),
          anomaly('LEDGER_CODE', 'expense:food', '餐飲'),
        ]}
        completenessError=""
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '確認無漏記 專案 媽媽專案' }));
    expect(onConfirm).toHaveBeenCalledWith('PROJECT', 'p1');

    fireEvent.click(screen.getByRole('button', { name: '確認無漏記 會計科目 餐飲' }));
    expect(onConfirm).toHaveBeenCalledWith('LEDGER_CODE', 'expense:food');
  });

  it('surfaces a failed check without blocking, using fixed warning wording', () => {
    render(
      <SettlementCompletenessGate
        anomalies={[]}
        completenessError="Permission denied"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/完整性檢查無法完成/)).toBeInTheDocument();
    // Raw SDK error text stays out of the UI (constants are the display source).
    expect(screen.queryByText('Permission denied')).not.toBeInTheDocument();
  });

  it('shows the month activity summary on each anomaly', () => {
    render(
      <SettlementCompletenessGate
        anomalies={[
          {
            ...anomaly('LEDGER_CODE', 'expense:food', '餐飲'),
            activityCount: 3,
            activityAmount: 1234,
          },
        ]}
        completenessError=""
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('當月活動：3 筆，合計 1,234')).toBeInTheDocument();
  });

  it('names the missing repayment for a debt account instead of generic activity', () => {
    render(
      <SettlementCompletenessGate
        anomalies={[anomaly('DEBT_ACCOUNT', 'd1', '房貸 A')]}
        completenessError=""
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText(/債務帳戶／房貸 A/)).toBeInTheDocument();
    expect(screen.getByText('當月沒有找到還款紀錄')).toBeInTheDocument();
    expect(screen.queryByText(/當月活動/)).not.toBeInTheDocument();
  });
});
