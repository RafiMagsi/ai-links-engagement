'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { CommentSettings } from '@ai-links/shared-types';

const defaultSettings: CommentSettings = {
  accountId: '',
  enabled: true,
  maxCommentsPerDay: 5,
  minTimeBetweenComments: 45,
  minCommentLength: 50,
  maxCommentLength: 280,
  requireApproval: true,
  allowOnAIGeneratedPosts: false,
  keywords: [],
  tone: 'professional',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export default function CommentSettingsPage() {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState('');
  const [settings, setSettings] = useState<CommentSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comment-settings?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (accountId) {
      fetchSettings();
    }
  }, [accountId, fetchSettings]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/comment-settings', {
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
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setSettings({
        ...settings,
        keywords: [...(settings.keywords || []), keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings({
      ...settings,
      keywords: (settings.keywords || []).filter((k) => k !== keyword),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Comment Settings</h1>
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
                {/* Enable Comments */}
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
                    Enable Comments
                  </label>
                </div>

                {/* Require Approval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.requireApproval}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          requireApproval: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Require Approval
                  </label>
                </div>

                {/* Allow on AI Posts */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <input
                      type="checkbox"
                      checked={settings.allowOnAIGeneratedPosts}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          allowOnAIGeneratedPosts: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Allow on AI-Generated Posts
                  </label>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={settings.tone || 'professional'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tone: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="expert">Expert</option>
                    <option value="supportive">Supportive</option>
                  </select>
                </div>

                {/* Max Comments Per Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Comments Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxCommentsPerDay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxCommentsPerDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Time Between Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Time Between Comments (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="1440"
                    value={settings.minTimeBetweenComments}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minTimeBetweenComments: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Min Comment Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Comment Length (characters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="280"
                    value={settings.minCommentLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        minCommentLength: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Comment Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Comment Length (characters)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={settings.maxCommentLength}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxCommentLength: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords for Comment Eligibility
                </label>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Enter keyword and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.keywords || []).map((keyword) => (
                    <div
                      key={keyword}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
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
