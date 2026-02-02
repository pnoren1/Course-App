import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    console.log('🔐 Video students authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      console.log('❌ Video students authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Video students user authenticated:', { id: user.id, email: user.email });

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

    // Get students with their video watching statistics
    let studentsQuery = supabase
      .from('user_profile')
      .select(`
        user_id,
        organization_id,
        auth_users!inner(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('role', 'student');

    if (targetOrgId) {
      studentsQuery = studentsQuery.eq('organization_id', targetOrgId);
    }

    const { data: studentsData, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // Get video watching statistics for each student
    const studentIds = studentsData?.map(s => s.user_id) || [];
    
    const { data: progressData, error: progressError } = await supabase
      .from('video_progress')
      .select('user_id, video_lesson_id, completion_percentage, is_completed')
      .in('user_id', studentIds);

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
    }

    // Process students data
    const students = studentsData?.map((student: any) => {
      const authUser = student.auth_users;
      const userProgress = progressData?.filter(p => p.user_id === student.user_id) || [];
      
      const videosWatched = userProgress.length;
      const completedVideos = userProgress.filter(p => p.is_completed).length;
      const averageCompletion = videosWatched > 0 
        ? userProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / videosWatched 
        : 0;

      return {
        id: student.user_id,
        name: authUser.raw_user_meta_data?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        email: authUser.email,
        organizationId: student.organization_id,
        videosWatched,
        completedVideos,
        averageCompletion: Math.round(averageCompletion * 10) / 10
      };
    }) || [];

    // Sort by name
    students.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      students,
      total: students.length
    });

  } catch (error) {
    console.error('Error in students API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}