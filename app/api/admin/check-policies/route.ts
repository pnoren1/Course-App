import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Check if submission_comments table exists and what policies are on it
    const { data: tableInfo, error: tableError } = await (supabaseAdmin as any)
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'submission_comments')
      .eq('table_schema', 'public');

    if (tableError) {
      return NextResponse.json({
        success: false,
        error: `Table check error: ${tableError.message}`,
        tableExists: false
      });
    }

    const tableExists = tableInfo && tableInfo.length > 0;

    // Try to query policies directly from pg_policies
    const { data: policies, error: policiesError } = await (supabaseAdmin as any)
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'submission_comments');

    let studentPolicyExists = false;
    if (policies) {
      studentPolicyExists = policies.some((policy: any) => 
        policy.policyname === 'Students can view comments on their submissions'
      );
    }

    return NextResponse.json({
      success: true,
      tableExists,
      migration045Applied: studentPolicyExists,
      studentCommentsPolicyExists: studentPolicyExists,
      totalPolicies: policies?.length || 0,
      policies: policies?.map((p: any) => ({
        name: p.policyname,
        cmd: p.cmd,
        qual: p.qual
      })) || [],
      policiesError: policiesError?.message
    });

  } catch (error) {
    console.error('Error in policy check:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}