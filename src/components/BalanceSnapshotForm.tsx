import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Account, type BalanceSnapshot } from '../types';
import { accountService } from '../services/accountService';

interface BalanceSnapshotFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (snapshot: Omit<BalanceSnapshot, 'id' | 'recordedAt'>) => Promise<void>;
    accounts: Account[];
    householdId: string;
    userEmail: string;
}

const BalanceSnapshotForm: React.FC<BalanceSnapshotFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    accounts,
    householdId,
    userEmail
}) => {
    const currentDate = new Date();
    const [accountId, setAccountId] = useState('');
    const [year, setYear] = useState(currentDate.getFullYear());
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previousBalance, setPreviousBalance] = useState<number | null>(null);

    useEffect(() => {
        if (accountId && year && month) {
            loadPreviousBalance();
        }
    }, [accountId, year, month]);

    const loadPreviousBalance = async () => {
        if (!accountId) return;

        try {
            // Get previous month's balance
            let prevYear = year;
            let prevMonth = month - 1;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear = year - 1;
            }

            const snapshots = await accountService.getBalanceSnapshots(accountId, prevYear, prevMonth);
            if (snapshots.length > 0) {
                setPreviousBalance(snapshots[0].balance);
            } else {
                setPreviousBalance(null);
            }
        } catch (err) {
            console.error('Failed to load previous balance:', err);
            setPreviousBalance(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!accountId) {
            setError('Please select an account');
            return;
        }

        if (!balance || parseFloat(balance) < 0) {
            setError('Please enter a valid balance');
            return;
        }

        setLoading(true);

        try {
            await onSubmit({
                accountId,
                householdId,
                year,
                month,
                balance: parseFloat(balance),
                recordedBy: userEmail
            });

            // Reset form
            setAccountId('');
            setBalance('');
            setPreviousBalance(null);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to record balance');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedAccount = accounts.find(a => a.id === accountId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Record Balance</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Account Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Account
                        </label>
                        <select
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                        >
                            <option value="">Select an account</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name} ({account.currency})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year & Month */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Year
                            </label>
                            <input
                                type="number"
                                required
                                min="2000"
                                max="2100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Month
                            </label>
                            <select
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{m}月</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Previous Balance Reference */}
                    {previousBalance !== null && selectedAccount && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700">
                                Previous month's balance: <span className="font-semibold">
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: selectedAccount.currency
                                    }).format(previousBalance)}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Balance */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Balance {selectedAccount && `(${selectedAccount.currency})`}
                        </label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="0.00"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BalanceSnapshotForm;
