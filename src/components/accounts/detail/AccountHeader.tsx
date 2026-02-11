import { TrendingUp } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type Account } from '../../../schemas';
import { formatCurrency } from '../../../utils/formatUtils';

interface AccountHeaderProps {
  account: Account;
  currentBalance?: number;
  trend: number;
  trendPercentage: string;
  firstRecordMonth?: string;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  currentBalance,
  trend,
  trendPercentage,
  firstRecordMonth,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{account.name}</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="capitalize">{account.type}</span>
          <span>•</span>
          <span>{account.currency}</span>
          {currentBalance !== undefined && (
            <>
              <span>•</span>
              <span>Current: {formatCurrency(currentBalance)}</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {firstRecordMonth && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              {trend >= 0 ? (
                <TrendingUp className="text-green-600" size={20} />
              ) : (
                <TrendingUp
                  className="text-red-600"
                  size={20}
                  style={{ transform: 'scaleY(-1)' }}
                />
              )}
              <span className={`font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}
                {formatCurrency(trend)} ({trendPercentage}%)
              </span>
              <span className="text-sm text-muted-foreground">
                vs first record ({firstRecordMonth})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
