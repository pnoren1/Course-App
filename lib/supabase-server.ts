import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { Database } from './types/database.types';

// יצירת Supabase client עבור server-side עם טיפול בטוקנים
export function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
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
    
    // Get the actual project reference from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let projectRef = 'lzedeawtmzfenyrewhmo'; // default fallback
    
    if (supabaseUrl) {
      const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match) {
        projectRef = match[1];
        console.log('🎯 Detected project ref:', projectRef);
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
    
    console.log('🔍 Looking for cookies:', possibleCookieNames);
    
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
  
  // יצירת הלקוח עם הטוקן
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : {}
    }
  });
  
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
            console.log('✅ User authenticated via session cookie:', { id: user.id, email: user.email });
            return { user, error: null, supabase };
          }
        }
      } catch (parseError) {
        console.log('❌ Error parsing session cookie:', parseError);
      }
    }
    
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

// Helper function to authenticate user with proper token handling
export async function authenticateRequest(request: NextRequest) {
  const { supabase, token } = createServerSupabaseClient(request);
  
  console.log('🔐 Authenticating request with token:', token ? 'Present' : 'Missing');
  
  // Use token if available, otherwise fall back to default auth
  const { data: { user }, error: authError } = token 
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();
    
  if (authError || !user) {
    console.error('❌ Authentication failed:', authError?.message || 'No user found');
    return { user: null, error: authError, supabase };
  }
  
  console.log('✅ User authenticated successfully:', { id: user.id, email: user.email });
  return { user, error: null, supabase };
}