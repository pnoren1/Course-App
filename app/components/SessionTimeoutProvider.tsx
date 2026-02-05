"use client";

import { useAutoLogout } from '@/lib/hooks/useSessionTimeout';

/**
 * קומפוננטה שמפעילה את בדיקת תוקף הסשן
 * צריך להוסיף אותה ב-layout או בדפים מוגנים
 */
export default function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  // הפעלת בדיקת תוקף סשן אוטומטית
  useAutoLogout();
  
  return <>{children}</>;
}
