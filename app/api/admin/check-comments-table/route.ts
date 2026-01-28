import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check if user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'org_admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if submission_comments table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('submission_comments')
      .select('count(*)')
      .limit(1);

    if (tableError) {
      return NextResponse.json({
        tableExists: false,
        error: tableError.message,
        code: tableError.code
      });
    }

    // Check RLS policies - simplified check
    let canInsert = false;
    try {
      const { error: insertTestError } = await supabase
        .from('submission_comments')
        .insert({
          submission_id: -1, // This will fail but we just want to check permissions
          comment: 'test',
          is_internal: false
        });
      
      // If we get a foreign key error, it means we have insert permissions
      canInsert = (insertTestError?.code === '23503') || (insertTestError?.message?.includes('foreign key') === true);
    } catch (e) {
      canInsert = false;
    }

    return NextResponse.json({
      tableExists: true,
      userRole: profile.role,
      userId: user.id,
      canInsert: canInsert,
      tableRowCount: Array.isArray(tableCheck) && tableCheck.length > 0 ? (tableCheck[0] as any)?.count || 0 : 0
    });

  } catch (error) {
    console.error('Error checking comments table:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}