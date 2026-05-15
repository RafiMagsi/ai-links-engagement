'use client';

import { AutomationAccount } from '@ai-links/shared-types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiClient } from '@/lib/api-client';
import { useDialog } from '@/lib/dialog-context';

export function AccountList() {
  const [accounts, setAccounts] = useState<AutomationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();
  const dialog = useDialog();

  useEffect(() => {
    if (!user) return;

    async function fetchAccounts() {
      try {
        const data = await ApiClient.get<{ accounts: AutomationAccount[] }>('/api/accounts');
        setAccounts(data.accounts || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Failed to fetch accounts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [user]);

  if (loading) {
    return <div className="text-center py-8">Loading accounts...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">Error: {error}</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No automation accounts yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              LinkedIn URL
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Daily Limits
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Timezone
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="font-medium">{account.name}</div>
                <div className="text-gray-500 text-xs">{account.email}</div>
              </td>
              <td className="px-6 py-4 text-sm">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    account.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {account.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                Posts: {account.dailyPostLimit}, Comments: {account.dailyCommentLimit}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{account.timezone}</td>
              <td className="px-6 py-4 text-sm">
                <a
                  href={`/dashboard/accounts/${account.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </a>
                <button
                  onClick={async () => {
                    const confirmed = await dialog.confirm({
                      variant: 'warning',
                      title: 'Delete Account?',
                      message:
                        'This will delete the account and related jobs/posts/comments. This cannot be undone.',
                      confirmText: 'Delete',
                      cancelText: 'Cancel',
                    });
                    if (!confirmed) return;

                    try {
                      setDeletingId(account.id);
                      await ApiClient.delete(`/api/accounts/${account.id}`);
                      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
                      void dialog.alert({ variant: 'success', message: 'Account deleted.' });
                    } catch (err) {
                      void dialog.alert({
                        variant: 'error',
                        message: err instanceof Error ? err.message : 'Failed to delete account',
                      });
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  disabled={deletingId === account.id}
                  className="ml-4 text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === account.id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
