import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/video/lessons - Get all video lessons
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lessons, error } = await supabase
      .from('video_lessons')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching video lessons:', error);
      return NextResponse.json({ error: 'Failed to fetch video lessons' }, { status: 500 });
    }

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/video/lessons - Create new video lesson (admin/org_admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { lesson_id, title, spotlightr_video_id, duration_seconds, required_completion_percentage } = body;

    // Validate required fields
    if (!lesson_id || !title || !spotlightr_video_id || !duration_seconds) {
      return NextResponse.json({ 
        error: 'Missing required fields: lesson_id, title, spotlightr_video_id, duration_seconds' 
      }, { status: 400 });
    }

    const { data: lesson, error } = await supabase
      .from('video_lessons')
      .insert({
        lesson_id,
        title,
        spotlightr_video_id,
        duration_seconds,
        required_completion_percentage: required_completion_percentage || 80
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating video lesson:', error);
      return NextResponse.json({ error: 'Failed to create video lesson' }, { status: 500 });
    }

    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}