import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { type SettlementPreview, settlementService } from '../../services/settlementService';
import { formatCurrency } from '../../utils/formatUtils';

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
  const [status, setStatus] = useState<DialogStatus>('month-selection');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [settlements, setSettlements] = useState<SettlementPreview[]>([]);
  const [error, setError] = useState('');

  const handleMonthSelect = async () => {
    if (!selectedMonth) {
      setError('Please select a month');
      return;
    }

    setError('');
    setStatus('processing');

    try {
      const [year, month] = selectedMonth.split('-').map(Number);
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
    if (!selectedMonth) return;

    setError('');
    setStatus('processing');

    try {
      const [year, month] = selectedMonth.split('-').map(Number);
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
    setSelectedMonth('');
    setSettlements([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  // Get current month as default (format: YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Settlement</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={status === 'processing'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === 'month-selection' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Select the month you want to settle. This will create snapshots for all active
                projects.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Settlement Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  max={currentMonth}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Settlement Preview for {selectedMonth}</strong>
                  <br />
                  Review the calculations below. Click "Confirm Settlement" to create snapshots for
                  all projects.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">
                        Project
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                        Last Balance
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                        Opening
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                        Income
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                        Expense
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">
                        Closing
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((settlement) => (
                      <tr key={settlement.projectId} className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${settlement.projectColor}`}
                            >
                              {settlement.projectIcon}
                            </span>
                            <span className="font-medium text-gray-900">
                              {settlement.projectName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-sm text-gray-600">
                          {settlement.lastSnapshot
                            ? `${settlement.lastSnapshot.year}-${String(settlement.lastSnapshot.month).padStart(2, '0')}: ${formatCurrency(settlement.lastSnapshot.balance)}`
                            : '—'}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(settlement.openingBalance)}
                        </td>
                        <td className="py-3 px-2 text-right text-green-600 font-medium">
                          +{formatCurrency(settlement.income)}
                        </td>
                        <td className="py-3 px-2 text-right text-red-600 font-medium">
                          -{formatCurrency(settlement.expense)}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-gray-900">
                          {formatCurrency(settlement.closingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Processing settlement...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">Settlement Complete!</p>
              <p className="text-gray-600 mt-2">All snapshots have been created successfully.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          {status === 'month-selection' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMonthSelect}
                disabled={!selectedMonth}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </>
          )}

          {status === 'preview' && (
            <>
              <button
                onClick={() => setStatus('month-selection')}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmSettlement}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
              >
                Confirm Settlement
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlySettlementDialog;
