import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const body = await request.json();
    const { email, userName, role = 'student', organizationId, groupId, password, currentUserId } = body;

    // ולידציה בסיסית
    if (!email) {
      return NextResponse.json(
        { error: 'נדרש להזין כתובת מייל' },
        { status: 400 }
      );
    }

    // אם לא הוזן שם משתמש, נשתמש בכתובת המייל
    const finalUserName = userName?.trim();// || email.trim();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'נדרש סיסמה באורך של לפחות 6 תווים' },
        { status: 400 }
      );
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'נדרש מזהה המשתמש הנוכחי' },
        { status: 400 }
      );
    }

    // בדיקת הרשאות מנהל של המשתמש הנוכחי
    const currentUserProfile = await supabaseAdmin.from('user_profile')
      .select('role')
      .eq('user_id', currentUserId)
      .single();

    if (currentUserProfile.error || !currentUserProfile.data || currentUserProfile.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל' },
        { status: 403 }
      );
    }

    // בדיקה אם המשתמש כבר קיים - בדיקה ישירה בטבלה
    const existingUserResult = await supabaseAdmin.from('user_profile')
      .select('user_id, email')
      .eq('email', email.trim())
      .limit(1);

    if (existingUserResult.error) {
      console.error('Error checking existing user:', existingUserResult.error);
      return NextResponse.json(
        { error: 'שגיאה בבדיקת משתמש קיים' },
        { status: 500 }
      );
    }

    if (existingUserResult.data && existingUserResult.data.length > 0) {
      return NextResponse.json(
        { error: 'משתמש עם כתובת מייל זו כבר קיים במערכת' },
        { status: 409 }
      );
    }

    // יצירת משתמש חדש ב-auth.users באמצעות Admin API
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true, // מאשר את המייל אוטומטית
      user_metadata: {
        full_name: finalUserName
      }
    });

    if (createUserError) {
      console.error('Error creating user in auth.users:', createUserError);
      
      if (createUserError.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'משתמש עם כתובת מייל זו כבר קיים במערכת' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `שגיאה ביצירת המשתמש: ${createUserError.message}` },
        { status: 500 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'שגיאה ביצירת המשתמש' },
        { status: 500 }
      );
    }

    // יצירת פרופיל משתמש בטבלת user_profile - נשתמש ב-supabaseAdmin
    const profileResult = await supabaseAdmin.from('user_profile').insert({
      user_id: newUser.user.id,
      user_name: finalUserName,
      email: email.trim(),
      role: role,
      organization_id: organizationId || null,
      group_id: groupId || null,
      granted_by: currentUserId // המשתמש המנהל שיוצר את המשתמש החדש
    }).select().single();

    if (profileResult.error) {
      console.error('Error creating user profile:', profileResult.error);
      
      // אם נכשלה יצירת הפרופיל, נמחק את המשתמש מ-auth.users
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return NextResponse.json(
        { error: `שגיאה ביצירת פרופיל המשתמש: ${profileResult.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `משתמש ${finalUserName} נוצר בהצלחה`,
      userData: {
        id: newUser.user.id,
        email: email.trim(),
        userName: finalUserName,
        role: role,
        organizationId: organizationId || null,
        groupId: groupId || null,
        createdAt: newUser.user.created_at
      }
    });

  } catch (error) {
    console.error('Error in create-user API:', error);
    return NextResponse.json(
      { error: `שגיאה פנימית בשרת: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}