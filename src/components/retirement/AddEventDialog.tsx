import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { RetirementOneTimeEvent } from '../../schemas/retirementPlan';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AddEventDialogProps {
  onAdd: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  currentYear: number;
}

export default function AddEventDialog({ onAdd, currentYear }: AddEventDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [year, setYear] = useState(currentYear.toString());
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !year || !amount) {
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        name,
        year: parseInt(year),
        type,
        amount: parseFloat(amount),
        note: note || undefined,
      });
      
      // Reset form
      setName('');
      setYear(currentYear.toString());
      setType('expense');
      setAmount('');
      setNote('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Event
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add One-Time Event</DialogTitle>
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
                {loading ? 'Adding...' : 'Add Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
