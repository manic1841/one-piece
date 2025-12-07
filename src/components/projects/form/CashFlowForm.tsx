import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NO_SELECTED } from '@/constants/empty';
import { CashFlowCategoryOptions } from '@/constants/finance/financeLabel';
import { useEffect, useState } from 'react';

interface CashFlowFormProps {
  category?: string;
  order?: number;
  onChanged: (data: { category: string; order?: number }) => void;
}

const CashFlowForm: React.FC<CashFlowFormProps> = ({ category, order, onChanged }) => {
  const [data, setData] = useState({
    category: category || NO_SELECTED,
    order: order,
  });

  useEffect(() => {
    onChanged?.(data);
  }, [data, onChanged]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">💰 現金流量</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">活動</Label>
          <Select
            value={data.category}
            onValueChange={(value) =>
              setData((prev) => ({
                ...prev,
                category: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="id-1" value={NO_SELECTED}>
                選擇
              </SelectItem>
              {CashFlowCategoryOptions.map((option) => (
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

export default CashFlowForm;
