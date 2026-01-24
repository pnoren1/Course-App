"use client";

import { useEffect, useState } from "react";
import { rlsSupabase, supabaseUtils } from "@/lib/supabase";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import UserRoleBadge from "./UserRoleBadge";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Skip auth check for login page
        if (pathname === "/login") {
          setLoading(false);
          return;
        }

        const { data } = await rlsSupabase.raw.auth.getSession();
        
        if (!data.session) {
          // בדיקה אם המשתמש חזר מאימות גוגל (יש לו query parameters של supabase)
          const hasAuthParams = searchParams.has('access_token') || searchParams.has('error');
          const isFromCourse = pathname === "/course";
          
          let redirectUrl = "/login";
          
          if (isFromCourse && hasAuthParams) {
            // המשתמש חזר מאימות גוגל אבל אין לו session - כנראה לא מורשה
            redirectUrl = "/login?error=unauthorized&from=google_auth";
          } else if (isFromCourse) {
            // המשתמש הגיע לקורס בלי אימות
            redirectUrl = "/login?error=unauthorized&from=course";
          }
          
          router.push(redirectUrl);
        } else {
          // אם המשתמש מחובר, נציג את מידע התפקיד לכמה שניות
          if (pathname === "/course") {
            setShowRoleInfo(true);
            setTimeout(() => setShowRoleInfo(false), 3000);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        
        // Use RLS-aware error handling
        const errorMessage = supabaseUtils.getErrorMessage(error, {
          component: 'auth-guard',
          operation: 'getSession'
        });
        
        // If authentication is required, redirect to login
        if (errorMessage?.includes('Authentication') || errorMessage?.includes('התחבר')) {
          router.push("/login?error=session_error");
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [pathname, router, searchParams]);

  if (loading && pathname !== "/login") return null;
  
  return (
    <>
      {/* Role info notification */}
      {showRoleInfo && pathname === "/course" && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-4 animate-in slide-in-from-right-5 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-slate-600">התחברת בהצלחה כ:</span>
            <UserRoleBadge size="sm" />
          </div>
        </div>
      )}
      {children}
    </>
  );
}
