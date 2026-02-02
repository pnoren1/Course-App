import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

// Helper function to extract Spotlightr video ID from embed URL
function extractSpotlightrId(embedUrl: string): string | null {
  if (!embedUrl) return null;
  
  try {
    const url = new URL(embedUrl);
    const pathParts = url.pathname.split('/');
    const watchIndex = pathParts.indexOf('watch');
    if (watchIndex !== -1 && pathParts[watchIndex + 1]) {
      return pathParts[watchIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

// Helper function to parse duration string to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  return 0;
}

// POST /api/video/sessions - Create new viewing session
export async function POST(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Starting video session authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', { id: user.id, email: user.email });

    const body = await request.json();
    const { video_lesson_id, browser_tab_id } = body;

    console.log('📝 Request data:', { video_lesson_id, browser_tab_id });

    // Validate required fields
    if (!video_lesson_id) {
      console.log('❌ Missing video_lesson_id');
      return NextResponse.json({ 
        error: 'Missing required field: video_lesson_id' 
      }, { status: 400 });
    }

    // Check if lesson exists in lessons table
    console.log('🔍 Looking for lesson with ID:', video_lesson_id);
    const { data: lessonData, error: lessonDataError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', video_lesson_id)
      .single();

    if (lessonDataError || !lessonData) {
      console.log('❌ Lesson not found:', lessonDataError?.message);
      return NextResponse.json({ error: 'Video lesson not found' }, { status: 404 });
    }

    console.log('✅ Found lesson:', { 
      id: lessonData.id, 
      title: lessonData.title,
      embedUrl: lessonData.embedUrl,
      embed_url: lessonData.embed_url 
    });

    // Check if this lesson has a video URL
    const embedUrl = lessonData.embedUrl || lessonData.embed_url || '';
    console.log('🎥 Video URL:', embedUrl);
    
    if (!embedUrl || !embedUrl.includes('spotlightr')) {
      console.log('❌ No Spotlightr video found');
      return NextResponse.json({ error: 'This lesson does not have a video' }, { status: 400 });
    }

    // Try to find or create corresponding video_lesson entry
    let videoLessonId = null;
    
    console.log('🔍 Looking for existing video_lesson...');
    // First check if video_lesson already exists
    const { data: existingVideoLesson } = await supabase
      .from('video_lessons')
      .select('id')
      .eq('lesson_id', video_lesson_id.toString())
      .single();

    if (existingVideoLesson) {
      console.log('✅ Found existing video_lesson:', existingVideoLesson.id);
      videoLessonId = existingVideoLesson.id;
    } else {
      console.log('📝 Creating new video_lesson entry...');
      // Create new video_lesson entry
      const spotlightrId = extractSpotlightrId(embedUrl);
      console.log('🎬 Extracted Spotlightr ID:', spotlightrId);
      
      if (spotlightrId) {
        const { data: newVideoLesson, error: insertError } = await supabase
          .from('video_lessons')
          .insert({
            lesson_id: video_lesson_id.toString(),
            title: lessonData.title,
            spotlightr_video_id: spotlightrId,
            duration_seconds: lessonData.duration_seconds || parseDuration(lessonData.duration || '0:00'),
            required_completion_percentage: 80
          })
          .select('id')
          .single();

        if (newVideoLesson && !insertError) {
          console.log('✅ Created video_lesson:', newVideoLesson.id);
          videoLessonId = newVideoLesson.id;
        } else {
          console.error('❌ Could not create video_lesson entry:', insertError);
          return NextResponse.json({ error: 'Could not initialize video tracking' }, { status: 500 });
        }
      } else {
        console.log('❌ Could not extract Spotlightr ID from URL');
        return NextResponse.json({ error: 'Invalid video URL format' }, { status: 400 });
      }
    }

    if (!videoLessonId) {
      console.log('❌ No video lesson ID available');
      return NextResponse.json({ error: 'Could not initialize video lesson' }, { status: 500 });
    }

    console.log('🎯 Using video_lesson_id:', videoLessonId);

    // Close any existing active sessions for this user and video
    console.log('🔄 Closing existing sessions...');
    await supabase
      .from('video_viewing_sessions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('video_lesson_id', videoLessonId)
      .eq('is_active', true);

    // Generate unique session token
    const sessionToken = randomBytes(32).toString('hex');
    console.log('🔑 Generated session token:', sessionToken.substring(0, 8) + '...');

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '';

    // Create new session
    console.log('📝 Creating new session...');
    const { data: session, error } = await supabase
      .from('video_viewing_sessions')
      .insert({
        user_id: user.id,
        video_lesson_id: videoLessonId, // Use the correct video lesson UUID
        session_token: sessionToken,
        browser_tab_id,
        user_agent: userAgent,
        ip_address: ipAddress || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating viewing session:', error);
      return NextResponse.json({ error: 'Failed to create viewing session' }, { status: 500 });
    }

    console.log('✅ Session created successfully:', session.id);

    return NextResponse.json({ 
      session_token: sessionToken,
      video_data: {
        id: videoLessonId,
        lesson_id: video_lesson_id.toString(),
        title: lessonData.title,
        spotlightr_video_id: extractSpotlightrId(embedUrl),
        duration_seconds: lessonData.duration_seconds || parseDuration(lessonData.duration || '0:00')
      }
    }, { status: 201 });
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/video/sessions - Update existing session (heartbeat)
export async function PUT(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ PUT Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { session_token } = body;

    if (!session_token) {
      return NextResponse.json({ 
        error: 'Missing required field: session_token' 
      }, { status: 400 });
    }

    // Update session heartbeat
    const { data: session, error } = await supabase
      .from('video_viewing_sessions')
      .update({ 
        last_heartbeat: new Date().toISOString(),
        is_active: true 
      })
      .eq('session_token', session_token)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !session) {
      console.error('Error updating session:', error);
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Session updated successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/video/sessions - Close session
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ DELETE Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('session_token');

    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'Missing required parameter: session_token' 
      }, { status: 400 });
    }

    // Close session
    const { error } = await supabase
      .from('video_viewing_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error closing session:', error);
      return NextResponse.json({ error: 'Failed to close session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Session closed successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}