import React from 'react';

import { addMonths, addYears, format, isSameMonth, isSameYear } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import { cn } from '@/ui/utils/cn';

export type ReportView = 'MENU' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';
export type ReportMode = 'MONTHLY' | 'YEARLY';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onBack: () => void;
  currentView: ReportView;
  onViewChange: (view: ReportView) => void;
  reportMode: ReportMode;
  onReportModeChange: (mode: ReportMode) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  currentDate,
  onDateChange,
  onBack,
  currentView,
  onViewChange,
  reportMode,
  onReportModeChange,
}) => {
  // Month navigation handlers
  const handlePreviousMonth = () => {
    onDateChange(addMonths(currentDate, -1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onDateChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const isCurrentMonthSelected = isSameMonth(currentDate, new Date());

  // Year navigation handlers
  const handlePreviousYear = () => {
    onDateChange(addYears(currentDate, -1));
  };

  const handleNextYear = () => {
    onDateChange(addYears(currentDate, 1));
  };

  const handleCurrentYear = () => {
    const now = new Date();
    onDateChange(new Date(now.getFullYear(), 0, 1));
  };

  const isCurrentYearSelected = isSameYear(currentDate, new Date());

  const handleYearChange = (year: string) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(year) || currentDate.getFullYear());
    onDateChange(newDate);
  };

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth((parseInt(month) || 1) - 1);
    onDateChange(newDate);
  };

  const reportTabs = [
    {
      id: 'INCOME_STATEMENT' as ReportView,
      label: REPORT_VIEW_TITLES.INCOME_STATEMENT,
      icon: <FileText size={16} />,
    },
    {
      id: 'BALANCE_SHEET' as ReportView,
      label: REPORT_VIEW_TITLES.BALANCE_SHEET,
      icon: <Wallet size={16} />,
    },
    {
      id: 'CASH_FLOW' as ReportView,
      label: REPORT_VIEW_TITLES.CASH_FLOW,
      icon: <TrendingUp size={16} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{title}</h1>
            <p className="text-muted-foreground font-medium text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode toggle buttons */}
          <div className="flex p-1 bg-muted/80 rounded-lg border border-border/50 gap-1">
            <Button
              type="button"
              variant={reportMode === 'MONTHLY' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onReportModeChange('MONTHLY')}
              className="text-xs font-bold"
            >
              月度
            </Button>
            <Button
              type="button"
              variant={reportMode === 'YEARLY' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onReportModeChange('YEARLY')}
              className="text-xs font-bold"
            >
              年度
            </Button>
          </div>

          {/* Monthly controls */}
          {reportMode === 'MONTHLY' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
                className="gap-1"
              >
                <ChevronLeft size={14} />
                上一月
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrentMonth}
                disabled={isCurrentMonthSelected}
              >
                本月
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                className="gap-1"
              >
                下一月
                <ChevronRight size={14} />
              </Button>
            </>
          )}

          {/* Yearly controls */}
          {reportMode === 'YEARLY' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviousYear}
                className="gap-1"
              >
                <ChevronLeft size={14} />
                上一年
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCurrentYear}
                disabled={isCurrentYearSelected}
              >
                本年
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleNextYear}
                className="gap-1"
              >
                下一年
                <ChevronRight size={14} />
              </Button>
            </>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-card border-border shadow-sm hover:bg-muted px-4 h-11 rounded-xl flex items-center gap-3 transition-all active:scale-95"
              >
                <div className="bg-accent p-1.5 rounded-lg text-foreground">
                  <Calendar size={18} />
                </div>
                <span className="font-bold text-foreground">
                  {reportMode === 'MONTHLY'
                    ? format(currentDate, 'yyyy 年 MM 月')
                    : format(currentDate, 'yyyy 年')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-6 rounded-lg shadow-2xl border-border"
              align="end"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <span className="text-sm font-black text-foreground uppercase tracking-wider">
                    {reportMode === 'MONTHLY' ? '選擇報表期間' : '選擇年份'}
                  </span>
                </div>
                {reportMode === 'MONTHLY' ? (
                  <YearMonthPicker
                    year={currentDate.getFullYear()}
                    month={currentDate.getMonth() + 1}
                    onYearChange={handleYearChange}
                    onMonthChange={handleMonthChange}
                    className="grid grid-cols-1 gap-4"
                  />
                ) : (
                  <YearMonthPicker
                    mode="year"
                    year={currentDate.getFullYear()}
                    onYearChange={handleYearChange}
                    yearLabel="年份"
                    className="grid grid-cols-1 gap-4"
                  />
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Quick Switch Tabs */}
      <div className="flex p-1 bg-muted/80 backdrop-blur-sm rounded-lg border border-border/50 w-fit">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all',
              currentView === tab.id
                ? 'bg-card text-foreground shadow-md shadow-border/50 translate-y-[-1px]'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
