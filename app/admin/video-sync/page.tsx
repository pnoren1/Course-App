"use client";

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { rlsSupabase } from '@/lib/supabase';

interface SyncStatus {
  counts: {
    lessons: number;
    video_lessons: number;
    viewing_sessions: number;
  };
  samples: {
    lessonsWithVideo: any[];
    videoLessons: any[];
  };
  recommendations: {
    needsSync: boolean;
    message: string;
  };
}

interface SyncResult {
  message: string;
  synced: number;
  skipped: number;
  errors: string[];
  total: number;
}

export default function VideoSyncPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current session for authentication
      const { data: { session } } = await rlsSupabase.auth.getSession();
      
      const response = await fetch('/api/debug/video-lessons-status', {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSyncResult(null);
      
      // Get current session for authentication
      const { data: { session } } = await rlsSupabase.auth.getSession();
      
      const response = await fetch('/api/debug/sync-video-lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setSyncResult(result);
      
      // Refresh status after sync
      await fetchStatus();
    } catch (err) {
      console.error('Error running sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to run sync');
    } finally {
      setSyncing(false);
    }
  };

  const testVideoSession = async (lessonId: number) => {
    try {
      setTesting(true);
      setError(null);
      setTestResult(null);
      
      // Get current session for authentication
      const { data: { session } } = await rlsSupabase.auth.getSession();
      
      const response = await fetch('/api/debug/test-video-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({ lesson_id: lessonId })
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (!result.success) {
        setError(`Test failed: ${result.result?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error testing video session:', err);
      setError(err instanceof Error ? err.message : 'Failed to test video session');
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <AdminLayout 
      title="סנכרון וידאו" 
      description="ניהול סנכרון בין טבלאות השיעורים ושיעורי הוידאו למעקב וידאו"
      icon={
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">סנכרון שיעורי וידאו</h1>
          <p className="text-gray-600">
            ניהול סנכרון בין טבלאות השיעורים ושיעורי הוידאו למעקב וידאו.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">שגיאה</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">סטטוס נוכחי</h2>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
              >
                {loading ? 'מרענן...' : 'רענן'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-600">טוען סטטוס...</span>
              </div>
            ) : status ? (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{status.counts.lessons}</div>
                    <div className="text-sm text-blue-800">סה"כ שיעורים</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{status.counts.video_lessons}</div>
                    <div className="text-sm text-green-800">שיעורי וידאו</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{status.counts.viewing_sessions}</div>
                    <div className="text-sm text-purple-800">סשני צפייה</div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${status.recommendations.needsSync ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-start">
                    {status.recommendations.needsSync ? (
                      <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <div>
                      <h3 className={`text-sm font-medium ${status.recommendations.needsSync ? 'text-yellow-800' : 'text-green-800'}`}>
                        {status.recommendations.needsSync ? 'Sync Required' : 'Status OK'}
                      </h3>
                      <p className={`text-sm mt-1 ${status.recommendations.needsSync ? 'text-yellow-700' : 'text-green-700'}`}>
                        {status.recommendations.message}
                      </p>
                    </div>
                  </div>
                </div>

                {status.samples.lessonsWithVideo.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Sample Lessons with Videos</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        {status.samples.lessonsWithVideo.map((lesson) => (
                          <div key={lesson.id} className="text-sm">
                            <span className="font-medium">#{lesson.id}</span> - {lesson.title}
                            <div className="text-gray-600 text-xs mt-1">
                              URL: {lesson.embedUrl || lesson.embed_url}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Sync Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Video Lessons</h2>
            <p className="text-gray-600 mb-4">
              This will copy lessons with Spotlightr videos to the video_lessons table for tracking.
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={runSync}
                disabled={syncing || !status?.recommendations.needsSync}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? 'Syncing...' : 'Run Sync'}
              </button>
              
              {status?.samples.lessonsWithVideo.length > 0 && (
                <button
                  onClick={() => testVideoSession(status.samples.lessonsWithVideo[0].id)}
                  disabled={syncing || testing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? 'Testing...' : 'Test Video Session'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>
              
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start">
                  {testResult.success ? (
                    <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div>
                    <h3 className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Test Passed' : 'Test Failed'}
                    </h3>
                    <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </p>
                    {testResult.result && (
                      <div className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                        <pre>{JSON.stringify(testResult.result, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Results */}
        {syncResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync Results</h2>
              
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{syncResult.total}</div>
                  <div className="text-xs text-blue-800">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{syncResult.synced}</div>
                  <div className="text-xs text-green-800">Synced</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{syncResult.skipped}</div>
                  <div className="text-xs text-yellow-800">Skipped</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{syncResult.errors.length}</div>
                  <div className="text-xs text-red-800">Errors</div>
                </div>
              </div>

              {syncResult.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Errors</h3>
                  <div className="bg-red-50 rounded-lg p-3">
                    <ul className="text-sm text-red-700 space-y-1">
                      {syncResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

          {syncResult && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm text-green-800 font-medium">{syncResult.message}</p>
                  <p className="text-xs text-green-700 mt-1">
                    מעקב הוידאו אמור לעבוד כעת. תוכל לחזור לדף הקורס ולנסות לצפות בסרטונים.
                  </p>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}