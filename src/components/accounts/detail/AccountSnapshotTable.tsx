import { Calendar, Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { type AccountSnapshot } from '../../../schemas';
import { formatDate } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/formatUtils';

interface AccountSnapshotTableProps {
  snapshots: AccountSnapshot[];
  onEdit: (snapshot: AccountSnapshot) => void;
  onDelete: (snapshotId: string) => void;
}

export const AccountSnapshotTable: React.FC<AccountSnapshotTableProps> = ({
  snapshots,
  onEdit,
  onDelete,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Calendar className="text-blue-600" size={20} />
        <CardTitle>Snapshot History</CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No snapshots recorded yet. Record your first balance to start tracking.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Recorded At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots
                .sort((a, b) => {
                  if (a.year !== b.year) return b.year - a.year;
                  return b.month - a.month;
                })
                .map((snapshot, index, arr) => {
                  const previousSnapshot = arr[index + 1];
                  const change = previousSnapshot ? snapshot.amount - previousSnapshot.amount : 0;
                  return (
                    <TableRow key={snapshot.id}>
                      <TableCell>
                        {snapshot.year}-{String(snapshot.month).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(snapshot.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {previousSnapshot ? (
                          <span
                            className={`font-medium ${
                              change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {change >= 0 ? '+' : ''}
                            {formatCurrency(change)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(snapshot.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                            onClick={() => onEdit(snapshot)}
                            title="Edit snapshot"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(snapshot.id)}
                            title="Delete snapshot"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
