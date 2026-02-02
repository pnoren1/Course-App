import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Video Auth Check Starting...');
    
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔍 Debug: Token status:', {
      hasToken: !!token,
      tokenLength: token?.length,
      tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
    });
    
    // בדיקת headers
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Debug: Auth header:', authHeader ? 'Present' : 'Missing');
    
    // בדיקת cookies
    const cookies = request.cookies;
    const cookieNames = Array.from(cookies.getAll()).map(c => c.name);
    console.log('🔍 Debug: Available cookies:', cookieNames);
    
    // בדיקת אימות
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
    
    console.log('🔍 Debug: Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A',
        hasAuthHeader: !!authHeader,
        cookieNames,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        authError: authError?.message
      }
    });
    
  } catch (error) {
    console.error('💥 Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}