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
  
  console.log('🔍 Auth header:', authHeader ? 'Present' : 'Not found');
  
  if (!token) {
    // נסה למצוא טוקן ב-cookies
    const cookies = request.cookies;
    
    // Get the actual project reference from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let projectRef = 'lzedeawtmzfenyrewhmo'; // default fallback
    
    if (supabaseUrl) {
      const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match) {
        projectRef = match[1];
      }
    }
    
    // רשימת שמות cookies אפשריים של Supabase
    const possibleCookieNames = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token-code-verifier`,
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
            console.log('✅ Found access_token in JSON cookie');
            break;
          }
        } catch {
          // אם זה לא JSON, אולי זה הטוקן עצמו
          if (cookieValue.startsWith('eyJ')) { // JWT token starts with eyJ
            token = cookieValue;
            console.log('✅ Found JWT token directly in cookie');
            break;
          }
        }
      }
    }
    
    // אם עדיין לא מצאנו, נסה לחפש בכל ה-cookies שמתחילים ב-sb-
    if (!token) {
      // חיפוש בכל ה-cookies שמתחילים ב-sb-
      for (const cookie of cookies.getAll()) {
        if (cookie.name.startsWith('sb-') && cookie.value) {
          try {
            const parsed = JSON.parse(cookie.value);
            if (parsed.access_token) {
              token = parsed.access_token;
              console.log('🎯 Found token in sb- cookie');
              break;
            }
          } catch {
            // ignore parsing errors
          }
        }
      }
    }
  }

  console.log('🔍 Final token status:', token ? 'Found' : 'Not found');

  return { supabase, token };
}

// פונקציה עזר לקבלת משתמש מחובר
export async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, token } = createServerSupabaseClient(request);
  
  console.log('🔑 Token found:', token ? 'Yes' : 'No');
  
  if (!token) {
    console.log('❌ No token found in request');
    
    // Try to get token from session cookie as fallback
    const cookies = request.cookies;
    const sessionCookie = cookies.get('sb-lzedeawtmzfenyrewhmo-auth-token');
    
    if (sessionCookie?.value) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        if (sessionData.access_token) {
          console.log('🔄 Found token in session cookie');
          const { data: { user }, error } = await supabase.auth.getUser(sessionData.access_token);
          
          if (user && !error) {
            console.log('✅ User authenticated via session cookie');
            return { user, error: null, supabase };
          }
        }
      } catch (parseError) {
        console.log('❌ Error parsing session cookie');
      }
    }
    
    return { user: null, error: { message: 'No authentication token found' }, supabase };
  }

  try {
    // הגדרת הטוקן
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('👤 User from auth:', user ? 'Found' : 'No user');
    if (error) {
      console.error('❌ Auth error:', error.message);
    }
    
    return { user, error, supabase };
  } catch (error) {
    console.error('❌ Error in getAuthenticatedUser');
    return { user: null, error, supabase };
  }
}