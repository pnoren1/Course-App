"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rlsSupabase } from '@/lib/supabase';
import { UserInfo } from '@/app/components/UserRoleBadge';
import AdminNavigation from '@/app/components/AdminNavigation';
import AdminBreadcrumb from '@/app/components/AdminBreadcrumb';
import SubmissionNotifications from '@/app/components/SubmissionNotifications';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function AdminLayout({ children, title, description, icon }: AdminLayoutProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { user } = await rlsSupabase.getCurrentUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { isAdmin: adminStatus } = await rlsSupabase.isAdmin();
      
      // בדיקה נוספת אם המשתמש הוא מנהל ארגון
      let hasAdminAccess = adminStatus;
      if (!adminStatus) {
        const { user: currentUser } = await rlsSupabase.getCurrentUser();
        if (currentUser) {
          try {
            const { data: profile, error } = await rlsSupabase.from('user_profile')
              .select('*')
              .eq('user_id', currentUser.id)
              .single();
            
            if (error) {
              console.error('Error fetching user profile:', error);
            } else {
              hasAdminAccess = (profile as any)?.role === 'org_admin';
            }
          } catch (error) {
            console.error('Error checking user role:', error);
          }
        }
      }
      
      setIsAdmin(hasAdminAccess);
      
      if (!hasAdminAccess) {
        router.push('/course');
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await rlsSupabase.raw.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">בודק הרשאות...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {icon && (
                <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl border border-blue-200">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                {description && <p className="text-sm text-slate-600">{description}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <SubmissionNotifications />
              <UserInfo showRole={true} size="sm" />
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/course')}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  לקורס
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  יציאה
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <AdminNavigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminBreadcrumb />
        {children}
      </main>
    </div>
  );
}