import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';
import { Card, CardContent } from '@/components/ui/card';

interface RecordStatsProps {
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
  };
}

export const RecordStats: React.FC<RecordStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expense</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg ${stats.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}
            >
              <TrendingUp
                className={stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}
                size={24}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p
                className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-foreground' : 'text-orange-600'}`}
              >
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
