'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { OfficialReaction, ReactionType } from '@ai-links/shared-types';

export default function ReactionsMonitorPage() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [reactions, setReactions] = useState<(OfficialReaction & { id: string })[]>([]);
  const [typeFilter, setTypeFilter] = useState<ReactionType | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchReactions = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL('/api/reactions', window.location.origin);
      url.searchParams.set('accountId', accountId);
      if (typeFilter !== 'all') {
        url.searchParams.set('reactionType', typeFilter);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setReactions(data.data);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setMessage('Error fetching reactions');
    } finally {
      setLoading(false);
    }
  }, [accountId, typeFilter]);

  useEffect(() => {
    if (accountId) {
      fetchReactions();
    }
  }, [accountId, typeFilter, fetchReactions]);

  const getTypeColor = (type: ReactionType) => {
    switch (type) {
      case ReactionType.FEEDBACK_GIVEN:
        return 'bg-blue-100 text-blue-800';
      case ReactionType.CURATED:
        return 'bg-purple-100 text-purple-800';
      case ReactionType.SPOTLIGHT:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementLevel = (score?: number) => {
    if (!score) return 'N/A';
    if (score > 100) return 'High';
    if (score > 50) return 'Medium';
    return 'Low';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Reactions Monitor</h1>
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
                Filter by Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ReactionType | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value={ReactionType.FEEDBACK_GIVEN}>Feedback Given</option>
                <option value={ReactionType.CURATED}>Curated</option>
                <option value={ReactionType.SPOTLIGHT}>Spotlight</option>
              </select>
            </div>
          </div>

          <button
            onClick={fetchReactions}
            disabled={loading || !accountId}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-800">
            {message}
          </div>
        )}

        {/* Stats */}
        {accountId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Total Reactions
              </h3>
              <p className="text-3xl font-bold text-gray-900">{reactions.length}</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Feedback Given
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {
                  reactions.filter((r) => r.reactionType === ReactionType.FEEDBACK_GIVEN)
                    .length
                }
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Curated/Spotlight
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {
                  reactions.filter(
                    (r) =>
                      r.reactionType === ReactionType.CURATED ||
                      r.reactionType === ReactionType.SPOTLIGHT
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        {/* Reactions List */}
        <div className="space-y-4">
          {reactions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              {accountId
                ? 'No reactions found'
                : 'Enter an account ID to view reactions'}
            </div>
          ) : (
            reactions.map((reaction) => (
              <div
                key={reaction.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Post: {reaction.postId}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(reaction.createdAt || new Date()).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(reaction.reactionType)}`}
                  >
                    {reaction.reactionType}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Reason:</strong> {reaction.actionReason}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Engagement Score:</strong>{' '}
                      {getEngagementLevel(reaction.engagementScore)}
                    </p>
                    {reaction.engagementScore && (
                      <p className="text-xs text-gray-500 mt-1">
                        ({reaction.engagementScore} points)
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded p-4">
                  <p className="text-xs text-blue-700">
                    <strong>Official Action:</strong> {reaction.isOfficialAction ? 'Yes' : 'No'} |
                    <strong className="ml-2">Actor:</strong> {reaction.actorType}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
