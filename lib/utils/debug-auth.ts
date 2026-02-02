/**
 * Debug utilities for authentication issues
 */

import { rlsSupabase } from '@/lib/supabase';

export async function debugAuthState() {
  console.log('=== Authentication Debug ===');
  
  try {
    // Check session
    const { data: { session }, error: sessionError } = await rlsSupabase.auth.getSession();
    console.log('Session:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      error: sessionError?.message
    });

    // Check user
    const { data: { user }, error: userError } = await rlsSupabase.auth.getUser();
    console.log('User:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: userError?.message
    });

    // Test API call
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('API Test:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Response:', errorText);
      }
    } catch (apiError) {
      console.log('API Test Error:', apiError);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log('=== End Authentication Debug ===');
}

export async function debugVideoTrackingAuth() {
  console.log('=== Video Tracking Auth Debug ===');
  
  // Check if we're in the right context
  console.log('Environment:', {
    isClient: typeof window !== 'undefined',
    hasSupabase: !!rlsSupabase,
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A'
  });
  
  // Check local storage
  if (typeof window !== 'undefined') {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    console.log('Auth-related localStorage keys:', authKeys);
    
    authKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`${key}:`, {
            hasAccessToken: !!parsed.access_token,
            hasRefreshToken: !!parsed.refresh_token,
            expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'N/A',
            tokenStart: parsed.access_token ? parsed.access_token.substring(0, 20) + '...' : 'N/A'
          });
        } catch {
          console.log(`${key}: (not JSON)`, value.substring(0, 50) + '...');
        }
      }
    });
    
    // Check cookies
    const cookies = document.cookie.split(';').map(c => c.trim());
    const authCookies = cookies.filter(c => 
      c.includes('sb-') || c.includes('supabase') || c.includes('auth')
    );
    console.log('Auth-related cookies:', authCookies.map(c => c.split('=')[0]));
  }
  
  // Test session and API call
  try {
    const { data: { session }, error: sessionError } = await rlsSupabase.auth.getSession();
    console.log('Current session:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenStart: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'N/A',
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      error: sessionError?.message
    });
    
    // Test the debug API endpoint
    if (session?.access_token) {
      try {
        const response = await fetch('/api/debug/video-auth', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Debug API response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });
        
        if (response.ok) {
          const debugData = await response.json();
          console.log('Server debug data:', debugData);
        } else {
          const errorText = await response.text();
          console.log('Debug API error:', errorText);
        }
      } catch (apiError) {
        console.error('Debug API call failed:', apiError);
      }
    }
    
  } catch (error) {
    console.error('Session check failed:', error);
  }
  
  console.log('=== End Video Tracking Auth Debug ===');
}