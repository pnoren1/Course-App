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

    // Get total students count
    let studentsQuery = supabase
      .from('user_profile')
      .select('user_id', { count: 'exact' })
      .eq('role', 'student');

    if (targetOrgId) {
      studentsQuery = studentsQuery.eq('organization_id', targetOrgId);
    }

    const { count: totalStudents } = await studentsQuery;

    // Get total videos count
    const { count: totalVideos } = await supabase
      .from('video_lessons')
      .select('id', { count: 'exact' });

    // Get students progress data
    let progressQuery = supabase
      .from('video_progress')
      .select(`
        user_id,
        completion_percentage,
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
        )
      `)
      .eq('user_profile.role', 'student');

    if (targetOrgId) {
      progressQuery = progressQuery.eq('user_profile.organization_id', targetOrgId);
    }

    const { data: progressData, error: progressError } = await progressQuery;

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
      return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }

    // Process students data
    const studentsMap = new Map();
    let totalCompletion = 0;
    let totalSuspicious = 0;

    progressData?.forEach((progress: any) => {
      const userId = progress.user_id;
      const userProfile = progress.user_profile;
      const authUser = userProfile.auth_users;
      
      if (!studentsMap.has(userId)) {
        studentsMap.set(userId, {
          id: userId,
          name: authUser.raw_user_meta_data?.full_name || authUser.email?.split('@')[0] || 'Unknown',
          email: authUser.email,
          totalVideosWatched: 0,
          totalCompletion: 0,
          suspiciousActivityCount: 0,
          lastActivity: progress.last_watch_updated,
          organizationId: userProfile.organization_id
        });
      }

      const student = studentsMap.get(userId);
      student.totalVideosWatched += 1;
      student.totalCompletion += progress.completion_percentage;
      student.suspiciousActivityCount += progress.suspicious_activity_count;
      
      if (new Date(progress.last_watch_updated) > new Date(student.lastActivity)) {
        student.lastActivity = progress.last_watch_updated;
      }

      totalCompletion += progress.completion_percentage;
      totalSuspicious += progress.suspicious_activity_count;
    });

    // Calculate averages for students
    const studentsProgress = Array.from(studentsMap.values()).map((student: any) => ({
      ...student,
      averageCompletion: student.totalVideosWatched > 0 ? student.totalCompletion / student.totalVideosWatched : 0
    }));

    // Get video statistics
    const { data: videoStats, error: videoStatsError } = await supabase
      .from('video_lessons')
      .select(`
        id,
        title,
        video_progress(
          completion_percentage,
          suspicious_activity_count,
          total_watched_seconds
        )
      `);

    if (videoStatsError) {
      console.error('Error fetching video stats:', videoStatsError);
      return NextResponse.json({ error: 'Failed to fetch video stats' }, { status: 500 });
    }

    const processedVideoStats = videoStats?.map((video: any) => {
      const progresses = video.video_progress || [];
      const totalViews = progresses.length;
      const avgCompletion = totalViews > 0 
        ? progresses.reduce((sum: number, p: any) => sum + p.completion_percentage, 0) / totalViews 
        : 0;
      const avgWatchTime = totalViews > 0
        ? progresses.reduce((sum: number, p: any) => sum + p.total_watched_seconds, 0) / totalViews
        : 0;
      const suspiciousActivities = progresses.reduce((sum: number, p: any) => sum + p.suspicious_activity_count, 0);

      return {
        id: video.id,
        title: video.title,
        totalViews,
        averageCompletion: avgCompletion,
        averageWatchTime: avgWatchTime,
        suspiciousActivities
      };
    }) || [];

    const averageCompletion = progressData && progressData.length > 0 
      ? totalCompletion / progressData.length 
      : 0;

    const analyticsData = {
      totalStudents: totalStudents || 0,
      totalVideos: totalVideos || 0,
      averageCompletion,
      suspiciousActivities: totalSuspicious,
      studentsProgress,
      videoStats: processedVideoStats
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error in video analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}