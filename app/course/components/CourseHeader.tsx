"use client";

import { UserInfo } from "@/app/components/UserRoleBadge";
import MiniSubmissionStatus from "./MiniSubmissionStatus";
import VideoGradeDisplay from "@/app/components/VideoGradeDisplay";
import Link from "next/link";

type Props = {
  onSignOut: () => void;
  userRoleData: {
    role: any;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
  onToggleSubmissionDetails?: () => void;
};

export default function CourseHeader({ onSignOut, userRoleData, onToggleSubmissionDetails }: Props) {
  // השתמש בנתונים מה-props במקום לקרוא מהדטאבייס
  const { role, userName: roleUserName } = userRoleData;
  const userName = roleUserName;
  
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

            <div className="flex flex-col items-end gap-3 pt-2">
              {/* User Info Section with integrated sign out - Using vertical layout to prevent line wrapping */}
              <UserInfo 
                userName={userName || userRoleData.userName || undefined} 
                showRole={true} 
                showOrganization={true} 
                size="sm" 
                layout="vertical"
                showSignOut={true}
                onSignOut={onSignOut}
                userRoleData={userRoleData}
              />
            </div>
          </div>
        </div>

        {/* Bottom Stats Bar */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-25 border-t border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Admin Panel Link - moved to left side */}
              {(role === 'admin' || role === 'org_admin') && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-900 rounded-xl font-medium text-sm transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>ניהול</span>
                </Link>
              )}
              
              <Link
                href="/course/about"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 hover:text-indigo-900 rounded-xl font-medium text-sm transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>אודות הקורס - הנחיות</span>
              </Link>
              <a
                href="https://lzedeawtmzfenyrewhmo.supabase.co/storage/v1/object/sign/general/course.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jNDZmMTNjZC02OTUyLTRkZTItODRhMC1lZmM3MWIxY2U2NTciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJnZW5lcmFsL2NvdXJzZS5wZGYiLCJpYXQiOjE3Njg2ODE1NzYsImV4cCI6MTgwMDIxNzU3Nn0.opJMMSnVUuFF7_aLWzVXNDUaUK8KazjTRU31nSw1ZW4"
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
              {/* Video Grading Summary - visible for all users */}
              {userRoleData.userId && (
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <VideoGradeDisplay 
                    userId={userRoleData.userId}
                    showDetails={false}
                    isAdmin={role === 'admin' || role === 'org_admin'}
                  />
                </div>
              )}
              
              {/* Mini Submission Status - visible for all users */}
              {userRoleData.userId && (
                <MiniSubmissionStatus 
                  userId={userRoleData.userId} 
                  onToggleDetails={onToggleSubmissionDetails}
                />
              )}
              
              {/* <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium">קורס בסיס + מתקדם</span>
              </div> */}
              {/* <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">למידה עצמית</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}