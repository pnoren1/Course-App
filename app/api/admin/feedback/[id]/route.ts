import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import { feedbackService } from '@/lib/services/feedbackService';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error('API: supabaseAdmin not available');
      return NextResponse.json(
        { error: 'שגיאה בהגדרות השרת' },
        { status: 500 }
      );
    }

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו - נדרשות הרשאות מנהל' },
        { status: 403 }
      );
    }

    // Validate feedback ID
    if (!feedbackId) {
      return NextResponse.json(
        { error: 'נדרש מזהה משוב' },
        { status: 400 }
      );
    }

    // Check if feedback exists
    const { data: feedback, error: fetchError } = await supabaseAdmin
      .from('feedback')
      .select('id')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !feedback) {
      return NextResponse.json(
        { error: 'משוב לא נמצא' },
        { status: 404 }
      );
    }

    // Delete the feedback
    const success = await feedbackService.deleteFeedback(feedbackId);

    if (!success) {
      return NextResponse.json(
        { error: 'שגיאה במחיקת המשוב' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'המשוב נמחק בהצלחה'
    });

  } catch (error) {
    console.error('Error in feedback delete API:', error);
    return NextResponse.json(
      { error: `שגיאה פנימית בשרת: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
