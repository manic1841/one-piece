import React from 'react';

import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ReportPageLayoutProps {
  title: string;
  currentDate: Date;
  formatMonthYear: (date: Date) => string;
  isCurrentMonth: () => boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
  onBack: () => void;
  children: React.ReactNode;
}

export const ReportPageLayout: React.FC<ReportPageLayoutProps> = ({
  title,
  currentDate,
  formatMonthYear,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onBack,
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回報表
          </Button>
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center font-medium">
            {formatMonthYear(currentDate)}
          </div>
          <Button variant="outline" size="icon" onClick={onNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth() && (
            <Button variant="outline" onClick={onCurrentMonth}>
              本月
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
