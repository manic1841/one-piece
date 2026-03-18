import React from 'react';

import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { type Portfolio, type PortfolioSnapshotFormData } from '@/domains/portfolio/types';

import { usePortfolioSnapshotForm } from './hooks/usePortfolioSnapshotForm';
import { AccountSnapshotList } from './snapshot/AccountSnapshotList';
import { CashFlowInput } from './snapshot/CashFlowInput';
import { PerformancePreview } from './snapshot/PerformancePreview';
import { PeriodSelection } from './snapshot/PeriodSelection';

interface PortfolioSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioSnapshotFormData) => Promise<void>;
  portfolio: Portfolio;
  householdId: string;
}

const PortfolioSnapshotForm: React.FC<PortfolioSnapshotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  portfolio,
  householdId,
}) => {
  const {
    year,
    setYear,
    month,
    setMonth,
    deposits,
    setDeposits,
    withdrawals,
    setWithdrawals,
    loading,
    error,
    accounts,
    accountSnapshots,
    totalValue,
    handleSubmit,
    isMissingSnapshots,
    preview,
  } = usePortfolioSnapshotForm(householdId, portfolio, onClose, onSubmit);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Portfolio Settlement - {portfolio.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

          <PeriodSelection year={year} setYear={setYear} month={month} setMonth={setMonth} />

          <AccountSnapshotList
            accounts={accounts}
            accountSnapshots={accountSnapshots}
            totalValue={totalValue}
          />

          <CashFlowInput
            deposits={deposits}
            setDeposits={setDeposits}
            withdrawals={withdrawals}
            setWithdrawals={setWithdrawals}
          />

          <PerformancePreview preview={preview} isMissingSnapshots={isMissingSnapshots} />

          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isMissingSnapshots}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processing...' : 'Record Settlement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioSnapshotForm;
