import React from 'react';

import { AlertCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Settlement (結算)</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 py-4 border-b">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Year</label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Month</label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
