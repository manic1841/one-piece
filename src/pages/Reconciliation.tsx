import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reconciliationService } from '../services/reconciliationService';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

const Reconciliation: React.FC = () => {
    const { userProfile } = useAuth();
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userProfile?.householdId) {
            loadReport();
        }
    }, [userProfile?.householdId, selectedYear, selectedMonth]);

    const loadReport = async () => {
        if (!userProfile?.householdId) return;

        setLoading(true);
        try {
            const data = await reconciliationService.getReconciliationReport(
                userProfile.householdId,
                selectedYear,
                selectedMonth
            );
            setReport(data);
        } catch (error) {
            console.error('Error loading reconciliation report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
                <p className="text-gray-600 mt-2">
                    Compare actual balance changes with transaction records
                </p>
            </div>

            {/* Month Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">
                        {selectedYear}年 {selectedMonth}月
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {report && (
                <>
                    {/* Discrepancy Alert */}
                    {report.hasDiscrepancy ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
                            <div>
                                <h3 className="font-semibold text-yellow-900">發現差異</h3>
                                <p className="text-sm text-yellow-800 mt-1">
                                    實際餘額變化與交易記錄不符，差異金額：
                                    <span className="font-bold ml-1">
                                        {formatCurrency(Math.abs(report.discrepancy))}
                                    </span>
                                    {report.discrepancy > 0 ? ' (多出)' : ' (短少)'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                            <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                            <div>
                                <h3 className="font-semibold text-green-900">對帳成功</h3>
                                <p className="text-sm text-green-800 mt-1">
                                    實際餘額變化與交易記錄完全一致
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actual Balance Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">實際餘額</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">上月總餘額</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(report.previousMonth.totalBalance)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {report.previousMonth.year}/{report.previousMonth.month}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">本月總餘額</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    {formatCurrency(report.currentMonth.totalBalance)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {report.currentMonth.year}/{report.currentMonth.month}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">實際變化</p>
                                <p className={`text-xl font-bold mt-1 ${report.actualChange >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {report.actualChange >= 0 ? '+' : ''}{formatCurrency(report.actualChange)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">交易統計</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {/* Income */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">收入明細</h4>
                                <div className="space-y-2">
                                    {Object.entries(report.transactions.incomeBySource).map(([source, amount]) => (
                                        <div key={source} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{source}</span>
                                            <span className="font-medium text-green-600">
                                                +{formatCurrency(amount as number)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                                        <span>總收入</span>
                                        <span className="text-green-600">
                                            +{formatCurrency(report.transactions.totalIncome)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-3">支出明細</h4>
                                <div className="space-y-2">
                                    {Object.entries(report.transactions.expensesByProject).map(([project, amount]) => (
                                        <div key={project} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{project}</span>
                                            <span className="font-medium text-red-600">
                                                -{formatCurrency(amount as number)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-gray-200 flex justify-between font-semibold">
                                        <span>總支出</span>
                                        <span className="text-red-600">
                                            -{formatCurrency(report.transactions.totalExpenses)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calculated Change */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-700">理論變化（收入-支出）</span>
                                <span className={`text-xl font-bold ${report.calculatedChange >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {report.calculatedChange >= 0 ? '+' : ''}{formatCurrency(report.calculatedChange)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reconciliation Result */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">對帳結果</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">實際變化</span>
                                <span className="font-medium">{formatCurrency(report.actualChange)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">理論變化</span>
                                <span className="font-medium">{formatCurrency(report.calculatedChange)}</span>
                            </div>
                            <div className="pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                                <span className="font-semibold text-gray-900">差異</span>
                                <span className={`text-2xl font-bold ${Math.abs(report.discrepancy) < 0.01
                                        ? 'text-green-600'
                                        : 'text-yellow-600'
                                    }`}>
                                    {Math.abs(report.discrepancy) < 0.01
                                        ? '✓ 完全一致'
                                        : formatCurrency(report.discrepancy)
                                    }
                                </span>
                            </div>
                            {report.hasDiscrepancy && (
                                <p className="text-sm text-gray-600 mt-2">
                                    💡 提示：差異可能來自未記錄的交易、手續費、或餘額記錄錯誤。
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {!report && !loading && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <p className="text-gray-500">
                        沒有找到 {selectedYear}年{selectedMonth}月 的對帳資料
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        請先在 Assets 頁面記錄本月和上月的帳戶餘額
                    </p>
                </div>
            )}
        </div>
    );
};

export default Reconciliation;
