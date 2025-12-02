import React, { useState } from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { type SettlementPreview, settlementService } from '../../services/settlementService';
import { formatCurrency } from '../../utils/formatUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MonthlySettlementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  projects: Array<{ id: string; name: string; icon: string; color: string }>;
  onSuccess: () => void;
}

type DialogStatus = 'month-selection' | 'preview' | 'processing' | 'done';

const MonthlySettlementDialog: React.FC<MonthlySettlementDialogProps> = ({
  isOpen,
  onClose,
  householdId,
  projects,
  onSuccess,
}) => {
  const currentDate = new Date();
  const [status, setStatus] = useState<DialogStatus>('month-selection');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [settlements, setSettlements] = useState<SettlementPreview[]>([]);
  const [error, setError] = useState('');

  const handleMonthSelect = async () => {
    setError('');
    setStatus('processing');

    try {
      const previews = await settlementService.calculateAllSettlements(
        householdId,
        projects,
        year,
        month,
      );
      setSettlements(previews);
      setStatus('preview');
    } catch (err) {
      console.error('Error calculating settlements:', err);
      setError('Failed to calculate settlements. Please try again.');
      setStatus('month-selection');
    }
  };

  const handleConfirmSettlement = async () => {
    setError('');
    setStatus('processing');

    try {
      const result = await settlementService.batchCreateSettlement(
        householdId,
        year,
        month,
        settlements,
      );

      if (result.success) {
        setStatus('done');
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(result.errors.join('. '));
        setStatus('preview');
      }
    } catch (err) {
      console.error('Error creating settlements:', err);
      setError('Failed to create settlements. Please try again.');
      setStatus('preview');
    }
  };

  const handleClose = () => {
    setStatus('month-selection');
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setSettlements([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <DialogTitle>Monthly Settlement</DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {status === 'month-selection' && (
            <div className="space-y-4 py-4">
              <p className="text-muted-foreground">
                Select the month you want to settle. This will create snapshots for all active
                projects.
              </p>

              {/* Year & Month */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="year">年份</Label>
                  <Input
                    id="year"
                    type="number"
                    required
                    min="2000"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">月份</Label>
                  <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {m}月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4 py-4">
              <Card className="bg-blue-50 border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Settlement Preview for {year}-{String(month).padStart(2, '0')}</strong>
                  <br />
                  Review the calculations below. Click "Confirm Settlement" to create snapshots for
                  all projects.
                </p>
              </Card>

              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead className="text-right">Last Balance</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((settlement) => (
                    <TableRow key={settlement.projectId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${settlement.projectColor}`}
                          >
                            {settlement.projectIcon}
                          </span>
                          <span className="font-medium">{settlement.projectName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {settlement.lastSnapshot
                          ? `${settlement.lastSnapshot.year}-${String(settlement.lastSnapshot.month).padStart(2, '0')}: ${formatCurrency(settlement.lastSnapshot.balance)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(settlement.openingBalance)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        +{formatCurrency(settlement.income)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        -{formatCurrency(settlement.expense)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(settlement.closingBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground">Processing settlement...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">Settlement Complete!</p>
              <p className="text-muted-foreground mt-2">
                All snapshots have been created successfully.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-6">
          {status === 'month-selection' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleMonthSelect}>
                Next
              </Button>
            </>
          )}

          {status === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStatus('month-selection')}>
                Back
              </Button>
              <Button onClick={handleConfirmSettlement} className="bg-green-600 hover:bg-green-700">
                Confirm Settlement
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlySettlementDialog;
