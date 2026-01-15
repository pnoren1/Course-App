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
    <header className="mb-12">
      <div className="bg-gradient-to-r from-white via-white to-slate-50 rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Main Header Content */}
        <div className="p-8 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 via-indigo-50 to-blue-50 rounded-3xl border-2 border-indigo-200 shadow-sm">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="pt-2">
                <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">קורס AWS</h1>
                {/* <p className="text-base text-slate-600 leading-relaxed mb-3">שיעורים מוקלטים — צפייה בסדר קבוע</p> */}
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    פעיל
                  </span>
                  <span className="text-sm text-slate-500">
                    עודכן לאחרונה: ינואר 2026
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {userName && (
                <div className="inline-flex items-center gap-2 px-4 py-2 text-slate-600">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm text-slate-700 font-medium">שלום, {userName}</span>
                </div>
              )}
              <button
                onClick={onSignOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>יציאה</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-25 border-t border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/course/about"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 hover:text-indigo-900 rounded-xl font-medium text-sm transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>אודות הקורס - הנחיות</span>
              </a>
              <a
                // href="https://lzedeawtmzfenyrewhmo.supabase.co/storage/v1/object/sign/general/course.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jNDZmMTNjZC02OTUyLTRkZTItODRhMC1lZmM3MWIxY2U2NTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnZW5lcmFsL2NvdXJzZS5wZGYiLCJpYXQiOjE3Njg1MTU3MDUsImV4cCI6MjA4Mzg3NTcwNX0.qUsFqh4lr6yg9UyYnhCeq_rf3w2wWFpleUMowmNYSbs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 hover:text-purple-900 rounded-xl font-medium text-sm transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>מצגת הקורס</span>
              </a>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium">קורס בסיס + מתקדם</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">למידה עצמית</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}