import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'lessons' });

    if (columnsError) {
      console.error('Error getting columns:', columnsError);
      // Fallback: try to get some sample data
      const { data: sampleLessons, error: sampleError } = await supabase
        .from('lessons')
        .select('*')
        .limit(1);

      if (sampleError) {
        return NextResponse.json({ 
          error: 'Could not get table structure',
          details: columnsError.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Could not get column info, showing sample data',
        sampleData: sampleLessons?.[0] || null,
        availableKeys: sampleLessons?.[0] ? Object.keys(sampleLessons[0]) : []
      });
    }

    // Get some sample lessons data
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .limit(3);

    if (lessonsError) {
      console.error('Error getting lessons:', lessonsError);
    }

    // Check video_lessons table status
    const { data: videoLessons, error: videoLessonsError } = await supabase
      .from('video_lessons')
      .select('*')
      .limit(3);

    return NextResponse.json({
      tableColumns: columns,
      sampleLessons: lessons || [],
      videoLessons: videoLessons || [],
      videoLessonsError: videoLessonsError?.message || null,
      lessonsCount: lessons?.length || 0,
      videoLessonsCount: videoLessons?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}