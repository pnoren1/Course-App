import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // בדיקה אם המשתמש מחובר
    const { user: currentUser, error: userError } = await rlsSupabase.getCurrentUser();
    
    if (userError) {
      return NextResponse.json({
        error: 'שגיאה בשליפת המשתמש',
        details: userError
      });
    }

    if (!currentUser) {
      return NextResponse.json({
        error: 'משתמש לא מחובר'
      });
    }

    // בדיקת פרופיל המשתמש
    const profileResult = await rlsSupabase.from('user_profile').select('*').eq('user_id', currentUser.id).single();
    
    // בדיקת הרשאות מנהל
    const { isAdmin, error: adminError } = await rlsSupabase.isAdmin();

    return NextResponse.json({
      user: {
        id: currentUser.id,
        email: currentUser.email,
        created_at: currentUser.created_at
      },
      profile: {
        data: profileResult.data,
        error: profileResult.error
      },
      adminCheck: {
        isAdmin,
        error: adminError
      }
    });

  } catch (error) {
    console.error('Error in debug-user API:', error);
    return NextResponse.json({
      error: 'שגיאה פנימית בשרת',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}