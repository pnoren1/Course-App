import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check current user
    const { user, error: userError } = await rlsSupabase.getCurrentUser();
    
    if (userError) {
      return NextResponse.json({ 
        error: 'User error', 
        details: userError,
        user: null 
      });
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'No user found', 
        user: null 
      });
    }

    // Check admin status
    const { isAdmin, error: adminError } = await rlsSupabase.isAdmin();
    
    if (adminError) {
      return NextResponse.json({ 
        error: 'Admin check error', 
        details: adminError,
        user: user.id,
        isAdmin: false 
      });
    }

    // Test basic queries
    const tests: {
      user_profile: { success: boolean; error?: string } | null;
      assignments: { success: boolean; error?: string } | null;
      assignment_submissions: { success: boolean; error?: string } | null;
    } = {
      user_profile: null,
      assignments: null,
      assignment_submissions: null
    };

    try {
      const { data: profileData, error: profileError } = await rlsSupabase
        .from('user_profile')
        .select('*')
        .limit(1);
      tests.user_profile = { success: !profileError, error: profileError?.message };
    } catch (e) {
      tests.user_profile = { success: false, error: (e as any).message };
    }

    try {
      const { data: assignmentsData, error: assignmentsError } = await rlsSupabase
        .from('assignments')
        .select('*')
        .limit(1);
      tests.assignments = { success: !assignmentsError, error: assignmentsError?.message };
    } catch (e) {
      tests.assignments = { success: false, error: (e as any).message };
    }

    try {
      const { data: submissionsData, error: submissionsError } = await rlsSupabase
        .from('assignment_submissions')
        .select('*')
        .limit(1);
      tests.assignment_submissions = { success: !submissionsError, error: submissionsError?.message };
    } catch (e) {
      tests.assignment_submissions = { success: false, error: (e as any).message };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      isAdmin,
      tests
    });

  } catch (error) {
    console.error('Debug auth test error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: (error as any).message 
    }, { status: 500 });
  }
}