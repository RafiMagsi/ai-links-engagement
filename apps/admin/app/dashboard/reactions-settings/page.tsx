'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ReactionSettings, ReactionType } from '@ai-links/shared-types';

const defaultSettings: ReactionSettings = {
  accountId: '',
  enabled: true,
  maxReactionsPerDay: 10,
  maxReactionsPerPost: 1,
  allowedReactionTypes: [
    ReactionType.FEEDBACK_GIVEN,
    ReactionType.CURATED,
    ReactionType.SPOTLIGHT,
  ],
  curateTrendingContent: true,
  minEngagementScore: 20,
  keywordWeighting: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function ReactionSettingsPage() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [settings, setSettings] = useState<ReactionSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reaction-settings?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reaction-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          accountId,
        }),
      });

      if (response.ok) {
        setMessage('Settings saved successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (accountId) {
      fetchSettings();
    }
  }, [accountId, fetchSettings]);

  const toggleReactionType = (type: ReactionType) => {
    const types = settings.allowedReactionTypes;
    if (types.includes(type)) {
      setSettings({
        ...settings,
        allowedReactionTypes: types.filter((t) => t !== type),
      });
    } else {
      setSettings({
        ...settings,
        allowedReactionTypes: [...types, type],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Reaction Settings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Enter account ID to load/create settings"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {accountId && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Enable Reactions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, enabled: e.target.checked })
                      }
                      className="mr-2"
                    />
                    Enable Reactions
                  </label>
                </div>

                {/* Curate Trending */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.curateTrendingContent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          curateTrendingContent: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Curate Trending Content
                  </label>
                </div>

                {/* Max Reactions Per Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Reactions Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxReactionsPerDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxReactionsPerDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Reactions Per Post */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Reactions Per Post
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxReactionsPerPost}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxReactionsPerPost: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Engagement Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Engagement Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={settings.minEngagementScore}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minEngagementScore: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Allowed Reaction Types */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Allowed Reaction Types
                </label>
                <div className="space-y-2">
                  {Object.values(ReactionType).map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.allowedReactionTypes.includes(type)}
                        onChange={() => toggleReactionType(type)}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <h3 className="font-semibold text-blue-900 mb-2">Reaction Types:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    <strong>Feedback Given:</strong> Auto-like after commenting on a post
                  </li>
                  <li>
                    <strong>Curated:</strong> Like high-quality, keyword-matched content
                  </li>
                  <li>
                    <strong>Spotlight:</strong> Special reactions for featured content
                  </li>
                </ul>
              </div>

              {/* Save Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {message && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    message.includes('success')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {message}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
