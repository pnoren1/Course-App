import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const assignmentId = url.searchParams.get('assignment_id');

    let query = supabaseAdmin
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments(*),
        user_profile:user_profile!assignment_submissions_user_id_fkey(*),
        submission_files(count)
      `);

    // If org_admin, filter by organization
    if (profile.role === 'org_admin' && profile.organization_id) {
      // First get the user IDs from the organization
      const { data: orgUsers } = await supabaseAdmin
        .from('user_profile')
        .select('user_id')
        .eq('organization_id', profile.organization_id);
      
      const userIds = orgUsers?.map(u => u.user_id) || [];
      if (userIds.length > 0) {
        query = query.in('user_id', userIds);
      } else {
        // No users in organization, return empty result
        return NextResponse.json({ submissions: [] });
      }
    }

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
    console.log('🔧 PATCH /api/admin/submissions - Starting');
    
    // Check authentication and get user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    console.log('👤 Authentication result:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError ? (authError as any).message : null 
    });
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError ? (authError as any).message : 'No user');
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

    console.log('👤 User profile:', { 
      profile, 
      profileError: profileError?.message 
    });

    if (profileError || !profile) {
      console.log('❌ Profile not found:', profileError?.message);
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    const hasAdminAccess = profile.role === 'admin' || profile.role === 'org_admin';
    
    console.log('🔐 Access check:', { 
      role: profile.role, 
      hasAdminAccess 
    });
    
    if (!hasAdminAccess) {
      console.log('❌ Access denied - insufficient permissions');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { submissionId, status } = await request.json();

    console.log('📝 Update request:', { submissionId, status });

    if (!submissionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['submitted', 'reviewed', 'needs_revision', 'approved'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If org_admin, verify they can update this submission
    if (profile.role === 'org_admin') {
      if (!profile.organization_id) {
        console.log('❌ Org admin has no organization_id');
        return NextResponse.json({ error: 'Organization admin must be assigned to an organization' }, { status: 403 });
      }

      // First get the submission
      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('assignment_submissions')
        .select('user_id')
        .eq('id', submissionId)
        .single();

      console.log('📋 Submission check:', { 
        submission, 
        submissionError: submissionError?.message 
      });

      if (submissionError || !submission) {
        console.log('❌ Submission not found:', submissionError?.message);
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }

      // Then get the user's organization separately
      const { data: submissionUser, error: userError } = await supabaseAdmin
        .from('user_profile')
        .select('organization_id')
        .eq('user_id', submission.user_id)
        .single();

      console.log('👤 Submission user check:', { 
        submissionUser, 
        userError: userError?.message 
      });

      if (userError || !submissionUser) {
        console.log('❌ Submission user not found:', userError?.message);
        return NextResponse.json({ error: 'Submission user not found' }, { status: 404 });
      }

      const submissionOrgId = submissionUser.organization_id;
      
      console.log('🏢 Organization check:', { 
        submissionOrgId, 
        userOrgId: profile.organization_id,
        match: submissionOrgId === profile.organization_id
      });

      if (!submissionOrgId) {
        console.log('❌ Submission has no organization');
        return NextResponse.json({ error: 'Cannot update submission without organization' }, { status: 403 });
      }

      if (submissionOrgId !== profile.organization_id) {
        console.log('❌ Organization mismatch');
        return NextResponse.json({ error: 'Cannot update submission from different organization' }, { status: 403 });
      }
    }

    // Update submission using admin client (bypasses RLS)
    console.log('💾 Updating submission...');
    
    const { data, error } = await supabaseAdmin
      .from('assignment_submissions')
      .update({ status })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating submission status:', error);
      
      // If it's the updated_at trigger error, provide a helpful message
      if (error.message?.includes('updated_at')) {
        return NextResponse.json({ 
          error: 'Database schema issue detected. Please run the latest migrations to fix the updated_at column.' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: `Failed to update submission status: ${error.message || error.code || 'Unknown error'}` 
      }, { status: 500 });
    }

    console.log('✅ Submission updated successfully');
    return NextResponse.json({ submission: data });
  } catch (error: any) {
    console.error('❌ Error in submissions PATCH API:', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}