import React from 'react';
import { type TransactionType } from '../../schemas';

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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType('expense');
            setCategory('');
            setShowAllocations(false);
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            type === 'expense'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setType('income');
            setCategory('');
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            type === 'income'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Income
        </button>
      </div>
    </div>
  );
};
