import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { feedbackService } from '@/lib/services/feedbackService';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'לא מורשה' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'נדרשות הרשאות אדמין' },
        { status: 403 }
      );
    }

    // Check if requesting stats
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      // Return statistics
      const stats = await feedbackService.getFeedbackStats();
      return NextResponse.json(stats);
    }

    // Return all feedback with user details
    const feedback = await feedbackService.getAllFeedback();
    return NextResponse.json(feedback);

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'שגיאה בטעינת המשובים' },
      { status: 500 }
    );
  }
}
