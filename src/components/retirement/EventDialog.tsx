import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type RetirementOneTimeEvent } from '@/domains/retirement/types';

import { useRetirementEventDialog } from './useRetirementEventDialog';

interface EventDialogProps {
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementOneTimeEvent;
  trigger?: React.ReactNode;
}

export default function EventDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
}: EventDialogProps) {
  const {
    isOpen,
    setIsOpen,
    name,
    setName,
    year,
    setYear,
    type,
    setType,
    amount,
    setAmount,
    note,
    setNote,
    loading,
    handleSubmit,
  } = useRetirementEventDialog({
    initialData,
    currentYear,
    onSave,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit One-Time Event' : 'Add One-Time Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., House Down Payment"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-year">Year *</Label>
              <Input
                id="event-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min={currentYear}
                required
              />
            </div>

            <div>
              <Label htmlFor="event-type">Type *</Label>
              <Select value={type} onValueChange={(value: 'income' | 'expense') => setType(value)}>
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="event-amount">Amount *</Label>
            <Input
              id="event-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <Label htmlFor="event-note">Note (Optional)</Label>
            <Input
              id="event-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
