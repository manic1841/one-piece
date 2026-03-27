import React, { useState } from 'react';

import { Calendar, ChevronDown, ChevronRight, Pencil, Trash2, TrendingUp } from 'lucide-react';

import { type AccountSnapshot } from '@/domains/account/schemas';
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
import { formatCurrency, formatDate } from '@/ui/utils';

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newRows = new Set(expandedRows);
    if (newRows.has(id)) {
      newRows.delete(id);
    } else {
      newRows.add(id);
    }
    setExpandedRows(newRows);
  };

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
                <TableHead className="w-[150px]">Date</TableHead>
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
                  const hasHoldings = snapshot.holdings && snapshot.holdings.length > 0;
                  const isExpanded = expandedRows.has(snapshot.id);

                  return (
                    <React.Fragment key={snapshot.id}>
                      <TableRow className={isExpanded ? 'border-b-0 bg-slate-50/50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {hasHoldings ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleRow(snapshot.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                              </Button>
                            ) : (
                              <div className="w-6" />
                            )}
                            <span className="font-medium">
                              {snapshot.year}-{String(snapshot.month).padStart(2, '0')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(snapshot.originalAmount || snapshot.amount)}
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
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
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
                      {isExpanded && hasHoldings && (
                        <TableRow className="bg-slate-50/50 border-t-0">
                          <TableCell colSpan={5} className="py-0 pb-4">
                            <div className="ml-7 border rounded-lg bg-white overflow-hidden shadow-sm">
                              <Table>
                                <TableHeader className="bg-slate-50">
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-[10px] font-bold uppercase">
                                      Symbol
                                    </TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold uppercase">
                                      Qty
                                    </TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold uppercase text-right">
                                      Cost
                                    </TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold uppercase text-right">
                                      Market Value
                                    </TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold uppercase text-right">
                                      Gain (%)
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {snapshot.holdings!.map((holding, idx) => {
                                    const gain = holding.marketValue - holding.cost;
                                    const gainPercent =
                                      holding.cost !== 0 ? (gain / holding.cost) * 100 : 0;
                                    return (
                                      <TableRow key={idx} className="hover:bg-slate-50/50">
                                        <TableCell className="py-2 py-1 text-xs">
                                          <div className="font-bold">{holding.symbol}</div>
                                          <div className="text-[10px] text-muted-foreground">
                                            {holding.name}
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs">
                                          {holding.quantity}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right">
                                          {formatCurrency(holding.cost)}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right font-medium">
                                          {formatCurrency(holding.marketValue)}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right">
                                          <div
                                            className={`flex items-center justify-end gap-1 font-medium ${
                                              gain >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}
                                          >
                                            {gain >= 0 && <TrendingUp size={10} />}
                                            {formatCurrency(gain)} ({gainPercent.toFixed(2)}%)
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
