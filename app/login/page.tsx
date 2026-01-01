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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full card" dir="rtl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">כניסה לקורס</h2>

        <GoogleSignIn onError={(msg) => setError(msg)} />

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
