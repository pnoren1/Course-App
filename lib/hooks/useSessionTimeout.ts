"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseUtils } from '../supabase';

interface UseSessionTimeoutOptions {
  /**
   * זמן מקסימלי לסשן במילישניות
   * ברירת מחדל: 30 דקות
   */
  maxSessionTime?: number;
  
  /**
   * תדירות בדיקה במילישניות
   * ברירת מחדל: 5 דקות
   */
  checkInterval?: number;
  
  /**
   * האם להפעיל את הבדיקה
   * ברירת מחדל: true
   */
  enabled?: boolean;
  
  /**
   * callback שיופעל לפני יציאה
   */
  onBeforeLogout?: () => void;
  
  /**
   * נתיב להפניה לאחר יציאה
   * ברירת מחדל: /login
   */
  redirectPath?: string;
}

/**
 * Hook לניהול תוקף סשן אוטומטי
 * בודק את תוקף הסשן במרווחי זמן קבועים ומבצע logout אוטומטי
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    maxSessionTime = 30 * 60 * 1000, // 30 דקות
    checkInterval = 5 * 60 * 1000,   // 5 דקות
    enabled = true,
    onBeforeLogout,
    redirectPath = '/login'
  } = options;

  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const checkSession = async () => {
      try {
        const { expired } = await supabaseUtils.checkSessionExpiry(maxSessionTime);
        
        if (expired) {
          console.log('Session expired - logging out');
          
          // קריאה ל-callback לפני יציאה
          if (onBeforeLogout) {
            onBeforeLogout();
          }
          
          // ניקוי interval
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          
          // הפניה לדף התחברות
          router.push(redirectPath);
        }
      } catch (error) {
        console.error('Error checking session expiry:', error);
      }
    };

    // בדיקה ראשונית
    checkSession();

    // הגדרת interval לבדיקות תקופתיות
    intervalRef.current = setInterval(checkSession, checkInterval);

    // ניקוי בעת unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, maxSessionTime, checkInterval, onBeforeLogout, redirectPath, router]);
}

/**
 * Hook פשוט יותר עם הגדרות ברירת מחדל
 * מומלץ לשימוש ברוב המקרים
 */
export function useAutoLogout() {
  useSessionTimeout({
    maxSessionTime: 30 * 60 * 1000, // 30 דקות
    checkInterval: 5 * 60 * 1000,   // בדיקה כל 5 דקות
    enabled: true
  });
}
