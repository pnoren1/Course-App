import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// GET /api/video/lessons/[id] - Get specific video lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { id } = await params;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: lesson, error } = await supabase
      .from('video_lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching video lesson:', error);
      return NextResponse.json({ error: 'Video lesson not found' }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/video/lessons/[id] - Update video lesson (admin/org_admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { id } = await params;
    
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
    const { title, spotlightr_video_id, duration_seconds, required_completion_percentage } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (spotlightr_video_id !== undefined) updateData.spotlightr_video_id = spotlightr_video_id;
    if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds;
    if (required_completion_percentage !== undefined) updateData.required_completion_percentage = required_completion_percentage;

    const { data: lesson, error } = await supabase
      .from('video_lessons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating video lesson:', error);
      return NextResponse.json({ error: 'Failed to update video lesson' }, { status: 500 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/video/lessons/[id] - Delete video lesson (admin/org_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { id } = await params;
    
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

    const { error } = await supabase
      .from('video_lessons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting video lesson:', error);
      return NextResponse.json({ error: 'Failed to delete video lesson' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Video lesson deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}