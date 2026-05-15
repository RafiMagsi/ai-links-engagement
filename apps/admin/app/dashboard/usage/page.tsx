'use client';

export const dynamic = 'force-dynamic';




import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { DailyUsage } from '@ai-links/shared-types';

export default function UsagePage() {
  const { user } = useAuth();
  const [todayUsage, setTodayUsage] = useState<DailyUsage | null>(null);
  const [usageHistory, setUsageHistory] = useState<DailyUsage[]>([]);
  const [breakdown, setBreakdown] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!user) return;

    async function fetchUsage() {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch(`/api/usage?days=${days}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch usage');
        const data = await response.json();
        setTodayUsage(data.todayUsage);
        setUsageHistory(data.usageHistory || []);
        setBreakdown(data.breakdown || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [user, days]);

  const quotaLimits = {
    posts: 30,
    comments: 50,
    reactions: 20,
    total: 100,
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
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
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Jobs
            </Link>
            <Link
              href="/dashboard/usage"
              className="text-blue-600 font-medium text-sm border-b-2 border-blue-600 pb-4"
            >
              Usage
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Daily Quota Usage</h2>

        {loading ? (
          <div className="text-center py-8">Loading usage data...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* System Breakdown */}
            {breakdown && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">System Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Jobs Created</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.jobsCreated ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Executions</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.executions ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Posts Created</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.postsCreated ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Comments Created</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.commentsCreated ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Total Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.totalTokens ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Avg Tokens / Execution</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.avgTokensPerExecution ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Input Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.totalInputTokens ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Output Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.totalOutputTokens ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Avg Input / Execution</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.avgInputTokensPerExecution ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Avg Output / Execution</p>
                    <p className="text-2xl font-bold text-gray-900">{breakdown.avgOutputTokensPerExecution ?? '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Usage */}
            {todayUsage && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Today&apos;s Usage</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Posts */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Posts</h4>
                      <span className="text-sm text-gray-600">
                        {todayUsage.postsCreated}/{quotaLimits.posts}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getStatusColor(
                          getUsagePercentage(todayUsage.postsCreated, quotaLimits.posts)
                        )}`}
                        style={{
                          width: `${getUsagePercentage(
                            todayUsage.postsCreated,
                            quotaLimits.posts
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {todayUsage.quotaPostsRemaining} remaining
                    </p>
                  </div>

                  {/* Comments */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Comments</h4>
                      <span className="text-sm text-gray-600">
                        {todayUsage.commentsCreated}/{quotaLimits.comments}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getStatusColor(
                          getUsagePercentage(todayUsage.commentsCreated, quotaLimits.comments)
                        )}`}
                        style={{
                          width: `${getUsagePercentage(
                            todayUsage.commentsCreated,
                            quotaLimits.comments
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {todayUsage.quotaCommentsRemaining} remaining
                    </p>
                  </div>

                  {/* Reactions */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Reactions</h4>
                      <span className="text-sm text-gray-600">
                        {todayUsage.reactionsAdded}/{quotaLimits.reactions}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getStatusColor(
                          getUsagePercentage(todayUsage.reactionsAdded, quotaLimits.reactions)
                        )}`}
                        style={{
                          width: `${getUsagePercentage(
                            todayUsage.reactionsAdded,
                            quotaLimits.reactions
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {todayUsage.quotaReactionsRemaining} remaining
                    </p>
                  </div>

                  {/* Total */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Total</h4>
                      <span className="text-sm text-gray-600">
                        {todayUsage.totalActions}/{quotaLimits.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getStatusColor(
                          getUsagePercentage(todayUsage.totalActions, quotaLimits.total)
                        )}`}
                        style={{
                          width: `${getUsagePercentage(
                            todayUsage.totalActions,
                            quotaLimits.total
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {todayUsage.quotaTotalRemaining} remaining
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Usage History</h3>
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Posts
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Comments
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Reactions
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usageHistory.map((usage) => (
                      <tr key={usage.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{usage.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {usage.postsCreated}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {usage.commentsCreated}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {usage.reactionsAdded}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {usage.totalActions}
                        </td>
                      </tr>
                    ))}
                    {usageHistory.length === 0 && (
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>
                          No usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quota Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-4">Global Daily Quotas</h3>
              <div className="grid grid-cols-4 gap-4 text-sm text-blue-800">
                <div>
                  <p className="font-medium">Posts</p>
                  <p>{quotaLimits.posts} per day</p>
                </div>
                <div>
                  <p className="font-medium">Comments</p>
                  <p>{quotaLimits.comments} per day</p>
                </div>
                <div>
                  <p className="font-medium">Reactions</p>
                  <p>{quotaLimits.reactions} per day</p>
                </div>
                <div>
                  <p className="font-medium">Total</p>
                  <p>{quotaLimits.total} per day</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
