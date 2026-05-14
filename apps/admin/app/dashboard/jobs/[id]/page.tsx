'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AutomationJob } from '@ai-links/shared-types';

export default function JobDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<AutomationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !jobId) return;

    async function fetchJob() {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const response = await fetch(`/api/jobs/details/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch job');
        }

        const data = await response.json();
        setJob(data.job);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [user, jobId]);

  const handleRetry = async () => {
    if (!user || !job) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'retry' }),
      });

      if (!response.ok) throw new Error('Failed to retry job');
      // Refresh job data
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancel = async () => {
    if (!user || !job) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) throw new Error('Failed to cancel job');
      router.push('/dashboard/jobs');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped_rate_limited: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Link
              href="/dashboard/jobs"
              className="text-blue-600 hover:underline mb-4 inline-block"
            >
              ← Back to Jobs
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Error: {error || 'Job not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            href="/dashboard/jobs"
            className="text-blue-600 hover:underline mb-4 inline-block text-sm"
          >
            ← Back to Jobs
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Details</h1>
              <p className="text-gray-600 text-sm mt-1 font-mono">{job.id}</p>
            </div>
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                job.status
              )}`}
            >
              {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Overview */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Job Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Job ID</p>
                  <p className="text-sm font-mono font-bold text-gray-900">{job.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Job Type</p>
                  <p className="text-sm font-bold text-gray-900">
                    {job.jobType.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account ID</p>
                  <p className="text-sm font-mono text-gray-900">{job.accountId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className="text-sm font-bold text-gray-900">{job.priority}</p>
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-600">Created At</p>
                    <p className="text-sm text-gray-900">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {job.startedAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-gray-600">Started At</p>
                      <p className="text-sm text-gray-900">
                        {new Date(job.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {job.completedAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-green-600 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-gray-600">Completed At</p>
                      <p className="text-sm text-gray-900">
                        {new Date(job.completedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-3 h-3 rounded-full bg-gray-600 mt-1.5"></div>
                  <div>
                    <p className="text-sm text-gray-600">Updated At</p>
                    <p className="text-sm text-gray-900">
                      {new Date(job.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {job.nextRetryAt && (
                  <div className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full bg-orange-600 mt-1.5"></div>
                    <div>
                      <p className="text-sm text-gray-600">Next Retry At</p>
                      <p className="text-sm text-gray-900">
                        {new Date(job.nextRetryAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Payload */}
            {job.payload && Object.keys(job.payload).length > 0 && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Payload</h2>
                <div className="bg-gray-50 rounded p-4 overflow-x-auto">
                  <pre className="text-sm text-gray-900">
                    {JSON.stringify(job.payload, null, 2)}
                  </pre>
                </div>
              </section>
            )}

            {/* Result */}
            {job.result && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Generated Result</h2>
                <div className="space-y-4">
                  {job.result.generatedContent && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Generated Content</p>
                      <div className="bg-blue-50 rounded p-4 border border-blue-200">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {job.result.generatedContent}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    {job.result.aiModel && (
                      <div>
                        <p className="text-sm text-gray-600">AI Model</p>
                        <p className="text-sm font-mono text-gray-900">
                          {job.result.aiModel}
                        </p>
                      </div>
                    )}
                    {job.result.tokensUsed && (
                      <div>
                        <p className="text-sm text-gray-600">Tokens Used</p>
                        <p className="text-sm font-bold text-gray-900">
                          {job.result.tokensUsed}
                        </p>
                      </div>
                    )}
                    {job.result.postId && (
                      <div>
                        <p className="text-sm text-gray-600">Post ID</p>
                        <p className="text-sm font-mono text-blue-600">
                          {job.result.postId}
                        </p>
                      </div>
                    )}
                  </div>
                  {job.result.error && (
                    <div>
                      <p className="text-sm text-gray-600">Error</p>
                      <div className="bg-red-50 rounded p-4 border border-red-200">
                        <p className="text-sm text-red-900">{job.result.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-6">
            {/* Retry Information */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Retry Info</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Attempts</p>
                  <p className="text-lg font-bold text-gray-900">
                    {job.attempts}/{job.maxAttempts}
                  </p>
                </div>

                {job.nextRetryAt && (
                  <div className="bg-yellow-50 rounded p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-800 font-medium">Scheduled Retry</p>
                    <p className="text-sm text-yellow-900 mt-1">
                      {new Date(job.nextRetryAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {job.status === 'failed' && !job.nextRetryAt && (
                  <div className="bg-red-50 rounded p-3 border border-red-200">
                    <p className="text-xs text-red-800 font-medium">Max Retries Reached</p>
                    <p className="text-sm text-red-900 mt-1">
                      This job has failed permanently after {job.maxAttempts} attempts.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-2">
                {job.status === 'failed' && (
                  <button
                    onClick={handleRetry}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Retry Job
                  </button>
                )}
                {['pending', 'processing'].includes(job.status) && (
                  <button
                    onClick={handleCancel}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Cancel Job
                  </button>
                )}
                {!['pending', 'processing', 'failed'].includes(job.status) && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No Actions Available</p>
                  </div>
                )}
              </div>
            </section>

            {/* Duration */}
            {job.startedAt && job.completedAt && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Duration</h2>
                <div>
                  <p className="text-sm text-gray-600">Processing Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {Math.round(
                      (new Date(job.completedAt).getTime() -
                        new Date(job.startedAt).getTime()) /
                        1000
                    )}{' '}
                    seconds
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
