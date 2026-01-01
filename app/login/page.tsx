"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleSignIn from "./components/GoogleSignIn";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <p className="text-sm text-slate-600 leading-relaxed">יש להתחבר כדי להמשיך את הלמידה שלך</p>
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
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
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

        {/* <hr className="my-6 border-gray-200" />

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const email = e.currentTarget.email.value;
            const password = e.currentTarget.password.value;

            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            setLoading(false);

            if (error) {
              setError(error.message ?? "שגיאה בהתחברות, אנא נסי שוב.");
              return;
            }

            // כניסה הצליחה — נווט ל /course
            router.push('/course');
          }}
        >
          <label className="sr-only" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            placeholder="Email"
            required
            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <label className="sr-only" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? "bg-primary-300 cursor-not-allowed" : "btn-primary"}`}
          >
            {loading ? "מתחבר..." : "כניסה"}
          </button>

          {error && (
            <div role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form> */}
      </div>
    </main>
  );
}
