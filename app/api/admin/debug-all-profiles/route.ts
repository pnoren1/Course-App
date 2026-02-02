import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('=== Debug All Profiles API Called ===');
  
  try {
    // Use admin client to see all profiles
    const supabaseAdmin = getSupabaseAdmin();
    
    console.log('Fetching all user profiles...');
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { 
          success: false,
          error: 'שגיאה בקבלת פרופילים',
          details: profilesError.message 
        },
        { status: 500 }
      );
    }

    console.log('All profiles:', allProfiles);

    // Also get auth users for comparison
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    console.log('Auth users:', authUsers);

    return NextResponse.json({
      success: true,
      profiles: allProfiles || [],
      authUsers: authUsers?.users || [],
      profileCount: allProfiles?.length || 0,
      authUserCount: authUsers?.users?.length || 0
    });

  } catch (error) {
    console.error('Error in debug-all-profiles API:', error);
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