import { useState } from 'react';

import { Plus } from 'lucide-react';
import { type FieldValues, type Path, type UseFormReturn, useWatch } from 'react-hook-form';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import {
  AdvancedDisclosure,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  ReadoutField,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';
import {
  RetirementEntryEditorLabels as L,
  RetirementEndConditionOptions,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';

export type RetirementEntryKind = 'income' | 'expense';

/** Minimal field shape the shared editor binds; both entity forms satisfy it. */
interface RetirementEntryFormValues extends FieldValues {
  name: string;
  type?: string;
  currentAnnual?: string | number | null;
  growthRate?: string | number;
  startYear?: string | number;
  endCondition?: string;
  endConditionValue?: string;
}

interface RetirementEntryEditorProps<TFieldValues extends RetirementEntryFormValues> {
  kind: RetirementEntryKind;
  /** RHF form from the entity controller (ADR-0064); the editor only renders. */
  form: UseFormReturn<TFieldValues, unknown, unknown>;
  open: boolean;
  setOpen: (value: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  submitError: string | null;
  /** Derived growth readout (preview). */
  growthText: string;
  planInflationRate: number;
  /** Income: import-derived annual shown read-only (null = scenario-only). */
  currentAnnual?: number | null;
  /** Expense: debt payment locks the annual and hides the end-condition control. */
  isDebtPayment?: boolean;
  isEdit: boolean;
  importSourceText?: string | null;
  trigger?: React.ReactNode;
}

/**
 * 收入／支出共用的側邊編輯器（spec #301 §2.1）。落點為 `ui/sheet`：行動版全螢幕
 * bottom sheet、桌面版右側面板，皆只用 `DrawerPanel`（不新建 SidePanel）。
 *
 * 兩小分支：Type（收入可編輯／支出隱藏）與 Debt（隱藏結束條件、endYear 唯讀、
 * 隱藏匯入來源）。結束條件語意在此只呈現供選擇；塌縮成 `endYear`／`lifelong`
 * 由 Controller 的 mapper 負責（ADR-0064）。
 */
export function RetirementEntryEditor<TFieldValues extends RetirementEntryFormValues>({
  kind,
  form,
  open,
  setOpen,
  onSubmit,
  loading,
  submitError,
  growthText,
  planInflationRate,
  currentAnnual,
  isDebtPayment = false,
  isEdit,
  importSourceText,
  trigger,
}: RetirementEntryEditorProps<TFieldValues>) {
  const { confirm } = useConfirm();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Read during render so the Proxy subscribes and the handler sees the latest value.
  const isDirty = form.formState.isDirty;

  const endCondition = useWatch({
    control: form.control,
    name: 'endCondition' as Path<TFieldValues>,
  });
  const endConditionValue = useWatch({
    control: form.control,
    name: 'endConditionValue' as Path<TFieldValues>,
  });

  const title = (() => {
    if (kind === 'income') return isEdit ? L.titleIncomeEdit : L.titleIncomeAdd;
    return isEdit ? L.titleExpenseEdit : L.titleExpenseAdd;
  })();

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setAdvancedOpen(false);
      setOpen(true);
      return;
    }
    if (!isDirty) {
      setOpen(false);
      return;
    }
    void confirm({
      title: L.discardTitle,
      context: L.discardContext,
      consequence: L.discardConsequence,
      confirmLabel: L.discardConfirm,
      cancelLabel: L.discardCancel,
      confirmTone: 'destructive',
    }).then((confirmed) => {
      if (confirmed) setOpen(false);
    });
  };

  const defaultTrigger =
    kind === 'income' ? (
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        {L.addIncomeAction}
      </Button>
    ) : (
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        {L.addExpenseAction}
      </Button>
    );

  const showsValueField = endCondition === 'age' || endCondition === 'year';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="h-[100dvh] overflow-y-auto rounded-none sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-w-md sm:rounded-none sm:border-l"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          form.setFocus('name' as Path<TFieldValues>);
        }}
      >
        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex h-full flex-col gap-4 py-2">
            <DrawerPanel
              title={title}
              description={L.description}
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    {L.cancelAction}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? L.savingAction : L.saveAction}
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 pt-4">
                {kind === 'income' ? (
                  <FormField name="type">
                    <FormItem>
                      <FormLabel>{L.typeLabel}</FormLabel>
                      <FormControl>
                        <SelectField
                          options={RetirementIncomeTypeOptions}
                          placeholder={L.typePlaceholder}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                ) : null}

                <FormField name="name">
                  <FormItem>
                    <FormLabel required>{L.nameLabel}</FormLabel>
                    <FormControl>
                      <TextInput placeholder={L.namePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                {kind === 'income' ? (
                  <IncomeAnnualReadout value={currentAnnual ?? null} />
                ) : (
                  <ExpenseAnnualInput isDebtPayment={isDebtPayment} />
                )}

                {!isDebtPayment && importSourceText ? (
                  <ReadoutField label={L.importSource} value={importSourceText} />
                ) : null}

                <ReadoutField label={L.growth} value={growthText} />

                <AdvancedDisclosure
                  label={L.advanced}
                  open={advancedOpen}
                  onOpenChange={setAdvancedOpen}
                >
                  {!isDebtPayment ? (
                    <FormField name="endCondition">
                      <FormItem>
                        <FormLabel>{L.endCondition}</FormLabel>
                        <FormControl>
                          <SelectField options={RetirementEndConditionOptions} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  ) : null}

                  {!isDebtPayment && showsValueField ? (
                    <FormField name="endConditionValue">
                      <FormItem>
                        <FormLabel required>
                          {endCondition === 'age' ? L.endConditionAge : L.endConditionYear}
                        </FormLabel>
                        <FormControl>
                          <NumberInput />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  ) : null}

                  {isDebtPayment ? (
                    <ReadoutField
                      label={L.endYearReadOnly}
                      value={
                        endConditionValue === '' || endConditionValue == null
                          ? '—'
                          : String(endConditionValue)
                      }
                    />
                  ) : null}

                  <FormField name="growthRate">
                    <FormItem>
                      <FormLabel>{L.growthRateLabel}</FormLabel>
                      <FormControl>
                        <NumberInput
                          step="0.1"
                          placeholder={
                            planInflationRate != null
                              ? L.planInflation(planInflationRate)
                              : L.planInflationPlaceholder
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <FormField name="startYear">
                    <FormItem>
                      <FormLabel required>{L.startYear}</FormLabel>
                      <FormControl>
                        <NumberInput />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </AdvancedDisclosure>

                {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
              </div>
            </DrawerPanel>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

/** Income annual is import-derived: shown read-only (with a hint when scenario-only). */
function IncomeAnnualReadout({ value }: { value: number | null }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="entry-current-annual">{L.currentAnnual}</Label>
      {value == null ? (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {L.noValueMarker}
        </div>
      ) : (
        <NumberInput id="entry-current-annual" value={String(value)} readOnly />
      )}
      {value == null ? <p className="text-xs text-muted-foreground">{L.importHint}</p> : null}
    </div>
  );
}

/** Expense annual is editable, except for debt payments (import-derived). */
function ExpenseAnnualInput({ isDebtPayment }: { isDebtPayment: boolean }) {
  return (
    <>
      <FormField name="currentAnnual">
        <FormItem>
          <FormLabel required>{L.currentAnnual}</FormLabel>
          <FormControl>
            <NumberInput readOnly={isDebtPayment} />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      {isDebtPayment ? <p className="text-xs text-muted-foreground">{L.debtDerivedHint}</p> : null}
    </>
  );
}
