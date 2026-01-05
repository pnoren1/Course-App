"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && pathname !== "/login") {
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
      setLoading(false);
    });
  }, [pathname, router, searchParams]);

  if (loading) return null;
  return <>{children}</>;
}
