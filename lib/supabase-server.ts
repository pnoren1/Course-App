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
    
    console.log('🍪 Available cookies:', Array.from(cookies.getAll()).map(c => ({ 
      name: c.name, 
      hasValue: !!c.value,
      valueStart: c.value ? c.value.substring(0, 20) + '...' : 'empty'
    })));
    
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
        console.log(`🎯 Checking cookie ${cookieName}:`, cookieValue.substring(0, 50) + '...');
        try {
          // אם זה JSON, נסה לחלץ את הטוקן
          const parsed = JSON.parse(cookieValue);
          if (parsed.access_token) {
            token = parsed.access_token;
            console.log('✅ Found access_token in JSON cookie:', cookieName);
            break;
          }
        } catch {
          // אם זה לא JSON, אולי זה הטוקן עצמו
          if (cookieValue.startsWith('eyJ')) { // JWT token starts with eyJ
            token = cookieValue;
            console.log('✅ Found JWT token directly in cookie:', cookieName);
            break;
          }
        }
      }
    }
    
    // אם עדיין לא מצאנו, נסה לחפש בכל ה-cookies שמתחילים ב-sb-
    if (!token) {
      console.log('🔍 Searching all sb- cookies...');
      
      // חיפוש בכל ה-cookies שמתחילים ב-sb-
      for (const cookie of cookies.getAll()) {
        if (cookie.name.startsWith('sb-') && cookie.value) {
          console.log(`🔍 Checking sb- cookie ${cookie.name}:`, cookie.value.substring(0, 50) + '...');
          try {
            const parsed = JSON.parse(cookie.value);
            if (parsed.access_token) {
              token = parsed.access_token;
              console.log('🎯 Found token in cookie:', cookie.name);
              break;
            }
          } catch {
            // ignore parsing errors
          }
        }
      }
    }
  }

  console.log('🔍 Final token status:', token ? `Found (${token.substring(0, 20)}...)` : 'Not found');
  return { supabase, token };
}

// פונקציה עזר לקבלת משתמש מחובר
export async function getAuthenticatedUser(request: NextRequest) {
  const { supabase, token } = createServerSupabaseClient(request);
  
  console.log('🔑 Token found:', token ? 'Yes' : 'No');
  
  if (!token) {
    console.log('❌ No token found in request');
    return { user: null, error: { message: 'No authentication token found' }, supabase };
  }

  try {
    // הגדרת הטוקן
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('👤 User from auth:', user ? { id: user.id, email: user.email } : 'No user');
    if (error) {
      console.error('❌ Auth error:', error);
    }
    
    return { user, error, supabase };
  } catch (error) {
    console.error('❌ Error in getAuthenticatedUser:', error);
    return { user: null, error, supabase };
  }
}