import React from 'react';

import { X } from 'lucide-react';

import { Avatar } from '@/ui/components/Avatar';
import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
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
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import {
  SETTINGS_MEMBER_ROLE_LABELS,
  SettingsHouseholdLabels,
} from '@/ui/constants/setting/settingsLabels';
import { useMemberForm } from '@/ui/features/setting/hooks/useMemberForm';
import { type Household, RoleEnum } from '@/ui/features/setting/viewmodels/setting.vm';

interface MemberManagementUIProps {
  household: Household | null;
  memberProfiles: Record<string, { email: string; displayName: string }>;
  loading: boolean;
  error: string;
  success: string;
  onAdd: (email: string, role: string) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
  onUpdateRole: (uid: string, newRole: string) => Promise<void>;
  /** 目前登入者的 uid——本元件只需要做自我列比對，不需要整個身分物件。 */
  currentUid: string;
}

const ROLE_OPTIONS: SelectFieldOption[] = (
  [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.MEMBER, RoleEnum.GUEST] as const
).map((role) => ({ value: role, label: SETTINGS_MEMBER_ROLE_LABELS[role] }));

/** Household 區段內容：新增成員表單 + 成員列。外框由區段頁面提供。 */
const MemberManagementUI: React.FC<MemberManagementUIProps> = ({
  household,
  memberProfiles,
  loading,
  error,
  success,
  onAdd,
  onRemove,
  onUpdateRole,
  currentUid,
}) => {
  const { confirm } = useConfirm();
  const { form, submit, isSubmitting } = useMemberForm({ onAdd });

  const handleRemoveMember = async (uid: string, email: string) => {
    const confirmed = await confirm({
      title: SettingsHouseholdLabels.removeConfirmTitle,
      context: email,
      consequence: SettingsHouseholdLabels.removeConfirmConsequence,
      confirmLabel: SettingsHouseholdLabels.removeConfirmLabel,
    });
    if (!confirmed) return;
    await onRemove(uid);
  };

  if (!household) return null;

  const memberEntries = Object.entries(household.members);

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <ListSectionHeader title={SettingsHouseholdLabels.addTitle} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField name="email">
              <FormItem>
                <FormLabel required>{SettingsHouseholdLabels.emailLabel}</FormLabel>
                <FormControl>
                  <TextInput type="email" placeholder={SettingsHouseholdLabels.emailPlaceholder} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField name="role">
              <FormItem>
                <FormLabel>{SettingsHouseholdLabels.roleLabel}</FormLabel>
                <FormControl>
                  <SelectField options={ROLE_OPTIONS} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
                {loading ? SettingsHouseholdLabels.adding : SettingsHouseholdLabels.addAction}
              </Button>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription className="text-positive">{success}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>

      <div>
        <ListSectionHeader
          className="mb-4"
          title={SettingsHouseholdLabels.membersTitle}
          count={memberEntries.length}
        />
        <div className="divide-y divide-border">
          {memberEntries.map(([uid, member]) => {
            const profile = memberProfiles[uid];
            const displayName = profile?.displayName || SettingsHouseholdLabels.nameLoading;
            const isSelf = uid === currentUid;

            return (
              <div
                key={uid}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar initials={displayName.charAt(0).toUpperCase()} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {profile?.email || uid}
                    </p>
                  </div>
                  {isSelf && <Badge variant="outline">{SettingsHouseholdLabels.selfBadge}</Badge>}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <SelectField
                    aria-label={SettingsHouseholdLabels.roleFieldLabel}
                    className="w-32"
                    value={member.role}
                    onChange={(value) => void onUpdateRole(uid, value)}
                    options={ROLE_OPTIONS}
                    disabled={isSelf || loading}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${SettingsHouseholdLabels.removeAction} ${profile?.email || uid}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isSelf || loading}
                    onClick={() => void handleRemoveMember(uid, profile?.email || uid)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MemberManagementUI;
