import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { diffBalanceSheet, diffCashFlow, diffIncomeStatement } from '@/domains/report/reportDrift';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { CloseFinancialReports } from './CloseFinancialReports';

const buildPreview = (overrides?: { adjustment?: number }) => ({
  incomeStatement: {
    yearMonth: '2026-03',
    incomeTotal: 50000,
    expenseTotal: 30000,
    netIncome: 20000,
    incomeItems: [
      {
        code: 'income:salary',
        label: '薪資',
        amount: 50000,
        subItems: [{ code: 'income:salary:charles', label: '薪資 › Charles', amount: 50000 }],
      },
    ],
    expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
  },
  balanceSheet: {
    yearMonth: '2026-03',
    assets: {
      total: 100000,
      groups: {
        cash: {
          label: '現金與銀行',
          total: 100000,
          items: [{ code: 'account:1', label: '主力帳戶', amount: 100000 }],
        },
      },
    },
    liabilities: { total: 0, groups: { loan: { label: '貸款', total: 0, items: [] } } },
    equity: {
      total: 100000,
      groups: {
        openingEquity: { label: '期初餘額', total: 80000, items: [] },
        netIncome: { label: '本期淨利', total: 20000, items: [] },
        adjustment: { label: '調整', total: 0, items: [] },
      },
    },
  },
  cashFlow: {
    yearMonth: '2026-03',
    operating: {
      label: '營業活動',
      total: 20000,
      inflowItems: [{ code: 'income:salary', label: '薪資', amount: 50000 }],
      outflowItems: [{ code: 'expense:food', label: '餐飲', amount: 30000 }],
    },
    investing: { label: '投資活動', total: 0, inflowItems: [], outflowItems: [] },
    financing: { label: '融資活動', total: 0, inflowItems: [], outflowItems: [] },
    netCashChange: 20000,
    beginningBalance: 0,
    endingBalance: 20000,
    actualBalance: 20000,
    adjustment: overrides?.adjustment ?? 0,
  },
});

/** Builds the drift-annotated statements the stage hook hands the component. */
const reportsFrom = (preview = buildPreview()) => ({
  incomeStatement: diffIncomeStatement(preview.incomeStatement as never, null),
  balanceSheet: diffBalanceSheet(preview.balanceSheet as never, null),
  cashFlow: diffCashFlow(preview.cashFlow as never, null),
});

type Props = Parameters<typeof CloseFinancialReports>[0];

const renderReports = (props?: Partial<Props>) =>
  render(
    <CloseFinancialReports
      reports={reportsFrom()}
      timestamps={{}}
      isLoading={false}
      error={null}
      isSettlementReady={true}
      onContinue={() => {}}
      onGenerate={() => {}}
      onBack={() => {}}
      confirming={false}
      isConfirmable={true}
      isGenerated={false}
      {...props}
    />,
  );

describe('CloseFinancialReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the income statement section header, roll-up row, nested subItems and total rows', async () => {
    renderReports();

    const statement = screen.getByTestId('close-income-statement');
    expect(statement).toHaveTextContent('薪資');
    expect(statement).toHaveTextContent('收入');
    expect(statement).toHaveTextContent('薪資 › Charles');
    expect(statement).toHaveTextContent('收入合計');
    expect(statement).toHaveTextContent('支出合計');
    expect(statement).toHaveTextContent('本期淨利');
    const balancePanel = screen.getByTestId('close-balance-sheet').closest('[role="tabpanel"]');
    expect(balancePanel).toHaveAttribute('data-state', 'inactive');
    expect(screen.getByTestId('close-balance-sheet')).toHaveTextContent('主力帳戶');
  });

  it('collapses and expands a statement row from the left chevron', () => {
    renderReports();

    const toggle = screen.getByRole('button', { name: '薪資' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle);
    expect(screen.getByTestId('close-income-statement')).not.toHaveTextContent('薪資 › Charles');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles');
  });

  it('resets collapsed groups when switching statement tabs', () => {
    renderReports();

    fireEvent.click(screen.getByRole('button', { name: '薪資' }));
    expect(screen.getByTestId('close-income-statement')).not.toHaveTextContent('薪資 › Charles');

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: '損益表' }));

    expect(screen.getByTestId('close-income-statement')).toHaveTextContent('薪資 › Charles');
  });

  it('switches statement tabs on desktop', () => {
    renderReports();

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));
    expect(screen.getByTestId('close-balance-sheet')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: '現金流量表' }));
    expect(screen.getByTestId('close-cash-flow')).toBeInTheDocument();
  });

  it('renders the balance sheet sections, group totals and the closing liabilities + equity row', () => {
    renderReports();

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));

    const sheet = screen.getByTestId('close-balance-sheet');
    expect(sheet).toHaveTextContent('資產');
    expect(sheet).toHaveTextContent('現金與銀行');
    expect(sheet).toHaveTextContent('資產合計');
    expect(sheet).toHaveTextContent('負債 + 權益');
    // Zero-total, empty groups and the removed Calculated tag do not render.
    expect(sheet).not.toHaveTextContent('貸款');
    expect(sheet).not.toHaveTextContent('Calculated');
  });

  it('renders the cash flow hierarchy with inflow/outflow buckets and the unchanged footer', () => {
    renderReports();

    fireEvent.mouseDown(screen.getByRole('tab', { name: '現金流量表' }));

    const statement = screen.getByTestId('close-cash-flow');
    expect(statement).toHaveTextContent('營業活動');
    expect(statement).toHaveTextContent('流入');
    expect(statement).toHaveTextContent('流出');
    expect(statement).toHaveTextContent('營業活動合計');
    expect(statement).toHaveTextContent('現金淨變動');
    expect(statement).toHaveTextContent('實際餘額');
  });

  it('shows the reports generated panel with timestamps when persisted', () => {
    renderReports({
      timestamps: { incomeStatement: '10:00', balanceSheet: '10:01', cashFlow: '10:02' },
      isGenerated: true,
    });

    const panel = screen.getByTestId('reports-generated-panel');
    expect(panel).toHaveTextContent('10:00');
    expect(panel).toHaveTextContent('10:01');
    expect(panel).toHaveTextContent('10:02');
    expect(screen.queryByTestId('generate-reports')).not.toBeInTheDocument();
  });

  it('disables generate while settlement is not ready, without naming the categories', () => {
    renderReports({ isSettlementReady: false });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
    // The missing-category list is Step 7's presentation; Step 8 only gates.
    expect(screen.queryByText(/尚未完成所有類別的月結算/)).not.toBeInTheDocument();
  });

  it('leaves generate enabled while readiness has not loaded', () => {
    renderReports({ isSettlementReady: null });

    expect(screen.getByTestId('generate-reports')).not.toBeDisabled();
  });

  it('disables generate while the preview is loading', () => {
    renderReports({ isLoading: true });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
  });

  it('warns when the cash flow adjustment exceeds 1000', () => {
    renderReports({ reports: reportsFrom(buildPreview({ adjustment: 1500 })) });

    expect(screen.getByText(/現金流調整超過 1,000/)).toBeInTheDocument();
  });

  it('shows the no-data note when no statement loaded and there is no error', () => {
    renderReports({
      reports: { incomeStatement: null, balanceSheet: null, cashFlow: null },
    });

    expect(screen.getByText(MONTHLY_CLOSE_LABELS.NO_DATA)).toBeInTheDocument();
  });

  it('shows the load error instead of the no-data note', () => {
    renderReports({
      reports: { incomeStatement: null, balanceSheet: null, cashFlow: null },
      error: '無法載入報表預覽，請稍後再試。',
    });

    expect(screen.getByText('無法載入報表預覽，請稍後再試。')).toBeInTheDocument();
    expect(screen.queryByText(MONTHLY_CLOSE_LABELS.NO_DATA)).not.toBeInTheDocument();
  });
});
