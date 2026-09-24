import React from 'react';

import { Database, Download, ShieldAlert } from 'lucide-react';

import { type Household } from '@/ui/features/setting/viewmodels/setting.vm';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { type WatchListPickerData } from '@/ui/features/setting/hooks/useWatchListPickerData';

import { AllocationTemplateSettings } from './AllocationTemplateSettings';
import EmailWhitelistUI from './EmailWhitelistUI';
import { LedgerCodeSettings } from './LedgerCodeSettings';
import MemberManagementUI from './MemberManagementUI';
import WatchListSettings from './WatchListSettings';

interface SettingsUIProps {
  isAdmin: boolean;
  isHouseholdOwnerOrAdmin: boolean;
  isSettingsAuthorized: boolean;
  loading: boolean;
  // Whitelist props
  whitelist: string[];
  whitelistLoading: boolean;
  whitelistSaving: boolean;
  whitelistError: string;
  addWhitelistEmail: (email: string) => Promise<void>;
  removeWhitelistEmail: (email: string) => Promise<void>;
  // Member management props
  household: Household | null;
  memberProfiles: Record<string, { email: string; displayName: string }>;
  memberLoading: boolean;
  memberError: string;
  memberSuccess: string;
  addHouseholdMember: (email: string, role: string) => Promise<void>;
  removeHouseholdMember: (uid: string) => Promise<void>;
  updateMemberRole: (uid: string, newRole: string) => Promise<void>;
  currentUid: string;
  backupLoading: boolean;
  backupError: string;
  backupSuccess: string;
  exportHouseholdBackup: () => Promise<void>;
  restoreLoading: boolean;
  restoreError: string;
  restoreSuccess: string;
  restoreHouseholdBackup: (file: File) => Promise<void>;
  // Watch list props
  watchListPickerOptions: WatchListPickerData;
}

const SettingsUI: React.FC<SettingsUIProps> = (props) => {
  const {
    isAdmin,
    isHouseholdOwnerOrAdmin,
    isSettingsAuthorized,
    loading,
    whitelist,
    whitelistLoading,
    whitelistSaving,
    whitelistError,
    addWhitelistEmail,
    removeWhitelistEmail,
    household,
    memberProfiles,
    memberLoading,
    memberError,
    memberSuccess,
    addHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
    currentUid,
    backupLoading,
    backupError,
    backupSuccess,
    exportHouseholdBackup,
    restoreLoading,
    restoreError,
    restoreSuccess,
    restoreHouseholdBackup,
    watchListPickerOptions,
  } = props;

  const restoreInputRef = React.useRef<HTMLInputElement>(null);
  const [isRestoreConfirmOpen, setRestoreConfirmOpen] = React.useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = React.useState<File | null>(null);

  const handleRestoreClick = () => {
    if (restoreLoading) return;
    restoreInputRef.current?.click();
  };

  const handleRestoreFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingRestoreFile(file);
    setRestoreConfirmOpen(true);
    event.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) {
      setRestoreConfirmOpen(false);
      return;
    }

    await restoreHouseholdBackup(pendingRestoreFile);
    setPendingRestoreFile(null);
    setRestoreConfirmOpen(false);
  };

  const handleCancelRestore = () => {
    if (restoreLoading) return;
    setPendingRestoreFile(null);
    setRestoreConfirmOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSettingsAuthorized) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <Card>
          <CardContent className="p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/15 rounded-full mb-4">
                <ShieldAlert size={32} className="text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                Only administrators or household owners/admins can access the Settings page.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" description="Manage your household and system settings" />

      {isAdmin && (
        <section className="space-y-4">
          <div className="bg-elevated rounded-lg border border-border p-4 text-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-card/20 rounded-full flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="font-semibold">System Administrator Access</p>
                <p className="text-sm opacity-90">You have full system privileges</p>
              </div>
            </div>
          </div>
          <EmailWhitelistUI
            whitelist={whitelist}
            loading={whitelistLoading}
            saving={whitelistSaving}
            error={whitelistError}
            onAdd={addWhitelistEmail}
            onRemove={removeWhitelistEmail}
          />
        </section>
      )}

      {isHouseholdOwnerOrAdmin && (
        <section className="space-y-4">
          <MemberManagementUI
            household={household}
            memberProfiles={memberProfiles}
            loading={memberLoading}
            error={memberError}
            success={memberSuccess}
            onAdd={addHouseholdMember}
            onRemove={removeHouseholdMember}
            onUpdateRole={updateMemberRole}
            currentUid={currentUid}
          />

          <WatchListSettings pickerOptions={watchListPickerOptions} />

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Database size={18} />
                    <span>備份資料庫</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    匯出此 household 的完整資料（包含所有 snapshots）為 JSON 檔。
                  </p>
                </div>
                <Button onClick={exportHouseholdBackup} disabled={backupLoading}>
                  <Download size={16} className="mr-2" />
                  {backupLoading ? '匯出中...' : '備份資料庫'}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">一鍵還原備份</p>
                  <p className="text-xs text-muted-foreground">
                    選擇備份檔後立即還原，會覆蓋目前 household 的既有資料。
                  </p>
                </div>
                <>
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleRestoreFileChange}
                  />
                  <Button
                    variant="destructive"
                    onClick={handleRestoreClick}
                    disabled={restoreLoading}
                  >
                    {restoreLoading ? '還原中...' : '還原備份'}
                  </Button>
                </>
              </div>

              {backupError && <p className="text-sm text-destructive">{backupError}</p>}
              {backupSuccess && <p className="text-sm text-positive">{backupSuccess}</p>}
              {restoreError && <p className="text-sm text-destructive">{restoreError}</p>}
              {restoreSuccess && <p className="text-sm text-positive">{restoreSuccess}</p>}
            </CardContent>
          </Card>

          <LedgerCodeSettings />
          <AllocationTemplateSettings />
        </section>
      )}

      <Dialog open={isRestoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認還原備份</DialogTitle>
            <DialogDescription>
              此操作會先刪除目前 household 既有資料，再以備份檔完整覆蓋。此動作無法復原。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-warning/20 bg-warning/5 p-3 text-sm text-warning">
            {pendingRestoreFile ? `即將還原檔案：${pendingRestoreFile.name}` : '尚未選擇備份檔案。'}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRestore} disabled={restoreLoading}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmRestore} disabled={restoreLoading}>
              {restoreLoading ? '還原中...' : '確認還原'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsUI;
