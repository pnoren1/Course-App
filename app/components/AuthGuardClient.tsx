"use client";

import { useEffect, useState } from "react";
import { rlsSupabase, supabaseUtils } from "@/lib/supabase";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
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
        }
      } catch (error) {
        console.error('Error checking session:', error);
        
        // Use RLS-aware error handling
        const errorInfo = supabaseUtils.getErrorMessage(error, {
          component: 'auth-guard',
          operation: 'getSession'
        });
        
        // If authentication is required, redirect to login
        if (errorInfo.message.includes('Authentication') || errorInfo.message.includes('התחבר')) {
          router.push("/login?error=session_error");
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [pathname, router, searchParams]);

  if (loading && pathname !== "/login") return null;
  return <>{children}</>;
}
