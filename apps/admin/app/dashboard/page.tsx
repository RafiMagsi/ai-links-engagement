'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DailyUsage } from '@ai-links/shared-types';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [accountCount, setAccountCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchDashboardData() {
      try {
        if (!user) return;
        const token = await user.getIdToken();

        // Fetch usage
        const usageResponse = await fetch('/api/usage', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          setUsage(usageData.todayUsage);
        }

        // Fetch accounts count
        const accountsResponse = await fetch('/api/accounts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          setAccountCount(accountsData.accounts.length);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Sign Out
              </button>
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
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Usage
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Overview</h2>
          <p className="text-gray-600">
            Phase 2 - POST AUTOMATION is now live. Manage your automation accounts, configure keywords and schedules, and monitor job execution.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Automation Accounts</h3>
            <p className="text-3xl font-bold text-gray-900">{accountCount}</p>
            <Link
              href="/dashboard/accounts"
              className="text-blue-600 hover:underline text-xs mt-2 inline-block"
            >
              View accounts →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Today&apos;s Posts</h3>
            <p className="text-3xl font-bold text-gray-900">{usage?.postsCreated || 0}</p>
            <p className="text-gray-500 text-xs mt-2">
              {usage ? `${usage.quotaPostsRemaining} remaining` : 'Loading...'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Today&apos;s Comments</h3>
            <p className="text-3xl font-bold text-gray-900">{usage?.commentsCreated || 0}</p>
            <p className="text-gray-500 text-xs mt-2">
              {usage ? `${usage.quotaCommentsRemaining} remaining` : 'Loading...'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Actions</h3>
            <p className="text-3xl font-bold text-gray-900">{usage?.totalActions || 0}</p>
            <p className="text-gray-500 text-xs mt-2">
              {usage ? `${usage.quotaTotalRemaining} quota remaining` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/accounts"
              className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Manage Accounts</h4>
              <p className="text-sm text-gray-600">Create and configure LinkedIn automation accounts</p>
            </Link>

            <Link
              href="/dashboard/accounts"
              className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Configure Keywords</h4>
              <p className="text-sm text-gray-600">Set up keywords, tone, and content intents</p>
            </Link>

            <Link
              href="/dashboard/jobs"
              className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <h4 className="font-semibold text-gray-900 mb-2">Monitor Jobs</h4>
              <p className="text-sm text-gray-600">Track job execution and retry failed jobs</p>
            </Link>
          </div>
        </div>

        {/* Phase 2 Status */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Phase 2 Features</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Account Management</h4>
                <p className="text-gray-600 text-sm">Create, configure, and manage automation accounts with daily limits</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Node.js Worker</h4>
                <p className="text-gray-600 text-sm">Background worker with OpenAI integration for content generation</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Daily Quota Engine</h4>
                <p className="text-gray-600 text-sm">Global quota tracking with per-account limits (30 posts, 50 comments, 20 reactions)</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Job Queue & Monitoring</h4>
                <p className="text-gray-600 text-sm">Create, monitor, and manage automation jobs with retry and cancel actions</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Content Generation</h4>
                <p className="text-gray-600 text-sm">AI-powered post and comment generation with tone and intent control</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
