import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRANSACTION_CATEGORIES as categories } from '../../../constants/transaction/categories';
import { type TransactionType } from '../../../schemas';

interface TransactionBasicFieldsProps {
  type: TransactionType;
  amount: string;
  setAmount: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export const TransactionBasicFields: React.FC<TransactionBasicFieldsProps> = ({
  type,
  amount,
  setAmount,
  category,
  setCategory,
  date,
  setDate,
  description,
  setDescription,
}) => {
  const availableCategories = type === 'income' ? categories.income : categories.expense;
  const showCategory = type !== 'transfer';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">金額</Label>
        <Input
          id="amount"
          type="number"
          required
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Category (hidden for transfer) */}
      {showCategory && (
        <div className="space-y-2">
          <Label htmlFor="category">類別</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger id="category">
              <SelectValue placeholder="選擇類別" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">日期</Label>
        <Input
          id="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">備註（選填）</Label>
        <Input
          id="description"
          type="text"
          placeholder="新增備註..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
  );
};
