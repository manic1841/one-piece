import React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { Radio, RadioGroup } from '@/ui/components/RadioGroup';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  TextArea,
  TextInput,
} from '@/ui/components/form';
import { CurrencyInput } from '@/ui/components/form/CurrencyInput';
import { DateInput } from '@/ui/components/form/DateInput';
import { SelectField } from '@/ui/components/form/Select';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Switch } from '@/ui/components/ui/switch';

import { GalleryCaption, GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const FieldDemo: React.FC<{ label: string; error?: boolean; children: React.ReactNode }> = ({
  label,
  error,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
    {children}
    {error && <StatusGlyph type="error" label="Balance does not match ledger" />}
  </div>
);

const InputSection: React.FC = () => (
  <GallerySection number="13" title="Input & Form Field">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <FieldDemo label="ACCOUNT NAME">
        <TextInput defaultValue="Main Bank Account" aria-label="Account name" />
      </FieldDemo>
      <FieldDemo label="AMOUNT">
        <CurrencyInput prefix="NT$" defaultValue={125420} aria-label="Amount" />
      </FieldDemo>
      <FieldDemo label="ENDING BALANCE *" error>
        <CurrencyInput prefix="NT$" defaultValue={124200} error aria-label="Ending balance" />
      </FieldDemo>
      <FieldDemo label="DATE">
        <DateInput defaultValue="2026-10-02" aria-label="Date" />
      </FieldDemo>
    </div>
  </GallerySection>
);

const galleryFormSchema = z.object({
  accountName: z.string().min(1, 'Account name is required.'),
  endingBalance: z.string().min(1, 'Ending balance is required.'),
  note: z.string(),
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

const FormValidationSection: React.FC = () => {
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
    defaultValues: {
      accountName: 'Main Bank',
      endingBalance: '',
      note: 'Rolled forward from the previous period.',
    },
  });

  // Trigger once so the invalid field shows its error deterministically.
  React.useEffect(() => {
    void form.trigger();
  }, [form]);

  return (
    <GallerySection number="14" title="Form Validation States">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GalleryModule label="DEFAULT · REQUIRED · ERROR · DESCRIPTION">
          <Form {...form}>
            <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
              <FormField name="accountName">
                <FormItem>
                  <FormLabel required>ACCOUNT NAME</FormLabel>
                  <FormControl>
                    <TextInput placeholder="e.g. Main Bank" />
                  </FormControl>
                  <FormDescription>The display name shown across every report.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="endingBalance">
                <FormItem>
                  <FormLabel required>ENDING BALANCE</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="note">
                <FormItem>
                  <FormLabel>NOTE</FormLabel>
                  <FormControl>
                    <TextArea />
                  </FormControl>
                  <FormDescription>Optional context kept with the balance.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>
            </form>
          </Form>
        </GalleryModule>
        <GalleryModule label="CONTRACT">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">FormItem</span> is the only place label / control /
              error vertical spacing is decided.
            </li>
            <li>
              <span className="text-foreground">Required</span> appends a destructive{' '}
              <span className="text-destructive">*</span>; no 「必填」 text.
            </li>
            <li>
              <span className="text-foreground">FormMessage</span> renders only the first error and
              turns FormLabel destructive.
            </li>
            <li>
              <span className="text-foreground">FormControl</span> injects value / onChange / ref /
              aria-* into an RHF-free input.
            </li>
          </ul>
        </GalleryModule>
      </div>
    </GallerySection>
  );
};

const SelectSection: React.FC = () => (
  <GallerySection number="15" title="Select & Dropdown">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <FieldDemo label="ACCOUNT">
        <SelectField
          aria-label="Account"
          options={[
            { value: 'main', label: 'Main Bank' },
            { value: 'brokerage', label: 'Brokerage' },
            { value: 'credit', label: 'Credit Card' },
          ]}
        />
      </FieldDemo>
      <FieldDemo label="CATEGORY">
        <SelectField
          aria-label="Category"
          options={[
            { value: 'investment', label: 'Investment' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
        />
      </FieldDemo>
      <FieldDemo label="PROJECT">
        <SelectField
          aria-label="Project"
          options={[
            { value: 'retirement', label: 'Retirement' },
            { value: 'home', label: 'Home' },
            { value: 'wedding', label: 'Wedding' },
          ]}
        />
      </FieldDemo>
    </div>
  </GallerySection>
);

const PeriodSection: React.FC = () => (
  <GallerySection number="16" title="Period Picker">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="REPORT PERIOD">
        <YearMonthPicker year={2026} month={9} onYearChange={() => {}} onMonthChange={() => {}} />
      </GalleryModule>
      <GalleryModule label="TRANSACTION DATE">
        <Button variant="outline">OCT 2, 2026</Button>
      </GalleryModule>
    </div>
  </GallerySection>
);

const InlineEditableSection: React.FC = () => (
  <GallerySection number="17" title="Inline Editable Title">
    <GalleryModule label="IN-PLACE RENAME">
      <InlineEditableTitle value="Retirement Fund" onSave={() => {}} />
    </GalleryModule>
    <GalleryCaption>就地改名：Enter 儲存、Escape 取消、空值不儲存。</GalleryCaption>
  </GallerySection>
);

const SwitchSection: React.FC = () => {
  const [reconcile, setReconcile] = React.useState(true);
  const [notify, setNotify] = React.useState(false);

  return (
    <GallerySection number="18" title="Toggle / Switch">
      <GalleryModule label="SETTINGS">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Automatic reconciliation</span>
            <Switch
              checked={reconcile}
              onCheckedChange={setReconcile}
              aria-label="Automatic reconciliation"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Notifications</span>
            <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notifications" />
          </div>
        </div>
      </GalleryModule>
    </GallerySection>
  );
};

const CheckboxSection: React.FC = () => {
  const [etf, setEtf] = React.useState(true);
  const [dividend, setDividend] = React.useState(false);
  const toBoolean = (checked: boolean | 'indeterminate') => checked === true;

  return (
    <GallerySection number="19" title="CheckBox / Selection">
      <GalleryModule label="DATA SELECTION">
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={etf}
              onCheckedChange={(checked) => setEtf(toBoolean(checked))}
              aria-label="ETF Purchase"
            />
            ETF Purchase
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={dividend}
              onCheckedChange={(checked) => setDividend(toBoolean(checked))}
              aria-label="Dividend Received"
            />
            Dividend Received
          </label>
        </div>
      </GalleryModule>
    </GallerySection>
  );
};

const SelectionSection: React.FC = () => {
  const [cadence, setCadence] = React.useState('monthly');

  return (
    <GallerySection number="20" title="Radio / Single Selection">
      <GalleryModule label="CADENCE">
        <RadioGroup aria-label="Cadence" name="cadence" value={cadence} onValueChange={setCadence}>
          <Radio value="monthly" label="Monthly" />
          <Radio value="quarterly" label="Quarterly" />
          <Radio value="yearly" label="Yearly" />
        </RadioGroup>
      </GalleryModule>
    </GallerySection>
  );
};

export const GalleryFormsBody: React.FC = () => (
  <>
    <GalleryGroup label="FORMS & INPUT" />
    <InputSection />
    <FormValidationSection />
    <SelectSection />
    <PeriodSection />
    <InlineEditableSection />
    <SwitchSection />
    <CheckboxSection />
    <SelectionSection />
  </>
);
