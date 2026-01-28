import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/organization-students
 * Get students in the organization admin's organization
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

    const supabaseAdmin = getSupabaseAdmin();

    // Get user profile to check role and organization
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'לא נמצא פרופיל משתמש' },
        { status: 404 }
      );
    }

    // Check if user is admin or org_admin
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 403 }
      );
    }

    let students;
    
    if (userProfile.role === 'admin') {
      // Admin can see all students
      const { data, error } = await supabaseAdmin
        .from('user_profile')
        .select(`
          user_id, 
          user_name, 
          email, 
          role,
          organization_id,
          group_id
        `)
        .eq('role', 'student')
        .order('user_name', { ascending: true });

      if (error) {
        throw error;
      }
      students = data;
    } else if (userProfile.role === 'org_admin' && userProfile.organization_id) {
      // Org admin can only see students in their organization
      const { data, error } = await supabaseAdmin
        .from('user_profile')
        .select(`
          user_id, 
          user_name, 
          email, 
          role,
          organization_id,
          group_id
        `)
        .eq('role', 'student')
        .eq('organization_id', userProfile.organization_id)
        .order('user_name', { ascending: true });

      if (error) {
        throw error;
      }
      students = data;
    } else {
      students = [];
    }

    return NextResponse.json({
      success: true,
      students: students || [],
      organizationId: userProfile.organization_id,
      userRole: userProfile.role
    });

  } catch (error) {
    console.error('Error in GET /api/admin/organization-students:', error);
    return NextResponse.json(
      { error: `שגיאה בקבלת רשימת תלמידים: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}