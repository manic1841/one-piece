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

import { AmountField, DateField } from './AmountFields';
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

/**
 * Advanced panel: amount (hero) → ledger code (the one required decision) →
 * date → project → note. `intentType` is always `MANUAL`, so it has no control of
 * its own; the schema pins the literal. The project stays single-select here —
 * a manual entry cannot carry an allocation document, so a split would have
 * nowhere to land. Re-clicking the selected chip clears it (the field is
 * optional and has no rows to remove).
 */
export function AdvancedPanel({ projects, allLedgerCodes }: AdvancedPanelProps) {
  return (
    <div className="space-y-5">
      <AmountField />

      <FormField name="ledgerCode">
        <FormItem>
          <FormLabel required>科目</FormLabel>
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

      <DateField />

      <FormField name="projectId">
        <FormItem>
          <FormLabel>專案</FormLabel>
          <FormChipGroup aria-label="專案" options={toProjectOptions(projects)} allowDeselect />
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
