import React from 'react';

import { type Account, type AccountSnapshot, type Holding } from '@/schemas';

interface AccountSnapshotListProps {
  accounts: Account[];
  accountSnapshots: Map<string, AccountSnapshot>;
  totalValue: number;
}

export const AccountSnapshotList: React.FC<AccountSnapshotListProps> = ({
  accounts,
  accountSnapshots,
  totalValue,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold">Linked Account Snapshots</label>
      <div className="space-y-2 border rounded-md p-4 bg-slate-50">
        {accounts.map((account: Account) => {
          const snapshot = accountSnapshots.get(account.id);
          const currency = account.currency || 'USD';

          return (
            <div
              key={account.id}
              className="flex justify-between items-start border-b last:border-0 pb-2 last:pb-0"
            >
              <div>
                <div className="font-medium text-sm">{account.name}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {account.category}
                </div>

                {snapshot?.holdings && (
                  <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1">
                    {snapshot.holdings.map((h: Holding, idx: number) => (
                      <div key={idx} className="text-[11px] text-slate-500">
                        {h.name} ({h.symbol}): {h.quantity} @{' '}
                        {(h.marketValue / h.quantity).toLocaleString()} ={' '}
                        <span className="font-medium">
                          {h.marketValue.toLocaleString()} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                {snapshot ? (
                  <div className="font-semibold text-sm">
                    {snapshot.amount.toLocaleString()}{' '}
                    <span className="text-[10px] text-muted-foreground">{currency}</span>
                  </div>
                ) : (
                  <div className="text-destructive text-[10px] font-bold uppercase tracking-tighter">
                    Missing Snapshot
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-300 font-bold">
          <span className="text-sm">Combined Portfolio Value</span>
          <span className="text-blue-600 font-mono">{totalValue.toLocaleString()} TWD</span>
        </div>
      </div>
    </div>
  );
};
