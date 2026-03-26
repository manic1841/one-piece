import React from 'react';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { type Project } from '@/domains/project/schemas';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import { Card } from '@/ui/components/ui/card';
import { SettlementPreview } from '@/ui/features/project/components/settlement/SettlementPreview';
import { DialogStatus, useSettlementDialog } from '@/ui/features/project/hooks/useSettlementDialog';

interface MonthlySettlementProps {
  householdId: string;
  userEmail: string;
  projects: Project[];
  onBack: () => void;
  onSuccess?: () => void;
}

const MonthlySettlement: React.FC<MonthlySettlementProps> = ({
  householdId,
  userEmail,
  projects,
  onBack,
  onSuccess,
}) => {
  const { status, year, month, setYear, setMonth, settlements, error, toPreview, confirm, back } =
    useSettlementDialog(householdId, projects, userEmail, onSuccess, onBack);

  if (status === DialogStatus.DONE) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 size={64} className="text-green-500 animate-in zoom-in duration-300" />
        <h2 className="text-2xl font-bold">Settlement Complete</h2>
        <p className="text-muted-foreground">
          Monthly snapshots have been created for all projects.
        </p>
        <Button onClick={onBack}>Return to Projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Monthly Settlement</h1>
          <p className="text-muted-foreground">
            Calculate and finalize project balances for a specific month
          </p>
        </div>
      </div>

      {status === DialogStatus.SELECTION && (
        <Card className="p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900">選擇結算期間</h3>
            <YearMonthPicker
              year={year}
              month={month}
              onYearChange={(y) => setYear(parseInt(y) || 0)}
              onMonthChange={(m) => setMonth(parseInt(m) || 1)}
              yearLabel="結算年份"
              monthLabel="結算月份"
            />
            <Button className="w-full" onClick={toPreview}>
              Preview Settlement
            </Button>
          </div>
        </Card>
      )}

      {status === DialogStatus.PREVIEW && (
        <div className="space-y-4">
          <SettlementPreview year={year} month={month} settlements={settlements} error={error} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={back}>
              Back
            </Button>
            <Button onClick={confirm}>Confirm Settlement</Button>
          </div>
        </div>
      )}

      {status === DialogStatus.PROCESSING && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p>Processing settlement...</p>
        </div>
      )}
    </div>
  );
};

export default MonthlySettlement;
