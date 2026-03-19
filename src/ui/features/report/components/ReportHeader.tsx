import React from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, FileText, Wallet, TrendingUp } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/components/ui/popover';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { cn } from '@/ui/utils/cn';

export type ReportView = 'MENU' | 'INCOME_STATEMENT' | 'BALANCE_SHEET' | 'CASH_FLOW';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onBack: () => void;
  currentView: ReportView;
  onViewChange: (view: ReportView) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  subtitle,
  currentDate,
  onDateChange,
  onBack,
  currentView,
  onViewChange,
}) => {
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
    { id: 'INCOME_STATEMENT' as ReportView, label: '損益表', icon: <FileText size={16} /> },
    { id: 'BALANCE_SHEET' as ReportView, label: '資產負債表', icon: <Wallet size={16} /> },
    { id: 'CASH_FLOW' as ReportView, label: '現金流量表', icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-500 font-medium text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 px-4 h-11 rounded-xl flex items-center gap-3 transition-all active:scale-95"
              >
                <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                  <Calendar size={18} />
                </div>
                <span className="font-bold text-slate-700">
                  {format(currentDate, 'yyyy 年 MM 月')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-6 rounded-2xl shadow-2xl border-slate-100" align="end">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <span className="text-sm font-black text-slate-900 uppercase tracking-wider">選擇報表期間</span>
                </div>
                <YearMonthPicker
                  year={currentDate.getFullYear()}
                  month={currentDate.getMonth() + 1}
                  onYearChange={handleYearChange}
                  onMonthChange={handleMonthChange}
                  className="grid grid-cols-1 gap-4"
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Quick Switch Tabs */}
      <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 w-fit">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
              currentView === tab.id
                ? "bg-white text-indigo-600 shadow-md shadow-slate-200/50 translate-y-[-1px]"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
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
