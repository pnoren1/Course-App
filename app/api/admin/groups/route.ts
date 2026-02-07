import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { groupService } from '@/lib/services/groupService';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/groups
 * Get all groups (system admin) or groups by organization (org admin)
 * Requirements: 1.5, 4.1, 4.2, 4.3
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
      return NextResponse.json(
        { error: 'לא נמצא פרופיל משתמש' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לצפות בקבוצות' },
        { status: 403 }
      );
    }

    let groups;
    
    if (userProfile.role === 'admin') {
      // System admin can see all groups
      groups = await groupService.getAllGroups();
    } else if (userProfile.role === 'org_admin' && userProfile.organization_id) {
      // Org admin can only see groups from their organization
      groups = await groupService.getGroupsByOrganization(userProfile.organization_id);
    } else {
      return NextResponse.json(
        { error: 'לא ניתן לקבוע את הארגון שלך' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      groups
    });

  } catch (error) {
    console.error('Error in GET /api/admin/groups:', error);
    return NextResponse.json(
      { error: `שגיאה בקבלת רשימת קבוצות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups
 * Create a new group
 * Requirements: 1.2, 4.1, 4.2, 4.3, 6.2
 */
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'לא נמצא פרופיל משתמש' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה ליצור קבוצות' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, organizationId } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'נדרש להזין שם קבוצה' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'נדרש לבחור ארגון' },
        { status: 400 }
      );
    }

    // For org_admin, ensure they can only create groups in their organization
    if (userProfile.role === 'org_admin' && userProfile.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'אין לך הרשאה ליצור קבוצות בארגון זה' },
        { status: 403 }
      );
    }

    // Create the group
    const group = await groupService.createGroup({
      name: name.trim(),
      organizationId
    });

    return NextResponse.json({
      success: true,
      message: `קבוצה "${name.trim()}" נוצרה בהצלחה`,
      group
    });

  } catch (error) {
    console.error('Error in POST /api/admin/groups:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'קבוצה בשם זה כבר קיימת בארגון' },
          { status: 409 }
        );
      }
      if (error.message.includes('foreign key') || error.message.includes('violates foreign key constraint')) {
        return NextResponse.json(
          { error: 'הארגון הנבחר לא קיים' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: `שגיאה ביצירת קבוצה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}