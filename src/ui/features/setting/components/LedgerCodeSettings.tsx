import React, { useEffect, useRef, useState } from 'react';

import { Edit2, Plus, Power, Shield } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  type SelectFieldOption,
  TextInput,
} from '@/ui/components/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import {
  SETTINGS_LEDGER_TYPE_LABELS,
  SETTINGS_LEDGER_TYPE_ORDER,
  SettingsLedgerCodeLabels,
} from '@/ui/constants/setting/settingsLabels';
import { useLedgerCodeSettings } from '@/ui/features/setting/hooks/useLedgerCodeSettings';
import { type LedgerCodeFormVM } from '@/ui/features/setting/viewmodels/ledgerCodeForm.vm';
import { cn } from '@/ui/utils/cn';

const TYPE_OPTIONS: SelectFieldOption[] = SETTINGS_LEDGER_TYPE_ORDER.map((type) => ({
  value: type,
  label: SETTINGS_LEDGER_TYPE_LABELS[type],
}));

interface AddCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<LedgerCodeFormVM>;
  /** Resolves `true` on success；對話框僅在成功後關閉。 */
  submit: () => Promise<boolean>;
  isSubmitting: boolean;
  error: string;
}

/**
 * 新增自訂科目的 dialog。建立科目是次要流程，收進 dialog 讓科目清單保持第一層
 * （visual-standards：複雜設定預設隱藏）。欄位由 RHF + `form` 套件黏合（ADR-0064）。
 */
const AddCodeDialog: React.FC<AddCodeDialogProps> = ({
  open,
  onOpenChange,
  form,
  submit,
  isSubmitting,
  error,
}) => {
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await submit()) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {SettingsLedgerCodeLabels.addAction}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{SettingsLedgerCodeLabels.dialogTitle}</DialogTitle>
          <DialogDescription>{SettingsLedgerCodeLabels.dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4" noValidate>
            <FormField name="type">
              <FormItem>
                <FormLabel>{SettingsLedgerCodeLabels.typeLabel}</FormLabel>
                <FormControl>
                  <SelectField options={TYPE_OPTIONS} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField name="code">
              <FormItem>
                <FormLabel required>{SettingsLedgerCodeLabels.codeLabel}</FormLabel>
                <FormControl>
                  <TextInput placeholder={SettingsLedgerCodeLabels.codePlaceholder} />
                </FormControl>
                <p className="text-xs leading-snug text-muted-foreground">
                  <span className="font-mono">{SettingsLedgerCodeLabels.codeHelpPrefix}</span>
                  {SettingsLedgerCodeLabels.codeHelpMiddle}
                  <span className="font-mono">{SettingsLedgerCodeLabels.codeHelpDetail}</span>
                  {SettingsLedgerCodeLabels.codeHelpSuffix}
                </p>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField name="label">
              <FormItem>
                <FormLabel required>{SettingsLedgerCodeLabels.labelLabel}</FormLabel>
                <FormControl>
                  <TextInput placeholder={SettingsLedgerCodeLabels.labelPlaceholder} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {SettingsLedgerCodeLabels.cancelAction}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? SettingsLedgerCodeLabels.adding
                  : SettingsLedgerCodeLabels.addAction}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/** Accounting 區段內容：自訂科目代碼的清單與編輯。外框由區段頁面提供。 */
export const LedgerCodeSettings = () => {
  const {
    groupedRows,
    editingCode,
    editValue,
    setEditValue,
    error,
    handleToggleActive,
    startEdit,
    cancelEdit,
    saveEdit,
    ledgerCodeForm,
  } = useLedgerCodeSettings();
  const { form, submit, error: formError, isSubmitting } = ledgerCodeForm;
  const editInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (editingCode) editInputRef.current?.focus();
  }, [editingCode]);

  return (
    <div className="space-y-6">
      {/* 對話框開著時錯誤顯示在對話框內，避免同一訊息同時出現兩處。 */}
      {error && !dialogOpen && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <AddCodeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          submit={submit}
          isSubmitting={isSubmitting}
          error={formError}
        />
      </div>

      <Accordion type="multiple" defaultValue={SETTINGS_LEDGER_TYPE_ORDER}>
        {SETTINGS_LEDGER_TYPE_ORDER.map((type) => {
          const rows = groupedRows[type];
          return (
            <AccordionItem key={type} value={type}>
              <AccordionTrigger>
                {`${SETTINGS_LEDGER_TYPE_LABELS[type]} ${SettingsLedgerCodeLabels.groupSuffix} (${rows.length})`}
              </AccordionTrigger>
              <AccordionContent>
                {rows.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground italic">
                    {SettingsLedgerCodeLabels.emptyGroup}
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {rows.map(({ item, isDetail, parentLabel }) => (
                      <div
                        key={item.code}
                        className={cn(
                          'flex items-center justify-between gap-4 py-3',
                          isDetail && 'pl-6',
                        )}
                      >
                        <div className="min-w-0 space-y-1">
                          {editingCode === item.code ? (
                            <div className="flex items-center gap-2">
                              <TextInput
                                ref={editInputRef}
                                aria-label={SettingsLedgerCodeLabels.editInputLabel}
                                value={editValue}
                                onChange={setEditValue}
                                className="h-8 w-48"
                              />
                              <Button size="sm" onClick={saveEdit}>
                                {SettingsLedgerCodeLabels.saveAction}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                {SettingsLedgerCodeLabels.cancelAction}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {isDetail && parentLabel
                                  ? `${parentLabel} › ${item.label}`
                                  : item.label}
                              </p>
                              {item.isCustom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={SettingsLedgerCodeLabels.editAction}
                                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                                  onClick={() => startEdit(item.code, item.label)}
                                >
                                  <Edit2 size={12} />
                                </Button>
                              )}
                            </div>
                          )}
                          <Badge variant="outline" className="font-mono">
                            {item.code}
                          </Badge>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {!item.isCustom ? (
                            <Badge variant="secondary" className="gap-1 uppercase">
                              <Shield size={10} aria-hidden="true" />
                              {SettingsLedgerCodeLabels.systemBadge}
                            </Badge>
                          ) : (
                            <Button
                              variant={item.isActive ? 'outline' : 'ghost'}
                              size="sm"
                              className={cn(
                                'h-8 gap-1.5',
                                item.isActive
                                  ? 'text-positive hover:text-positive'
                                  : 'text-muted-foreground',
                              )}
                              onClick={() => handleToggleActive(item)}
                            >
                              <Power size={14} aria-hidden="true" />
                              {item.isActive
                                ? SettingsLedgerCodeLabels.activeAction
                                : SettingsLedgerCodeLabels.disabledAction}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
