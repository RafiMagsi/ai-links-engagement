'use client';

import { AutomationJob, JobStatus } from '@ai-links/shared-types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface JobMonitorProps {
  accountId: string;
}

export function JobMonitor({ accountId }: JobMonitorProps) {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !accountId) return;

    const fetchJobs = async () => {
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
    };

    fetchJobs();

    // Poll every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [user, accountId, filter]);

  const handleRetry = async (jobId: string) => {
    if (!user) return;

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
      // Refresh jobs list
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!user) return;

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
      // Refresh jobs list
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
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
        {Object.values(JobStatus).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No jobs found</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {job.id.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{job.jobType}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {job.status === JobStatus.FAILED && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Retry
                      </button>
                    )}
                    {[JobStatus.PENDING, JobStatus.PROCESSING].includes(job.status) && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        className="text-red-600 hover:underline"
                      >
                        Cancel
                      </button>
                    )}
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
