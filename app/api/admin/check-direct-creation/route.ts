import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // בדיקה אם המשתמש מחובר
    const { user: currentUser, error: userError, supabase } = await getAuthenticatedUser(request);
    
    if (userError || !currentUser) {
      return NextResponse.json({
        available: false,
        reason: 'נדרשת התחברות למערכת',
        details: { 
          userError: userError && typeof userError === 'object' && 'message' in userError ? userError.message : String(userError),
          hasUser: !!currentUser
        }
      });
    }

    // בדיקת פרופיל המשתמש ישירות
    const profileResult = await supabase.from('user_profile')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({
        available: false,
        reason: 'לא נמצא פרופיל משתמש',
        details: { 
          profileError: profileResult.error?.message,
          userId: currentUser.id
        }
      });
    }

    // בדיקה ישירה של התפקיד
    const isUserAdmin = profileResult.data.role === 'admin';
    
    if (!isUserAdmin) {
      return NextResponse.json({
        available: false,
        reason: 'נדרשות הרשאות מנהל',
        details: { 
          currentRole: profileResult.data.role,
          requiredRole: 'admin'
        }
      });
    }

    // בדיקת פונקציית is_admin
    const isAdminResult = await supabase.rpc('is_admin');
    
    if (isAdminResult.error) {
      return NextResponse.json({
        available: false,
        reason: 'שגיאה בבדיקת הרשאות מנהל',
        details: { adminError: isAdminResult.error.message }
      });
    }

    if (!isAdminResult.data) {
      return NextResponse.json({
        available: false,
        reason: 'פונקציית is_admin מחזירה false',
        details: { 
          profileRole: profileResult.data.role,
          isAdminFunction: isAdminResult.data
        }
      });
    }

    // בדיקה אם Service Role Key זמין
    const supabaseAdmin = getSupabaseAdmin();

    return NextResponse.json({
      available: true,
      reason: 'יצירה ישירה זמינה',
      details: {
        userId: currentUser.id,
        userRole: profileResult.data.role,
        isAdminFunction: isAdminResult.data,
        serviceRoleAvailable: true
      }
    });

  } catch (error) {
    console.error('Error checking direct creation availability:', error);
    return NextResponse.json({
      available: false,
      reason: 'שגיאה בבדיקת זמינות',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}