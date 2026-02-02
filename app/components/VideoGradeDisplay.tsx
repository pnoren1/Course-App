'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Award } from 'lucide-react';

interface VideoGradeResult {
  userId: string;
  videoLessonId: string;
  baseScore: number;
  suspiciousActivityPenalty: number;
  completionBonus: number;
  finalScore: number;
  isCompleted: boolean;
  gradeContribution: number;
}

interface TotalVideoGrade {
  totalScore: number;
  maxPossibleScore: number;
  completedVideos: number;
  totalVideos: number;
  videoGrades: VideoGradeResult[];
}

interface VideoGradeDisplayProps {
  userId?: string;
  videoLessonId?: string;
  showDetails?: boolean;
  isAdmin?: boolean;
}

export default function VideoGradeDisplay({ 
  userId, 
  videoLessonId, 
  showDetails = false,
  isAdmin = false 
}: VideoGradeDisplayProps) {
  const [totalGrade, setTotalGrade] = useState<TotalVideoGrade | null>(null);
  const [singleGrade, setSingleGrade] = useState<VideoGradeResult | null>(null);
  const [videoLessons, setVideoLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideoGrades = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (videoLessonId) params.append('videoLessonId', videoLessonId);

      const response = await fetch(`/api/video/grading?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video grades');
      }

      const data = await response.json();
      
      if (videoLessonId) {
        setSingleGrade(data.grade);
      } else {
        setTotalGrade(data.totalGrade);
      }

      // קבלת פרטי הסרטונים להצגה
      const lessonsResponse = await fetch('/api/video/lessons');
      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        setVideoLessons(lessonsData.lessons || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateGrades = async () => {
    if (!userId || !isAdmin) return;

    try {
      setLoading(true);
      const response = await fetch('/api/video/grading', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to update grades');
      }

      await fetchVideoGrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grades');
    }
  };

  useEffect(() => {
    fetchVideoGrades();
  }, [userId, videoLessonId]);

  const getVideoTitle = (videoLessonId: string) => {
    const lesson = videoLessons.find(l => l.id === videoLessonId);
    return lesson?.title || 'Unknown Video';
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100) / 100;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionBadge = (isCompleted: boolean) => {
    return isCompleted ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <Award className="w-3 h-3 mr-1" />
        הושלם
      </Badge>
    ) : (
      <Badge variant="secondary">
        לא הושלם
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin ml-2" />
            טוען ציוני צפייה...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            שגיאה: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // תצוגת ציון בודד
  if (singleGrade) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ציון צפייה - {getVideoTitle(singleGrade.videoLessonId)}</span>
            {getCompletionBadge(singleGrade.isCompleted)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>ציון סופי:</span>
              <span className={`text-2xl font-bold ${getScoreColor(singleGrade.finalScore)}`}>
                {formatScore(singleGrade.finalScore)}
              </span>
            </div>

            <Progress value={singleGrade.finalScore} className="w-full" />

            {showDetails && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>ציון בסיסי:</span>
                  <span>{formatScore(singleGrade.baseScore)}</span>
                </div>
                
                {singleGrade.suspiciousActivityPenalty > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span className="flex items-center">
                      <TrendingDown className="w-4 h-4 ml-1" />
                      עונש פעילות חשודה:
                    </span>
                    <span>-{formatScore(singleGrade.suspiciousActivityPenalty)}</span>
                  </div>
                )}
                
                {singleGrade.completionBonus > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center">
                      <TrendingUp className="w-4 h-4 ml-1" />
                      בונוס השלמה:
                    </span>
                    <span>+{formatScore(singleGrade.completionBonus)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-medium">
                  <span>תרומה לציון הכולל:</span>
                  <span>{formatScore(singleGrade.gradeContribution)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // תצוגת ציון כולל
  if (totalGrade) {
    const overallPercentage = totalGrade.maxPossibleScore > 0 
      ? (totalGrade.totalScore / totalGrade.maxPossibleScore) * 100 
      : 0;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ציון צפייה כולל</span>
              {isAdmin && (
                <Button onClick={updateGrades} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 ml-1" />
                  עדכן ציונים
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>ציון כולל:</span>
                <span className={`text-3xl font-bold ${getScoreColor(overallPercentage)}`}>
                  {formatScore(totalGrade.totalScore)} / {formatScore(totalGrade.maxPossibleScore)}
                </span>
              </div>

              <Progress value={overallPercentage} className="w-full" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {totalGrade.completedVideos}
                  </div>
                  <div className="text-gray-600">סרטונים הושלמו</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {totalGrade.totalVideos}
                  </div>
                  <div className="text-gray-600">סה"כ סרטונים</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {showDetails && (
          <Card>
            <CardHeader>
              <CardTitle>פירוט ציונים לפי סרטון</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {totalGrade.videoGrades.map((grade) => (
                  <div key={grade.videoLessonId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{getVideoTitle(grade.videoLessonId)}</div>
                      <div className="text-sm text-gray-600">
                        תרומה: {formatScore(grade.gradeContribution)} נקודות
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getCompletionBadge(grade.isCompleted)}
                      <span className={`font-bold ${getScoreColor(grade.finalScore)}`}>
                        {formatScore(grade.finalScore)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}