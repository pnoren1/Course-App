import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { VideoEventOptimizer } from '@/lib/services/videoEventOptimizer';

// POST /api/video/events/batch - Track multiple viewing events
export async function POST(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Video events batch authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Video events batch authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Video events batch user authenticated:', { id: user.id, email: user.email });

    const body = await request.json();
    const { session_token, events, compression_info } = body;
    
    // Initialize optimizer for decompression if needed
    const optimizer = new VideoEventOptimizer();

    // Validate required fields
    if (!session_token || !events || !Array.isArray(events)) {
      return NextResponse.json({ 
        error: 'Missing required fields: session_token, events (array)' 
      }, { status: 400 });
    }

    if (events.length === 0) {
      return NextResponse.json({ 
        error: 'Events array cannot be empty' 
      }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (events.length > 100) {
      return NextResponse.json({ 
        error: 'Batch size too large. Maximum 100 events per batch' 
      }, { status: 400 });
    }

    // Decompress events if they were compressed
    let processedEvents = events;
    if (compression_info && compression_info.compression_ratio < 1) {
      try {
        processedEvents = optimizer.decompressEvents(events);
      } catch (error) {
        console.error('Error decompressing events:', error);
        return NextResponse.json({ 
          error: 'Failed to decompress events' 
        }, { status: 400 });
      }
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

    // Validate and prepare events
    const validEventTypes = ['play', 'pause', 'seek', 'heartbeat', 'end'];
    const preparedEvents = [];
    
    for (let i = 0; i < processedEvents.length; i++) {
      const event = processedEvents[i];
      
      // Validate each event
      if (!event.event_type || event.timestamp_in_video === undefined) {
        return NextResponse.json({ 
          error: `Event ${i}: Missing required fields: event_type, timestamp_in_video` 
        }, { status: 400 });
      }

      if (!validEventTypes.includes(event.event_type)) {
        return NextResponse.json({ 
          error: `Event ${i}: Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` 
        }, { status: 400 });
      }

      preparedEvents.push({
        session_id: session.id,
        event_type: event.event_type,
        timestamp_in_video: parseFloat(event.timestamp_in_video),
        client_timestamp: event.client_timestamp || new Date().toISOString(),
        is_tab_visible: event.is_tab_visible !== undefined ? event.is_tab_visible : true,
        playback_rate: event.playback_rate ? parseFloat(event.playback_rate) : 1.0,
        volume_level: event.volume_level !== undefined ? parseFloat(event.volume_level) : 1.0,
        additional_data: event.additional_data || {}
      });
    }

    // Insert all events in a single transaction
    const { data: insertedEvents, error } = await supabase
      .from('video_viewing_events')
      .insert(preparedEvents)
      .select();

    if (error) {
      console.error('Error creating batch viewing events:', error);
      return NextResponse.json({ error: 'Failed to create viewing events' }, { status: 500 });
    }

    // Update session heartbeat
    await supabase
      .from('video_viewing_sessions')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', session.id);

    return NextResponse.json({ 
      message: `Successfully created ${insertedEvents?.length || 0} events`,
      events: insertedEvents,
      compression_info: compression_info || null
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}