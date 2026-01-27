import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const assignmentId = url.searchParams.get('assignment_id');

    let query = rlsSupabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments(*),
        user_profile:user_profile!assignment_submissions_user_id_fkey(*),
        submission_files(count)
      `);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (assignmentId && assignmentId !== 'all') {
      query = query.eq('assignment_id', parseInt(assignmentId));
    }

    const { data, error } = await query.order('submission_date', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Transform data to include files count
    const submissions = (data || []).map(item => ({
      ...item,
      files_count: Array.isArray(item.submission_files) ? item.submission_files.length : 0
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error in submissions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const { submissionId, status } = await request.json();

    if (!submissionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['submitted', 'reviewed', 'needs_revision', 'approved'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await rlsSupabase
      .from('assignment_submissions')
      .update({ status })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating submission status:', error);
      return NextResponse.json({ error: 'Failed to update submission status' }, { status: 500 });
    }

    return NextResponse.json({ submission: data });
  } catch (error) {
    console.error('Error in submissions PATCH API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}