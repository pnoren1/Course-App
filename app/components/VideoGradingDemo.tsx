'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, Play, Award } from 'lucide-react';

interface VideoGradingDemoProps {
  userId: string;
  isAdmin?: boolean;
}

export default function VideoGradingDemo({ userId, isAdmin = false }: VideoGradingDemoProps) {
  const [demoResults, setDemoResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDemo = async () => {
    setLoading(true);
    try {
      // Simulate some demo data
      const demoGrade = {
        totalScore: 85.5,
        maxPossibleScore: 100,
        completedVideos: 3,
        totalVideos: 5,
        videoGrades: [
          {
            videoLessonId: 'demo-1',
            baseScore: 90,
            suspiciousActivityPenalty: 5,
            completionBonus: 0,
            finalScore: 85,
            isCompleted: true,
            gradeContribution: 17
          },
          {
            videoLessonId: 'demo-2',
            baseScore: 95,
            suspiciousActivityPenalty: 0,
            completionBonus: 5,
            finalScore: 100,
            isCompleted: true,
            gradeContribution: 20
          },
          {
            videoLessonId: 'demo-3',
            baseScore: 75,
            suspiciousActivityPenalty: 10,
            completionBonus: 0,
            finalScore: 65,
            isCompleted: true,
            gradeContribution: 13
          }
        ]
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDemoResults(demoGrade);
    } catch (error) {
      console.error('Demo error:', error);
    } finally {
      setLoading(false);
    }
  };

  const overallPercentage = demoResults 
    ? (demoResults.totalScore / demoResults.maxPossibleScore) * 100 
    : 0;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Calculator className="w-5 h-5" />
          הדגמת מערכת ציוני צפייה
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-purple-700">
          הדגמה של אופן פעולת מערכת הציונים עבור צפייה בסרטונים
        </div>

        <Button 
          onClick={runDemo} 
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2"></div>
              מחשב ציונים...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 ml-2" />
              הרץ הדגמה
            </>
          )}
        </Button>

        {demoResults && (
          <div className="space-y-4 mt-6 p-4 bg-white/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(overallPercentage)}%
                </div>
                <div className="text-sm text-purple-700">
                  {demoResults.totalScore} / {demoResults.maxPossibleScore} נקודות
                </div>
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                <Award className="w-3 h-3 ml-1" />
                {demoResults.completedVideos}/{demoResults.totalVideos} הושלמו
              </Badge>
            </div>

            <Progress value={overallPercentage} className="h-2" />

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-purple-900">פירוט ציונים:</h4>
              {demoResults.videoGrades.map((grade: any, index: number) => (
                <div key={grade.videoLessonId} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">סרטון הדגמה {index + 1}</div>
                    <div className="text-xs text-gray-600">
                      בסיס: {grade.baseScore} | עונש: -{grade.suspiciousActivityPenalty} | בונוס: +{grade.completionBonus}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-600">
                      {grade.finalScore}%
                    </span>
                    <span className="text-xs text-gray-500">
                      ({grade.gradeContribution} נק')
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>✅ מערכת הציונים פועלת כראוי!</strong>
                <ul className="mt-2 text-xs space-y-1">
                  <li>• חישוב ציון בסיסי לפי אחוז צפייה</li>
                  <li>• הפחתת ציון עבור פעילות חשודה</li>
                  <li>• בונוס עבור צפייה מלאה ורציפה</li>
                  <li>• אינטגרציה עם מערכת הציונים הכללית</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}