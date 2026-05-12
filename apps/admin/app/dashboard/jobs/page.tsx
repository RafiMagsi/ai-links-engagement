'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AutomationAccount, JobType } from '@ai-links/shared-types';
import { JobMonitor } from '@/components/job-monitor';

export default function JobsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AutomationAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [jobType, setJobType] = useState<JobType>(JobType.POST_GENERATION);
  const [keyword, setKeyword] = useState('');
  const [creatingJob, setCreatingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchAccounts() {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch('/api/accounts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [user]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedAccount) return;

    setCreatingJob(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          jobType,
          payload: {
            keyword: keyword || undefined,
            manualTrigger: true,
          },
          priority: 10,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create job');
      }

      setKeyword('');
      alert('Job created successfully!');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCreatingJob(false);
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
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Accounts
            </Link>
            <Link
              href="/dashboard/jobs"
              className="text-blue-600 font-medium text-sm border-b-2 border-blue-600 pb-4"
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
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Job Monitor</h2>

        {loading ? (
          <div className="text-center py-8">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600 mb-4">No accounts found. Create an account first.</p>
            <Link
              href="/dashboard/accounts"
              className="text-blue-600 hover:underline"
            >
              Create Account →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Create Job Form */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Create Manual Job</h3>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreateJob} className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Select Account
                    </label>
                    <select
                      required
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.linkedinUrl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Job Type
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value as JobType)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={JobType.POST_GENERATION}>Post Generation</option>
                      <option value={JobType.COMMENT_GENERATION}>Comment Generation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Keyword (Optional)
                    </label>
                    <input
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="e.g., AI, Machine Learning"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingJob}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {creatingJob ? 'Creating Job...' : 'Create Job'}
                </button>
              </form>
            </div>

            {/* Job Monitor */}
            {selectedAccount && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Job Queue</h3>
                <JobMonitor accountId={selectedAccount} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
