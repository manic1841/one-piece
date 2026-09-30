import { fireEvent, render, screen, within } from '@testing-library/react';
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
      isReadOnly={false}
      isStageCompleted={false}
      reportsPersisted={false}
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

  // Legacy persisted reports store detail codes flat while the preview nests
  // them; the drift pair must not put the same code at two levels, or the
  // flattened table carries duplicate React keys and collapse/expand renders
  // ghost rows.
  it('renders a legacy-vs-rollup property pair without duplicate rows on collapse/expand', () => {
    const preview = buildPreview();
    preview.balanceSheet.assets.groups.property = {
      label: '不動產',
      total: 192345,
      items: [
        {
          code: 'asset:property',
          label: '不動產',
          amount: 192345,
          subItems: [{ code: 'asset:property:senhuo', label: '我家', amount: 192345 }],
        },
      ],
    };
    const persisted = {
      ...preview.balanceSheet,
      assets: {
        ...preview.balanceSheet.assets,
        groups: {
          property: {
            label: '不動產',
            total: 192345,
            items: [
              { code: 'asset:property:senhuo', label: 'asset:property:senhuo', amount: 192345 },
            ],
          },
        },
      },
    };
    renderReports({
      reports: {
        incomeStatement: diffIncomeStatement(preview.incomeStatement as never, null),
        balanceSheet: diffBalanceSheet(preview.balanceSheet as never, persisted as never),
        cashFlow: diffCashFlow(preview.cashFlow as never, null),
      },
    });

    fireEvent.mouseDown(screen.getByRole('tab', { name: '資產負債表' }));
    const sheet = screen.getByTestId('close-balance-sheet');
    expect((sheet.textContent!.match(/我家/g) ?? []).length).toBe(1);

    // The three statements share forceMount, so the chevron name repeats across
    // tables; scope to the balance sheet's own toggle.
    const toggle = within(sheet)
      .getAllByRole('button', { name: '不動產' })
      .find((button) => button.closest('[data-testid="close-balance-sheet"]') !== null)!;
    fireEvent.click(toggle);
    expect(sheet).not.toHaveTextContent('我家');
    fireEvent.click(toggle);
    expect((sheet.textContent!.match(/我家/g) ?? []).length).toBe(1);
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

  it('shows the reports generated panel with timestamps once the stage is completed', () => {
    renderReports({
      timestamps: { incomeStatement: '10:00', balanceSheet: '10:01', cashFlow: '10:02' },
      isStageCompleted: true,
      reportsPersisted: true,
    });

    const panel = screen.getByTestId('reports-generated-panel');
    expect(panel).toHaveTextContent('10:00');
    expect(panel).toHaveTextContent('10:01');
    expect(panel).toHaveTextContent('10:02');
    expect(screen.queryByTestId('generate-reports')).not.toBeInTheDocument();
  });

  // Issue #222: leftover persisted reports (legacy pre-workflow month or a
  // reopened period) must not hide the only action that completes the stage.
  it('offers generate and warns about existing reports when persisted but the stage is pending', () => {
    const onGenerate = vi.fn();
    renderReports({
      timestamps: { incomeStatement: '10:00', balanceSheet: '10:01', cashFlow: '10:02' },
      isStageCompleted: false,
      reportsPersisted: true,
      onGenerate,
    });

    expect(screen.queryByTestId('reports-generated-panel')).not.toBeInTheDocument();
    expect(screen.getByText(/已有先前產生的報表/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();

    const button = screen.getByTestId('generate-reports');
    fireEvent.click(button);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('does not warn about existing reports on a first generation', () => {
    renderReports({ isStageCompleted: false, reportsPersisted: false });

    expect(screen.queryByText(/已有先前產生的報表/)).not.toBeInTheDocument();
    expect(screen.getByTestId('generate-reports')).toBeInTheDocument();
  });

  // CLOSED read-only review never offers a confirm action (ADR-0071).
  it('hides the action entirely on a read-only period', () => {
    renderReports({ isReadOnly: true, isStageCompleted: true, reportsPersisted: true });

    expect(screen.queryByTestId('generate-reports')).not.toBeInTheDocument();
    expect(screen.getByTestId('reports-generated-panel')).toBeInTheDocument();
  });

  it('disables generate while settlement is not ready, without naming the categories', () => {
    renderReports({ isSettlementReady: false });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
    // The missing-category list is Step 7's presentation; Step 8 only gates.
    expect(screen.queryByText(/尚未完成所有類別的月結算/)).not.toBeInTheDocument();
  });

  it('disables generate while readiness has not loaded or its load failed (#229)', () => {
    renderReports({ isSettlementReady: null });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
  });

  it('disables generate when the report preview failed to load (#229)', () => {
    renderReports({ error: '無法載入報表預覽，請稍後再試。' });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
  });

  it('disables generate when there is no report data (#229)', () => {
    renderReports({
      reports: { incomeStatement: null, balanceSheet: null, cashFlow: null },
    });

    expect(screen.getByTestId('generate-reports')).toBeDisabled();
  });

  // #229: a failed persistence read must not render as 尚未產生 (which would
  // wrongly offer Generate as if this were a first generation).
  it('shows an unknown persistence state and blocks generate when the read failed', () => {
    renderReports({ reportsPersisted: null });

    expect(screen.queryByText('尚未產生')).not.toBeInTheDocument();
    expect(screen.queryByText(/已有先前產生的報表/)).not.toBeInTheDocument();
    expect(screen.getByText(/無法確認報表是否已產生/)).toBeInTheDocument();
    expect(screen.getByTestId('generate-reports')).toBeDisabled();
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

  // Same-month inflow/outflow flips (buy+sell an investment, capital injection
  // plus withdrawal) put one code in both buckets. The flattened cash-flow
  // table must not share row keys across buckets, or collapsing one bucket
  // collapses the other too and duplicate React keys render ghosts.
  it('renders a flipped inflow/outflow code once per bucket without duplicate keys', () => {
    const preview = buildPreview();
    const detail = (amount: number) => [
      { code: 'asset:investment:etf', label: '證券投資 › ETF', amount },
    ];
    preview.cashFlow.investing = {
      label: '投資活動',
      total: 100000,
      inflowItems: [
        { code: 'asset:investment', label: '證券投資', amount: 100000, subItems: detail(100000) },
      ],
      outflowItems: [
        { code: 'asset:investment', label: '證券投資', amount: 200000, subItems: detail(200000) },
      ],
    };
    renderReports({
      reports: {
        incomeStatement: diffIncomeStatement(preview.incomeStatement as never, null),
        balanceSheet: diffBalanceSheet(preview.balanceSheet as never, null),
        cashFlow: diffCashFlow(preview.cashFlow as never, null),
      },
    });

    fireEvent.mouseDown(screen.getByRole('tab', { name: '現金流量表' }));
    const flow = screen.getByTestId('close-cash-flow');
    expect((flow.textContent!.match(/ETF/g) ?? []).length).toBe(2);

    const inflowToggle = within(flow).getAllByRole('button', { name: '證券投資' })[0];
    fireEvent.click(inflowToggle);
    expect((flow.textContent!.match(/ETF/g) ?? []).length).toBe(1);
    fireEvent.click(inflowToggle);
    expect((flow.textContent!.match(/ETF/g) ?? []).length).toBe(2);
  });
});
