import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { Database } from './types/database.types';

// יצירת Supabase client עבור server-side עם טיפול בטוקנים
export function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // קבלת הטוקן מה-Authorization header או מ-cookies
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    // נסה למצוא טוקן ב-cookies
    const cookies = request.cookies;
    
    // רשימת שמות cookies אפשריים של Supabase
    const possibleCookieNames = [
      'sb-access-token',
      'supabase-auth-token',
      'sb-lzedeawtmzfenyrewhmo-auth-token', // עם project ref
      'supabase.auth.token'
    ];
    
    for (const cookieName of possibleCookieNames) {
      const cookieValue = cookies.get(cookieName)?.value;
      if (cookieValue) {
        try {
          // אם זה JSON, נסה לחלץ את הטוקן
          const parsed = JSON.parse(cookieValue);
          if (parsed.access_token) {
            token = parsed.access_token;
            break;
          }
        } catch {
          // אם זה לא JSON, אולי זה הטוקן עצמו
          token = cookieValue;
          break;
        }
      }
    }
  }

  return { supabase, token };
}

// פונקציה עזר לקבלת משתמש מחובר
export async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, token } = createServerSupabaseClient(request);
  
  if (token) {
    try {
      // הגדרת הטוקן
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      });
    } catch (error) {
      console.error('Error setting session:', error);
    }
  }

  // קבלת המשתמש
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return { user, error, supabase };
}