import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RecordFormType, type RecordFormData } from '@/domains/record/types';

interface TypeToggleProps {
  type: RecordFormType;
  onChanged?: <K extends keyof RecordFormData>(name: K, value: RecordFormData[K]) => void;
}

export const TypeToggle: React.FC<TypeToggleProps> = ({ type, onChanged }) => {
  return (
    <div className="space-y-2">
      <Label>Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === RecordFormType.EXPENSE ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', RecordFormType.EXPENSE);
          }}
          className={`flex-1 ${
            type === RecordFormType.EXPENSE
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
              : ''
          }`}
        >
          支出
        </Button>
        <Button
          type="button"
          variant={type === RecordFormType.INCOME ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', RecordFormType.INCOME);
          }}
          className={`flex-1 ${
            type === RecordFormType.INCOME
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
              : ''
          }`}
        >
          收入
        </Button>
        <Button
          type="button"
          variant={type === RecordFormType.TRANSFER ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', RecordFormType.TRANSFER);
          }}
          className={`flex-1 ${
            type === RecordFormType.TRANSFER
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
              : ''
          }`}
        >
          轉帳
        </Button>
      </div>
    </div>
  );
};
