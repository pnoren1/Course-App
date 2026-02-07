'use client';

import { useEffect, useState } from 'react';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/env';

/**
 * Component to check if environment variables are properly loaded
 * Shows a user-friendly error message if they're missing
 */
export default function EnvironmentCheck({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    try {
      // Try to get environment variables
      const url = getSupabaseUrl();
      const key = getSupabaseAnonKey();

      if (!url || !key) {
        setError('חסרים משתני סביבה נדרשים. אנא נסה לרענן את הדף.');
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Environment check failed:', err);
      setError('שגיאה בטעינת הגדרות האפליקציה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            שגיאה בטעינת האפליקציה
          </h2>
          <p className="text-center text-gray-600 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              רענן את הדף
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              נקה נתונים ורענן
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            אם הבעיה נמשכת, אנא פנה למנהל המערכת
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
