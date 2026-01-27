import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const { user } = await rlsSupabase.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isAdmin } = await rlsSupabase.isAdmin();
    
    // בדיקה נוספת אם המשתמש הוא מנהל ארגון
    let hasAdminAccess = isAdmin;
    if (!isAdmin) {
      try {
        const { data: profile, error } = await rlsSupabase.from('user_profile')
          .select('*')
          .eq('user_id', user.id)
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
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const submissionId = parseInt(resolvedParams.id);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    // Verify submission exists
    const { data: submission, error: submissionError } = await rlsSupabase
      .from('assignment_submissions')
      .select('id')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Get files for this submission
    const { data: files, error: filesError } = await rlsSupabase
      .from('submission_files')
      .select('*')
      .eq('submission_id', submissionId)
      .order('uploaded_at', { ascending: true });

    if (filesError) {
      console.error('Error fetching submission files:', filesError);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('Error in submission files API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}