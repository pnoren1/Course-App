import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  console.log('=== Debug User Auth API Called ===');
  
  try {
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request cookies:', request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value, valueStart: c.value?.substring(0, 20) })));
    
    const { user, error: authError, supabase } = await getAuthenticatedUser(request);
    
    console.log('Auth result:', {
      hasUser: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      error: authError
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        step: 'authentication',
        error: 'No user found',
        details: authError
      });
    }
    
    // Check user profile
    console.log('Checking user profile...');
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log('User profile result:', { userProfile, profileError });
    
    // Check admin status
    console.log('Checking admin status...');
    const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin');
    
    console.log('Admin check result:', { isAdminResult, adminError });
    
    // Check has_role function
    console.log('Checking has_role function...');
    const { data: hasRoleResult, error: hasRoleError } = await supabase.rpc('has_role', { role_name: 'admin' });
    
    console.log('Has role result:', { hasRoleResult, hasRoleError });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      userProfile: userProfile || null,
      profileError: profileError?.message || null,
      isAdmin: isAdminResult || false,
      adminError: adminError?.message || null,
      hasAdminRole: hasRoleResult || false,
      hasRoleError: hasRoleError?.message || null,
      authMethod: 'server-side'
    });
    
  } catch (error) {
    console.error('Error in debug-user-auth API:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}