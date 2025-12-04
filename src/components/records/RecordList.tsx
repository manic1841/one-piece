import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Record, RecordType } from '@/domains/record/record';

interface RecordListProps {
  items: Record[];
  loading: boolean;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
}

export const RecordList: React.FC<RecordListProps> = ({ items, loading, onDelete, onEdit }) => {
  const formatDate = (date: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading transactions...</div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No transactions found. Click "Record Income" or "Add Expense" to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y divide-border">
        {items.map((item) => {
          if (item.recordType === RecordType.PLANNED_INCOME) {
            const income = item;
            return (
              <div
                key={`income-${income.id}`}
                className="p-4 hover:bg-accent/50 transition-colors bg-green-50/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground capitalize">
                            {income?.category?.replace('_', ' ')}
                          </p>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Planned Income
                          </span>
                        </div>
                        {income.description && (
                          <p className="text-sm text-muted-foreground">{income.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(income.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(income.amount)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(income)}
                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(income)}
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          } else if (item.recordType === 'projectTransaction') {
            const pt = item;
            const typeLabel =
              pt.category === 'transfer' ? '轉帳' : pt.category === 'adjustment' ? '調整' : '分配';

            return (
              <div
                key={`pt-${pt.id}`}
                className="p-4 hover:bg-accent/50 transition-colors bg-blue-50/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground capitalize">{typeLabel}</p>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {typeLabel}
                          </span>
                        </div>
                        {pt.description && (
                          <p className="text-sm text-muted-foreground">{pt.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(pt.date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(pt.amount)}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(pt)}
                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(pt)}
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          } else {
            const transaction = item;
            return (
              <div
                key={`transaction-${transaction.id}`}
                className="p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          transaction.transactionType === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {transaction?.category?.replace('_', ' ')}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className={`text-lg font-bold ${
                        transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.transactionType === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(transaction)}
                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(transaction)}
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </Card>
  );
};
