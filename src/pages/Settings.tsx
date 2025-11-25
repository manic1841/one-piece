import React from 'react';

const Settings: React.FC = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                <div className="p-6">
                    <h3 className="font-medium text-gray-900">Household</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage family members and permissions</p>
                </div>
                <div className="p-6">
                    <h3 className="font-medium text-gray-900">Categories</h3>
                    <p className="text-sm text-gray-500 mt-1">Customize income and expense categories</p>
                </div>
                <div className="p-6">
                    <h3 className="font-medium text-gray-900">Projects</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage budget projects and goals</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
