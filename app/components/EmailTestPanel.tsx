"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EmailTestPanelProps {
  className?: string;
}

export default function EmailTestPanel({ className = '' }: EmailTestPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    connectionStatus?: string;
  } | null>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testEmail.trim()) {
      setResult({
        success: false,
        message: 'נדרש להזין כתובת מייל לבדיקה'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Sending request to /api/admin/test-email');
      
      // Debug: Check all cookies
      console.log('All cookies:', document.cookie);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session data:', session ? { 
        hasAccessToken: !!session.access_token,
        tokenStart: session.access_token?.substring(0, 20) + '...',
        expiresAt: session.expires_at,
        user: session.user ? { id: session.user.id, email: session.user.email } : null
      } : 'No session');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Adding auth header with token');
      } else {
        console.warn('No session token found');
      }
      
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ testEmail: testEmail.trim() })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        console.error('Response not ok:', response.status, response.statusText);
      }

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Response is not JSON:', text);
        setResult({
          success: false,
          message: `שגיאה: השרת החזיר תגובה לא תקינה (${response.status})`
        });
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      setResult(data);

    } catch (error) {
      console.error('Error testing email:', error);
      setResult({
        success: false,
        message: 'שגיאה בבדיקת המייל'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestSimple = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('Testing simple API endpoint');
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Simple test session data:', session ? { 
        hasAccessToken: !!session.access_token,
        tokenStart: session.access_token?.substring(0, 20) + '...',
        expiresAt: session.expires_at,
        user: session.user ? { id: session.user.id, email: session.user.email } : null
      } : 'No session');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('Adding auth header with token for simple test');
      } else {
        console.warn('No session token found for simple test');
      }
      
      const response = await fetch('/api/admin/test-simple', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ test: 'simple test' })
      });

      console.log('Simple test response status:', response.status);
      
      const contentType = response.headers.get('content-type');
      console.log('Simple test Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Simple test response is not JSON:', text);
        setResult({
          success: false,
          message: `שגיאה בבדיקה פשוטה: השרת החזיר תגובה לא תקינה (${response.status})`
        });
        return;
      }

      const data = await response.json();
      console.log('Simple test response data:', data);
      setResult({
        success: data.success,
        message: data.success ? 'בדיקה פשוטה עברה בהצלחה - ה-API עובד' : 'בדיקה פשוטה נכשלה'
      });

    } catch (error) {
      console.error('Error in simple test:', error);
      setResult({
        success: false,
        message: 'שגיאה בבדיקה פשוטה'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        בדיקת מייל
      </button>
    );
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-white rounded-lg border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl animate-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">בדיקת הגדרות מייל</h3>
                  <p className="text-sm text-slate-600">בדיקת חיבור ושליחת מייל בדיקה</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">הערה:</p>
                  <p>בדיקה זו תבדוק את החיבור לשרת המייל ותשלח מייל בדיקה לכתובת שתזין. ודא שהגדרת את משתני הסביבה הנדרשים ב-.env.local</p>
                </div>
              </div>
            </div>

            {result && (
              <div className={`mb-4 p-3 border rounded-lg ${
                result.success 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex items-start gap-2">
                  <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    result.success ? 'text-green-600' : 'text-red-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={
                      result.success 
                        ? "M5 13l4 4L19 7" 
                        : "M6 18L18 6M6 6l12 12"
                    } />
                  </svg>
                  <div className="text-sm">
                    <p className="font-medium">{result.success ? 'הצלחה!' : 'שגיאה'}</p>
                    <p>{result.message}</p>
                    {result.connectionStatus && (
                      <p className="mt-1 text-xs opacity-75">
                        סטטוס חיבור: {result.connectionStatus}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleTestEmail} className="space-y-4">
              <div>
                <label htmlFor="testEmail" className="block text-sm font-medium text-slate-700 mb-1">
                  כתובת מייל לבדיקה *
                </label>
                <input
                  type="email"
                  id="testEmail"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  מייל בדיקה יישלח לכתובת זו עם תבנית ברוכים הבאים
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    const { data: { user } } = await supabase.auth.getUser();
                    console.log('Auth Status Check:', {
                      hasSession: !!session,
                      hasUser: !!user,
                      sessionExpiry: session?.expires_at,
                      userEmail: user?.email,
                      cookies: document.cookie
                    });
                    alert(`Session: ${!!session}, User: ${!!user}, Email: ${user?.email || 'None'}`);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  בדיקת אימות
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/admin/debug-all-profiles', {
                        method: 'GET',
                        credentials: 'include'
                      });
                      
                      const data = await response.json();
                      console.log('All profiles result:', data);
                      
                      if (data.success) {
                        console.table(data.profiles);
                        console.table(data.authUsers);
                        
                        const profilesInfo = data.profiles.map(p => 
                          `${p.user_email || p.email} (${p.user_id.substring(0, 8)}...) - ${p.role}`
                        ).join('\n');
                        
                        alert(`נמצאו ${data.profileCount} פרופילים ו-${data.authUserCount} משתמשי auth:\n\nפרופילים:\n${profilesInfo}\n\nראה Console לפרטים מלאים`);
                        console.log(`נמצאו ${data.profileCount} פרופילים ו-${data.authUserCount} משתמשי auth:\n\nפרופילים:\n${profilesInfo}\n\nראה Console לפרטים מלאים`);
                      } else {
                        alert(`שגיאה: ${data.error}\nפרטים: ${data.details || 'אין פרטים נוספים'}`);
                      }
                    } catch (error) {
                      alert(`שגיאה: ${error}`);
                    }
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  הצג כל הפרופילים
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const headers: Record<string, string> = {
                        'Content-Type': 'application/json'
                      };
                      
                      if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                      }
                      
                      const response = await fetch('/api/admin/debug-my-exact-profile', {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({})
                      });
                      
                      const data = await response.json();
                      console.log('My exact profile result:', data);
                      
                      if (data.success) {
                        const { results } = data;
                        alert(`חיפוש עבור: ${data.searchEmail} (${data.searchUserId})

חיפוש לפי User ID: ${results.byId.count} תוצאות
חיפוש לפי Email: ${results.byEmail.count} תוצאות  
חיפוש לפי User Email: ${results.byUserEmail.count} תוצאות

ראה Console לפרטים מלאים`);
                      } else {
                        alert(`שגיאה: ${data.error}\nפרטים: ${data.details || 'אין פרטים נוספים'}`);
                      }
                    } catch (error) {
                      alert(`שגיאה: ${error}`);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  חפש את הפרופיל שלי
                </button>
                
                <button
                  type="button"
                  onClick={handleTestSimple}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? 'בודק...' : 'בדיקה פשוטה'}
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      בודק חיבור ושולח מייל...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      שליחת מייל בדיקה
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  סגירה
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">הגדרת משתני סביבה נדרשים:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>EMAIL_HOST - כתובת שרת המייל</li>
                    <li>EMAIL_PORT - פורט השרת (587 או 465)</li>
                    <li>EMAIL_USER - שם משתמש למייל</li>
                    <li>EMAIL_PASS - סיסמת אפליקציה</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}