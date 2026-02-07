import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // בדיקת authentication
    const { user, error } = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'לא מחובר למערכת',
        error: (error as any)?.message || 'No user found'
      }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        message: 'שגיאה בהגדרות השרת - אין גישה למנהל'
      }, { status: 500 });
    }

    // בדיקת פרופיל המשתמש - משתמש ב-supabaseAdmin כדי לעקוף RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role, organization_id, user_name, email')
      .eq('user_id', user.id)
      .single();


    if (profileError) {
      return NextResponse.json({
        success: false,
        message: 'שגיאה בקבלת פרופיל משתמש',
        error: profileError.message,
        user: {
          id: user.id,
          email: user.email
        }
      }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({
        success: false,
        message: 'לא נמצא פרופיל משתמש',
        user: {
          id: user.id,
          email: user.email
        }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'פרופיל נמצא בהצלחה',
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        role: profile.role,
        organization_id: profile.organization_id,
        user_name: profile.user_name,
        email: profile.email
      },
      isAdmin: ['admin', 'org_admin'].includes(profile.role),
      isSystemAdmin: profile.role === 'admin'
    });

  } catch (error) {
    console.error('❌ Error in role check:', error);
    return NextResponse.json({
      success: false,
      message: 'שגיאה פנימית',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}