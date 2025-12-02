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
import { BalanceSheetCategory } from '@/domains/finance/finaceCategory';
import { BalanceSheetCategoryOptions } from '@/constants/finance/financeLabel';

interface BalanceSheetFormProps {
  category?: BalanceSheetCategory;
  order?: number;
  onChanged: (data: { category?: BalanceSheetCategory; order?: number }) => void;
}

const BalanceSheetForm: React.FC<BalanceSheetFormProps> = ({ category, order, onChanged }) => {
  const [data, setData] = useState({
    category,
    order,
  });

  useEffect(() => {
    onChanged(data);
  }, [data, onChanged]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">📈 資產負債表</h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">類別</Label>
          <Select
            value={data.category}
            onValueChange={(value) =>
              setData((prev) => ({
                ...prev,
                category: value as BalanceSheetCategory,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇" />
            </SelectTrigger>
            <SelectContent>
              {BalanceSheetCategoryOptions.map((option) => (
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

export default BalanceSheetForm;
