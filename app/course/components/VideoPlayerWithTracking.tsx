"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoPlayerProps } from '@/lib/types/video';
import { useVideoTracking } from '@/lib/hooks/useVideoTracking';
import { debugVideoTrackingAuth } from '@/lib/utils/debug-auth';
import AuthDebugPanel from '@/app/components/AuthDebugPanel';

export default function VideoPlayerWithTracking({
  videoLessonId,
  spotlightrVideoId,
  onProgressUpdate,
  onSessionStart,
  onSessionEnd
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the video tracking hook
  const {
    sessionToken,
    isActive,
    isTabVisible,
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    volume,
    error: trackingError,
    startSession,
    endSession,
    updateTime,
    updatePlayState,
    updateSeek,
    updatePlaybackRate,
    updateVolume,
    queuedEventsCount,
    debugAuth
  } = useVideoTracking({
    videoLessonId,
    batchSize: 10,
    batchInterval: 5000,
    heartbeatInterval: 10000
  });

  // Handle iframe load and start session
  const handleIframeLoad = useCallback(async () => {
    console.log('🎬 Video iframe loaded for lesson:', videoLessonId);
    setIsLoading(false);
    
    // Debug authentication state before starting session
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Running auth debug...');
      debugVideoTrackingAuth();
    }
    
    console.log('🚀 Starting tracking session...');
    // Start tracking session
    const token = await startSession();
    if (token) {
      console.log('✅ Session started with token:', token.substring(0, 8) + '...');
      onSessionStart?.(token);
      
      // Set up message listener for Spotlightr events
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from Spotlightr domain
        if (!event.origin.includes('spotlightr.com')) return;

        const { type, data } = event.data;
        console.log('📺 Video event:', type, data);
        
        switch (type) {
          case 'video:play':
            updatePlayState(true);
            break;
            
          case 'video:pause':
            updatePlayState(false);
            break;
            
          case 'video:seek':
            updateSeek(data.currentTime || 0, currentTime);
            break;
            
          case 'video:timeupdate':
            updateTime(data.currentTime || 0, data.duration);
            
            // Update progress callback
            if (data.duration && data.duration > 0) {
              const progress = (data.currentTime / data.duration) * 100;
              onProgressUpdate?.(progress);
            }
            break;
            
          case 'video:ratechange':
            updatePlaybackRate(data.playbackRate || 1.0);
            break;
            
          case 'video:volumechange':
            updateVolume(data.volume || 1.0);
            break;
            
          case 'video:ended':
            updatePlayState(false);
            break;
            
          case 'video:loadedmetadata':
            if (data.duration) {
              updateTime(0, data.duration);
            }
            break;
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    } else {
      // Log more details about the session start failure
      console.error('❌ Failed to start video tracking session for lesson:', videoLessonId);
    }
  }, [startSession, onSessionStart, updatePlayState, updateSeek, updateTime, updatePlaybackRate, updateVolume, currentTime, onProgressUpdate, videoLessonId]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionToken) {
        endSession();
        onSessionEnd?.();
      }
    };
  }, [sessionToken, endSession, onSessionEnd]);

  // Handle tracking errors
  useEffect(() => {
    if (trackingError) {
      setError(trackingError);
    }
  }, [trackingError]);

  // Construct Spotlightr embed URL with API enabled
  const embedUrl = `https://app.spotlightr.com/watch/${spotlightrVideoId}?enableApi=true&origin=${encodeURIComponent(window.location.origin)}`;

  if (error) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 mb-2">שגיאה בטעינת הסרטון</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          
          {error.includes('Authentication') && (
            <div className="text-xs text-red-600 bg-red-100 rounded-lg p-3 mb-3">
              <p className="font-medium mb-1">פתרונות אפשריים:</p>
              <ul className="text-right space-y-1">
                <li>• רענן את הדף ונסה שוב</li>
                <li>• התנתק והתחבר מחדש</li>
                <li>• פנה למנהל המערכת</li>
              </ul>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            רענן דף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black border border-slate-200">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <div className="text-center">
              <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-slate-600">טוען סרטון...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={`Video ${videoLessonId}`}
          onLoad={handleIframeLoad}
          onError={() => {
            setIsLoading(false);
            setError('Failed to load video player');
          }}
        />
      </div>
      
      {/* Tracking Status Indicator */}
      {sessionToken && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>מעקב {isActive ? 'פעיל' : 'לא פעיל'}</span>
            {!isTabVisible && (
              <span className="text-orange-600">• טאב לא פעיל</span>
            )}
          </div>
          
          {queuedEventsCount > 0 && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{queuedEventsCount} אירועים בתור</span>
            </div>
          )}
        </div>
      )}
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 space-y-2">
          {sessionToken ? (
            <div className="p-2 bg-slate-100 rounded text-xs text-slate-600 font-mono">
              <div>Session: {sessionToken.slice(0, 8)}...</div>
              <div>Time: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s</div>
              <div>Playing: {isPlaying ? 'Yes' : 'No'} | Visible: {isTabVisible ? 'Yes' : 'No'}</div>
              <div>Rate: {playbackRate}x | Volume: {(volume * 100).toFixed(0)}%</div>
              <div>Events Queued: {queuedEventsCount}</div>
            </div>
          ) : (
            <div className="p-2 bg-red-50 rounded text-xs border border-red-200">
              <div className="text-red-600 font-medium mb-2">No active video session</div>
              {error && <div className="text-red-600 mb-2">Error: {error}</div>}
              <button
                onClick={async () => {
                  console.log('🔍 Manual debug triggered');
                  await debugAuth();
                }}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 mr-2"
              >
                Debug Auth
              </button>
              <button
                onClick={async () => {
                  console.log('🔄 Retrying session start...');
                  await startSession();
                }}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                Retry Session
              </button>
            </div>
          )}
          
          {/* Advanced Debug Panel */}
          <AuthDebugPanel />
        </div>
      )}
    </div>
  );
}