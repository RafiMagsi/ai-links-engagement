'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">AI Links Admin Dashboard</h1>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Admin Dashboard</h2>
          <p className="text-gray-600 mb-4">
            This is the foundation for the AI Links engagement automation engine. Phase 1 setup is complete.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What's Ready:</h3>
            <ul className="list-disc list-inside space-y-2 text-blue-800">
              <li>Monorepo structure with pnpm workspaces</li>
              <li>Next.js 14 admin app with TypeScript</li>
              <li>Firebase Admin SDK integration</li>
              <li>Shared types package</li>
              <li>Authentication with custom admin claims</li>
              <li>Protected routes and admin checks</li>
            </ul>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Automation Accounts</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-xs mt-2">Phase 2 coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Active Jobs</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-xs mt-2">Phase 2 coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Actions</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-xs mt-2">Phase 2 coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Daily Usage</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-xs mt-2">Phase 2 coming soon</p>
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Development Roadmap</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                  <span className="text-green-600">✓</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Phase 1: Foundation</h4>
                <p className="text-gray-600 text-sm">Monorepo setup, authentication, and shared packages</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200">
                  <span className="text-gray-600">-</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Phase 2: Core Features</h4>
                <p className="text-gray-600 text-sm">Account management, automation rules, and job scheduling</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200">
                  <span className="text-gray-600">-</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Phase 3: AI & Automation</h4>
                <p className="text-gray-600 text-sm">OpenAI integration, engagement engine, and analytics</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
