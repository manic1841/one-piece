import React from 'react';

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';

import { DebtSettlementStatus, useDebtSettlement } from '../hooks/useDebtSettlement';

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
  const { status, error, year, month, setYear, setMonth, preview, toPreview, settle, back } =
    useDebtSettlement(householdId, userEmail, onSuccess);

  const [ackMissingRepayments, setAckMissingRepayments] = React.useState(false);

  React.useEffect(() => {
    if (status !== DebtSettlementStatus.PREVIEW) {
      setAckMissingRepayments(false);
    }
  }, [status]);

  if (status === DebtSettlementStatus.SUCCESS) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <CheckCircle2 size={48} className="text-emerald-500 animate-in zoom-in duration-300" />
        <h3 className="text-xl font-bold">債務結算完成</h3>
        <p className="text-muted-foreground text-center text-sm">
          {year}年{month}月的債務快照已成功建立。
        </p>
        <Button onClick={onCancel} className="bg-emerald-600 hover:bg-emerald-700">
          完成
        </Button>
      </div>
    );
  }

  if (
    (status === DebtSettlementStatus.PREVIEW || status === DebtSettlementStatus.PROCESSING) &&
    preview
  ) {
    const canConfirm = !preview.hasMissingRepayments || ackMissingRepayments;

    return (
      <div className="space-y-5 py-2">
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <p className="text-sm font-semibold text-slate-700">{preview.yearMonth} 債務結算預覽</p>
          <p className="text-xs text-slate-600">請確認每個債務帳戶當月還款紀錄與快照建立狀態。</p>
        </div>

        <div className="max-h-64 overflow-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">帳戶</th>
                <th className="px-3 py-2 text-right font-medium">當月還款</th>
                <th className="px-3 py-2 text-right font-medium">快照</th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item) => (
                <tr key={item.debtAccountId} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{item.debtAccountName}</td>
                  <td className="px-3 py-2 text-right">
                    {item.hasRepaymentRecord ? (
                      <span className="text-emerald-700 font-medium">
                        {item.repaymentCount} 筆 / {item.repaymentAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">無還款</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {item.hasSnapshot ? (
                      <span className="text-slate-600">已存在</span>
                    ) : (
                      <span className="text-indigo-700 font-medium">將建立</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {preview.hasMissingRepayments && (
          <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2 text-amber-800 text-sm">
              <AlertCircle size={16} className="mt-0.5" />
              <p className="font-medium leading-relaxed">
                以下帳戶在 {preview.yearMonth} 沒有還款紀錄：
                {preview.missingRepaymentAccountNames.join('、')}。
                仍可結算，但會建立「零還款」快照。
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-amber-900 font-medium">
              <input
                type="checkbox"
                checked={ackMissingRepayments}
                onChange={(e) => setAckMissingRepayments(e.target.checked)}
              />
              我已確認無還款紀錄，仍要繼續結算
            </label>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm">
            <AlertCircle size={16} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={back}
            disabled={status === DebtSettlementStatus.PROCESSING}
          >
            返回
          </Button>
          <Button
            onClick={() => settle(preview.hasMissingRepayments)}
            disabled={status === DebtSettlementStatus.PROCESSING || !canConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
          >
            {status === DebtSettlementStatus.PROCESSING ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                結算中
              </>
            ) : preview.hasMissingRepayments ? (
              '仍要結算'
            ) : (
              '確認結算'
            )}
          </Button>
        </div>
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
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={status === DebtSettlementStatus.PROCESSING}
        >
          取消
        </Button>
        <Button
          onClick={toPreview}
          disabled={status === DebtSettlementStatus.PROCESSING}
          className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
        >
          {status === DebtSettlementStatus.PROCESSING ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              載入中
            </>
          ) : (
            '預覽結算'
          )}
        </Button>
      </div>
    </div>
  );
};
