"use client";

import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import GoogleSignIn from "./components/GoogleSignIn";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // בדיקה אם המשתמש הגיע עם שגיאת הרשאה
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const fromParam = searchParams.get('from');
    
    if (errorParam === 'unauthorized') {
      if (fromParam === 'google_auth') {
        setError('האימות עם Google הצליח, אבל החשבון שלך לא מורשה לגשת למערכת. יש לפנות למנהל המערכת או לנסות להתחבר עם חשבון אחר.');
      } else if (fromParam === 'course') {
        // setError('נראה שהחשבון שלך לא מורשה לגשת למערכת. אנא פנה למנהל המערכת או נסה להתחבר עם חשבון אחר.');
      }
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full" dir="rtl">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">כניסה למערכת הקורסים</h1>
          <p className="text-sm text-slate-600 leading-relaxed">יש להתחבר כדי להמשיך את הלמידה</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <GoogleSignIn onError={(msg) => setError(msg)} />

          {error && (
            <div role="alert" className="mt-6 rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-700 leading-relaxed mb-3">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                  >
                    ניסיון חוזר
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            בהתחברות אתה מסכים/ה לתנאי השימוש ומדיניות הפרטיות
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">טוען...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}