import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { IncomeStatementCategory } from '@/domains/finance/finaceCategory';
import { IncomeStatementCategoryOptions } from '@/constants/finance/financeLabel';

interface IncomeStatementFormProps {
  category?: IncomeStatementCategory;
  order?: number;
  onChanged: (data: { category?: IncomeStatementCategory; order?: number }) => void;
}

const IncomeStatementForm: React.FC<IncomeStatementFormProps> = ({
  category,
  order,
  onChanged,
}) => {
  const [data, setData] = useState({
    category,
    order,
  });

  useEffect(() => {
    onChanged(data);
  }, [data, onChanged]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">📊 損益表</h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">類別</Label>
          <Select
            value={data.category}
            onValueChange={(value) =>
              setData((prev) => ({
                ...prev,
                category: value as IncomeStatementCategory,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇" />
            </SelectTrigger>
            <SelectContent>
              {IncomeStatementCategoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">排序</Label>
          <Input
            type="number"
            value={data.order}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                order: parseInt(e.target.value) || 0,
              }))
            }
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementForm;
