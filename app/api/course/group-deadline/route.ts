import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/course/group-deadline
 * Returns the course_deadline for the current user's group (if any).
 * Used by the course page to determine whether submissions are allowed.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get the user's group_id from their profile
    const { data: profile, error: profileError } = await admin
      .from('user_profile')
      .select('group_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      // No profile — no deadline restriction
      return NextResponse.json({ deadline: null });
    }

    if (!profile.group_id) {
      // User not assigned to a group — no deadline
      return NextResponse.json({ deadline: null });
    }

    // Get the group's course_deadline
    const { data: group, error: groupError } = await admin
      .from('groups')
      .select('course_deadline')
      .eq('id', profile.group_id)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ deadline: null });
    }

    return NextResponse.json({
      deadline: group.course_deadline ?? null
    });

  } catch (error) {
    console.error('Error in GET /api/course/group-deadline:', error);
    return NextResponse.json({ error: 'שגיאה פנימית' }, { status: 500 });
  }
}
