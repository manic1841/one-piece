import React from 'react';

import { AlertCircle, Trash2 } from 'lucide-react';

import { YearMonthPicker } from '@/components/shared/YearMonthPicker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useBatchSnapshotForm } from './useBatchSnapshotForm';

interface BatchSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  userEmail: string;
  onSuccess: () => void;
}

export const BatchSnapshotForm: React.FC<BatchSnapshotFormProps> = ({
  isOpen,
  onClose,
  householdId,
  userEmail,
  onSuccess,
}) => {
  const {
    year,
    setYear,
    month,
    setMonth,
    accountData,
    fetching,
    loading,
    removeAccount,
    updateAmount,
    submit,
  } = useBatchSnapshotForm(householdId, userEmail, onSuccess, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Settlement (結算)</DialogTitle>
        </DialogHeader>

        <div className="py-4 border-b">
          <YearMonthPicker
            year={year}
            month={month}
            onYearChange={(y) => setYear(parseInt(y) || 0)}
            onMonthChange={(m) => setMonth(parseInt(m) || 1)}
          />
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {fetching ? (
            <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
          ) : (
            <div className="space-y-3">
              {accountData.map((item) => {
                const hasSnapshot = !!item.snapshot;
                return (
                  <div
                    key={item.account.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      hasSnapshot ? 'bg-destructive/10 border-destructive/50' : 'bg-card'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.account.name}</div>
                      {hasSnapshot && (
                        <div className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <AlertCircle size={12} />
                          Already has a snapshot for this period
                        </div>
                      )}
                    </div>

                    <div className="w-40 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{item.account.currency}</span>
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) =>
                          updateAmount(item.account.id, parseFloat(e.target.value) || 0)
                        }
                        disabled={hasSnapshot}
                        className={hasSnapshot ? 'opacity-50' : ''}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeAccount(item.account.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                );
              })}
              {accountData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">No accounts to settle.</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={loading || fetching || accountData.every((i) => i.snapshot)}
          >
            {loading ? 'Processing...' : 'Confirm Settlement (確認結算)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
