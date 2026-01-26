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
      'sb-lzedeawtmzfenyrewhmo-auth-token', // עם project ref הנכון
      'sb-lzedeawtmzfenyrewhmo-auth-token-code-verifier',
      'supabase-auth-token',
      'sb-access-token',
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
    
    // אם עדיין לא מצאנו, נסה לחפש בכל ה-cookies
    if (!token) {
      console.log('🍪 Available cookies:', Array.from(cookies.getAll()).map(c => c.name));
    }
  }

  return { supabase, token };
}

// פונקציה עזר לקבלת משתמש מחובר
export async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, token } = createServerSupabaseClient(request);
  
  console.log('🔑 Token found:', token ? 'Yes' : 'No');
  
  if (token) {
    try {
      // הגדרת הטוקן
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      });
      console.log('✅ Session set successfully');
    } catch (error) {
      console.error('❌ Error setting session:', error);
    }
  }

  // קבלת המשתמש
  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('👤 User from auth:', user ? { id: user.id, email: user.email } : 'No user');
  if (error) {
    console.error('❌ Auth error:', error);
  }
  
  return { user, error, supabase };
}