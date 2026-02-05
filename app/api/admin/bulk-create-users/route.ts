import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimiters, getRequestIdentifier } from '@/lib/middleware/rate-limit';
import { emailService } from '@/lib/services/emailService';

interface BulkUserData {
  email: string;
  userName: string;
  password: string;
  role: string;
  organizationId: string | null;
  groupId: string | null;
}

interface BulkCreateResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  emailsSent: number;
  emailsFailed: number;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 פעולות המוניות בשעה
    const identifier = getRequestIdentifier(request);
    const rateLimitResult = await rateLimiters.bulkOperation(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      );
    }

    // בדיקה אם Service Role Key זמין
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service Role Key לא מוגדר. יצירת משתמש ישירה לא זמינה.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { users, currentUserId } = body;

    // ולידציה בסיסית
    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'נדרש לשלוח רשימת משתמשים' },
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

    const result: BulkCreateResult = {
      success: 0,
      failed: 0,
      errors: [],
      emailsSent: 0,
      emailsFailed: 0
    };

    // עיבוד כל משתמש בנפרד
    for (const userData of users as BulkUserData[]) {
      try {
        // ולידציה של נתוני המשתמש
        if (!userData.email || !userData.password || userData.password.length < 6) {
          result.failed++;
          result.errors.push({
            email: userData.email || 'לא צוין',
            error: 'כתובת מייל וסיסמה (לפחות 6 תווים) נדרשים'
          });
          continue;
        }

        const finalUserName = userData.userName?.trim();

        // בדיקה אם המשתמש כבר קיים
        const existingUserResult = await supabaseAdmin.from('user_profile')
          .select('user_id, email')
          .eq('email', userData.email.trim())
          .limit(1);

        if (existingUserResult.data && existingUserResult.data.length > 0) {
          result.failed++;
          result.errors.push({
            email: userData.email,
            error: 'משתמש עם כתובת מייל זו כבר קיים במערכת'
          });
          continue;
        }

        // יצירת משתמש חדש ב-auth.users
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email.trim(),
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: finalUserName
          }
        });

        if (createUserError) {
          result.failed++;
          result.errors.push({
            email: userData.email,
            error: createUserError.message?.includes('already registered') 
              ? 'משתמש עם כתובת מייל זו כבר קיים במערכת'
              : `שגיאה ביצירת המשתמש: ${createUserError.message}`
          });
          continue;
        }

        if (!newUser.user) {
          result.failed++;
          result.errors.push({
            email: userData.email,
            error: 'שגיאה ביצירת המשתמש'
          });
          continue;
        }

        // יצירת פרופיל משתמש
        const profileResult = await supabaseAdmin.from('user_profile').insert({
          user_id: newUser.user.id,
          user_name: finalUserName,
          email: userData.email.trim(),
          role: userData.role,
          organization_id: userData.organizationId || null,
          group_id: userData.groupId || null,
          granted_by: currentUserId
        }).select().single();

        if (profileResult.error) {
          // אם נכשלה יצירת הפרופיל, נמחק את המשתמש מ-auth.users
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          
          result.failed++;
          result.errors.push({
            email: userData.email,
            error: `שגיאה ביצירת פרופיל המשתמש: ${profileResult.error.message}`
          });
          continue;
        }

        result.success++;

        // שליחת מייל ברוכים הבאים למשתמש החדש
        try {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const emailSent = await emailService.sendWelcomeEmail({
            email: userData.email.trim(),
            userName: finalUserName || userData.email.trim(),
            siteUrl: siteUrl
          });

          if (emailSent) {
            result.emailsSent++;
          } else {
            result.emailsFailed++;
            console.warn('Failed to send welcome email to:', userData.email.trim());
          }
        } catch (emailError) {
          result.emailsFailed++;
          console.error('Error sending welcome email to', userData.email.trim(), ':', emailError);
        }

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
      message: `הושלם ייבוא המשתמשים: ${result.success} הצליחו, ${result.failed} נכשלו. מיילים: ${result.emailsSent} נשלחו, ${result.emailsFailed} נכשלו`,
      result
    });

  } catch (error) {
    console.error('Error in bulk-create-users API:', error);
    return NextResponse.json(
      { error: `שגיאה פנימית בשרת: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}