'use client';

import { AutomationJob, JobStatus } from '@ai-links/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useDialog } from '@/lib/dialog-context';

interface JobMonitorProps {
  accountId: string;
  refreshToken?: number;
}

type JobAction = 'retry' | 'cancel' | 'delete';

export function JobMonitor({ accountId, refreshToken }: JobMonitorProps) {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<Record<string, JobAction | undefined>>({});
  const { user } = useAuth();
  const dialog = useDialog();

  const fetchJobs = useCallback(async () => {
    if (!user || !accountId) return;

    try {
      const token = await user.getIdToken();
      const url = new URL('/api/jobs', window.location.origin);
      url.searchParams.append('accountId', accountId);
      if (filter) url.searchParams.append('status', filter);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, accountId, filter]);

  useEffect(() => {
    if (!user || !accountId) return;
    setLoading(true);
    void fetchJobs();

    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user, accountId, filter, refreshToken, fetchJobs]);

  const setJobActionLoading = useCallback((jobId: string, action?: JobAction) => {
    setActionLoading((prev) => ({ ...prev, [jobId]: action }));
  }, []);

  const handleRetry = async (jobId: string) => {
    if (!user) return;

    try {
      setJobActionLoading(jobId, 'retry');
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
      await fetchJobs();
    } catch (err) {
      await dialog.alert({
        variant: 'error',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setJobActionLoading(jobId, undefined);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!user) return;

    try {
      setJobActionLoading(jobId, 'cancel');
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
      await fetchJobs();
    } catch (err) {
      await dialog.alert({
        variant: 'error',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setJobActionLoading(jobId, undefined);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!user) return;

    const confirmed = await dialog.confirm({
      variant: 'warning',
      title: 'Delete Job?',
      message: 'This will delete the job (and its execution history). This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      setJobActionLoading(jobId, 'delete');
      // Optimistic UI: remove row immediately
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      const token = await user.getIdToken();
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete' }),
      });

      if (!response.ok) throw new Error('Failed to delete job');
      await fetchJobs();
    } catch (err) {
      await dialog.alert({
        variant: 'error',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
      // Re-sync list if delete failed
      await fetchJobs();
    } finally {
      setJobActionLoading(jobId, undefined);
    }
  };

  const getStatusColor = (status: JobStatus) => {
    const colors: Record<JobStatus, string> = {
      [JobStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [JobStatus.PROCESSING]: 'bg-blue-100 text-blue-800',
      [JobStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [JobStatus.FAILED]: 'bg-red-100 text-red-800',
      [JobStatus.SKIPPED_RATE_LIMITED]: 'bg-orange-100 text-orange-800',
      [JobStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  const filteredStatuses = Object.values(JobStatus);

  if (loading) {
    return <div className="text-center py-8">Loading jobs...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-4">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filter === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {filteredStatuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No jobs found</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Job Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Next Retry
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="font-mono text-blue-600 hover:underline cursor-pointer"
                    >
                      {job.id.substring(0, 12)}...
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1).toLowerCase().replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {job.attempts}/{job.maxAttempts}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.nextRetryAt
                      ? new Date(job.nextRetryAt).toLocaleString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{job.priority}</td>
                  <td className="px-6 py-4 text-sm">
                    {job.status === JobStatus.FAILED && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={Boolean(actionLoading[job.id])}
                        className="text-blue-600 hover:underline mr-3 disabled:opacity-50"
                      >
                        {actionLoading[job.id] === 'retry' ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                    {[JobStatus.PENDING, JobStatus.PROCESSING].includes(job.status) && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={Boolean(actionLoading[job.id])}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        {actionLoading[job.id] === 'cancel' ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={Boolean(actionLoading[job.id])}
                      className="text-gray-600 hover:underline ml-3 disabled:opacity-50"
                    >
                      {actionLoading[job.id] === 'delete' ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
