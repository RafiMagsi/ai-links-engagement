'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AutomationComment, CommentStatus } from '@ai-links/shared-types';

export default function CommentsMonitorPage() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [comments, setComments] = useState<(AutomationComment & { id: string })[]>([]);
  const [statusFilter, setStatusFilter] = useState<CommentStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (accountId) {
      fetchComments();
    }
  }, [accountId, statusFilter]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/comments', window.location.origin);
      url.searchParams.set('accountId', accountId);
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setComments(data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setMessage('Error fetching comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    commentId: string,
    action: 'approve' | 'reject' | 'publish',
    reason?: string
  ) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        setMessage(`Comment ${action}d successfully`);
        fetchComments();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      setMessage('Error updating comment');
    }
  };

  const getStatusColor = (status: CommentStatus) => {
    switch (status) {
      case CommentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case CommentStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case CommentStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case CommentStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case CommentStatus.FAILED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Comments Monitor</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Enter account ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CommentStatus | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value={CommentStatus.PENDING}>Pending</option>
                <option value={CommentStatus.APPROVED}>Approved</option>
                <option value={CommentStatus.PUBLISHED}>Published</option>
                <option value={CommentStatus.REJECTED}>Rejected</option>
                <option value={CommentStatus.FAILED}>Failed</option>
              </select>
            </div>
          </div>

          <button
            onClick={fetchComments}
            disabled={loading || !accountId}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.includes('success')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              {accountId
                ? 'No comments found'
                : 'Enter an account ID to view comments'}
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Post: {comment.postId}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Generated: {new Date(comment.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(comment.status)}`}
                  >
                    {comment.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded p-4 mb-4">
                  <p className="text-gray-700">{comment.content}</p>
                </div>

                {comment.rejectedReason && (
                  <div className="bg-red-50 rounded p-4 mb-4">
                    <p className="text-sm text-red-700">
                      <strong>Rejection Reason:</strong> {comment.rejectedReason}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {comment.status === CommentStatus.PENDING && (
                    <>
                      <button
                        onClick={() => handleAction(comment.id, 'approve')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt(
                            'Enter rejection reason (optional):'
                          );
                          handleAction(comment.id, 'reject', reason || undefined);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {comment.status === CommentStatus.APPROVED && (
                    <button
                      onClick={() => handleAction(comment.id, 'publish')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Publish
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
