import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/emailService';
import { requireAdminAuth } from '@/lib/utils/admin-auth';

export async function POST(request: NextRequest) {
  try {
    // בדיקת הרשאות מנהל
    await requireAdminAuth(request);

    // בדיקת חיבור המייל
    const isConnected = await emailService.testEmailConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'חיבור המייל פועל תקין'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'שגיאה בחיבור למשרת המייל'
      }, { status: 500 });
    }

  } catch (error) {
    // אם זה NextResponse (שגיאת הרשאה), החזר אותו
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error('Error testing email connection:', error);
    return NextResponse.json(
      { error: `שגיאה בבדיקת חיבור המייל: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // בדיקת הרשאות מנהל
    await requireAdminAuth(request);

    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'נדרש להזין כתובת מייל לבדיקה' },
        { status: 400 }
      );
    }

    // שליחת מייל בדיקה
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const emailSent = await emailService.sendWelcomeEmail({
      email: testEmail,
      userName: 'משתמש בדיקה',
      siteUrl: siteUrl
    });

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: `מייל בדיקה נשלח בהצלחה לכתובת ${testEmail}`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'שגיאה בשליחת מייל הבדיקה'
      }, { status: 500 });
    }

  } catch (error) {
    // אם זה NextResponse (שגיאת הרשאה), החזר אותו
    if (error instanceof NextResponse) {
      return error;
    }
    
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: `שגיאה בשליחת מייל בדיקה: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}