'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Award, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

interface VideoGradingSummaryProps {
  userId: string;
}

interface TotalVideoGrade {
  totalScore: number;
  maxPossibleScore: number;
  completedVideos: number;
  totalVideos: number;
  videoGrades: any[];
}

export default function VideoGradingSummary({ userId }: VideoGradingSummaryProps) {
  const [totalGrade, setTotalGrade] = useState<TotalVideoGrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching video grades for user:', userId);
        
        const response = await authenticatedFetch(`/api/video/grading?userId=${userId}`);
        
        console.log('📡 Video grading API response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Video grading data received:', data);
          setTotalGrade(data.totalGrade);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Failed to fetch grades';
          console.error('❌ Video grading API error:', errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        console.error('💥 Error fetching grades:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [userId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full ml-2"></div>
            <span className="text-sm text-blue-700">טוען ציוני צפייה...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !totalGrade) {
    return (
      <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <CardContent className="p-4">
          <div className="text-center text-gray-600">
            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">ציוני צפייה יופיעו כאן לאחר תחילת הצפייה בסרטונים</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallPercentage = totalGrade.maxPossibleScore > 0 
    ? (totalGrade.totalScore / totalGrade.maxPossibleScore) * 100 
    : 0;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-blue-900">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <span>ציון צפייה כולל</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Main Score Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${getScoreColor(overallPercentage)}`}>
                {Math.round(overallPercentage)}%
              </div>
              <div className="text-sm text-blue-700">
                {totalGrade.totalScore.toFixed(1)} / {totalGrade.maxPossibleScore.toFixed(1)} נקודות
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <TrendingUp className="w-3 h-3 ml-1" />
                {totalGrade.completedVideos}/{totalGrade.totalVideos} הושלמו
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={overallPercentage} 
              className="h-2"
              style={{
                '--progress-background': getProgressColor(overallPercentage)
              } as any}
            />
            <div className="flex justify-between text-xs text-blue-600">
              <span>התקדמות כללית</span>
              <span>{Math.round(overallPercentage)}%</span>
            </div>
          </div>

          {/* Detailed View */}
          {showDetails && totalGrade.videoGrades.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">פירוט לפי סרטון:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {totalGrade.videoGrades.map((grade, index) => (
                  <div key={grade.videoLessonId} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900">
                        סרטון {index + 1}
                      </div>
                      <div className="text-xs text-blue-600">
                        {grade.gradeContribution.toFixed(1)} נקודות
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {grade.isCompleted ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          <Award className="w-3 h-3 ml-1" />
                          הושלם
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          בתהליך
                        </Badge>
                      )}
                      <span className={`text-sm font-bold ${getScoreColor(grade.finalScore)}`}>
                        {Math.round(grade.finalScore)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encouragement Message */}
          {overallPercentage < 70 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                💡 כדי לשפר את הציון, צפה בסרטונים במלואם ובקצב רגיל
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}