import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        available: false,
        reason: 'לא סופק מזהה משתמש'
      });
    }

    // בדיקה אם Service Role Key זמין
    if (!supabaseAdmin) {
      return NextResponse.json({
        available: false,
        reason: 'Service Role Key לא מוגדר',
        details: { serviceRoleAvailable: false }
      });
    }

    // בדיקת פרופיל המשתמש ישירות עם supabaseAdmin
    const profileResult = await supabaseAdmin.from('user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({
        available: false,
        reason: 'לא נמצא פרופיל משתמש',
        details: { 
          profileError: profileResult.error?.message,
          userId: userId
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

    return NextResponse.json({
      available: true,
      reason: 'יצירה ישירה זמינה',
      details: {
        userId: userId,
        userRole: profileResult.data.role,
        serviceRoleAvailable: true
      }
    });

  } catch (error) {
    console.error('Error in simple check:', error);
    return NextResponse.json({
      available: false,
      reason: 'שגיאה בבדיקת זמינות',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
}