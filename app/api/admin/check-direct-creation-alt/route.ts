import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // חיפוש טוקן ב-cookies
    let accessToken = null;
    const allCookies: Record<string, string> = {};
    
    // request.cookies.forEach((value, key) => {
    //   allCookies[key] = value;
      
    //   if (key.includes('auth-token') || key.includes('supabase')) {
    //     try {
    //       const parsed = JSON.parse(value);
    //       if (parsed.access_token) {
    //         accessToken = parsed.access_token;
    //       }
    //     } catch {
    //       // אולי זה הטוקן עצמו
    //       if (value.startsWith('eyJ')) {
    //         accessToken = value;
    //       }
    //     }
    //   }
    // });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // הגדרת הטוקן אם נמצא
    if (accessToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });
    }

    // בדיקה אם המשתמש מחובר
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      return NextResponse.json({
        available: false,
        reason: 'נדרשת התחברות למערכת',
        details: { 
          userError: userError?.message,
          hasUser: !!currentUser,
          hasToken: !!accessToken,
          cookieCount: Object.keys(allCookies).length,
          cookieNames: Object.keys(allCookies)
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
    if (!supabaseAdmin) {
      return NextResponse.json({
        available: false,
        reason: 'Service Role Key לא מוגדר',
        details: { serviceRoleAvailable: false }
      });
    }

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