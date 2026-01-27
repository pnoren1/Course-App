import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { groupService } from '@/lib/services/groupService';
import { rlsSupabase, supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/groups/by-organization/[orgId]
 * Get groups filtered by organization (for dropdowns and organization-specific views)
 * Requirements: 2.2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    // Get user profile to check role and organization
    // Use supabaseAdmin to bypass RLS for admin operations
    if (!supabaseAdmin) {
      console.error('API: supabaseAdmin not available');
      return NextResponse.json(
        { error: 'שגיאה בהגדרות השרת' },
        { status: 500 }
      );
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.log('API: Profile error for current user:', profileError);
      return NextResponse.json(
        { error: 'לא נמצא פרופיל משתמש' },
        { status: 404 }
      );
    }

    console.log('API: User profile:', userProfile);

    // Validate that the organization exists first
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'ארגון לא נמצא' },
        { status: 404 }
      );
    }

    // Check permissions - allow all users to read groups in their organization for dropdowns
    // Only admins can access groups from other organizations
    if (userProfile.role !== 'admin' && userProfile.organization_id !== orgId) {
      return NextResponse.json(
        { error: 'אין לך הרשאה לגשת לקבוצות של ארגון זה' },
        { status: 403 }
      );
    }

    // Get groups for the organization
    const groups = await groupService.getGroupsByOrganization(orgId);

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name
      },
      groups
    });

  } catch (error) {
    console.error('Error in GET /api/admin/groups/by-organization/[orgId]:', error);
    return NextResponse.json(
      { error: `שגיאה בקבלת קבוצות לפי ארגון: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}