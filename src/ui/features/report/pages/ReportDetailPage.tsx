import { useMemo, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatementPanel } from '@/ui/components/statement/StatementPanel';
import { StatementTable } from '@/ui/components/statement/StatementTable';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { REPORT_DETAIL_LABELS, REPORT_TAB_ORDER } from '@/ui/constants/report/reportCenterLabels';
import { REPORT_VIEW_TITLES, type ReportViewId } from '@/ui/constants/report/reportViewLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import {
  type ReportDetailReady,
  useReportDetail,
} from '@/ui/features/report/hooks/useReportDetail';
import {
  formatReportPeriodDisplay,
  parseReportPeriod,
  stepReportPeriod,
} from '@/ui/features/report/viewmodels/reportHistory.vm';
import {
  buildBalanceMetrics,
  buildBalanceSheetRows,
  buildCashFlowMetrics,
  buildCashFlowRows,
  buildIncomeMetrics,
  buildIncomeStatementRows,
} from '@/ui/features/report/viewmodels/reportStatementRows.vm';

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

/**
 * 單張報表：外框帶標題（僅行動版）與摘要指標；null 時只留下標題與空狀態，不顯示指標。
 */
const ReportStatement: React.FC<{
  view: ReportViewId;
  state: ReportDetailReady;
  collapsed: ReadonlySet<string>;
  onToggle: (key: string) => void;
}> = ({ view, state, collapsed, onToggle }) => {
  const title = REPORT_VIEW_TITLES[view];
  const empty = (
    <EmptyState
      title={REPORT_DETAIL_LABELS.EMPTY_TITLE}
      description={REPORT_DETAIL_LABELS.EMPTY_DESCRIPTION}
    />
  );

  if (view === 'INCOME_STATEMENT') {
    const data = state.incomeStatement;
    return (
      <StatementPanel title={title} metrics={data ? buildIncomeMetrics(data) : undefined}>
        {data === null ? (
          empty
        ) : (
          <StatementTable
            testId="report-detail-income-statement"
            rows={buildIncomeStatementRows(data)}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        )}
      </StatementPanel>
    );
  }

  if (view === 'BALANCE_SHEET') {
    const data = state.balanceSheet;
    return (
      <StatementPanel title={title} metrics={data ? buildBalanceMetrics(data) : undefined}>
        {data === null ? (
          empty
        ) : (
          <StatementTable
            testId="report-detail-balance-sheet"
            rows={buildBalanceSheetRows(data)}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        )}
      </StatementPanel>
    );
  }

  const data = state.cashFlow;
  return (
    <StatementPanel title={title} metrics={data ? buildCashFlowMetrics(data) : undefined}>
      {data === null ? (
        empty
      ) : (
        <div className="space-y-6">
          <StatementTable
            testId="report-detail-cash-flow"
            rows={buildCashFlowRows(data)}
            collapsed={collapsed}
            onToggle={onToggle}
          />
          <p className="text-right text-xs text-muted-foreground">
            {REPORT_DETAIL_LABELS.ACTUAL_BALANCE_LABEL} {data.actualBalanceText}
          </p>
        </div>
      )}
    </StatementPanel>
  );
};

const ReportDetailPage: React.FC = () => {
  const { period: rawPeriod } = useParams<{ period: string }>();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportViewId>('INCOME_STATEMENT');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const { state, reload } = useReportDetail(householdId, rawPeriod);
  const period = useMemo(() => parseReportPeriod(rawPeriod), [rawPeriod]);

  const toggleRow = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (state.status === 'invalid' || period === null) {
    return (
      <div className="space-y-8">
        <PageHeader title={REPORT_DETAIL_LABELS.BACK_CRUMB} onBack={() => navigate('/reports')} />
        <EmptyState
          title={REPORT_DETAIL_LABELS.EMPTY_TITLE}
          description={REPORT_DETAIL_LABELS.EMPTY_DESCRIPTION}
        />
      </div>
    );
  }

  const showCloseAction =
    period.mode === 'MONTHLY' && state.status === 'ready' && state.closeStatus !== 'CLOSED';

  return (
    <div className="space-y-8">
      <PageHeader
        title={period.raw}
        crumb={REPORT_DETAIL_LABELS.BACK_CRUMB}
        onBack={() => navigate('/reports')}
        description={formatReportPeriodDisplay(period)}
        actions={
          <div className="flex items-center gap-2">
            {showCloseAction && (
              <Button variant="text" onClick={() => navigate(`/close/${period.raw}`)}>
                {REPORT_DETAIL_LABELS.GO_TO_CLOSE} →
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={REPORT_DETAIL_LABELS.PREVIOUS_PERIOD}
              onClick={() => navigate(`/reports/${stepReportPeriod(period, -1)}`)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={REPORT_DETAIL_LABELS.NEXT_PERIOD}
              onClick={() => navigate(`/reports/${stepReportPeriod(period, 1)}`)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {state.status === 'loading' && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{REPORT_DETAIL_LABELS.LOADING}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-10" />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <Alert variant="warning">
          <AlertDescription>{REPORT_DETAIL_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {REPORT_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      {state.status === 'empty' && (
        <EmptyState
          title={REPORT_DETAIL_LABELS.EMPTY_TITLE}
          description={REPORT_DETAIL_LABELS.EMPTY_DESCRIPTION}
        />
      )}

      {state.status === 'ready' && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ReportViewId)}
          className="space-y-4"
        >
          <TabsList className="hidden md:inline-flex" aria-label={REPORT_DETAIL_LABELS.TABS_LABEL}>
            {REPORT_TAB_ORDER.map((view) => (
              <TabsTrigger key={view} value={view}>
                {REPORT_VIEW_TITLES[view]}
              </TabsTrigger>
            ))}
          </TabsList>

          {REPORT_TAB_ORDER.map((view) => (
            <TabsContent
              key={view}
              forceMount
              value={view}
              className="md:hidden md:data-[state=active]:block"
            >
              <PageSection spacing="compact" className="border-b-0">
                <ReportStatement
                  view={view}
                  state={state}
                  collapsed={collapsed}
                  onToggle={toggleRow}
                />
              </PageSection>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default ReportDetailPage;
