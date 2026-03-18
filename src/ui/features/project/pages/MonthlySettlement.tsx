import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { Card } from '@/ui/components/ui/card';
import { useSettlementDialog, DialogStatus } from '@/ui/features/project/components/settlement/useSettlementDialog';
import { SettlementPreview } from '@/ui/features/project/components/settlement/SettlementPreview';
import { type Project } from '@/domains/project/schemas';

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
  const {
    status,
    year,
    month,
    setYear,
    setMonth,
    settlements,
    error,
    toPreview,
    confirm,
    back,
  } = useSettlementDialog(householdId, projects, userEmail, onSuccess, onBack);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (status === DialogStatus.DONE) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle2 size={64} className="text-green-500 animate-in zoom-in duration-300" />
        <h2 className="text-2xl font-bold">Settlement Complete</h2>
        <p className="text-muted-foreground">Monthly snapshots have been created for all projects.</p>
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
          <p className="text-muted-foreground">Calculate and finalize project balances for a specific month</p>
        </div>
      </div>

      {status === DialogStatus.SELECTION && (
        <Card className="p-6 max-w-md mx-auto">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Select Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button className="w-full" onClick={toPreview}>
              Preview Settlement
            </Button>
          </div>
        </Card>
      )}

      {status === DialogStatus.PREVIEW && (
        <div className="space-y-4">
          <SettlementPreview
            year={year}
            month={month}
            settlements={settlements}
            error={error}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={back}>Back</Button>
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
