import React from 'react';
import { Plus } from 'lucide-react';

const Transactions: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                    <Plus size={20} />
                    <span>Add New</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 text-center text-gray-500">
                    No transactions found.
                </div>
            </div>
        </div>
    );
};

export default Transactions;
