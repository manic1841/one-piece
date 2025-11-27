import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { accessControlService } from '../services/accessControlService';
import { Mail, X, Plus } from 'lucide-react';

const EmailWhitelist: React.FC = () => {
  const { currentUser } = useAuth();
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    setLoading(true);
    try {
      const emails = await accessControlService.getWhitelist();
      setWhitelist(emails);
    } catch (err) {
      console.error('Error loading whitelist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser?.uid) {
      setError('User not authenticated');
      return;
    }

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (whitelist.includes(email)) {
      setError('This email is already in the whitelist');
      return;
    }

    setSaving(true);
    try {
      await accessControlService.addEmailToWhitelist(email, currentUser.uid);
      await loadWhitelist();
      setNewEmail('');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to add email');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!currentUser?.uid) return;

    if (!confirm(`Remove ${email} from whitelist?`)) return;

    setSaving(true);
    try {
      await accessControlService.removeEmailFromWhitelist(email, currentUser.uid);
      await loadWhitelist();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to remove email');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Whitelist</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email Whitelist</h2>
          <p className="text-sm text-gray-600 mt-1">
            Only whitelisted users can access this application
          </p>
        </div>
        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          {whitelist.length} {whitelist.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {/* Add Email Form */}
      <form onSubmit={handleAddEmail} className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Email to Whitelist
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Add
          </button>
        </div>
      </form>

      {/* Whitelist */}
      <div className="space-y-2">
        {whitelist.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No emails in whitelist</div>
        ) : (
          whitelist.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <span className="font-medium text-gray-900">{email}</span>
              </div>
              <button
                onClick={() => handleRemoveEmail(email)}
                disabled={saving}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Remove"
              >
                <X size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmailWhitelist;
