import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { videoGradingService } from '@/lib/services/videoGradingService';

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, videoLessonId } = body;

    // אם לא צוין userId, השתמש במשתמש הנוכחי
    const targetUserId = userId || user.id;

    // בדיקת הרשאות - משתמש יכול לעדכן רק את הציונים שלו
    // admin ו-org_admin יכולים לעדכן ציונים של כולם
    if (targetUserId !== user.id) {
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
      // עדכון ציון עבור סרטון בודד
      const { data: videoLesson } = await supabase
        .from('video_lessons')
        .select('*')
        .eq('id', videoLessonId)
        .single();

      if (!videoLesson) {
        return NextResponse.json({ error: 'Video lesson not found' }, { status: 404 });
      }

      const defaultConfig = videoGradingService.getDefaultGradeConfig();
      const config = {
        videoLessonId: videoLesson.id,
        weight: defaultConfig.weight,
        minimumCompletionPercentage: videoLesson.required_completion_percentage || defaultConfig.minimumCompletionPercentage,
        suspiciousActivityPenalty: defaultConfig.suspiciousActivityPenalty,
        completionBonus: defaultConfig.completionBonus
      };

      const grade = await videoGradingService.calculateVideoGrade(targetUserId, videoLessonId, config);
      return NextResponse.json({ grade });
    } else {
      // עדכון כל הציונים
      await videoGradingService.updateVideoGrades(targetUserId);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error in auto-update grades:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// עדכון אוטומטי של ציונים כאשר מתעדכנת התקדמות הצפייה
export async function PUT(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // בדיקה שהקריאה מגיעה מהמערכת הפנימית
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, videoLessonId } = body;

    if (!userId || !videoLessonId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // קבלת הגדרות הסרטון
    const { data: videoLesson } = await supabase
      .from('video_lessons')
      .select('*')
      .eq('id', videoLessonId)
      .single();

    if (!videoLesson) {
      return NextResponse.json({ error: 'Video lesson not found' }, { status: 404 });
    }

    const defaultConfig = videoGradingService.getDefaultGradeConfig();
    const config = {
      videoLessonId: videoLesson.id,
      weight: defaultConfig.weight,
      minimumCompletionPercentage: videoLesson.required_completion_percentage || defaultConfig.minimumCompletionPercentage,
      suspiciousActivityPenalty: defaultConfig.suspiciousActivityPenalty,
      completionBonus: defaultConfig.completionBonus
    };

    // חישוב ועדכון הציון
    const grade = await videoGradingService.calculateVideoGrade(userId, videoLessonId, config);
    
    return NextResponse.json({ 
      success: true, 
      grade: {
        finalScore: grade.finalScore,
        gradeContribution: grade.gradeContribution,
        isCompleted: grade.isCompleted
      }
    });
  } catch (error) {
    console.error('Error in automatic grade update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}