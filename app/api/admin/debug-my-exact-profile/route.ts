import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== Debug My Exact Profile API Called ===');
  
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'נדרש להתחבר למערכת' 
        },
        { status: 401 }
      );
    }

    console.log('Looking for user:', { id: user.id, email: user.email });

    // Use admin client to search for exact profile
    const supabaseAdmin = getSupabaseAdmin();
    
    // Search by user_id
    console.log('Searching by user_id...');
    const { data: profileById, error: byIdError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id);

    console.log('Profile by ID result:', { profileById, byIdError });

    // Search by email
    console.log('Searching by email...');
    const { data: profileByEmail, error: byEmailError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('email', user.email);

    console.log('Profile by email result:', { profileByEmail, byEmailError });

    // Search by user_email
    console.log('Searching by user_email...');
    const { data: profileByUserEmail, error: byUserEmailError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('user_email', user.email);

    console.log('Profile by user_email result:', { profileByUserEmail, byUserEmailError });

    // Test the RLS functions directly with admin client
    console.log('Testing RLS functions with admin client...');
    
    // Set the auth context to the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email
    });

    console.log('Session generation result:', { sessionData, sessionError });

    return NextResponse.json({
      success: true,
      searchUserId: user.id,
      searchEmail: user.email,
      results: {
        byId: {
          data: profileById || [],
          error: byIdError?.message || null,
          count: profileById?.length || 0
        },
        byEmail: {
          data: profileByEmail || [],
          error: byEmailError?.message || null,
          count: profileByEmail?.length || 0
        },
        byUserEmail: {
          data: profileByUserEmail || [],
          error: byUserEmailError?.message || null,
          count: profileByUserEmail?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Error in debug-my-exact-profile API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'שגיאה פנימית בשרת',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}