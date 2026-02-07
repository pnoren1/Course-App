import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Helper function to check if user has admin permissions
 * Returns the user and profile if authorized, or throws an error response
 */
export async function requireAdminAuth(request: NextRequest) {
  // בדיקת הרשאות מנהל
  const { user, error: authError } = await getAuthenticatedUser(request);
  
  if (authError || !user) {
    throw NextResponse.json(
      { error: 'נדרשת התחברות למערכת' },
      { status: 401 }
    );
  }

  if (!supabaseAdmin) {
    throw NextResponse.json(
      { error: 'שגיאה בהגדרות השרת' },
      { status: 500 }
    );
  }

  // בדיקה אם המשתמש הוא מנהל - משתמש ב-supabaseAdmin כדי לעקוף RLS
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profile')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw NextResponse.json(
      { error: 'לא נמצא פרופיל משתמש' },
      { status: 403 }
    );
  }

  if (!['admin', 'org_admin'].includes(profile.role)) {
    throw NextResponse.json(
      { error: 'אין הרשאה לבצע פעולה זו' },
      { status: 403 }
    );
  }

  return { user, profile, supabase: supabaseAdmin };
}

/**
 * Helper function to check if user has system admin permissions (not org admin)
 */
export async function requireSystemAdminAuth(request: NextRequest) {
  const { user, profile, supabase } = await requireAdminAuth(request);
  
  if (profile.role !== 'admin') {
    throw NextResponse.json(
      { error: 'פעולה זו מיועדת למנהלי מערכת בלבד' },
      { status: 403 }
    );
  }
  
  return { user, profile, supabase };
}