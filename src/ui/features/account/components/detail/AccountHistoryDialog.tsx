import React, { useState } from 'react';

import { type Account } from '@/domains/account/types/account';
import { type AccountSnapshot } from '@/domains/account/schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccountSnapshots } from '@/ui/features/account/hooks/useAccountSnapshots';
import { useAuth } from '@/infra/contexts/useAuth';

import { AccountSnapshotTable } from './AccountSnapshotTable';
import AccountSnapshotEditor from '../../pages/AccountSnapshotEditor';

interface AccountHistoryDialogProps {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}

export const AccountHistoryDialog: React.FC<AccountHistoryDialogProps> = ({
  account,
  isOpen,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';
  const { snapshots, reload } = useAccountSnapshots(householdId, account.id);
  const { deleteSnapshot } = useAccountCmds(householdId);

  const [editingSnapshot, setEditingSnapshot] = useState<AccountSnapshot | null>(null);

  const handleDelete = async (snapshotId: string) => {
    if (window.confirm('確定要刪除這筆歷史結算紀錄嗎？')) {
      await deleteSnapshot(account.id, snapshotId);
      reload();
    }
  };

  const handleEdit = (snapshot: AccountSnapshot) => {
    setEditingSnapshot(snapshot);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              歷史結算紀錄 - {account.name} ({account.currency})
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <AccountSnapshotTable
              snapshots={snapshots}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </DialogContent>
      </Dialog>

      {editingSnapshot && (
        <AccountSnapshotEditor
          account={account}
          isOpen={true}
          snapshot={{ ...editingSnapshot, accountId: account.id }}
          onClose={() => {
            setEditingSnapshot(null);
            reload();
          }}
        />
      )}
    </>
  );
};
