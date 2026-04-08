import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';

type DynamicCategorySelectorProps = {
  intent: string | null;
  ledgerCode: string | null;
  allLedgerCodes: LedgerCodeItem[];
  onChange: (ledgerCode: string) => void;
};

export function DynamicCategorySelector({
  intent,
  ledgerCode,
  allLedgerCodes,
  onChange,
}: DynamicCategorySelectorProps) {
  const mapping = DEFAULT_INTENT_MAPPINGS.find((m) => m.intent === intent);
  const showSelector = mapping?.debitUserSelect || mapping?.creditUserSelect;
  const prefix = mapping?.debitUserSelect
    ? mapping.allowedDebitPrefix
    : mapping?.allowedCreditPrefix;

  if (!showSelector || !prefix) return null;

  const options = allLedgerCodes.filter((c) => c.code.startsWith(prefix));

  return (
    <div className="space-y-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <Label className="text-xs text-slate-500 uppercase tracking-wider font-bold">
        屬性 / 詳細類別
      </Label>
      <Select value={ledgerCode ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="bg-white">
          <SelectValue placeholder="選擇具體項目..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.code} value={opt.code}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
