import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { videoGradingService, VideoGradeConfig } from '@/lib/services/videoGradingService';

export async function GET(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    console.log('🔐 Video grading authentication...');
    console.log('🔍 Token available:', token ? 'Yes' : 'No');
    
    // Check authentication with explicit token usage
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Video grading authentication failed:', {
        error: authError?.message,
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 20) + '...' : 'N/A'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Video grading user authenticated:', { id: user.id, email: user.email });

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || user.id;
    const videoLessonId = searchParams.get('videoLessonId');

    // בדיקת הרשאות - משתמש יכול לראות רק את הציונים שלו
    // admin ו-org_admin יכולים לראות ציונים של כולם
    if (userId !== user.id) {
      const { data: userProfile } = await supabase
        .from('user_profile')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (videoLessonId) {
      // חישוב ציון עבור סרטון בודד
      const { data: videoLesson } = await supabase
        .from('video_lessons')
        .select('*')
        .eq('id', videoLessonId)
        .single();

      if (!videoLesson) {
        return NextResponse.json({ error: 'Video lesson not found' }, { status: 404 });
      }

      const config: VideoGradeConfig = {
        videoLessonId: videoLesson.id,
        weight: videoLesson.grade_weight || 1.0,
        minimumCompletionPercentage: videoLesson.required_completion_percentage || 80,
        suspiciousActivityPenalty: videoLesson.suspicious_activity_penalty || 0.1,
        completionBonus: videoLesson.completion_bonus || 0.05
      };

      const grade = await videoGradingService.calculateVideoGrade(userId, videoLessonId, config);
      return NextResponse.json({ grade });
    } else {
      // חישוב ציון כולל עבור כל הסרטונים
      const { data: videoLessons } = await supabase
        .from('video_lessons')
        .select('*')
        .order('created_at');

      if (!videoLessons) {
        return NextResponse.json({ error: 'Failed to fetch video lessons' }, { status: 500 });
      }

      const videoConfigs: VideoGradeConfig[] = videoLessons.map(lesson => ({
        videoLessonId: lesson.id,
        weight: lesson.grade_weight || 1.0,
        minimumCompletionPercentage: lesson.required_completion_percentage || 80,
        suspiciousActivityPenalty: lesson.suspicious_activity_penalty || 0.1,
        completionBonus: lesson.completion_bonus || 0.05
      }));

      const totalGrade = await videoGradingService.calculateTotalVideoGrade(userId, videoConfigs);
      return NextResponse.json({ totalGrade });
    }
  } catch (error) {
    console.error('Error calculating video grades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // בדיקת הרשאות - רק admin ו-org_admin יכולים לעדכן הגדרות ציון
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { videoLessonId, gradeConfig } = body;

    if (!videoLessonId || !gradeConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // עדכון הגדרות הציון בטבלת video_lessons
    const { error: updateError } = await supabase
      .from('video_lessons')
      .update({
        grade_weight: gradeConfig.weight,
        required_completion_percentage: gradeConfig.minimumCompletionPercentage,
        suspicious_activity_penalty: gradeConfig.suspiciousActivityPenalty,
        completion_bonus: gradeConfig.completionBonus
      })
      .eq('id', videoLessonId);

    if (updateError) {
      console.error('Error updating video lesson config:', updateError);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating video grading config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // בדיקת הרשאות - רק admin ו-org_admin יכולים לעדכן ציונים
    const { data: userProfile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // עדכון אוטומטי של ציוני הצפייה
    await videoGradingService.updateVideoGrades(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating video grades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}