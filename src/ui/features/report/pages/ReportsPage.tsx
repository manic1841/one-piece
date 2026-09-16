import React, { useState } from 'react';

import { ArrowRight, ChevronRight, FileText, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { Card, CardContent } from '@/ui/components/ui/card';
import { PageHeader } from '@/ui/components/PageHeader';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';

import { ReportSettlement } from '../components/ReportSettlement';
import BalanceSheetPage from './BalanceSheet';
import CashFlowStatementPage from './CashFlowStatement';
import IncomeStatementPage from './IncomeStatement';

type ReportView = 'MENU' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';
type ReportMode = 'MONTHLY' | 'YEARLY';

const Reports: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<ReportView>('MENU');
  const [reportMode, setReportMode] = useState<ReportMode>('MONTHLY');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const householdId = userProfile?.householdId || '';

  if (!householdId) {
    return <div className="p-8 text-center">Please select a household first.</div>;
  }

  const commonProps = {
    householdId,
    currentDate,
    onDateChange: setCurrentDate,
    onViewChange: setView,
    onBack: () => setView('MENU'),
    reportMode,
    onReportModeChange: setReportMode,
  };

  if (view === 'INCOME_STATEMENT') {
    return <IncomeStatementPage {...commonProps} />;
  }

  if (view === 'BALANCE_SHEET') {
    return <BalanceSheetPage {...commonProps} />;
  }

  if (view === 'CASH_FLOW') {
    return <CashFlowStatementPage {...commonProps} />;
  }

  return (
    <div className="relative space-y-12 max-w-5xl mx-auto pb-20">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/5 blur-[120px] rounded-full -z-10 animate-pulse" />

      <PageHeader
        title="財務報表中心"
        description="即時追蹤損益狀況，深度分析資產分佈與現金流。"
        badge={
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-caption">
            Standard
          </span>
        }
      />

      <ReportSettlement
        householdId={householdId}
        userEmail={userProfile?.email || ''}
        onGoToProjectSettlement={() => navigate('/projects')}
      />

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <div className="flex items-center gap-4 px-2">
          <h2 className="text-2xl font-black text-foreground tracking-tight">報表檢視庫</h2>
          <div className="h-0.5 flex-1 bg-muted/80 mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportLinkCard
            title={REPORT_VIEW_TITLES.INCOME_STATEMENT}
            desc="查看特定期間內的收入與支出明細，掌握您的淨利潤。"
            border="border-positive/10"
            iconColor="text-positive"
            icon={<FileText size={32} />}
            onClick={() => setView('INCOME_STATEMENT')}
          />
          <ReportLinkCard
            title={REPORT_VIEW_TITLES.BALANCE_SHEET}
            desc="資產、負債與股東權益之快照，衡量財務健康度。"
            border="border-border"
            iconColor="text-foreground"
            icon={<Wallet size={32} />}
            onClick={() => setView('BALANCE_SHEET')}
          />
          <ReportLinkCard
            title={REPORT_VIEW_TITLES.CASH_FLOW}
            desc="追蹤現金流入與流出，分為營業、投資與融資活動。"
            border="border-border"
            iconColor="text-foreground"
            icon={<TrendingUp size={32} />}
            onClick={() => setView('CASH_FLOW')}
          />
        </div>
      </div>
    </div>
  );
};

function ReportLinkCard({
  title,
  desc,
  border,
  iconColor,
  icon,
  onClick,
}: {
  title: string;
  desc: string;
  border: string;
  iconColor: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`group bg-card ${border} hover:shadow-xl hover:shadow-border/50 transition-all duration-300 cursor-pointer overflow-hidden rounded-lg border-0 ring-1 ring-border`}
    >
      <CardContent className="p-0">
        <div
          className={`p-8 flex justify-between items-center ${iconColor} bg-card/40 backdrop-blur-sm`}
        >
          {icon}
          <div className="bg-card p-2 rounded-full shadow-sm group-hover:translate-x-1 transition-transform">
            <ChevronRight size={20} />
          </div>
        </div>
        <div className="p-8 space-y-3">
          <h3 className="text-xl font-black text-foreground tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">{desc}</p>
          <div className="pt-4 flex items-center gap-2 group-hover:gap-3 transition-all">
            <span className={`text-xs font-black uppercase tracking-widest ${iconColor}`}>
              探索細節
            </span>
            <ArrowRight size={14} className={iconColor} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Reports;
