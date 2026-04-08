import React from 'react';

import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';

interface PerformanceCardProps {
  title: string;
  value: string;
  subValue: string;
  trend?: 'up' | 'down' | 'neutral';
  valueColor?: 'default' | 'green' | 'red';
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  value,
  subValue,
  trend,
  valueColor = 'default',
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            valueColor === 'green' ? 'text-green-600' : valueColor === 'red' ? 'text-red-600' : ''
          }`}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{subValue}</p>
      </CardContent>
    </Card>
  );
};
