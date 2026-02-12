import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';
import { emailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdminAuth(request);

    const body = await request.json();
    const { recipientType, subject, message, organizationId, groupId, userId } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'נושא והודעה הם שדות חובה' },
        { status: 400 }
      );
    }

    // Get recipients based on type
    let recipients: { email: string; user_name: string | null }[] = [];

    if (recipientType === 'all') {
      const { data, error } = await supabase
        .from('user_profile')
        .select('email, user_name')
        .not('email', 'is', null);
      
      if (error) throw error;
      recipients = (data || []).filter((r): r is { email: string; user_name: string | null } => r.email !== null);
    } else if (recipientType === 'organization' && organizationId) {
      const { data, error } = await supabase
        .from('user_profile')
        .select('email, user_name')
        .eq('organization_id', organizationId)
        .not('email', 'is', null);
      
      if (error) throw error;
      recipients = (data || []).filter((r): r is { email: string; user_name: string | null } => r.email !== null);
    } else if (recipientType === 'group' && groupId) {
      const { data, error } = await supabase
        .from('user_profile')
        .select('email, user_name')
        .eq('group_id', groupId)
        .not('email', 'is', null);
      
      if (error) throw error;
      recipients = (data || []).filter((r): r is { email: string; user_name: string | null } => r.email !== null);
    } else if (recipientType === 'user' && userId) {
      const { data, error } = await supabase
        .from('user_profile')
        .select('email, user_name')
        .eq('user_id', userId)
        .not('email', 'is', null)
        .single();
      
      if (error) throw error;
      recipients = data && data.email ? [data as { email: string; user_name: string | null }] : [];
    } else {
      return NextResponse.json(
        { error: 'נא לבחור נמענים' },
        { status: 400 }
      );
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'לא נמצאו נמענים' },
        { status: 400 }
      );
    }

    // Send email
    const success = await emailService.sendBulkEmail({
      recipients: recipients.map(r => r.email),
      subject,
      message,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    });

    if (!success) {
      return NextResponse.json(
        { error: 'שגיאה בשליחת המייל' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error('Error sending bulk email:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת המייל' },
      { status: 500 }
    );
  }
}
