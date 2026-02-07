import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { groupService } from '@/lib/services/groupService';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Helper function to get user profile with admin privileges
 */
async function getUserProfile(userId: string) {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not available');
  }

  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('user_profile')
    .select('role, organization_id')
    .eq('user_id', userId)
    .single();

  if (profileError || !userProfile) {
    throw new Error('לא נמצא פרופיל משתמש');
  }

  return userProfile;
}

/**
 * GET /api/admin/groups/[id]
 * Get a specific group by ID
 * Requirements: 4.1, 4.2, 4.3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    // Check permissions
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לצפות בקבוצות' },
        { status: 403 }
      );
    }

    const group = await groupService.getGroupById(id);
    
    if (!group) {
      return NextResponse.json(
        { error: 'קבוצה לא נמצאה' },
        { status: 404 }
      );
    }

    // For org_admin, ensure they can only access groups from their organization
    if (userProfile.role === 'org_admin' && userProfile.organization_id !== group.organization_id) {
      return NextResponse.json(
        { error: 'אין לך הרשאה לגשת לקבוצה זו' },
        { status: 403 }
      );
    }

    // Get user count for the group
    const userCount = await groupService.getUserCountByGroup(id);

    return NextResponse.json({
      success: true,
      group: {
        ...group,
        userCount
      }
    });

  } catch (error) {
    console.error('Error in GET /api/admin/groups/[id]:', error);
    
    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: `שגיאה בקבלת פרטי קבוצה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/groups/[id]
 * Update a specific group
 * Requirements: 1.3, 4.1, 4.2, 4.3
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    // Check permissions
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לעדכן קבוצות' },
        { status: 403 }
      );
    }

    // First, get the existing group to check permissions
    const existingGroup = await groupService.getGroupById(id);
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'קבוצה לא נמצאה' },
        { status: 404 }
      );
    }

    // For org_admin, ensure they can only update groups from their organization
    if (userProfile.role === 'org_admin' && userProfile.organization_id !== existingGroup.organization_id) {
      return NextResponse.json(
        { error: 'אין לך הרשאה לעדכן קבוצה זו' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'נדרש להזין שם קבוצה' },
        { status: 400 }
      );
    }

    // Update the group (organizationId cannot be changed as per requirements)
    const updatedGroup = await groupService.updateGroup(id, {
      name: name.trim()
    });

    return NextResponse.json({
      success: true,
      message: `קבוצה "${name.trim()}" עודכנה בהצלחה`,
      group: updatedGroup
    });

  } catch (error) {
    console.error('Error in PUT /api/admin/groups/[id]:', error);
    
    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'קבוצה בשם זה כבר קיימת בארגון' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: `שגיאה בעדכון קבוצה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/groups/[id]
 * Delete a specific group
 * Requirements: 1.4, 4.1, 4.2, 4.3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    // Check permissions
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה למחוק קבוצות' },
        { status: 403 }
      );
    }

    // First, get the existing group to check permissions and get name for response
    const existingGroup = await groupService.getGroupById(id);
    
    if (!existingGroup) {
      return NextResponse.json(
        { error: 'קבוצה לא נמצאה' },
        { status: 404 }
      );
    }

    // For org_admin, ensure they can only delete groups from their organization
    if (userProfile.role === 'org_admin' && userProfile.organization_id !== existingGroup.organization_id) {
      return NextResponse.json(
        { error: 'אין לך הרשאה למחוק קבוצה זו' },
        { status: 403 }
      );
    }

    // Delete the group (this will validate that no users are assigned)
    await groupService.deleteGroup(id);

    return NextResponse.json({
      success: true,
      message: `קבוצה "${existingGroup.name}" נמחקה בהצלחה`
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/groups/[id]:', error);
    
    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('משתמשים משויכים')) {
        return NextResponse.json(
          { error: 'לא ניתן למחוק קבוצה שיש בה משתמשים משויכים' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: `שגיאה במחיקת קבוצה: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}