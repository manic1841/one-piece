import React, { useState } from 'react';

import { Plus, X } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { FormItem, TextInput } from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { SettingsWhitelistLabels } from '@/ui/constants/setting/settingsLabels';

interface EmailWhitelistUIProps {
  whitelist: string[];
  loading: boolean;
  saving: boolean;
  error: string;
  onAdd: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** System 區段內容：全域 email 白名單。外框由區段頁面提供。 */
const EmailWhitelistUI: React.FC<EmailWhitelistUIProps> = ({
  whitelist,
  loading,
  saving,
  error: propError,
  onAdd,
  onRemove,
}) => {
  const { confirm } = useConfirm();
  const [newEmail, setNewEmail] = useState('');
  const [localError, setLocalError] = useState('');

  const error = propError || localError;

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setLocalError(SettingsWhitelistLabels.errorEmailRequired);
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setLocalError(SettingsWhitelistLabels.errorEmailInvalid);
      return;
    }
    if (whitelist.includes(email)) {
      setLocalError(SettingsWhitelistLabels.errorEmailDuplicate);
      return;
    }

    try {
      await onAdd(email);
      setNewEmail('');
    } catch {
      // Error handled by parent hook
    }
  };

  const handleRemoveEmail = async (email: string) => {
    const confirmed = await confirm({
      title: SettingsWhitelistLabels.removeConfirmTitle,
      context: email,
      consequence: SettingsWhitelistLabels.removeConfirmConsequence,
      confirmLabel: SettingsWhitelistLabels.removeConfirmLabel,
    });
    if (!confirmed) return;

    try {
      await onRemove(email);
    } catch {
      // Error handled by parent hook
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{SettingsWhitelistLabels.description}</p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleAddEmail} noValidate className="space-y-2">
        <FormItem>
          <Label htmlFor="new-email">{SettingsWhitelistLabels.addLabel}</Label>
          <div className="flex gap-2">
            <TextInput
              id="new-email"
              type="email"
              value={newEmail}
              onChange={setNewEmail}
              placeholder={SettingsWhitelistLabels.emailPlaceholder}
              disabled={saving}
              className="flex-1"
            />
            <Button type="submit" disabled={saving}>
              <Plus size={16} aria-hidden="true" />
              {SettingsWhitelistLabels.addAction}
            </Button>
          </div>
        </FormItem>
      </form>

      <ListSectionHeader title={SettingsWhitelistLabels.listTitle} count={whitelist.length} />
      {loading ? (
        <p className="text-sm text-muted-foreground">{SettingsWhitelistLabels.loading}</p>
      ) : whitelist.length === 0 ? (
        <EmptyState
          title={SettingsWhitelistLabels.emptyTitle}
          description={SettingsWhitelistLabels.emptyDescription}
        />
      ) : (
        <div className="divide-y divide-border">
          {whitelist.map((email) => (
            <div key={email} className="flex items-center justify-between gap-4 py-3">
              <span className="truncate font-mono text-sm text-foreground">{email}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${SettingsWhitelistLabels.removeAction} ${email}`}
                onClick={() => void handleRemoveEmail(email)}
                disabled={saving}
                className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailWhitelistUI;
