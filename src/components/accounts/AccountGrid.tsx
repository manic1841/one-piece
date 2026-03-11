import React from 'react';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

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
  isReorderMode?: boolean;
  onMoveUp?: (accountId: string) => void;
  onMoveDown?: (accountId: string) => void;
}

export const AccountGrid: React.FC<AccountGridProps> = ({
  accounts,
  onEdit,
  onDelete,
  onRecordSnapshot,
  onSelectAccount,
  isReorderMode,
  onMoveUp,
  onMoveDown,
}) => {
  const { twdAccounts, foreignAccounts, investmentAccounts } = React.useMemo(() => {
    return {
      twdAccounts: accounts.filter((a) => a.currency === 'TWD' && a.category !== 'investment'),
      foreignAccounts: accounts.filter((a) => a.currency !== 'TWD' && a.category !== 'investment'),
      investmentAccounts: accounts.filter((a) => a.category === 'investment'),
    };
  }, [accounts]);

  const renderAccountGroup = (title: string, groupAccounts: AccountWithSnapshot[]) => {
    if (groupAccounts.length === 0) return null;

    return (
      <div className="mb-8 last:mb-0">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="h-4 w-1 bg-primary rounded-full" />
          {title}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({groupAccounts.length})
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupAccounts.map((account) => {
            const snapshot = account.snapshot;
            return (
              <div
                key={account.id}
                onClick={() => onSelectAccount?.(account)}
                className="group border border-border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer bg-card text-card-foreground shadow-sm relative"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{AccountCategoryIcons[account.category!]}</span>
                    <div>
                      <h3 className="font-medium text-foreground">{account.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {account.category} • {account.currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isReorderMode ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp?.(account.id);
                          }}
                          title="Move Up"
                        >
                          <ArrowUp size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown?.(account.id);
                          }}
                          title="Move Down"
                        >
                          <ArrowDown size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(snapshot?.amount || 0)}
                    </p>
                    {snapshot?.year && snapshot?.month && (
                      <span className="text-sm font-medium text-muted-foreground">
                        ({snapshot.year}/{snapshot.month.toString().padStart(2, '0')})
                      </span>
                    )}
                  </div>
                  {
                    <p className="text-xs text-muted-foreground mt-1">
                      As of {snapshot?.createdAt ? formatDate(snapshot.createdAt) : 'N/A'}
                    </p>
                  }
                </div>

                {!isReorderMode && (
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No accounts yet. Add your first account to start tracking your assets.
          </p>
        ) : (
          <>
            {renderAccountGroup('台幣帳戶', twdAccounts)}
            {renderAccountGroup('外幣帳戶', foreignAccounts)}
            {renderAccountGroup('投資帳戶', investmentAccounts)}
          </>
        )}
      </CardContent>
    </Card>
  );
};
