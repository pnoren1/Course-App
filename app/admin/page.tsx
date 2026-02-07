"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import SessionTimeoutProvider from '@/app/components/SessionTimeoutProvider';
import { rlsSupabase } from '@/lib/supabase';
import { useUserRole } from '@/lib/hooks/useUserRole';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

interface Stats {
  totalUsers: number;
  totalAssignments: number;
  totalUnits: number;
  pendingSubmissions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { role } = useUserRole();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAssignments: 0,
    totalUnits: 0,
    pendingSubmissions: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load users count
      const { count: usersCount } = await rlsSupabase.raw
        .from('user_profile')
        .select('*', { count: 'exact', head: true });

      // Load assignments count
      const { count: assignmentsCount } = await rlsSupabase.raw
        .from('assignments')
        .select('*', { count: 'exact', head: true });

      // Load units count
      const { count: unitsCount } = await rlsSupabase.raw
        .from('units')
        .select('*', { count: 'exact', head: true });

      // Load pending submissions count (submitted status)
      const { count: pendingCount } = await rlsSupabase.raw
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      setStats({
        totalUsers: usersCount || 0,
        totalAssignments: assignmentsCount || 0,
        totalUnits: unitsCount || 0,
        pendingSubmissions: pendingCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <SessionTimeoutProvider>
      <AdminLayout 
        title="לוח בקרה" 
        description="סקירה כללית של המערכת"
        icon={
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0a2 2 0 01-2 2H10a2 2 0 01-2-2v0z" />
          </svg>
        }
      >
      <div className="space-y-8">
        {/* Info message for org admins */}
        {role === 'org_admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">מידע למנהל אירגון</h3>
                <p className="text-sm text-blue-700 mt-1">
                  כמנהל אירגון, אתה יכול לצפות בהגשות ובהתקדמות התלמידים באירגון שלך. ניהול מטלות, יחידות, משתמשים וארגונים זמין רק למנהלי מערכת.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">ברוך הבא לפאנל הניהול</h2>
              <p className="text-sm text-slate-600">כאן תוכל לנהל את כל היבטי המערכת בצורה נוחה ומסודרת</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600">משתמשים רשומים</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loadingStats ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    stats.totalUsers
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600">מטלות פעילות</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loadingStats ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    stats.totalAssignments
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600">יחידות קורס</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loadingStats ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    stats.totalUnits
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600">הגשות ממתינות</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {loadingStats ? (
                    <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    stats.pendingSubmissions
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">ניהול משתמשים</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {role === 'org_admin' 
                ? 'רק מנהלי מערכת יכולים לנהל משתמשים'
                : 'הוספה, עריכה וניהול משתמשים ותפקידים'
              }
            </p>
            <button 
              onClick={() => role === 'admin' && router.push('/admin/users')}
              disabled={role === 'org_admin'}
              className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                role === 'org_admin'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
            >
              ניהול משתמשים
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">ניהול מטלות</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {role === 'org_admin' 
                ? 'רק מנהלי מערכת יכולים לנהל מטלות'
                : 'יצירה ועריכה של מטלות ליחידות הקורס'
              }
            </p>
            <button 
              onClick={() => role === 'admin' && router.push('/admin/assignments')}
              disabled={role === 'org_admin'}
              className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                role === 'org_admin'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-green-50 hover:bg-green-100 text-green-700'
              }`}
            >
              ניהול מטלות
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">ניהול יחידות</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {role === 'org_admin' 
                ? 'רק מנהלי מערכת יכולים לנהל יחידות'
                : 'ניהול יחידות הקורס והתוכן'
              }
            </p>
            <button 
              onClick={() => role === 'admin' && router.push('/admin/units')}
              disabled={role === 'org_admin'}
              className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                role === 'org_admin'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}
            >
              ניהול יחידות
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">ניהול הגשות</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">צפייה וניהול הגשות המטלות</p>
            <button 
              onClick={() => router.push('/admin/submissions')}
              className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              ניהול הגשות
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">ארגונים וקבוצות</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {role === 'org_admin' 
                ? 'רק מנהלי מערכת יכולים לנהל ארגונים וקבוצות'
                : 'יצירה וניהול ארגונים וקבוצות במקום אחד'
              }
            </p>
            <button 
              onClick={() => role === 'admin' && router.push('/admin/groups')}
              disabled={role === 'org_admin'}
              className={`w-full font-medium py-2 px-4 rounded-lg transition-colors ${
                role === 'org_admin'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
            >
              ניהול ארגונים וקבוצות
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-100 rounded-lg">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">התקדמות תלמידים</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">מעקב אחר סטטוס הגשות וצפייה בסרטונים</p>
            <button 
              onClick={() => router.push('/admin/student-progress')}
              className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              צפייה בהתקדמות
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">דוחות וסטטיסטיקות</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  בקרוב
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">צפייה בנתוני השימוש במערכת</p>
            <button 
              disabled
              className="w-full bg-slate-100 text-slate-400 font-medium py-2 px-4 rounded-lg cursor-not-allowed"
            >
              צפייה בדוחות
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
    </SessionTimeoutProvider>
  );
}