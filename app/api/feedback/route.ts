import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { emailService } from '@/lib/services/emailService';
import { getFeedbackEmail } from '@/lib/env';
import { feedbackService } from '@/lib/services/feedbackService';

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
    const { rating, feedback } = await request.json();

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'דירוג לא תקין' },
        { status: 400 }
      );
    }

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'נא להזין משוב' },
        { status: 400 }
      );
    }

    // Save feedback to database
    const savedFeedback = await feedbackService.createFeedback(userId, rating, feedback);
    if (!savedFeedback) {
      console.error('Failed to save feedback to database');
      return NextResponse.json(
        { error: 'שגיאה בשמירת המשוב' },
        { status: 500 }
      );
    }

    // Get user details from database
    const admin = getSupabaseAdmin();
    const { data: userProfile, error: profileError } = await admin
      .from('user_profile')
      .select(`
        user_name,
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
    const organizationName = userProfile?.organizations?.name || 'לא משויך';
    const groupName = userProfile?.groups?.name || 'לא משויך';
    const stars = '⭐'.repeat(rating);
    const timestamp = new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailContent = `
משוב חדש מהקורס! 🎓

דירוג: ${stars} (${rating}/5)

תלמידה: ${userName}
ארגון: ${organizationName}
קבוצה: ${groupName}

תוכן המשוב:
${feedback}

---
נשלח בתאריך: ${timestamp}
    `.trim();

    // Send email
    const feedbackEmail = getFeedbackEmail();
    const emailSent = await emailService.sendBulkEmail({
      recipients: [feedbackEmail],
      subject: `משוב חדש מהקורס - ${userName} (${rating}/5)`,
      message: emailContent,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://course-app-khaki.vercel.app'
    });

    if (!emailSent) {
      console.error('Failed to send feedback email');
      return NextResponse.json(
        { error: 'שגיאה בשליחת המייל' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת המשוב' },
      { status: 500 }
    );
  }
}
