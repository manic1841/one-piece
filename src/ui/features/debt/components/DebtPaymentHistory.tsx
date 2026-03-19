import { useEffect, useState } from 'react';

import { Calendar, ReceiptText } from 'lucide-react';

import { type Transaction } from '@/domains/ledger/schemas';

interface DebtPaymentHistoryProps {
  debtAccountId: string;
  getHistory: (id: string) => Promise<Transaction[]>;
}

export function DebtPaymentHistory({ debtAccountId, getHistory }: DebtPaymentHistoryProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // setLoading(true); // Redundant if initial state is true
    getHistory(debtAccountId)
      .then((data) => {
        if (mounted) {
          setHistory(data);
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
          {history.map((tx) => {
            // Extract principal/interest from entries
            // Entry with linkedLedgerCode (usually liability:*) is principal (debit)
            // Entry with expense:interest is interest (debit)
            const principal = tx.entries.find((e) => e.ledgerCode.startsWith('liability:'))?.debit || 0;
            const interest = tx.entries.find((e) => e.ledgerCode === 'expense:interest')?.debit || 0;

            return (
              <tr key={tx.id} className="hover:bg-white/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-2.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {tx.date.toISOString().slice(0, 10)}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ReceiptText className="h-3.5 w-3.5" />
                    {tx.description}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                  ${principal.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-rose-600">
                  ${interest.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                  ${(tx.amount || 0).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
