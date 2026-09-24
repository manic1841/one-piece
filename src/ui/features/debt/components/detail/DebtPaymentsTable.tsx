import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { type DebtPaymentHistoryItemVM } from '@/ui/features/debt/viewmodels/debtDisplay.vm';

interface DebtPaymentsTableProps {
  history: DebtPaymentHistoryItemVM[];
}

export const DebtPaymentsTable: React.FC<DebtPaymentsTableProps> = ({ history }) => {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">目前尚無還款紀錄</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Principal</TableHead>
          <TableHead className="text-right">Interest</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-[12px]">{item.dateText}</TableCell>
            <TableCell className="text-muted-foreground">{item.descriptionText}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {item.principalText}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {item.interestText}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{item.totalText}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
