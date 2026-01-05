"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  redirectTo?: string;
  onError?: (msg: string) => void;
};

export default function GoogleSignIn({ redirectTo = "/course", onError }: Props) {
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleClick = async () => {
    try {
      setOauthLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${location.origin}${redirectTo}` },
      });

      if (error) {
        onError?.(error.message ?? "שגיאה בהתחברות עם Google, אנא נסו שוב.");
        setOauthLoading(false);
      }
      // On success Supabase will redirect the browser
    } catch (err) {
      onError?.("שגיאה בהתחברות עם Google, אנא נסו שוב.");
      setOauthLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={oauthLoading}
      aria-label="התחברות עם Google"
      className={`w-full inline-flex justify-center items-center gap-3 transition-all duration-200 ${
        oauthLoading 
          ? "bg-slate-50 cursor-not-allowed border-slate-200 text-slate-400" 
          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm hover:shadow-md"
      } border font-medium py-3.5 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
    >
      <svg 
        className={`w-5 h-5 transition-opacity duration-200 ${oauthLoading ? 'opacity-50' : 'opacity-100'}`} 
        viewBox="0 0 533.5 544.3" 
        xmlns="http://www.w3.org/2000/svg" 
        aria-hidden 
        focusable="false"
      >
        <path fill="#4285F4" d="M533.5 278.4c0-18.1-1.6-35.4-4.6-52.4H272v99.1h146.9c-6.4 34.6-26.3 63.9-56.1 83.4v69.6h90.7c53.1-48.9 83.9-121 83.9-199.7z" />
        <path fill="#34A853" d="M272 544.3c75.6 0 139.2-24.9 185.6-67.6l-90.7-69.6c-25.2 17-57.5 27.1-94.9 27.1-72.9 0-134.7-49.2-156.9-115.5H23.9v72.6C70.3 480 163.9 544.3 272 544.3z" />
        <path fill="#FBBC05" d="M115.1 322.7c-5.6-16.8-8.8-34.7-8.8-53s3.2-36.2 8.8-53V144.1H23.9C8.5 179.8 0 219.1 0 266.5s8.5 86.7 23.9 122.4l91.2-66.2z" />
        <path fill="#EA4335" d="M272 108.6c40.9 0 77.6 14.1 106.7 41l80-80.1C408.7 24.6 344.1 0 272 0 163.9 0 70.3 64.3 23.9 159.8l91.2 66.2C137.3 157.8 199.1 108.6 272 108.6z" />
      </svg>
      <span className="text-sm font-medium">
        {oauthLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            מתחבר...
          </span>
        ) : (
          "התחברות עם Google"
        )}
      </span>
    </button>
  );
}
