import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { type Transaction, type PlannedIncome } from '../../schemas';
import { type TransactionListItem } from '../../hooks/useTransactions';
import { formatCurrency } from '../../utils/formatUtils';
import { toDate } from '../../utils/dateUtils';
import { Timestamp } from 'firebase/firestore';

interface TransactionListProps {
  items: TransactionListItem[];
  loading: boolean;
  onEditTransaction: (transaction: Transaction) => void;
  onEditPlannedIncome: (income: PlannedIncome) => void;
  onDeleteTransaction: (id: string) => void;
  onDeletePlannedIncome: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  onEditTransaction,
  onEditPlannedIncome,
  onDeleteTransaction,
  onDeletePlannedIncome,
}) => {
  const formatDate = (timestamp: Timestamp | Date) => {
    if (!timestamp) return '';
    const date = toDate(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 text-center text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          No transactions found. Click "Record Income" or "Add Expense" to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          if (item.type === 'plannedIncome') {
            const income = item.data;
            return (
              <div
                key={`income-${income.id}`}
                className="p-4 hover:bg-gray-50 transition-colors bg-green-50/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 capitalize">
                            {income.category.replace('_', ' ')}
                          </p>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Planned Income
                          </span>
                        </div>
                        {income.description && (
                          <p className="text-sm text-gray-500">{income.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(income.date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-green-600">
                      +{formatCurrency(income.amount)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditPlannedIncome(income)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDeletePlannedIncome(income.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          } else {
            const transaction = item.data;
            return (
              <div
                key={`transaction-${transaction.id}`}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {transaction.category.replace('_', ' ')}
                        </p>
                        {transaction.description && (
                          <p className="text-sm text-gray-500">{transaction.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p
                      className={`text-lg font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEditTransaction(transaction)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};
