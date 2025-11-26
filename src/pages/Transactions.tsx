import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { transactionService } from '../services/transactionService';
import TransactionForm from '../components/TransactionForm';
import { type Transaction } from '../types';
import { Timestamp } from 'firebase/firestore';
import { useCallback } from 'react';
import { toDate } from '../utils/dateUtils';

const Transactions: React.FC = () => {
    const { userProfile, currentUser } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
    const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');


    const loadTransactions = useCallback(async () => {
        if (!userProfile?.householdId) return;

        setLoading(true);
        try {
            const data = await transactionService.getTransactions(userProfile.householdId);
            setTransactions(data);

            const statsData = await transactionService.getTransactionStats(userProfile.householdId);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    }, [userProfile?.householdId]);

    useEffect(() => {
        loadTransactions();
    }, [loadTransactions]);

    const handleCreateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
        if (!userProfile?.householdId) return;

        await transactionService.createTransaction(transaction);
        await loadTransactions();
    };

    const handleUpdateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
        if (!editingTransaction) return;

        await transactionService.updateTransaction(editingTransaction.id, transaction);
        setEditingTransaction(undefined);
        await loadTransactions();
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;

        await transactionService.deleteTransaction(id);
        await loadTransactions();
    };

    const handleEditClick = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingTransaction(undefined);
    };

    const filteredTransactions = transactions.filter(t => {
        if (filterType === 'all') return true;
        return t.type === filterType;
    });

    const formatDate = (timestamp: Timestamp | Date) => {
        if (!timestamp) return '';
        const date = toDate(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus size={20} />
                    Add Transaction
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Income</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalIncome)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <TrendingDown className="text-red-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Expense</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalExpense)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${stats.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                            <TrendingUp className={stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'} size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Balance</p>
                            <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-gray-900' : 'text-orange-600'}`}>
                                {formatCurrency(stats.balance)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
                <button
                    onClick={() => setFilterType('all')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilterType('income')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Income
                </button>
                <button
                    onClick={() => setFilterType('expense')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'expense'
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Expense
                </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading transactions...</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No transactions found. Click "Add Transaction" to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredTransactions.map((transaction) => (
                            <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                                                }`} />
                                            <div>
                                                <p className="font-medium text-gray-900 capitalize">
                                                    {transaction.category.replace('_', ' ')}
                                                </p>
                                                {transaction.description && (
                                                    <p className="text-sm text-gray-500">{transaction.description}</p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">{formatDate(transaction.date)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(transaction)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Transaction Form Modal */}
            {userProfile?.householdId && currentUser?.email && (
                <TransactionForm
                    isOpen={isFormOpen}
                    onClose={handleCloseForm}
                    onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
                    initialData={editingTransaction}
                    householdId={userProfile.householdId}
                    userEmail={currentUser.email}
                />
            )}
        </div>
    );
};

export default Transactions;
