'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { AutomationAccount, TonePreset, ContentIntent } from '@ai-links/shared-types';
import { useDialog } from '@/lib/dialog-context';

type TabType = 'details' | 'keywords' | 'schedule';

export default function AccountEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const accountId = params.id as string;
  const dialog = useDialog();

  const [account, setAccount] = useState<AutomationAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [saving, setSaving] = useState(false);

  // Keywords form state
  const [keywordsForm, setKeywordsForm] = useState({
    primaryKeywords: '',
    secondaryKeywords: '',
    blockedKeywords: '',
    tonePreset: TonePreset.PROFESSIONAL,
    allowedIntents: [ContentIntent.KNOWLEDGE_SHARING],
  });

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    weekdayPostStart: '09:00',
    weekdayPostEnd: '17:00',
    weekendPostStart: '10:00',
    weekendPostEnd: '18:00',
    timezone: 'Asia/Karachi',
    minMinutesBetweenActions: 30,
  });

  // Details form state
  const [detailsForm, setDetailsForm] = useState({
    name: '',
    email: '',
    bio: '',
    location: '',
    role: '',
    skills: '',
    category: 'ai',
  });

  useEffect(() => {
    const fetchAccount = async () => {
      if (!user || !accountId) return;

      try {
        const { ApiClient } = await import('@/lib/api-client');
        const [accountRes, keywordsRes, scheduleRes] = await Promise.all([
          ApiClient.get(`/api/accounts/${accountId}`),
          ApiClient.get(`/api/accounts/${accountId}/keywords`),
          ApiClient.get(`/api/accounts/${accountId}/schedule`),
        ]);

        if (accountRes.account) {
          setAccount(accountRes.account);
          setDetailsForm({
            name: accountRes.account.name || '',
            email: accountRes.account.email || '',
            bio: accountRes.account.bio || '',
            location: accountRes.account.location || '',
            role: accountRes.account.role || '',
            skills: accountRes.account.skills?.join(', ') || '',
            category: accountRes.account.category || 'ai',
          });
        }

        if (keywordsRes?.keywords) {
          setKeywordsForm({
            primaryKeywords: (keywordsRes.keywords.primaryKeywords || []).join(', '),
            secondaryKeywords: (keywordsRes.keywords.secondaryKeywords || []).join(', '),
            blockedKeywords: (keywordsRes.keywords.blockedKeywords || []).join(', '),
            tonePreset: keywordsRes.keywords.tonePreset || TonePreset.PROFESSIONAL,
            allowedIntents: keywordsRes.keywords.allowedIntents || [ContentIntent.KNOWLEDGE_SHARING],
          });
        }

        const schedule = (scheduleRes as any)?.schedule;
        if (schedule) {
          setScheduleForm({
            weekdayPostStart: schedule.weekdayPostWindow?.startTime || '09:00',
            weekdayPostEnd: schedule.weekdayPostWindow?.endTime || '17:00',
            weekendPostStart: schedule.weekendPostWindow?.startTime || '10:00',
            weekendPostEnd: schedule.weekendPostWindow?.endTime || '18:00',
            timezone: schedule.timezone || 'Asia/Karachi',
            minMinutesBetweenActions: schedule.minMinutesBetweenActions || 30,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load account';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [user, accountId]);

  const handleSaveKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    setSaving(true);
    try {
      const { ApiClient } = await import('@/lib/api-client');
      await ApiClient.post(`/api/accounts/${accountId}/keywords`, {
        accountId,
        primaryKeywords: keywordsForm.primaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
        secondaryKeywords: keywordsForm.secondaryKeywords.split(',').map(k => k.trim()).filter(Boolean),
        blockedKeywords: keywordsForm.blockedKeywords.split(',').map(k => k.trim()).filter(Boolean),
        tonePreset: keywordsForm.tonePreset,
        allowedIntents: keywordsForm.allowedIntents,
      });
      setSaving(false);
      void dialog.alert({ variant: 'success', message: 'Keywords saved successfully!' });
    } catch (err) {
      setSaving(false);
      void dialog.alert({
        variant: 'error',
        message:
          'Failed to save keywords: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    setSaving(true);
    try {
      const { ApiClient } = await import('@/lib/api-client');
      await ApiClient.post(`/api/accounts/${accountId}/schedule`, {
        accountId,
        weekdayPostWindow: {
          startTime: scheduleForm.weekdayPostStart,
          endTime: scheduleForm.weekdayPostEnd,
          enabled: true,
        },
        weekendPostWindow: {
          startTime: scheduleForm.weekendPostStart,
          endTime: scheduleForm.weekendPostEnd,
          enabled: true,
        },
        weekdayCommentWindow: { startTime: '09:00', endTime: '17:00', enabled: false },
        weekendCommentWindow: { startTime: '10:00', endTime: '18:00', enabled: false },
        timezone: scheduleForm.timezone,
        minMinutesBetweenActions: scheduleForm.minMinutesBetweenActions,
        weekdaysEnabled: [true, true, true, true, true, false, false],
      });
      setSaving(false);
      void dialog.alert({ variant: 'success', message: 'Schedule saved successfully!' });
    } catch (err) {
      setSaving(false);
      void dialog.alert({
        variant: 'error',
        message:
          'Failed to save schedule: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    setSaving(true);
    try {
      const { ApiClient } = await import('@/lib/api-client');
      const skillsArray = detailsForm.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const response = await ApiClient.post(`/api/accounts/${accountId}/details`, {
        name: detailsForm.name,
        email: detailsForm.email,
        bio: detailsForm.bio || undefined,
        location: detailsForm.location || undefined,
        role: detailsForm.role || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        category: detailsForm.category || undefined,
      });

      if (response.account) {
        setAccount(response.account);
      }
      setSaving(false);
      void dialog.alert({ variant: 'success', message: 'Account details saved successfully!' });
    } catch (err) {
      setSaving(false);
      void dialog.alert({
        variant: 'error',
        message:
          'Failed to save details: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading account...</p>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Link
              href="/dashboard/accounts"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Accounts
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Account not found'}</p>
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                href="/dashboard/accounts"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 block"
              >
                ← Back to Accounts
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{account.name}</h1>
              <p className="text-gray-600 text-sm">{account.email}</p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-8 border-t pt-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`font-medium text-sm pb-2 border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Account Details
            </button>
            <button
              onClick={() => setActiveTab('keywords')}
              className={`font-medium text-sm pb-2 border-b-2 transition-colors ${
                activeTab === 'keywords'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Keywords & Tone
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`font-medium text-sm pb-2 border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Schedule & Limits
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Details</h2>
            <form onSubmit={handleSaveDetails} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={detailsForm.name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={detailsForm.email}
                    onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Bio</label>
                <textarea
                  value={detailsForm.bio}
                  onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })}
                  placeholder="Add a short bio..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Location</label>
                  <input
                    type="text"
                    value={detailsForm.location}
                    onChange={(e) => setDetailsForm({ ...detailsForm, location: e.target.value })}
                    placeholder="e.g., New York, USA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                  <input
                    type="text"
                    value={detailsForm.role}
                    onChange={(e) => setDetailsForm({ ...detailsForm, role: e.target.value })}
                    placeholder="e.g., Developer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Skills</label>
                  <input
                    type="text"
                    value={detailsForm.skills}
                    onChange={(e) => setDetailsForm({ ...detailsForm, skills: e.target.value })}
                    placeholder="comma-separated, e.g., AI, ML, Python"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                  <select
                    value={detailsForm.category}
                    onChange={(e) => setDetailsForm({ ...detailsForm, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ai">AI</option>
                    <option value="software">Software</option>
                    <option value="startups">Startups</option>
                    <option value="product">Product</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance</option>
                    <option value="health">Health</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Daily Post Limit</label>
                  <p className="text-gray-700 py-2">{account.dailyPostLimit}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Daily Comment Limit</label>
                  <p className="text-gray-700 py-2">{account.dailyCommentLimit}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Daily Reaction Limit</label>
                  <p className="text-gray-700 py-2">{account.dailyReactionLimit}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {saving ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Keywords & Tone</h2>
            <form onSubmit={handleSaveKeywords} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Primary Keywords (comma-separated) *
                </label>
                <textarea
                  required
                  value={keywordsForm.primaryKeywords}
                  onChange={(e) => setKeywordsForm({ ...keywordsForm, primaryKeywords: e.target.value })}
                  placeholder="AI, Machine Learning, Tech..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Secondary Keywords</label>
                <textarea
                  value={keywordsForm.secondaryKeywords}
                  onChange={(e) => setKeywordsForm({ ...keywordsForm, secondaryKeywords: e.target.value })}
                  placeholder="Optional secondary keywords..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Blocked Keywords</label>
                <textarea
                  value={keywordsForm.blockedKeywords}
                  onChange={(e) => setKeywordsForm({ ...keywordsForm, blockedKeywords: e.target.value })}
                  placeholder="Keywords to avoid..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Tone Preset</label>
                <select
                  value={keywordsForm.tonePreset}
                  onChange={(e) => setKeywordsForm({ ...keywordsForm, tonePreset: e.target.value as TonePreset })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={TonePreset.PROFESSIONAL}>Professional</option>
                  <option value={TonePreset.FRIENDLY}>Friendly</option>
                  <option value={TonePreset.EDUCATIONAL}>Educational</option>
                  <option value={TonePreset.INSPIRATIONAL}>Inspirational</option>
                  <option value={TonePreset.HUMOROUS}>Humorous</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {saving ? 'Saving...' : 'Save Keywords'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Schedule & Limits</h2>
            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Timezone</label>
                  <select
                    value={scheduleForm.timezone}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Min Minutes Between Actions</label>
                  <input
                    type="number"
                    min="1"
                    value={scheduleForm.minMinutesBetweenActions}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, minMinutesBetweenActions: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekday Posting Window</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={scheduleForm.weekdayPostStart}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, weekdayPostStart: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">End Time</label>
                    <input
                      type="time"
                      value={scheduleForm.weekdayPostEnd}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, weekdayPostEnd: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekend Posting Window</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={scheduleForm.weekendPostStart}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, weekendPostStart: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">End Time</label>
                    <input
                      type="time"
                      value={scheduleForm.weekendPostEnd}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, weekendPostEnd: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
