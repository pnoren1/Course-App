import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/video/events - Track single viewing event
export async function POST(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Video events authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Video events authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Video events user authenticated:', { id: user.id, email: user.email });

    const body = await request.json();
    const { 
      session_token, 
      event_type, 
      timestamp_in_video, 
      is_tab_visible, 
      playback_rate, 
      volume_level, 
      additional_data 
    } = body;

    // Validate required fields
    if (!session_token || !event_type || timestamp_in_video === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: session_token, event_type, timestamp_in_video' 
      }, { status: 400 });
    }

    // Validate event type
    const validEventTypes = ['play', 'pause', 'seek', 'heartbeat', 'end'];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json({ 
        error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Get session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('video_viewing_sessions')
      .select('id, user_id, is_active')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized - Session belongs to different user' }, { status: 403 });
    }

    if (!session.is_active) {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
    }

    // Create viewing event
    const { data: event, error } = await supabase
      .from('video_viewing_events')
      .insert({
        session_id: session.id,
        event_type,
        timestamp_in_video: parseFloat(timestamp_in_video),
        client_timestamp: new Date().toISOString(),
        is_tab_visible: is_tab_visible !== undefined ? is_tab_visible : true,
        playback_rate: playback_rate ? parseFloat(playback_rate) : 1.0,
        volume_level: volume_level !== undefined ? parseFloat(volume_level) : 1.0,
        additional_data: additional_data || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating viewing event:', error);
      return NextResponse.json({ error: 'Failed to create viewing event' }, { status: 500 });
    }

    // Update session heartbeat
    await supabase
      .from('video_viewing_sessions')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', session.id);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}