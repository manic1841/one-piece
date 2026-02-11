import { Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountCategoryIcons } from '@/constants/account/icon';
import { type Account, type AccountWithSnapshot } from '@/domains/account/types';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface AccountGridProps {
  accounts: AccountWithSnapshot[];
  onEdit: (account: AccountWithSnapshot) => void;
  onDelete: (accountId: string) => void;
  onRecordSnapshot?: (account: Account) => void;
  onSelectAccount?: (account: AccountWithSnapshot) => void;
}

export const AccountGrid: React.FC<AccountGridProps> = ({
  accounts,
  onEdit,
  onDelete,
  onRecordSnapshot,
  onSelectAccount,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const snapshot = account.snapshot;
            if (!snapshot) return null;
            return (
              <div
                key={account.id}
                onClick={() => onSelectAccount?.(account)}
                className="border border-border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer bg-card text-card-foreground shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{AccountCategoryIcons[account.category!]}</span>
                    <div>
                      <h3 className="font-medium text-foreground">{account.name}</h3>
                      <p className="text-xs text-muted-foreground">{account.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(account);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(account.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(snapshot.amount || 0)}
                  </p>
                  {
                    <p className="text-xs text-muted-foreground">
                      As of {formatDate(snapshot.createdAt)}
                    </p>
                  }
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordSnapshot?.(account);
                  }}
                >
                  Record Balance
                </Button>
              </div>
            );
          })}
        </div>

        {accounts.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No accounts yet. Add your first account to start tracking your assets.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
