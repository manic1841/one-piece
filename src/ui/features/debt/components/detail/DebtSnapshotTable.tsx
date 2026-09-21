import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { type DebtSnapshot } from '@/domains/debt/schemas';
import { formatCurrency } from '@/ui/utils';

interface DebtSnapshotTableProps {
  snapshots: DebtSnapshot[];
}

export const DebtSnapshotTable: React.FC<DebtSnapshotTableProps> = ({ snapshots }) => {
  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground">目前尚無月度資料</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Opening</TableHead>
          <TableHead className="text-right">Principal</TableHead>
          <TableHead className="text-right">Interest</TableHead>
          <TableHead className="text-right">Closing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((snapshot) => (
          <TableRow key={snapshot.id}>
            <TableCell className="font-mono text-[12px]">{snapshot.yearMonth}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCurrency(snapshot.openingBalance)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCurrency(snapshot.principalPaid)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCurrency(snapshot.interestPaid)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatCurrency(snapshot.closingBalance)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
