import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type AccountSnapshot } from '../../../schemas';

interface EditSnapshotDialogProps {
  snapshot: AccountSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: { amount: number; year: number; month: number }) => Promise<void>;
}

export const EditSnapshotDialog: React.FC<EditSnapshotDialogProps> = ({
  snapshot,
  open,
  onOpenChange,
  onSave,
}) => {
  const [editAmount, setEditAmount] = useState(snapshot?.amount.toString() || '');
  const [editYear, setEditYear] = useState(snapshot?.year.toString() || '');
  const [editMonth, setEditMonth] = useState(snapshot?.month.toString() || '');

  const handleSave = async () => {
    if (!snapshot) return;
    await onSave(snapshot.id, {
      amount: parseFloat(editAmount),
      year: parseInt(editYear),
      month: parseInt(editMonth),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={editYear}
              onChange={(e) => setEditYear(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="number"
              min="1"
              max="12"
              value={editMonth}
              onChange={(e) => setEditMonth(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
