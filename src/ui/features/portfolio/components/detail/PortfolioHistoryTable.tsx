import React from 'react';

import { Trash2 } from 'lucide-react';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { formatCurrency, formatPercentage, formatYearMonth } from '@/ui/utils';

interface PortfolioHistoryTableProps {
  snapshots: PortfolioSnapshot[];
  onDelete?: (snapshotId: string) => Promise<void>;
}

export const PortfolioHistoryTable: React.FC<PortfolioHistoryTableProps> = ({
  snapshots,
  onDelete,
}) => {
  const handleDelete = async (snapshotId: string, dateStr: string) => {
    if (window.confirm(`Are you sure you want to delete the snapshot for ${dateStr}?`)) {
      try {
        if (onDelete) {
          await onDelete(snapshotId);
        }
      } catch (error) {
        console.error('Failed to delete snapshot:', error);
        alert('Failed to delete snapshot');
      }
    }
  };
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...snapshots]
              .sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
              })
              .map((snapshot) => (
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
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        handleDelete(snapshot.id, formatYearMonth(snapshot.year, snapshot.month))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {snapshots.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
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
