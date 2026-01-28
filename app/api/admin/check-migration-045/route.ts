import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Check if submission_comments table exists
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('submission_comments')
      .select('id')
      .limit(1);

    if (commentsError) {
      return NextResponse.json({
        success: false,
        tableExists: false,
        error: `submission_comments table error: ${commentsError.message}`,
        migration045Needed: true
      });
    }

    // Try to run a query that would test the student policy
    // This will help us understand if the policy exists
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('submission_comments')
      .select('*')
      .limit(1);

    return NextResponse.json({
      success: true,
      tableExists: true,
      canQueryComments: !testError,
      commentsCount: comments?.length || 0,
      testError: testError?.message,
      migration045Status: 'Table exists - policy status unclear without user context'
    });

  } catch (error) {
    console.error('Error checking migration 045:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      migration045Needed: true
    });
  }
}