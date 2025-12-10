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
import { useEffect, useState } from 'react';

type FinancialStatementType = 'incomeStatement' | 'cashFlow' | 'balanceSheet';

interface FinancialStatementFormProps {
  type: FinancialStatementType;
  title: string;
  icon: string;
  fieldLabel: string;
  categoryOptions: Array<{ value: string; label: string }>;
  subcategoryOptions?: Record<string, Array<{ value: string; label: string }>>;
  category?: string;
  subcategory?: string;
  order?: number;
  onChanged: (data: { category: string; subcategory?: string; order?: number }) => void;
}

const FinancialStatementForm: React.FC<FinancialStatementFormProps> = ({
  title,
  icon,
  fieldLabel,
  categoryOptions,
  subcategoryOptions,
  category,
  subcategory,
  order,
  onChanged,
}) => {
  const [data, setData] = useState({
    category: category || NO_SELECTED,
    subcategory: subcategory || NO_SELECTED,
    order,
  });

  const availableSubcategories =
    data.category !== NO_SELECTED && subcategoryOptions
      ? subcategoryOptions[data.category] || []
      : [];

  useEffect(() => {
    onChanged(data);
  }, [data, onChanged]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">
        {icon} {title}
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">{fieldLabel}</Label>
          <Select
            value={data.category}
            onValueChange={(value) =>
              setData((prev) => ({
                ...prev,
                category: value,
                subcategory: NO_SELECTED,
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
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">子類別</Label>
          <Select
            value={data.subcategory}
            onValueChange={(value) =>
              setData((prev) => ({
                ...prev,
                subcategory: value,
              }))
            }
            disabled={availableSubcategories.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem key="id-1" value={NO_SELECTED}>
                選擇
              </SelectItem>
              {availableSubcategories.map((option) => (
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

export default FinancialStatementForm;
