import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Check if user is admin or org_admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // For org_admin, restrict to their organization
    const targetOrgId = userProfile.role === 'org_admin' ? userProfile.organization_id : organizationId;

    // Get suspicious activities from video_viewing_events with additional_data containing suspicious flags
    let suspiciousQuery = supabase
      .from('video_viewing_events')
      .select(`
        id,
        session_id,
        event_type,
        timestamp_in_video,
        client_timestamp,
        additional_data,
        video_viewing_sessions!inner(
          id,
          user_id,
          video_lesson_id,
          started_at,
          user_profile!inner(
            user_id,
            role,
            organization_id,
            auth_users!inner(
              id,
              email,
              raw_user_meta_data
            )
          ),
          video_lessons!inner(
            id,
            title,
            lesson_id
          )
        )
      `)
      .not('additional_data->suspicious', 'is', null)
      .eq('video_viewing_sessions.user_profile.role', 'student')
      .order('client_timestamp', { ascending: false })
      .limit(500);

    if (targetOrgId) {
      suspiciousQuery = suspiciousQuery.eq('video_viewing_sessions.user_profile.organization_id', targetOrgId);
    }

    const { data: suspiciousEvents, error: suspiciousError } = await suspiciousQuery;

    if (suspiciousError) {
      console.error('Error fetching suspicious events:', suspiciousError);
      return NextResponse.json({ error: 'Failed to fetch suspicious activities' }, { status: 500 });
    }

    // Also get activities from video_progress with high suspicious_activity_count
    let progressQuery = supabase
      .from('video_progress')
      .select(`
        id,
        user_id,
        video_lesson_id,
        suspicious_activity_count,
        last_watch_updated,
        user_profile!inner(
          user_id,
          role,
          organization_id,
          auth_users!inner(
            id,
            email,
            raw_user_meta_data
          )
        ),
        video_lessons!inner(
          id,
          title,
          lesson_id
        )
      `)
      .gt('suspicious_activity_count', 0)
      .eq('user_profile.role', 'student');

    if (targetOrgId) {
      progressQuery = progressQuery.eq('user_profile.organization_id', targetOrgId);
    }

    const { data: suspiciousProgress, error: progressError } = await progressQuery;

    if (progressError) {
      console.error('Error fetching suspicious progress:', progressError);
    }

    // Process suspicious events
    const eventActivities = suspiciousEvents?.map((event: any) => {
      const session = event.video_viewing_sessions;
      const userProfile = session.user_profile;
      const authUser = userProfile.auth_users;
      const video = session.video_lessons;
      const additionalData = event.additional_data || {};

      return {
        id: `event_${event.id}`,
        userId: userProfile.user_id,
        userName: authUser.raw_user_meta_data?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        userEmail: authUser.email,
        videoId: video.id,
        videoTitle: video.title,
        activityType: additionalData.suspiciousType || 'Suspicious Event',
        description: additionalData.description || 'Suspicious activity detected during video viewing',
        severity: additionalData.severity || 'medium',
        timestamp: event.client_timestamp,
        status: additionalData.reviewStatus || 'pending',
        details: {
          sessionId: session.id,
          eventCount: 1,
          playbackRate: additionalData.playbackRate,
          seekCount: additionalData.seekCount,
          tabSwitches: additionalData.tabSwitches,
          additionalData: additionalData
        }
      };
    }) || [];

    // Process suspicious progress records
    const progressActivities = suspiciousProgress?.map((progress: any) => {
      const userProfile = progress.user_profile;
      const authUser = userProfile.auth_users;
      const video = progress.video_lessons;

      let activityType = 'General Suspicious Activity';
      let description = `${progress.suspicious_activity_count} suspicious activities detected`;
      let severity: 'low' | 'medium' | 'high' = 'medium';

      if (progress.suspicious_activity_count > 10) {
        severity = 'high';
        activityType = 'High Suspicious Activity';
        description = `Very high number of suspicious activities (${progress.suspicious_activity_count})`;
      } else if (progress.suspicious_activity_count > 5) {
        severity = 'medium';
        activityType = 'Multiple Suspicious Activities';
      } else {
        severity = 'low';
      }

      return {
        id: `progress_${progress.id}`,
        userId: userProfile.user_id,
        userName: authUser.raw_user_meta_data?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        userEmail: authUser.email,
        videoId: video.id,
        videoTitle: video.title,
        activityType,
        description,
        severity,
        timestamp: progress.last_watch_updated,
        status: 'pending' as const,
        details: {
          sessionId: '',
          eventCount: progress.suspicious_activity_count,
          additionalData: {
            totalSuspiciousCount: progress.suspicious_activity_count
          }
        }
      };
    }) || [];

    // Combine and deduplicate activities
    const allActivities = [...eventActivities, ...progressActivities];
    const uniqueActivities = allActivities.filter((activity, index, self) => 
      index === self.findIndex(a => 
        a.userId === activity.userId && 
        a.videoId === activity.videoId && 
        a.activityType === activity.activityType
      )
    );

    // Sort by timestamp (most recent first)
    uniqueActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Generate summary statistics
    const totalActivities = uniqueActivities.length;
    const pendingReview = uniqueActivities.filter(a => a.status === 'pending').length;
    const highSeverity = uniqueActivities.filter(a => a.severity === 'high').length;
    const dismissedActivities = uniqueActivities.filter(a => a.status === 'dismissed').length;

    // Top activity types
    const activityTypeCounts = uniqueActivities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActivityTypes = Object.entries(activityTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const recentTrends = last7Days.map(date => {
      const count = uniqueActivities.filter(activity => 
        activity.timestamp.startsWith(date)
      ).length;
      return { date, count };
    });

    const summary = {
      totalActivities,
      pendingReview,
      highSeverity,
      dismissedActivities,
      topActivityTypes,
      recentTrends
    };

    return NextResponse.json({
      activities: uniqueActivities,
      summary
    });

  } catch (error) {
    console.error('Error in suspicious activities API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}