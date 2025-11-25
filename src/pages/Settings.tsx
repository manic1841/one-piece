import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BudgetSettings from '../components/BudgetSettings';

const Settings: React.FC = () => {
    const { userProfile } = useAuth();
    const [testResult, setTestResult] = useState('');
    const [testing, setTesting] = useState(false);

    const testConnection = async () => {
        setTesting(true);
        setTestResult('');
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../firebase');
            await getDoc(doc(db, 'test_connection', 'ping'));
            setTestResult('✅ Firebase Connection Successful!');
        } catch (err: any) {
            if (err.code === 'permission-denied') {
                setTestResult('✅ Firebase Connection Successful! (Reached Firestore)');
            } else {
                console.error(err);
                setTestResult('❌ Connection Failed: ' + err.message);
            }
        }
        setTesting(false);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-2">Manage your account and budget preferences</p>
            </div>

            {/* Budget Allocation Section */}
            {userProfile?.householdId && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <BudgetSettings householdId={userProfile.householdId} />
                </div>
            )}

            {/* Firebase Connection Test Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Firebase Connection</h3>
                <button
                    onClick={testConnection}
                    disabled={testing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                    {testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult && (
                    <div className={`mt-4 p-3 rounded-lg ${testResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {testResult}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
