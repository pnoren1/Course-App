import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // בדיקת הרשאות מנהל
    const { isAdmin } = await rlsSupabase.isAdmin();
    
    // בדיקה נוספת אם המשתמש הוא מנהל ארגון
    let hasAdminAccess = isAdmin;
    if (!isAdmin) {
      const { user: currentUser } = await rlsSupabase.getCurrentUser();
      if (currentUser) {
        try {
          const { data: profile, error } = await rlsSupabase.from('user_profile')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile:', error);
          } else {
            hasAdminAccess = (profile as any)?.role === 'org_admin';
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }
    }
    
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, userName, role = 'student', organizationId, groupId } = body;

    // ולידציה בסיסית
    if (!email) {
      return NextResponse.json(
        { error: 'נדרש להזין כתובת מייל' },
        { status: 400 }
      );
    }

    // אם לא הוזן שם משתמש, נשתמש בכתובת המייל
    const finalUserName = userName?.trim() || email.trim();

    // יצירת הזמנה באמצעות הפונקציה במסד הנתונים
    const invitationResult = await rlsSupabase.rpc('create_user_invitation', {
      p_email: email.trim(),
      p_user_name: finalUserName,
      p_role: role,
      p_organization_id: organizationId || null,
      p_group_id: groupId || null
    });

    if (invitationResult.error) {
      console.error('Error creating invitation:', invitationResult.error);
      
      // טיפול בשגיאות ספציפיות
      if (invitationResult.error.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'משתמש עם כתובת מייל זו כבר קיים במערכת' },
          { status: 409 }
        );
      }
      
      if (invitationResult.error.message?.includes('pending invitation')) {
        return NextResponse.json(
          { error: 'כבר קיימת הזמנה פעילה לכתובת מייל זו' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'שגיאה ביצירת ההזמנה' },
        { status: 500 }
      );
    }

    const invitation = invitationResult.data?.[0];
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'שגיאה ביצירת ההזמנה' },
        { status: 500 }
      );
    }

    // כאן נוכל להוסיף לוגיקה לשליחת מייל עם קישור ההזמנה
    // const invitationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invitation?token=${invitation.invitation_token}`;
    
    return NextResponse.json({
      success: true,
      message: `הזמנה נשלחה בהצלחה לכתובת ${email}`,
      invitationData: {
        id: invitation.invitation_id,
        email,
        userName: finalUserName,
        role,
        organizationId: organizationId || null,
        groupId: groupId || null,
        expiresAt: invitation.expires_at,
        token: invitation.invitation_token // בפרודקשן לא נחזיר את הטוקן
      }
    });

  } catch (error) {
    console.error('Error in invite-user API:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}