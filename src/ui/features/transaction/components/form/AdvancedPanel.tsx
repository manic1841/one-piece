import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  TextArea,
} from '@/ui/components/form';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { type TransactionFormProjectOption } from '@/ui/features/transaction/types/transaction';

import { AmountDateFields } from './AmountDateFields';
import { FormChipGroup } from './ChipGroup';

type AdvancedPanelProps = {
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.name}`,
  }));

const INTENT_TYPE_OPTIONS = [{ value: 'MANUAL', label: 'MANUAL' }];

export function AdvancedPanel({ projects, allLedgerCodes }: AdvancedPanelProps) {
  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5">
      <AmountDateFields />
      <div className="grid gap-4 md:grid-cols-2">
        <FormField name="intentType">
          <FormItem>
            <FormLabel>Intent Type</FormLabel>
            <FormControl>
              <SelectField options={INTENT_TYPE_OPTIONS} placeholder="選擇進階意圖" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField name="projectId">
          <FormItem>
            <FormLabel>專案 (選填)</FormLabel>
            <FormChipGroup options={toProjectOptions(projects)} tone="neutral" />
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
      <FormField name="ledgerCode">
        <FormItem>
          <FormLabel required>科目 / 類別</FormLabel>
          <FormControl>
            <SelectField
              options={allLedgerCodes.map((option) => ({
                value: option.code,
                label: `${option.label} (${option.code})`,
              }))}
              placeholder="選擇會計科目..."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField name="description">
        <FormItem>
          <FormLabel>說明</FormLabel>
          <FormControl>
            <TextArea placeholder="補充分錄背景" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
