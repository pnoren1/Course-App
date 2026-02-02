import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Student progress authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Student progress authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Student progress user authenticated:', { id: user.id, email: user.email });

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get target student's organization
    const { data: targetStudent, error: targetError } = await supabase
      .from('user_profile')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (targetError || !targetStudent) {
      return NextResponse.json({ error: 'Target student not found' }, { status: 404 });
    }

    // For org_admin, ensure they can only view students from their organization
    if (userProfile.role === 'org_admin' && 
        userProfile.organization_id !== targetStudent.organization_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get detailed progress data
    const { data: progressData, error: progressError } = await supabase
      .from('video_progress')
      .select(`
        id,
        video_lesson_id,
        total_watched_seconds,
        completion_percentage,
        is_completed,
        first_watch_started,
        last_watch_updated,
        suspicious_activity_count,
        grade_contribution,
        video_lessons!inner(
          id,
          title,
          lesson_id,
          duration_seconds
        )
      `)
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    // Get viewing sessions for each video
    const videoIds = progressData?.map(p => p.video_lesson_id) || [];
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('video_viewing_sessions')
      .select(`
        id,
        video_lesson_id,
        started_at,
        last_heartbeat,
        is_active
      `)
      .eq('user_id', userId)
      .in('video_lesson_id', videoIds)
      .order('started_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions data:', sessionsError);
    }

    // Get viewing events for recent sessions
    const sessionIds = sessionsData?.slice(0, 20).map(s => s.id) || [];
    
    const { data: eventsData, error: eventsError } = await supabase
      .from('video_viewing_events')
      .select(`
        id,
        session_id,
        event_type,
        timestamp_in_video,
        client_timestamp,
        is_tab_visible,
        playback_rate,
        additional_data
      `)
      .in('session_id', sessionIds)
      .order('client_timestamp', { ascending: false })
      .limit(500);

    if (eventsError) {
      console.error('Error fetching events data:', eventsError);
    }

    // Process the data
    const processedProgress = progressData?.map((progress: any) => {
      const videoSessions = sessionsData?.filter(s => s.video_lesson_id === progress.video_lesson_id) || [];
      
      const sessionsWithEvents = videoSessions.map(session => {
        const sessionEvents = eventsData?.filter(e => e.session_id === session.id) || [];
        
        return {
          id: session.id,
          startedAt: session.started_at,
          lastHeartbeat: session.last_heartbeat,
          isActive: session.is_active,
          events: sessionEvents.map(event => ({
            id: event.id,
            eventType: event.event_type,
            timestampInVideo: event.timestamp_in_video,
            clientTimestamp: event.client_timestamp,
            isTabVisible: event.is_tab_visible,
            playbackRate: event.playback_rate,
            suspiciousFlag: event.additional_data?.suspicious || false
          }))
        };
      });

      return {
        id: progress.id,
        videoTitle: progress.video_lessons.title,
        lessonId: progress.video_lessons.lesson_id,
        totalWatchedSeconds: progress.total_watched_seconds,
        completionPercentage: progress.completion_percentage,
        isCompleted: progress.is_completed,
        firstWatchStarted: progress.first_watch_started,
        lastWatchUpdated: progress.last_watch_updated,
        suspiciousActivityCount: progress.suspicious_activity_count,
        gradeContribution: progress.grade_contribution,
        videoDurationSeconds: progress.video_lessons.duration_seconds,
        viewingSessions: sessionsWithEvents
      };
    }) || [];

    // Generate suspicious activities report
    const suspiciousActivities: any[] = [];
    
    eventsData?.forEach((event: any) => {
      if (event.additional_data?.suspicious) {
        const session = sessionsData?.find(s => s.id === event.session_id);
        const progress = progressData?.find(p => p.video_lesson_id === session?.video_lesson_id);
        
        if (progress) {
          suspiciousActivities.push({
            type: event.additional_data.suspiciousType || 'Unknown Activity',
            description: event.additional_data.description || 'Suspicious behavior detected',
            timestamp: event.client_timestamp,
            videoTitle: progress.video_lessons.title,
            severity: event.additional_data.severity || 'medium'
          });
        }
      }
    });

    // Add suspicious activities based on progress data
    progressData?.forEach((progress: any) => {
      if (progress.suspicious_activity_count > 0) {
        // Check for rapid seeking patterns
        const videoSessions = sessionsData?.filter(s => s.video_lesson_id === progress.video_lesson_id) || [];
        const allEvents = eventsData?.filter(e => 
          videoSessions.some(s => s.id === e.session_id)
        ) || [];
        
        const seekEvents = allEvents.filter(e => e.event_type === 'seek');
        if (seekEvents.length > 10) {
          suspiciousActivities.push({
            type: 'Excessive Seeking',
            description: `${seekEvents.length} seek events detected, indicating possible content skipping`,
            timestamp: progress.last_watch_updated,
            videoTitle: progress.video_lessons.title,
            severity: seekEvents.length > 20 ? 'high' : 'medium'
          });
        }

        // Check for unusual playback rates
        const fastPlaybackEvents = allEvents.filter(e => 
          e.playback_rate && e.playback_rate > 2.0
        );
        if (fastPlaybackEvents.length > 5) {
          suspiciousActivities.push({
            type: 'High Speed Playback',
            description: `Frequent use of high playback speeds (>${fastPlaybackEvents[0]?.playback_rate}x)`,
            timestamp: progress.last_watch_updated,
            videoTitle: progress.video_lessons.title,
            severity: 'low'
          });
        }
      }
    });

    return NextResponse.json({
      progress: processedProgress,
      suspiciousActivities: suspiciousActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    });

  } catch (error) {
    console.error('Error in student progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}