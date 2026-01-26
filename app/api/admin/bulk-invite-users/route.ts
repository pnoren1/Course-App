import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

interface BulkUserData {
  email: string;
  userName: string;
  role: string;
  organizationId: string | null;
}

interface BulkInviteResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

export async function POST(request: NextRequest) {
  try {
    // בדיקת הרשאות מנהל
    const { isAdmin } = await rlsSupabase.isAdmin();
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { users } = body;

    // ולידציה בסיסית
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'נדרש לשלוח רשימת משתמשים' },
        { status: 400 }
      );
    }

    const result: BulkInviteResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    // עיבוד כל משתמש בנפרד
    for (const userData of users as BulkUserData[]) {
      try {
        // ולידציה של נתוני המשתמש
        if (!userData.email) {
          result.failed++;
          result.errors.push({
            email: userData.email || 'לא צוין',
            error: 'כתובת מייל נדרשת'
          });
          continue;
        }

        const finalUserName = userData.userName?.trim() || userData.email.trim();

        // יצירת הזמנה באמצעות הפונקציה במסד הנתונים
        const invitationResult = await rlsSupabase.rpc('create_user_invitation', {
          p_email: userData.email.trim(),
          p_user_name: finalUserName,
          p_role: userData.role,
          p_organization_id: userData.organizationId || null
        });

        if (invitationResult.error) {
          result.failed++;
          
          // טיפול בשגיאות ספציפיות
          if (invitationResult.error.message?.includes('already exists')) {
            result.errors.push({
              email: userData.email,
              error: 'משתמש עם כתובת מייל זו כבר קיים במערכת'
            });
          } else if (invitationResult.error.message?.includes('pending invitation')) {
            result.errors.push({
              email: userData.email,
              error: 'כבר קיימת הזמנה פעילה לכתובת מייל זו'
            });
          } else {
            result.errors.push({
              email: userData.email,
              error: 'שגיאה ביצירת ההזמנה'
            });
          }
          continue;
        }

        const invitation = invitationResult.data?.[0];
        
        if (!invitation) {
          result.failed++;
          result.errors.push({
            email: userData.email,
            error: 'שגיאה ביצירת ההזמנה'
          });
          continue;
        }

        result.success++;

      } catch (error) {
        result.failed++;
        result.errors.push({
          email: userData.email,
          error: error instanceof Error ? error.message : 'שגיאה לא ידועה'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `הושלם ייבוא ההזמנות: ${result.success} הצליחו, ${result.failed} נכשלו`,
      result
    });

  } catch (error) {
    console.error('Error in bulk-invite-users API:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}