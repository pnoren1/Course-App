import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/user/profile
 * Get current user profile with organization and group info
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error('Profile API: supabaseAdmin not available');
      return NextResponse.json(
        { error: 'שגיאה בהגדרות השרת' },
        { status: 500 }
      );
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      // If no profile exists, return basic user info
      return NextResponse.json({
        success: true,
        profile: {
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'משתמש',
          email: user.email,
          role: 'student',
          organization_id: null,
          organization_name: null,
          group_id: null,
          group_name: null
        }
      });
    }

    // Get organization name if exists
    let organizationName = null;
    if (userProfile.organization_id) {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', userProfile.organization_id)
        .single();
      
      organizationName = org?.name || null;
    }

    // Get group name if exists
    let groupName = null;
    if (userProfile.group_id) {
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('name')
        .eq('id', userProfile.group_id)
        .single();
      
      groupName = group?.name || null;
    }

    return NextResponse.json({
      success: true,
      profile: {
        user_id: userProfile.user_id,
        user_name: userProfile.user_name,
        email: userProfile.email,
        role: userProfile.role,
        organization_id: userProfile.organization_id,
        organization_name: organizationName,
        group_id: userProfile.group_id,
        group_name: groupName
      }
    });

  } catch (error) {
    console.error('Error in GET /api/user/profile:', error);
    return NextResponse.json(
      { error: `שגיאה בקבלת פרופיל משתמש: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}