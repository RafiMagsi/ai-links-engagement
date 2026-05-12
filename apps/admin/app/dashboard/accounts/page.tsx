'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AccountList } from '@/components/account-list';

export default function AccountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    linkedinUrl: '',
    dailyPostLimit: 30,
    dailyCommentLimit: 50,
    dailyReactionLimit: 20,
    timezone: 'Asia/Karachi',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { ApiClient } = await import('@/lib/api-client');
      await ApiClient.post('/api/accounts', formData);

      setShowForm(false);
      setFormData({
        linkedinUrl: '',
        dailyPostLimit: 30,
        dailyCommentLimit: 50,
        dailyReactionLimit: 20,
        timezone: 'Asia/Karachi',
      });

      // Refresh the page to show new account
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Failed to create account:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">AI Links Automation</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-6 border-t pt-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Overview
            </Link>
            <Link
              href="/dashboard/accounts"
              className="text-blue-600 font-medium text-sm border-b-2 border-blue-600 pb-4"
            >
              Accounts
            </Link>
            <Link
              href="/dashboard/jobs"
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Jobs
            </Link>
            <Link
              href="/dashboard/usage"
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Usage
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Automation Accounts</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {showForm ? 'Cancel' : 'Create Account'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Create New Automation Account</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  required
                  value={formData.linkedinUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, linkedinUrl: e.target.value })
                  }
                  placeholder="https://www.linkedin.com/in/yourprofile"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Daily Post Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.dailyPostLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyPostLimit: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Daily Comment Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.dailyCommentLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyCommentLimit: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Daily Reaction Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.dailyReactionLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dailyReactionLimit: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) =>
                      setFormData({ ...formData, timezone: e.target.value })
                    }
                    placeholder="Asia/Karachi"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* Account List */}
        <AccountList />
      </main>
    </div>
  );
}
