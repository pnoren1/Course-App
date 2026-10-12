import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidIpPattern } from '@/lib/utils/ip-utils';

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
 * Helper: verify that group exists and check org_admin ownership
 */
async function verifyGroupAccess(groupId: string, userProfile: { role: string; organization_id: string | null }) {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin not available');
  }

  const { data: group, error } = await supabaseAdmin
    .from('groups')
    .select('id, organization_id')
    .eq('id', groupId)
    .single();

  if (error || !group) {
    return null;
  }

  if (userProfile.role === 'org_admin' && userProfile.organization_id !== group.organization_id) {
    return 'forbidden';
  }

  return group;
}

/**
 * GET /api/admin/groups/[id]/ip-restrictions
 * Returns the IP allow-list patterns for a group.
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'שגיאת שרת פנימית' },
        { status: 500 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לצפות בהגדרות קבוצה' },
        { status: 403 }
      );
    }

    const groupAccess = await verifyGroupAccess(id, userProfile);

    if (groupAccess === null) {
      return NextResponse.json(
        { error: 'קבוצה לא נמצאה' },
        { status: 404 }
      );
    }

    if (groupAccess === 'forbidden') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לגשת לקבוצה זו' },
        { status: 403 }
      );
    }

    const { data: patterns, error: fetchError } = await supabaseAdmin
      .from('group_ip_allowlist')
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching IP patterns:', fetchError);
      return NextResponse.json(
        { error: 'שגיאה בטעינת רשימת כתובות IP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ patterns: patterns ?? [] });

  } catch (error) {
    console.error('Error in GET /api/admin/groups/[id]/ip-restrictions:', error);

    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `שגיאה בטעינת כתובות IP: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/groups/[id]/ip-restrictions
 * Adds a new IP pattern to the group's allow-list.
 */
export async function POST(
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'שגיאת שרת פנימית' },
        { status: 500 }
      );
    }

    const userProfile = await getUserProfile(user.id);

    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לעדכן הגדרות קבוצה' },
        { status: 403 }
      );
    }

    const groupAccess = await verifyGroupAccess(id, userProfile);

    if (groupAccess === null) {
      return NextResponse.json(
        { error: 'קבוצה לא נמצאה' },
        { status: 404 }
      );
    }

    if (groupAccess === 'forbidden') {
      return NextResponse.json(
        { error: 'אין לך הרשאה לגשת לקבוצה זו' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ip_pattern, description } = body;

    if (!ip_pattern || typeof ip_pattern !== 'string') {
      return NextResponse.json(
        { error: 'נדרש להזין כתובת IP' },
        { status: 400 }
      );
    }

    if (!isValidIpPattern(ip_pattern.trim())) {
      return NextResponse.json(
        { error: 'כתובת IP אינה תקינה. יש להזין כתובת IPv4 תקנית או טווח CIDR (לדוגמה: 192.168.1.1 או 10.0.0.0/24)' },
        { status: 400 }
      );
    }

    const { data: pattern, error: insertError } = await supabaseAdmin
      .from('group_ip_allowlist')
      .insert({
        group_id: id,
        ip_pattern: ip_pattern.trim(),
        description: description ?? null
      })
      .select()
      .single();

    if (insertError) {
      // PostgreSQL unique-constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'כתובת IP זו כבר קיימת ברשימה' },
          { status: 409 }
        );
      }
      console.error('Error inserting IP pattern:', insertError);
      return NextResponse.json(
        { error: 'שגיאה בהוספת כתובת IP' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pattern }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/admin/groups/[id]/ip-restrictions:', error);

    if (error instanceof Error && error.message === 'לא נמצא פרופיל משתמש') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: `שגיאה בהוספת כתובת IP: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}` },
      { status: 500 }
    );
  }
}
