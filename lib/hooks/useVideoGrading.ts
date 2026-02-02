import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

export interface VideoGradeResult {
  userId: string;
  videoLessonId: string;
  baseScore: number;
  suspiciousActivityPenalty: number;
  completionBonus: number;
  finalScore: number;
  isCompleted: boolean;
  gradeContribution: number;
}

export interface TotalVideoGrade {
  totalScore: number;
  maxPossibleScore: number;
  completedVideos: number;
  totalVideos: number;
  videoGrades: VideoGradeResult[];
}

export interface VideoGradeConfig {
  weight: number;
  minimumCompletionPercentage: number;
  suspiciousActivityPenalty: number;
  completionBonus: number;
}

export function useVideoGrading(userId?: string, videoLessonId?: string) {
  const [totalGrade, setTotalGrade] = useState<TotalVideoGrade | null>(null);
  const [singleGrade, setSingleGrade] = useState<VideoGradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('userId', userId);
      if (videoLessonId) {
        params.append('videoLessonId', videoLessonId);
      }

      const response = await authenticatedFetch(`/api/video/grading?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video grades');
      }

      const data = await response.json();
      
      if (videoLessonId) {
        setSingleGrade(data.grade);
        setTotalGrade(null);
      } else {
        setTotalGrade(data.totalGrade);
        setSingleGrade(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, videoLessonId]);

  const updateGrades = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/video/grading', {
        method: 'PUT',
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to update grades');
      }

      await fetchGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grades');
    }
  }, [userId, fetchGrades]);

  const updateGradeConfig = useCallback(async (
    videoLessonId: string, 
    config: VideoGradeConfig
  ) => {
    try {
      const response = await authenticatedFetch('/api/video/grading', {
        method: 'POST',
        body: JSON.stringify({
          videoLessonId,
          gradeConfig: config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  return {
    totalGrade,
    singleGrade,
    loading,
    error,
    refetch: fetchGrades,
    updateGrades,
    updateGradeConfig
  };
}

export function useVideoLessons() {
  const [videoLessons, setVideoLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideoLessons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/video/lessons');
      if (!response.ok) {
        throw new Error('Failed to fetch video lessons');
      }

      const data = await response.json();
      setVideoLessons(data.lessons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideoLessons();
  }, [fetchVideoLessons]);

  return {
    videoLessons,
    loading,
    error,
    refetch: fetchVideoLessons
  };
}