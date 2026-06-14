import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/services/emailService';
import { getFeedbackEmail } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'לא מורשה' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const { message } = await request.json();

    // Validate input
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'נא להזין הודעה' },
        { status: 400 }
      );
    }

    // Get user details from database
    const admin = getSupabaseAdmin();
    const { data: userProfile, error: profileError } = await admin
      .from('user_profile')
      .select(`
        user_name,
        email,
        organization_id,
        group_id,
        organizations (name),
        groups (name)
      `)
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'שגיאה בטעינת פרטי משתמש' },
        { status: 500 }
      );
    }

    // Prepare email content
    const userName = userProfile?.user_name || 'לא צוין';
    const userEmail = userProfile?.email || 'לא צוין';
    const organizationName = userProfile?.organizations?.name || 'לא משויך';
    const groupName = userProfile?.groups?.name || 'לא משויך';
    const timestamp = new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const emailContent = `
פנייה חדשה מהקורס! 📬

תלמידה: ${userName}
מייל: ${userEmail}
ארגון: ${organizationName}
קבוצה: ${groupName}

תוכן הפנייה:
${message}

---
נשלח בתאריך: ${timestamp}
    `.trim();

    // Send email
    const feedbackEmail = getFeedbackEmail();
    const emailSent = await emailService.sendBulkEmail({
      recipients: [feedbackEmail],
      subject: `פנייה חדשה מהקורס - ${userName}`,
      message: emailContent,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://course-app-khaki.vercel.app',
    });

    if (!emailSent) {
      console.error('Failed to send contact email');
      return NextResponse.json(
        { error: 'שגיאה בשליחת המייל' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing contact:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת הפנייה' },
      { status: 500 }
    );
  }
}
