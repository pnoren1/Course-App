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
    <header className="flex items-start justify-between gap-6 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">קורס AWS</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">שיעורים מוקלטים — צפייה בסדר קבוע</p>
      </div>

      <div className="flex items-center gap-3">
        {userName && <div>שלום, {userName}</div>}
        <button
          onClick={onSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md shadow-sm active:shadow-md transform transition duration-150 ease-in-out active:scale-95 active:translate-y-0.5 cursor-pointer active:cursor-grabbing select-none focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 14l5-5-5-5v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>יציאה</span>
        </button>
      </div>
    </header>
  );
}