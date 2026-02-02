"use client";

import { useState, useCallback } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

interface AuthDebugInfo {
  clientSession: {
    hasSession: boolean;
    hasToken: boolean;
    tokenStart: string;
    expiresAt: string;
    userId: string | null;
    userEmail: string | null;
    error: string | null;
  };
  serverDebug: {
    hasToken: boolean;
    tokenLength: number;
    tokenStart: string;
    hasAuthHeader: boolean;
    cookieNames: string[];
    hasUser: boolean;
    userId: string | null;
    userEmail: string | null;
    authError: string | null;
  } | null;
  apiTest: {
    status: number;
    statusText: string;
    ok: boolean;
    error: string | null;
  } | null;
}

export function useAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = useCallback(async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Starting comprehensive auth debug...');
      
      // Check client-side session
      const { data: { session }, error: sessionError } = await rlsSupabase.auth.getSession();
      
      const clientSession = {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenStart: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'N/A',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        error: sessionError?.message || null
      };
      
      console.log('📋 Client session:', clientSession);
      
      // Test server debug API
      let serverDebug = null;
      let apiTest = null;
      
      try {
        const response = await authenticatedFetch('/api/debug/video-auth');
        
        apiTest = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          error: null
        };
        
        if (response.ok) {
          const data = await response.json();
          serverDebug = data.debug;
          console.log('🔍 Server debug data:', serverDebug);
        } else {
          const errorText = await response.text();
          apiTest.error = errorText;
          console.log('❌ Server debug API error:', errorText);
        }
      } catch (error) {
        apiTest = {
          status: 0,
          statusText: 'Network Error',
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        console.error('💥 Server debug API failed:', error);
      }
      
      const fullDebugInfo: AuthDebugInfo = {
        clientSession,
        serverDebug,
        apiTest
      };
      
      setDebugInfo(fullDebugInfo);
      console.log('🔍 Complete debug info:', fullDebugInfo);
      
      return fullDebugInfo;
      
    } catch (error) {
      console.error('💥 Debug failed:', error);
      const errorInfo: AuthDebugInfo = {
        clientSession: {
          hasSession: false,
          hasToken: false,
          tokenStart: 'N/A',
          expiresAt: 'N/A',
          userId: null,
          userEmail: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        serverDebug: null,
        apiTest: null
      };
      
      setDebugInfo(errorInfo);
      return errorInfo;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearDebug = useCallback(() => {
    setDebugInfo(null);
  }, []);

  return {
    debugInfo,
    isLoading,
    runDebug,
    clearDebug
  };
}