import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  console.log('=== Test Email API Called ===');
  console.log('Request headers:', Object.fromEntries(request.headers.entries()));
  console.log('Request cookies:', request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })));
  
  try {
    console.log('Checking authentication...');
    const { user, error: authError, supabase } = await getAuthenticatedUser(request);
    console.log('Current user:', user ? { id: user.id, email: user.email } : 'No user');
    
    if (authError) {
      console.log('Auth error:', authError);
      return NextResponse.json(
        { 
          success: false,
          error: 'שגיאה באימות המשתמש',
          details: authError.message 
        },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { 
          success: false,
          error: 'נדרש להתחבר למערכת' 
        },
        { status: 401 }
      );
    }
    
    console.log('Starting admin check...');
    // בדיקת הרשאות מנהל - עקיפת RLS על ידי שימוש ב-admin client
    const supabaseAdmin = getSupabaseAdmin();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    console.log('Admin check via direct query:', { userProfile, profileError });
    
    if (profileError) {
      console.log('Profile check error:', profileError);
      return NextResponse.json(
        { 
          success: false,
          error: 'שגיאה בבדיקת הרשאות',
          details: profileError.message 
        },
        { status: 500 }
      );
    }
    
    const isAdmin = userProfile?.role === 'admin';
    console.log('Is admin result:', isAdmin);
    
    if (!isAdmin) {
      console.log('Access denied - not admin, role is:', userProfile?.role);
      return NextResponse.json(
        { 
          success: false,
          error: 'אין הרשאה לבצע פעולה זו',
          details: `התפקיד הנוכחי: ${userProfile?.role || 'לא מוגדר'}. נדרש תפקיד admin.`
        },
        { status: 403 }
      );
    }

    console.log('Parsing request body...');
    const body = await request.json();
    console.log('Request body:', body);
    const { testEmail } = body;

    if (!testEmail) {
      console.log('No test email provided');
      return NextResponse.json(
        { error: 'נדרש להזין כתובת מייל לבדיקה' },
        { status: 400 }
      );
    }

    console.log('Testing email connection...');
    // בדיקת חיבור לשרת המייל
    const connectionTest = await emailService.testConnection();
    console.log('Connection test result:', connectionTest);
    
    if (!connectionTest) {
      console.log('Connection test failed');
      return NextResponse.json({
        success: false,
        message: 'שגיאה בחיבור לשרת המייל. בדוק את הגדרות המייל במשתני הסביבה.',
        connectionStatus: 'failed'
      });
    }

    console.log('Preparing test email data...');
    // שליחת מייל בדיקה
    const testEmailData = {
      email: testEmail,
      userName: 'משתמש בדיקה',
      role: 'student',
      loginUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      isInvitation: false,
      password: 'test123456'
    };
    console.log('Test email data prepared:', { email: testEmail, role: 'student' });

    console.log('Sending welcome email...');
    const emailSent = await emailService.sendWelcomeEmail(testEmailData);
    console.log('Email sent result:', emailSent);

    if (emailSent) {
      console.log('Email sent successfully');
      return NextResponse.json({
        success: true,
        message: `מייל בדיקה נשלח בהצלחה לכתובת ${testEmail}`,
        connectionStatus: 'success'
      });
    } else {
      console.log('Email sending failed');
      return NextResponse.json({
        success: false,
        message: 'שגיאה בשליחת מייל הבדיקה',
        connectionStatus: 'email_failed'
      });
    }

  } catch (error) {
    console.error('=== Error in test-email API ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false,
        error: 'שגיאה פנימית בשרת',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}