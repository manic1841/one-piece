import React from 'react';
import { type TransactionType } from '../../schemas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TypeToggleProps {
  type: TransactionType;
  setType: (type: TransactionType) => void;
  setCategory: (category: string) => void;
  setShowAllocations: (show: boolean) => void;
}

export const TypeToggle: React.FC<TypeToggleProps> = ({
  type,
  setType,
  setCategory,
  setShowAllocations,
}) => {
  return (
    <div className="space-y-2">
      <Label>Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === 'expense' ? 'default' : 'outline'}
          onClick={() => {
            setType('expense');
            setCategory('');
            setShowAllocations(false);
          }}
          className={`flex-1 ${type === 'expense'
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
              : ''
            }`}
        >
          Expense
        </Button>
        <Button
          type="button"
          variant={type === 'income' ? 'default' : 'outline'}
          onClick={() => {
            setType('income');
            setCategory('');
          }}
          className={`flex-1 ${type === 'income'
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
              : ''
            }`}
        >
          Income
        </Button>
      </div>
    </div>
  );
};
