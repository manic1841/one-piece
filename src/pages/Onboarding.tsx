import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { householdService } from '../services/householdService';
import { LogOut } from 'lucide-react';

const Onboarding: React.FC = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { currentUser, logout, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentUser.email) return;

        if (!input.trim()) {
            setError('Please enter a household name or ID');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const userProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                photoURL: currentUser.photoURL || undefined
            };

            await householdService.createOrJoinHousehold(input, userProfile);

            // Refresh auth context to get updated householdId
            if (refreshProfile) {
                await refreshProfile();
            }

            navigate('/');
        } catch (err) {
            console.error(err);
            const error = err as Error;
            setError(error.message || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Create or Join Family</h1>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
                        <LogOut size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Household Name or ID
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Enter a name to create or ID to join"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Onboarding;
