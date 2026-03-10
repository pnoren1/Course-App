import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { VALID_SUBMISSION_STATUSES } from '@/lib/types/submission-status';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for admin operations
    const supabaseAdmin = getSupabaseAdmin();

    // Check if user has admin access
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const hasAdminAccess = profile.role === 'admin' || profile.role === 'org_admin';
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { submissionIds, status } = await request.json();

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid submissionIds' }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    // Validate status
    if (!VALID_SUBMISSION_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If org_admin, verify they can update these submissions
    if (profile.role === 'org_admin') {
      if (!profile.organization_id) {
        return NextResponse.json({ error: 'Organization admin must be assigned to an organization' }, { status: 403 });
      }

      // Get all submissions
      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('assignment_submissions')
        .select('id, user_id')
        .in('id', submissionIds);

      if (submissionsError || !submissions) {
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
      }

      // Get user IDs from submissions
      const userIds = submissions.map(s => s.user_id);

      // Get users' organizations
      const { data: users, error: usersError } = await supabaseAdmin
        .from('user_profile')
        .select('user_id, organization_id')
        .in('user_id', userIds);

      if (usersError || !users) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      // Check if all submissions belong to the org_admin's organization
      const invalidSubmissions = users.filter(u => u.organization_id !== profile.organization_id);
      
      if (invalidSubmissions.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot update submissions from different organizations' 
        }, { status: 403 });
      }
    }

    // Update all submissions using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('assignment_submissions')
      .update({ status })
      .in('id', submissionIds)
      .select();

    if (error) {
      console.error('Error updating submissions:', error);
      
      if (error.message?.includes('updated_at')) {
        return NextResponse.json({ 
          error: 'Database schema issue detected. Please run the latest migrations to fix the updated_at column.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: `Failed to update submissions: ${error.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      updatedCount: data?.length || 0,
      submissions: data 
    });
  } catch (error: any) {
    console.error('Error in bulk update API:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}
