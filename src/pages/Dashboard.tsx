import React from 'react';

const Dashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">Total Assets</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">$0</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">Monthly Expenses</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">$0</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">Budget Status</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">On Track</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
