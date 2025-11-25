import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Settings: React.FC = () => {
    const [connectionStatus, setConnectionStatus] = useState<string>('');

    const testConnection = async () => {
        setConnectionStatus('Testing...');
        try {
            await getDoc(doc(db, 'test_connection', 'ping'));
            setConnectionStatus('Success: Connected to Firestore!');
        } catch (err: any) {
            console.error(err);
            setConnectionStatus(`Error: ${err.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-medium text-gray-900">System Status</h3>
                            <p className="text-sm text-gray-500 mt-1">Check connection to Firebase</p>
                        </div>
                        <button
                            onClick={testConnection}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                        >
                            Test Connection
                        </button>
                    </div>
                    {connectionStatus && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${connectionStatus.startsWith('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {connectionStatus}
                        </div>
                    )}
                </div>
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
