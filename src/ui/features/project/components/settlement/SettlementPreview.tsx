import type React from 'react';

import { Card } from '@/ui/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { formatCurrency } from '@/ui/utils';

interface SettlementPreviewProps {
  year: number;
  month: number;
  error?: string;
  settlements: Array<{
    projectId: string;
    projectName: string;
    openingBalance: number;
    income: number;
    expense: number;
    closingBalance: number;
    year: number;
    month: number;
  }>;
}

export const SettlementPreview: React.FC<SettlementPreviewProps> = ({
  year,
  month,
  error,
  settlements,
}) => {
  return (
    <div className="space-y-4 py-4">
      <Card className="bg-blue-50 border-blue-200 p-4">
        <p className="text-sm text-blue-800">
          <strong>
            Settlement Preview for {year}-{String(month).padStart(2, '0')}
          </strong>
          <br />
          Review the calculations below. Click "Confirm Settlement" to create snapshots for all
          projects.
        </p>
      </Card>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Opening</TableHead>
            <TableHead className="text-right">Income</TableHead>
            <TableHead className="text-right">Expense</TableHead>
            <TableHead className="text-right">Closing</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map((settlement) => (
            <TableRow key={settlement.projectId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{settlement.projectName}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(settlement.openingBalance)}
              </TableCell>
              <TableCell className="text-right text-green-600 font-medium">
                +{formatCurrency(settlement.income)}
              </TableCell>
              <TableCell className="text-right text-red-600 font-medium">
                -{formatCurrency(settlement.expense)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(settlement.closingBalance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
