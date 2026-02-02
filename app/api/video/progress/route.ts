import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/video/progress - Get user's video progress
export async function GET(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Video progress authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Video progress authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Video progress user authenticated:', { id: user.id, email: user.email });

    const { searchParams } = new URL(request.url);
    const videoLessonId = searchParams.get('video_lesson_id');
    const userId = searchParams.get('user_id');

    console.log('📝 Video progress request params:', { videoLessonId, userId, currentUserId: user.id });

    // If user_id is provided, check if current user is admin/org_admin
    let targetUserId = user.id;
    if (userId && userId !== user.id) {
      console.log('🔍 Checking admin permissions for user:', userId);
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profile')
        .select('role')
        .eq('user_id', user.id)
        .single();

      console.log('👤 User profile:', { role: profile?.role, error: profileError?.message });

      if (profileError || !profile || !['admin', 'org_admin'].includes(profile.role)) {
        console.log('❌ Insufficient permissions for viewing other user progress');
        return NextResponse.json({ error: 'Forbidden - Admin access required to view other users progress' }, { status: 403 });
      }
      targetUserId = userId;
      console.log('✅ Admin access granted for user:', targetUserId);
    }

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
        )
      `)
      .eq('user_id', targetUserId);

    if (videoLessonId) {
      query = query.eq('video_lesson_id', videoLessonId);
    }

    console.log('🔍 Fetching video progress for user:', targetUserId);

    const { data: progress, error } = await query.order('last_watch_updated', { ascending: false });

    if (error) {
      console.error('❌ Error fetching video progress:', error);
      return NextResponse.json({ error: 'Failed to fetch video progress' }, { status: 500 });
    }

    console.log('✅ Video progress fetched successfully:', { count: progress?.length || 0 });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('💥 Unexpected error in video progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}