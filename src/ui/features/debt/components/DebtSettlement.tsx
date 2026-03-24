import React from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/ui/components/ui/button';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { useDebtSettlement, DebtSettlementStatus } from '../hooks/useDebtSettlement';

interface DebtSettlementProps {
  householdId: string;
  userEmail: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DebtSettlement: React.FC<DebtSettlementProps> = ({
  householdId,
  userEmail,
  onSuccess,
  onCancel,
}) => {
  const {
    status,
    error,
    year,
    month,
    setYear,
    setMonth,
    settle,
  } = useDebtSettlement(householdId, userEmail, onSuccess);

  if (status === DebtSettlementStatus.SUCCESS) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle2 size={48} className="text-emerald-500 animate-in zoom-in duration-300" />
        <h3 className="text-xl font-bold">債務結算完成</h3>
        <p className="text-muted-foreground text-center text-sm">
          {year}年{month}月的債務快照已成功建立。
        </p>
        <Button onClick={onCancel} className="bg-emerald-600 hover:bg-emerald-700">完成</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs text-blue-700 leading-relaxed">
            結算功能會為所有債務帳戶建立該月份的快照 (Snapshot)。
            如果該月有還款紀錄，快照將包含還款後的餘額；若無還款，則以目前餘額作為月底結算值。
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">選擇結算期間</label>
          <YearMonthPicker
            year={year}
            month={month}
            onYearChange={(y) => setYear(parseInt(y) || 0)}
            onMonthChange={(m) => setMonth(parseInt(m) || 1)}
            yearLabel="結算年份"
            monthLabel="結算月份"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
            <AlertCircle size={16} />
            <p className="font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="ghost" onClick={onCancel} disabled={status === DebtSettlementStatus.PROCESSING}>
          取消
        </Button>
        <Button 
          onClick={settle} 
          disabled={status === DebtSettlementStatus.PROCESSING}
          className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
        >
          {status === DebtSettlementStatus.PROCESSING ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              結算中
            </>
          ) : (
            '確認結算'
          )}
        </Button>
      </div>
    </div>
  );
};
