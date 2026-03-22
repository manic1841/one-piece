import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

type AmountDateFieldsProps = {
  amountId: string;
  dateId: string;
  amount: string;
  date: string;
  amountLabel?: string;
  dateLabel?: string;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
};

export function AmountDateFields(props: AmountDateFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={props.amountId}>{props.amountLabel ?? '金額'}</Label>
        <Input
          id={props.amountId}
          type="number"
          min="0.01"
          step="0.01"
          value={props.amount}
          onChange={(event) => props.onAmountChange(event.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={props.dateId}>{props.dateLabel ?? '日期'}</Label>
        <Input
          id={props.dateId}
          type="date"
          value={props.date}
          onChange={(event) => props.onDateChange(event.target.value)}
        />
      </div>
    </div>
  );
}
