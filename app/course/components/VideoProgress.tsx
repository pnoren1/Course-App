"use client";

import React, { useState, useEffect } from 'react';
import { VideoProgressProps, ProgressResponse } from '@/lib/types/video';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

export default function VideoProgress({
  userId,
  videoLessonId,
  showDetails = false,
  refreshInterval = 30000 // 30 seconds
}: VideoProgressProps) {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch progress data
  const fetchProgress = async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
      console.log('🔍 Fetching video progress for user:', userId, 'lesson:', videoLessonId);
      
      const response = await authenticatedFetch(`/api/video/progress?user_id=${userId}&video_lesson_id=${videoLessonId}`);
      
      console.log('📡 Video progress API response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ Video progress API error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('✅ Video progress data received:', data);
      setProgress(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('💥 Error fetching progress:', error);
      setError(error instanceof Error ? error.message : 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProgress();
  }, [userId, videoLessonId]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchProgress, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Format time duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get completion status color and text
  const getCompletionStatus = () => {
    if (!progress) return { color: 'text-slate-500', text: 'לא זמין', bgColor: 'bg-slate-100' };
    
    if (progress.is_completed) {
      return { 
        color: 'text-green-700', 
        text: 'הושלם', 
        bgColor: 'bg-green-100 border-green-200' 
      };
    }
    
    if (progress.completion_percentage >= 80) {
      return { 
        color: 'text-blue-700', 
        text: 'כמעט הושלם', 
        bgColor: 'bg-blue-100 border-blue-200' 
      };
    }
    
    if (progress.completion_percentage >= 50) {
      return { 
        color: 'text-yellow-700', 
        text: 'בתהליך', 
        bgColor: 'bg-yellow-100 border-yellow-200' 
      };
    }
    
    if (progress.completion_percentage > 0) {
      return { 
        color: 'text-orange-700', 
        text: 'התחיל', 
        bgColor: 'bg-orange-100 border-orange-200' 
      };
    }
    
    return { 
      color: 'text-slate-500', 
      text: 'לא התחיל', 
      bgColor: 'bg-slate-100 border-slate-200' 
    };
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        טוען התקדמות...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <div>שגיאה בטעינת נתונים</div>
          <div className="text-xs text-red-500 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-sm text-slate-500">
        אין נתוני התקדמות זמינים
      </div>
    );
  }

  const status = getCompletionStatus();

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">התקדמות צפייה</span>
          <span className="font-semibold text-slate-900">
            {progress.completion_percentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              progress.is_completed 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : progress.completion_percentage >= 80
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : progress.completion_percentage >= 50
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}
            style={{ width: `${Math.min(progress.completion_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Status and Details */}
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${status.bgColor} ${status.color}`}>
          {progress.is_completed ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {status.text}
        </div>

        <div className="text-xs text-slate-500">
          זמן צפייה: {formatDuration(progress.total_watched_seconds)}
        </div>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">ציון תרומה:</span>
              <span className="font-medium text-slate-900 mr-1">
                {progress.grade_contribution.toFixed(1)}
              </span>
            </div>
            
            {progress.suspicious_activity_count > 0 && (
              <div>
                <span className="text-slate-500">פעילות חשודה:</span>
                <span className="font-medium text-red-600 mr-1">
                  {progress.suspicious_activity_count}
                </span>
              </div>
            )}
            
            {lastUpdated && (
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500">עודכן לאחרונה:</span>
                <span className="font-medium text-slate-700 mr-1">
                  {lastUpdated.toLocaleTimeString('he-IL')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchProgress}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:text-slate-800 transition-colors duration-200"
        title="רענן נתונים"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        רענן
      </button>
    </div>
  );
}