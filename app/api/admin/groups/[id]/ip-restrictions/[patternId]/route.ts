import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
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
 * DELETE /api/admin/groups/[id]/ip-restrictions/[patternId]
 * Removes an IP pattern from the group's allow-list.
 * Includes IDOR prevention: verifies the pattern belongs to the requested group.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; patternId: string }> }
) {
  try {
    const { id, patternId } = await params;

    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'שגיאת שרת פנימית' },
        { status: 500 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה למחוק כתובות IP' },
        { status: 403 }
      );
    }

    // IDOR prevention: verify the pattern's group_id matches the route's [id] param
    const { data: existingPattern, error: fetchError } = await supabaseAdmin
      .from('group_ip_allowlist')
      .select('group_id')
      .eq('id', patternId)
      .single();

    if (fetchError || !existingPattern) {
      return NextResponse.json(
        { error: 'כתובת IP לא נמצאה' },
        { status: 404 }
      );
    }

    if (existingPattern.group_id !== id) {
      return NextResponse.json(
        { error: 'אין לך הרשאה למחוק כתובת IP זו' },
        { status: 403 }
      );
    }

    // For org_admin: also verify they own the group
    if (userProfile.role === 'org_admin') {
      const { data: group, error: groupError } = await supabaseAdmin
        .from('groups')
        .select('organization_id')
        .eq('id', id)
        .single();

      if (groupError || !group) {
        return NextResponse.json(
          { error: 'קבוצה לא נמצאה' },
          { status: 404 }
        );
      }

      if (group.organization_id !== userProfile.organization_id) {
        return NextResponse.json(
          { error: 'אין לך הרשאה לגשת לקבוצה זו' },
          { status: 403 }
        );
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('group_ip_allowlist')
      .delete()
      .eq('id', patternId);

    if (deleteError) {
      console.error('Error deleting IP pattern:', deleteError);
      return NextResponse.json(
        { error: 'שגיאה במחיקת כתובת IP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'הכתובת הוסרה בהצלחה' });

  } catch (error) {
    console.error('Error in DELETE /api/admin/groups/[id]/ip-restrictions/[patternId]:', error);

    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `שגיאה במחיקת כתובת IP: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}
