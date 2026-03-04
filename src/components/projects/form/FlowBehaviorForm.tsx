import React from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectExpenseAsOptions, ProjectIncomeAsOptions } from '@/constants/finance/financeLabel';
import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';

interface FlowBehaviorFormProps {
  incomeAs?: ProjectIncomeBehavior;
  expenseAs?: ProjectExpenseBehavior;
  onChanged: (data: { incomeAs: ProjectIncomeBehavior; expenseAs: ProjectExpenseBehavior }) => void;
}

const FlowBehaviorForm: React.FC<FlowBehaviorFormProps> = ({
  incomeAs = ProjectIncomeBehavior.INCREASE_INCOME,
  expenseAs = ProjectExpenseBehavior.INCREASE_EXPENSE,
  onChanged,
}) => {
  const handleChange = (field: 'incomeAs' | 'expenseAs', value: string) => {
    onChanged({
      incomeAs: (field === 'incomeAs' ? value : incomeAs) as ProjectIncomeBehavior,
      expenseAs: (field === 'expenseAs' ? value : expenseAs) as ProjectExpenseBehavior,
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">🔄 資金流向行為 (Flow Behavior)</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">收入項 (Income) 視為</Label>
          <Select value={incomeAs} onValueChange={(value) => handleChange('incomeAs', value)}>
            <SelectTrigger>
              <SelectValue placeholder="選擇行為" />
            </SelectTrigger>
            <SelectContent>
              {ProjectIncomeAsOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">支出項 (Expense) 視為</Label>
          <Select value={expenseAs} onValueChange={(value) => handleChange('expenseAs', value)}>
            <SelectTrigger>
              <SelectValue placeholder="選擇行為" />
            </SelectTrigger>
            <SelectContent>
              {ProjectExpenseAsOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        * 這會影響此專案在現金流量表與資產負債表中的借貸方向與加減號。
      </p>
    </div>
  );
};

export default FlowBehaviorForm;
