'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Settings, AlertTriangle } from 'lucide-react';

interface VideoGradeConfig {
  weight: number;
  minimumCompletionPercentage: number;
  suspiciousActivityPenalty: number;
  completionBonus: number;
}

interface VideoLesson {
  id: string;
  title: string;
  duration_seconds: number;
  grade_weight?: number;
  required_completion_percentage?: number;
  suspicious_activity_penalty?: number;
  completion_bonus?: number;
}

interface VideoGradingConfigProps {
  isAdmin: boolean;
}

export default function VideoGradingConfig({ isAdmin }: VideoGradingConfigProps) {
  const [videoLessons, setVideoLessons] = useState<VideoLesson[]>([]);
  const [configs, setConfigs] = useState<Record<string, VideoGradeConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchVideoLessons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/video/lessons');
      if (!response.ok) {
        throw new Error('Failed to fetch video lessons');
      }

      const data = await response.json();
      const lessons = data.lessons || [];
      setVideoLessons(lessons);

      // יצירת הגדרות ברירת מחדל
      const defaultConfigs: Record<string, VideoGradeConfig> = {};
      lessons.forEach((lesson: VideoLesson) => {
        defaultConfigs[lesson.id] = {
          weight: lesson.grade_weight || 1.0,
          minimumCompletionPercentage: lesson.required_completion_percentage || 80,
          suspiciousActivityPenalty: lesson.suspicious_activity_penalty || 0.1,
          completionBonus: lesson.completion_bonus || 0.05
        };
      });
      setConfigs(defaultConfigs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (videoLessonId: string) => {
    if (!isAdmin) return;

    try {
      setSaving(videoLessonId);
      setError(null);
      setSuccess(null);

      const config = configs[videoLessonId];
      const response = await fetch('/api/video/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoLessonId,
          gradeConfig: config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setSuccess(`הגדרות נשמרו בהצלחה עבור ${getVideoTitle(videoLessonId)}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(null);
    }
  };

  const updateConfig = (videoLessonId: string, field: keyof VideoGradeConfig, value: number) => {
    setConfigs(prev => ({
      ...prev,
      [videoLessonId]: {
        ...prev[videoLessonId],
        [field]: value
      }
    }));
  };

  const getVideoTitle = (videoLessonId: string) => {
    const lesson = videoLessons.find(l => l.id === videoLessonId);
    return lesson?.title || 'Unknown Video';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const validateConfig = (config: VideoGradeConfig) => {
    const errors: string[] = [];
    
    if (config.weight < 0 || config.weight > 5) {
      errors.push('משקל חייב להיות בין 0 ל-5');
    }
    
    if (config.minimumCompletionPercentage < 0 || config.minimumCompletionPercentage > 100) {
      errors.push('אחוז צפייה מינימלי חייב להיות בין 0 ל-100');
    }
    
    if (config.suspiciousActivityPenalty < 0 || config.suspiciousActivityPenalty > 1) {
      errors.push('עונש פעילות חשודה חייב להיות בין 0 ל-1');
    }
    
    if (config.completionBonus < 0 || config.completionBonus > 1) {
      errors.push('בונוס השלמה חייב להיות בין 0 ל-1');
    }
    
    return errors;
  };

  useEffect(() => {
    fetchVideoLessons();
  }, []);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>אין לך הרשאה לצפות בהגדרות ציון</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">טוען הגדרות...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 ml-2" />
            הגדרות ציון צפייה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 mb-4">
            כאן תוכל להגדיר את פרמטרי הציון עבור כל סרטון בקורס
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {videoLessons.map((lesson) => {
        const config = configs[lesson.id];
        const validationErrors = config ? validateConfig(config) : [];
        
        return (
          <Card key={lesson.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div>{lesson.title}</div>
                  <div className="text-sm text-gray-600 font-normal">
                    משך: {formatDuration(lesson.duration_seconds)}
                  </div>
                </div>
                {validationErrors.length > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 ml-1" />
                    שגיאות
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {config && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        משקל בציון הכולל (0-5)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={config.weight}
                        onChange={(e) => updateConfig(lesson.id, 'weight', parseFloat(e.target.value) || 0)}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        משקל גבוה יותר = השפעה רבה יותר על הציון הסופי
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        אחוז צפייה מינימלי (0-100)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config.minimumCompletionPercentage}
                        onChange={(e) => updateConfig(lesson.id, 'minimumCompletionPercentage', parseInt(e.target.value) || 0)}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        אחוז מינימלי נדרש כדי לקבל ציון
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        עונש פעילות חשודה (0-1)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={config.suspiciousActivityPenalty}
                        onChange={(e) => updateConfig(lesson.id, 'suspiciousActivityPenalty', parseFloat(e.target.value) || 0)}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        הפחתה בציון לכל פעילות חשודה שזוהתה
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        בונוס השלמה מלאה (0-1)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={config.completionBonus}
                        onChange={(e) => updateConfig(lesson.id, 'completionBonus', parseFloat(e.target.value) || 0)}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        בונוס עבור צפייה של 95%+ ללא פעילות חשודה
                      </div>
                    </div>
                  </div>

                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="text-red-700 text-sm">
                        <div className="font-medium mb-1">שגיאות בהגדרות:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveConfig(lesson.id)}
                      disabled={saving === lesson.id || validationErrors.length > 0}
                    >
                      {saving === lesson.id ? (
                        <>שומר...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4 ml-1" />
                          שמור הגדרות
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}