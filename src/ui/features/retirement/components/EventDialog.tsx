import { Plus, Trash2 } from 'lucide-react';

import {
  CalculationMode,
  type RetirementIncomeSource,
  type RetirementOneTimeEvent,
} from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

import { useRetirementEventDialog } from '../hooks/useRetirementEventDialog';

interface EventDialogProps {
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementOneTimeEvent;
  trigger?: React.ReactNode;
  incomes?: RetirementIncomeSource[];
}

export default function EventDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
  incomes = [],
}: EventDialogProps) {
  const {
    isOpen,
    setIsOpen,
    name,
    setName,
    type,
    setType,
    phases,
    handleAddPhase,
    handleRemovePhase,
    handleUpdatePhase,
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
      <DialogContent
        aria-describedby={undefined}
        className="flex max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{initialData ? 'Edit One-Time Event' : 'Add One-Time Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4">
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

            <div className="space-y-3">
              <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between bg-background/95 px-1 py-1 backdrop-blur-sm">
                <Label>Phases *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPhase}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Phase
                </Button>
              </div>

              {phases.map((phase, index) => (
                <div key={index} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={phase.name}
                      onChange={(e) => handleUpdatePhase(index, { name: e.target.value })}
                      placeholder="Phase name"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={phases.length <= 1}
                      onClick={() => handleRemovePhase(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Year</Label>
                      <Input
                        type="number"
                        value={phase.startYear}
                        min={currentYear}
                        onChange={(e) => handleUpdatePhase(index, { startYear: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>End Year</Label>
                      <Input
                        type="number"
                        value={phase.endYear}
                        min={phase.startYear || String(currentYear)}
                        onChange={(e) => handleUpdatePhase(index, { endYear: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Mode</Label>
                    <Select
                      value={phase.mode}
                      onValueChange={(
                        value: (typeof CalculationMode)[keyof typeof CalculationMode],
                      ) => handleUpdatePhase(index, { mode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CalculationMode.FIXED}>Fixed amount</SelectItem>
                        <SelectItem value={CalculationMode.SALARY_PERCENTAGE}>
                          Salary percentage
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {phase.mode === CalculationMode.FIXED ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={phase.amount || ''}
                          onChange={(e) => handleUpdatePhase(index, { amount: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Growth Rate (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={phase.growthRate || '0'}
                          onChange={(e) => handleUpdatePhase(index, { growthRate: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Salary %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={phase.percentage || '0'}
                          onChange={(e) => handleUpdatePhase(index, { percentage: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Linked Income (optional)</Label>
                        <Select
                          value={phase.linkedIncomeId || '__all_salary__'}
                          onValueChange={(value) =>
                            handleUpdatePhase(index, {
                              linkedIncomeId: value === '__all_salary__' ? '' : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all_salary__">All salary income</SelectItem>
                            {incomes.map((income) => (
                              <SelectItem key={income.id} value={income.id}>
                                {income.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
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
