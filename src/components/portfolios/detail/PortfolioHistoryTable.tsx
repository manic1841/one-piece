import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type PortfolioSnapshot } from '@/schemas';
import { formatYearMonth } from '@/utils/dateUtils';
import { formatCurrency, formatPercentage } from '@/utils/formatUtils';

interface PortfolioHistoryTableProps {
  snapshots: PortfolioSnapshot[];
}

export const PortfolioHistoryTable: React.FC<PortfolioHistoryTableProps> = ({ snapshots }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Return %</TableHead>
              <TableHead className="text-right">Cumulative %</TableHead>
              <TableHead className="text-right">Net Flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snapshot) => (
              <TableRow key={snapshot.id}>
                <TableCell>{formatYearMonth(snapshot.year, snapshot.month)}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(snapshot.totalValue)}
                </TableCell>
                <TableCell
                  className={`text-right ${snapshot.performance.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(snapshot.performance.gain)}
                </TableCell>
                <TableCell
                  className={`text-right ${snapshot.performance.returnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatPercentage(snapshot.performance.returnRate, 2)}
                </TableCell>
                <TableCell
                  className={`text-right ${snapshot.performance.cumulativeReturnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatPercentage(snapshot.performance.cumulativeReturnRate, 2)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(snapshot.performance.netCashFlow)}
                </TableCell>
              </TableRow>
            ))}
            {snapshots.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No snapshots recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
