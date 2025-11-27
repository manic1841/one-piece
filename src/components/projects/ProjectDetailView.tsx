import React from 'react';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { type Project } from '../../schemas';
import { type CombinedTransaction } from '../../hooks/useProjects';
import { formatCurrency } from '../../utils/formatUtils';
import { toDateString } from '../../utils/dateUtils';

interface ProjectDetailViewProps {
    project: Project;
    balance: number;
    transactions: CombinedTransaction[];
    onBack: () => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
    project,
    balance,
    transactions,
    onBack,
}) => {
    const isPositive = balance >= 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <span className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${project.color}`}>
                            {project.icon}
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                            {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Current Balance</h3>
                <p className={`text-3xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(balance)}
                </p>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No transactions found for this project.
                        </div>
                    ) : (
                        transactions.map((item, index) => {
                            if (item.type === 'transaction') {
                                const tx = item.data;
                                const isIncome = tx.type === 'income';

                                return (
                                    <div key={`tx-${tx.id}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 flex items-center justify-center rounded-lg ${isIncome ? 'bg-green-100' : 'bg-red-100'
                                                        }`}
                                                >
                                                    {isIncome ? (
                                                        <TrendingUp className="text-green-600" size={20} />
                                                    ) : (
                                                        <TrendingDown className="text-red-600" size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{tx.category}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {tx.description || 'No description'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {toDateString(tx.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p
                                                    className={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'
                                                        }`}
                                                >
                                                    {isIncome ? '+' : '-'}
                                                    {formatCurrency(tx.amount)}
                                                </p>
                                                <p className="text-xs text-gray-500">{isIncome ? 'Income' : 'Expense'}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                const pt = item.data;
                                const isIncoming = pt.toProject === project.id;
                                const typeLabel =
                                    pt.type === 'allocation'
                                        ? 'Allocation'
                                        : pt.type === 'transfer'
                                            ? 'Transfer'
                                            : 'Adjustment';

                                return (
                                    <div key={`pt-${pt.id}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-10 h-10 flex items-center justify-center rounded-lg ${isIncoming ? 'bg-blue-100' : 'bg-orange-100'
                                                        }`}
                                                >
                                                    {isIncoming ? (
                                                        <TrendingUp className="text-blue-600" size={20} />
                                                    ) : (
                                                        <TrendingDown className="text-orange-600" size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{typeLabel}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {pt.description || 'No description'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {toDateString(pt.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p
                                                    className={`font-semibold ${isIncoming ? 'text-blue-600' : 'text-orange-600'
                                                        }`}
                                                >
                                                    {isIncoming ? '+' : '-'}
                                                    {formatCurrency(pt.amount)}
                                                </p>
                                                <p className="text-xs text-gray-500">{typeLabel}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailView;
