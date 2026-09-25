import React, { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useAccountSnapshots } from '@/ui/features/account/hooks/useAccountSnapshots';
import { type Account, type AccountSnapshot } from '@/ui/features/account/viewmodels/account.vm';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';

import AccountSnapshotEditor from '../../pages/AccountSnapshotEditor';
import { AccountSnapshotTable } from './AccountSnapshotTable';

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
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId || '';
  const { snapshots, reload } = useAccountSnapshots(householdId, account.id);
  const { deleteSnapshot } = useAccountCmds(householdId);

  const [editingSnapshot, setEditingSnapshot] = useState<AccountSnapshot | null>(null);

  const { confirm } = useConfirm();

  const handleDelete = async (snapshotId: string) => {
    const confirmed = await confirm({
      title: 'Delete this settlement record?',
    });
    if (confirmed) {
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
              currency={account.currency}
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
