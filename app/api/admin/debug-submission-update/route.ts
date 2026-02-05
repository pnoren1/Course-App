import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json();

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
    }

    // Check authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: { authError: authError ? (authError as any).message : null }
      }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get submission details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('assignment_submissions')
      .select(`
        *,
        user_profile!assignment_submissions_user_id_fkey(*)
      `)
      .eq('id', submissionId)
      .single();

    // Try to update with admin client
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('assignment_submissions')
      .update({ status: 'reviewed' })
      .eq('id', submissionId)
      .select()
      .single();

    return NextResponse.json({
      debug: {
        user: {
          id: user.id,
          email: user.email
        },
        profile: {
          data: profile,
          error: profileError?.message
        },
        submission: {
          data: submission,
          error: submissionError?.message
        },
        updateTest: {
          success: !updateError,
          data: updateResult,
          error: updateError?.message
        },
        checks: {
          hasProfile: !!profile,
          hasAdminRole: profile?.role === 'admin' || profile?.role === 'org_admin',
          profileOrgId: profile?.organization_id,
          submissionUserId: submission?.user_id,
          submissionUserOrgId: (submission?.user_profile as any)?.organization_id,
          organizationMatch: profile?.organization_id === (submission?.user_profile as any)?.organization_id
        }
      }
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error.message 
    }, { status: 500 });
  }
}
