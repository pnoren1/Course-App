import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/video/progress/admin - Get all users' video progress (admin/org_admin only)
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or org_admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !['admin', 'org_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const videoLessonId = searchParams.get('video_lesson_id');
    const organizationId = searchParams.get('organization_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('video_progress')
      .select(`
        *,
        video_lessons (
          id,
          title,
          lesson_id,
          duration_seconds,
          required_completion_percentage
        ),
        user_profile!inner (
          user_id,
          full_name,
          email,
          organization_id
        )
      `);

    if (videoLessonId) {
      query = query.eq('video_lesson_id', videoLessonId);
    }

    if (organizationId) {
      query = query.eq('user_profile.organization_id', organizationId);
    }

    const { data: progress, error } = await query
      .order('last_watch_updated', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching admin video progress:', error);
      return NextResponse.json({ error: 'Failed to fetch video progress' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('video_progress')
      .select('id', { count: 'exact', head: true });

    if (videoLessonId) {
      countQuery = countQuery.eq('video_lesson_id', videoLessonId);
    }

    if (organizationId) {
      countQuery = countQuery
        .eq('user_profile.organization_id', organizationId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting video progress:', countError);
    }

    return NextResponse.json({ 
      progress,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}