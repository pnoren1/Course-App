import { supabase } from '@/lib/supabase';

export interface VideoGradeConfig {
  videoLessonId: string;
  weight: number; // משקל הסרטון בציון הכולל (0-1)
  minimumCompletionPercentage: number; // אחוז צפייה מינימלי נדרש (0-100)
  suspiciousActivityPenalty: number; // עונש על פעילות חשודה (0-1)
  completionBonus: number; // בונוס עבור צפייה מלאה (0-1)
}

export interface VideoGradeResult {
  userId: string;
  videoLessonId: string;
  baseScore: number; // ציון בסיסי לפי אחוז צפייה
  suspiciousActivityPenalty: number; // הפחתה בגלל פעילות חשודה
  completionBonus: number; // בונוס עבור צפייה מלאה
  finalScore: number; // ציון סופי
  isCompleted: boolean; // האם הושלמה הצפייה הנדרשת
  gradeContribution: number; // תרומה לציון הכולל (finalScore * weight)
}

export class VideoGradingService {
  private supabase = supabase;

  /**
   * חישוב ציון בסיסי לפי אחוז צפייה
   */
  private calculateBaseScore(completionPercentage: number, minimumRequired: number): number {
    if (completionPercentage < minimumRequired) {
      return 0; // לא עמד בדרישה המינימלית
    }
    
    // ציון ליניארי בין המינימום ל-100%
    const normalizedCompletion = (completionPercentage - minimumRequired) / (100 - minimumRequired);
    return Math.min(100, normalizedCompletion * 100);
  }

  /**
   * חישוב הפחתת ציון עבור פעילות חשודה
   */
  private calculateSuspiciousActivityPenalty(
    suspiciousActivityCount: number,
    penaltyRate: number
  ): number {
    // הפחתה פרוגרסיבית - כל פעילות חשודה מפחיתה יותר
    const penalty = Math.min(1, suspiciousActivityCount * penaltyRate);
    return penalty * 100; // החזרה באחוזים
  }

  /**
   * חישוב בונוס עבור צפייה מלאה ורציפה
   */
  private calculateCompletionBonus(
    completionPercentage: number,
    suspiciousActivityCount: number,
    bonusRate: number
  ): number {
    // בונוס רק עבור צפייה של 95% ומעלה ללא פעילות חשודה
    if (completionPercentage >= 95 && suspiciousActivityCount === 0) {
      return bonusRate * 100; // החזרה באחוזים
    }
    return 0;
  }

  /**
   * חישוב ציון עבור סרטון בודד
   */
  async calculateVideoGrade(
    userId: string,
    videoLessonId: string,
    config: VideoGradeConfig
  ): Promise<VideoGradeResult> {
    // קבלת נתוני התקדמות מהמסד נתונים
    const { data: progress, error } = await this.supabase
      .from('video_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('video_lesson_id', videoLessonId)
      .single();

    if (error || !progress) {
      // אם אין נתוני צפייה, הציון הוא 0
      return {
        userId,
        videoLessonId,
        baseScore: 0,
        suspiciousActivityPenalty: 0,
        completionBonus: 0,
        finalScore: 0,
        isCompleted: false,
        gradeContribution: 0
      };
    }

    // חישוב רכיבי הציון
    const baseScore = this.calculateBaseScore(
      progress.completion_percentage,
      config.minimumCompletionPercentage
    );

    const suspiciousActivityPenalty = this.calculateSuspiciousActivityPenalty(
      progress.suspicious_activity_count,
      config.suspiciousActivityPenalty
    );

    const completionBonus = this.calculateCompletionBonus(
      progress.completion_percentage,
      progress.suspicious_activity_count,
      config.completionBonus
    );

    // חישוב הציון הסופי
    const finalScore = Math.max(0, Math.min(100, 
      baseScore - suspiciousActivityPenalty + completionBonus
    ));

    const isCompleted = progress.completion_percentage >= config.minimumCompletionPercentage;
    const gradeContribution = finalScore * config.weight;

    // עדכון הציון במסד הנתונים
    await this.supabase
      .from('video_progress')
      .update({ grade_contribution: gradeContribution })
      .eq('user_id', userId)
      .eq('video_lesson_id', videoLessonId);

    return {
      userId,
      videoLessonId,
      baseScore,
      suspiciousActivityPenalty,
      completionBonus,
      finalScore,
      isCompleted,
      gradeContribution
    };
  }

  /**
   * חישוב ציון כולל עבור כל הסרטונים של משתמש
   */
  async calculateTotalVideoGrade(
    userId: string,
    videoConfigs: VideoGradeConfig[]
  ): Promise<{
    totalScore: number;
    maxPossibleScore: number;
    completedVideos: number;
    totalVideos: number;
    videoGrades: VideoGradeResult[];
  }> {
    const videoGrades: VideoGradeResult[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let completedVideos = 0;

    for (const config of videoConfigs) {
      const grade = await this.calculateVideoGrade(userId, config.videoLessonId, config);
      videoGrades.push(grade);
      
      totalWeightedScore += grade.gradeContribution;
      totalWeight += config.weight * 100; // משקל * 100 (ציון מקסימלי)
      
      if (grade.isCompleted) {
        completedVideos++;
      }
    }

    return {
      totalScore: totalWeightedScore,
      maxPossibleScore: totalWeight,
      completedVideos,
      totalVideos: videoConfigs.length,
      videoGrades
    };
  }

  /**
   * קבלת הגדרות ציון ברירת מחדל
   */
  getDefaultGradeConfig(): Omit<VideoGradeConfig, 'videoLessonId'> {
    return {
      weight: 1.0, // משקל מלא
      minimumCompletionPercentage: 80, // 80% צפייה מינימלית
      suspiciousActivityPenalty: 0.1, // הפחתה של 10% לכל פעילות חשודה
      completionBonus: 0.05 // בונוס של 5% עבור צפייה מלאה
    };
  }

  /**
   * עדכון אוטומטי של ציוני צפייה עבור משתמש
   */
  async updateVideoGrades(userId: string): Promise<void> {
    // קבלת כל הסרטונים עם הגדרות הציון שלהם
    const { data: videoLessons, error } = await this.supabase
      .from('video_lessons')
      .select('*');

    if (error || !videoLessons) {
      throw new Error('Failed to fetch video lessons');
    }

    // יצירת הגדרות ציון עבור כל סרטון
    const defaultConfig = this.getDefaultGradeConfig();
    const videoConfigs: VideoGradeConfig[] = videoLessons.map(lesson => ({
      videoLessonId: lesson.id,
      weight: defaultConfig.weight,
      minimumCompletionPercentage: lesson.required_completion_percentage || defaultConfig.minimumCompletionPercentage,
      suspiciousActivityPenalty: defaultConfig.suspiciousActivityPenalty,
      completionBonus: defaultConfig.completionBonus
    }));

    // חישוב הציונים
    await this.calculateTotalVideoGrade(userId, videoConfigs);
  }
}

export const videoGradingService = new VideoGradingService();