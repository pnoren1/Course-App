import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
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

    // Get detailed progress data for export
    let exportQuery = supabase
      .from('video_progress')
      .select(`
        user_id,
        video_lesson_id,
        total_watched_seconds,
        completion_percentage,
        is_completed,
        first_watch_started,
        last_watch_updated,
        suspicious_activity_count,
        grade_contribution,
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
          lesson_id,
          duration_seconds
        )
      `)
      .eq('user_profile.role', 'student');

    if (targetOrgId) {
      exportQuery = exportQuery.eq('user_profile.organization_id', targetOrgId);
    }

    const { data: exportData, error: exportError } = await exportQuery;

    if (exportError) {
      console.error('Error fetching export data:', exportError);
      return NextResponse.json({ error: 'Failed to fetch export data' }, { status: 500 });
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Student Name',
        'Student Email',
        'Video Title',
        'Lesson ID',
        'Duration (seconds)',
        'Watched Time (seconds)',
        'Completion %',
        'Is Completed',
        'First Watch',
        'Last Watch',
        'Suspicious Activities',
        'Grade Contribution',
        'Organization ID'
      ];

      const csvRows = exportData?.map((row: any) => [
        row.user_profile.auth_users.raw_user_meta_data?.full_name || row.user_profile.auth_users.email?.split('@')[0] || 'Unknown',
        row.user_profile.auth_users.email,
        row.video_lessons.title,
        row.video_lessons.lesson_id,
        row.video_lessons.duration_seconds,
        row.total_watched_seconds,
        row.completion_percentage,
        row.is_completed ? 'Yes' : 'No',
        row.first_watch_started ? new Date(row.first_watch_started).toISOString() : '',
        new Date(row.last_watch_updated).toISOString(),
        row.suspicious_activity_count,
        row.grade_contribution,
        row.user_profile.organization_id || ''
      ]) || [];

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="video-analytics.csv"'
        }
      });

    } else if (format === 'json') {
      // Generate JSON
      const jsonData = exportData?.map((row: any) => ({
        studentName: row.user_profile.auth_users.raw_user_meta_data?.full_name || row.user_profile.auth_users.email?.split('@')[0] || 'Unknown',
        studentEmail: row.user_profile.auth_users.email,
        videoTitle: row.video_lessons.title,
        lessonId: row.video_lessons.lesson_id,
        videoDurationSeconds: row.video_lessons.duration_seconds,
        watchedTimeSeconds: row.total_watched_seconds,
        completionPercentage: row.completion_percentage,
        isCompleted: row.is_completed,
        firstWatchStarted: row.first_watch_started,
        lastWatchUpdated: row.last_watch_updated,
        suspiciousActivityCount: row.suspicious_activity_count,
        gradeContribution: row.grade_contribution,
        organizationId: row.user_profile.organization_id
      })) || [];

      return NextResponse.json({
        exportDate: new Date().toISOString(),
        totalRecords: jsonData.length,
        data: jsonData
      }, {
        headers: {
          'Content-Disposition': 'attachment; filename="video-analytics.json"'
        }
      });

    } else {
      return NextResponse.json({ error: 'Invalid format. Use csv or json' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in video analytics export API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}