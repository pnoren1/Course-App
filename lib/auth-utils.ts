// פונקציות עזר לטיפול בהתחברות בצד הלקוח

export function getSupabaseToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // נסה למצוא את הטוקן במקומות שונים
  const possibleKeys = [
    'supabase.auth.token',
    'sb-lzedeawtmzfenyrewhmo-auth-token',
    'supabase-auth-token',
    'sb-access-token',
    'supabase.auth.session'
  ];
  
  for (const key of possibleKeys) {
    // בדוק ב-localStorage
    const localToken = localStorage.getItem(key);
    if (localToken) {
      try {
        const parsed = JSON.parse(localToken);
        if (parsed.access_token) {
          return parsed.access_token;
        }
        if (parsed.session?.access_token) {
          return parsed.session.access_token;
        }
      } catch {
        // אם זה לא JSON, אולי זה הטוקן עצמו
        if (localToken.startsWith('eyJ')) { // JWT token
          return localToken;
        }
      }
    }
    
    // בדוק ב-sessionStorage
    const sessionToken = sessionStorage.getItem(key);
    if (sessionToken) {
      try {
        const parsed = JSON.parse(sessionToken);
        if (parsed.access_token) {
          return parsed.access_token;
        }
        if (parsed.session?.access_token) {
          return parsed.session.access_token;
        }
      } catch {
        // אם זה לא JSON, אולי זה הטוקן עצמו
        if (sessionToken.startsWith('eyJ')) { // JWT token
          return sessionToken;
        }
      }
    }
  }
  
  // נסה לקבל את הטוקן ישירות מ-Supabase client
  try {
    const supabaseSession = localStorage.getItem('sb-lzedeawtmzfenyrewhmo-auth-token');
    if (supabaseSession) {
      const parsed = JSON.parse(supabaseSession);
      if (parsed.access_token) {
        return parsed.access_token;
      }
    }
  } catch (error) {
    console.log('Error parsing Supabase session:', error);
  }
  
  return null;
}

export function createAuthHeaders(): HeadersInit {
  const token = getSupabaseToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('No auth token found');
  }
  
  return headers;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = createAuthHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
}

// פונקציה לדיבוג - מראה מה יש ב-storage
export function debugAuthStorage() {
  if (typeof window === 'undefined') return;
  
  console.log('=== Auth Storage Debug ===');
  console.log('localStorage keys:', Object.keys(localStorage));
  console.log('sessionStorage keys:', Object.keys(sessionStorage));
  
  const possibleKeys = [
    'supabase.auth.token',
    'sb-lzedeawtmzfenyrewhmo-auth-token',
    'supabase-auth-token',
    'sb-access-token',
    'supabase.auth.session'
  ];
  
  possibleKeys.forEach(key => {
    const localValue = localStorage.getItem(key);
    const sessionValue = sessionStorage.getItem(key);
    
    if (localValue) {
      console.log(`localStorage[${key}]: Found (${localValue.length} chars)`);
    }
    if (sessionValue) {
      console.log(`sessionStorage[${key}]: Found (${sessionValue.length} chars)`);
    }
  });
  
  const token = getSupabaseToken();
  console.log('Extracted token:', token ? 'Found' : 'null');
  console.log('=== End Debug ===');
}