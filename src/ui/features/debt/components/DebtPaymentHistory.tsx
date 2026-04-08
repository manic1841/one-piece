import { useEffect, useState } from 'react';

import { Calendar, ReceiptText } from 'lucide-react';

import { type Transaction } from '@/domains/ledger/schemas';
import {
  type DebtPaymentHistoryItemVM,
  mapDebtPaymentTransactionToHistoryVM,
} from '@/ui/features/debt/viewmodels/debtDisplay.vm';

interface DebtPaymentHistoryProps {
  debtAccountId: string;
  getHistory: (id: string) => Promise<Transaction[]>;
}

export function DebtPaymentHistory({ debtAccountId, getHistory }: DebtPaymentHistoryProps) {
  const [history, setHistory] = useState<DebtPaymentHistoryItemVM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // setLoading(true); // Redundant if initial state is true
    getHistory(debtAccountId)
      .then((data) => {
        if (mounted) {
          setHistory(data.map(mapDebtPaymentTransactionToHistoryVM));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load repayment history:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [debtAccountId, getHistory]);

  if (loading) {
    return <div className="py-4 text-center text-sm text-slate-500">載入中...</div>;
  }

  if (history.length === 0) {
    return <div className="py-8 text-center text-sm text-slate-400">目前尚無還款紀錄</div>;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100/50 text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">日期</th>
            <th className="px-4 py-2 font-medium">說明</th>
            <th className="px-4 py-2 font-medium text-right">本金</th>
            <th className="px-4 py-2 font-medium text-right">利息</th>
            <th className="px-4 py-2 font-medium text-right">總額</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((item) => {
            return (
              <tr key={item.id} className="hover:bg-white/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {item.dateText}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5" />
                    {item.descriptionText}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                  {item.principalText}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-rose-600">
                  {item.interestText}
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                  {item.totalText}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
