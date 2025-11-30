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
import { TRANSACTION_CATEGORIES as categories } from '../../../constants/categories';

interface TransactionBasicFieldsProps {
  type: 'income' | 'expense';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
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

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select a category" />
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

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
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
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          type="text"
          placeholder="Add notes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
  );
};
