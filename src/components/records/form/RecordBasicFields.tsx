import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RecordFormType,
  RecordType,
  type RecordFormData,
  type RecordCategory,
  ProjectTransactionCategory,
} from '@/domains/record/types';
import { RecordCategoryOptions } from '@/constants/record/category';

interface RecordBasicFieldsProps {
  formType: RecordFormType;
  recordType?: RecordType;
  amount: string;
  category: RecordCategory;
  date: string;
  description: string;
  onChanged?: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
}

export const RecordBasicFields: React.FC<RecordBasicFieldsProps> = ({
  formType,
  recordType,
  amount,
  category,
  date,
  description,
  onChanged,
}) => {
  const availableCategories =
    formType === RecordFormType.EXPENSE
      ? RecordCategoryOptions.expense
      : recordType === RecordType.TRANSACTION
        ? RecordCategoryOptions.income
        : RecordCategoryOptions.planned;
  const showCategory = formType !== RecordFormType.TRANSFER;

  if (formType === RecordFormType.TRANSFER) {
    // For transfer, set category to 'transfer' by default
    if (category !== ProjectTransactionCategory.TRANSFER) {
      onChanged?.('category', ProjectTransactionCategory.TRANSFER);
    }
  }

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
          onChange={(e) => onChanged?.('amount', e.target.value)}
        />
      </div>

      {/* Category (hidden for transfer) */}
      {showCategory && (
        <div className="space-y-2">
          <Label htmlFor="category">類別</Label>
          <Select
            value={category}
            onValueChange={(value) => onChanged?.('category', value)}
            required
          >
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
          onChange={(e) => onChanged?.('date', e.target.value)}
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
          onChange={(e) => onChanged?.('description', e.target.value)}
        />
      </div>
    </div>
  );
};
