import React from 'react';
import { Plus } from 'lucide-react';

const Accounts: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                    <Plus size={20} />
                    <span>Add Account</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Placeholder for account cards */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-medium text-gray-900">Cash Wallet</h3>
                            <p className="text-sm text-gray-500">Cash</p>
                        </div>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-4">$0</p>
                    <p className="text-xs text-gray-400 mt-2">Last updated: Never</p>
                </div>
            </div>
        </div>
    );
};

export default Accounts;
