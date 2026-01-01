"use client";

import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";

type Props = {
  onSignOut: () => void;
};

export default function CourseHeader({ onSignOut }: Props) {
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(
        data.user?.user_metadata?.full_name ??
        data.user?.email ??
        null
      )
    })
  }, [])
  
  return (
    <header className="mb-10">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/50">
              <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-1">קורס AWS</h1>
              <p className="text-sm text-slate-600 leading-relaxed">שיעורים מוקלטים — צפייה בסדר קבוע</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userName && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border border-slate-200/60 rounded-lg">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-slate-700 font-medium">שלום, {userName}</span>
              </div>
            )}
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 text-slate-700 hover:text-slate-900 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>יציאה</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}