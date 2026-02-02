"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoPlayerProps } from '@/lib/types/video';

export default function VideoPlayer({
  videoLessonId,
  spotlightrVideoId,
  onProgressUpdate,
  onSessionStart,
  onSessionEnd
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Generate unique browser tab ID
  const browserTabId = useRef(
    `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Track tab visibility using Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      
      // Track visibility change event
      if (sessionToken) {
        trackEvent('heartbeat', currentTime, {
          visibility_changed: true,
          was_visible: !visible,
          now_visible: visible,
          document_hidden: document.hidden,
          visibility_state: document.visibilityState
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionToken, currentTime]);

  // Track window focus/blur
  useEffect(() => {
    const handleFocus = () => {
      if (sessionToken) {
        trackEvent('heartbeat', currentTime, {
          window_focus_changed: true,
          focused: true,
          event_type: 'window_focus'
        });
      }
    };

    const handleBlur = () => {
      if (sessionToken) {
        trackEvent('heartbeat', currentTime, {
          window_focus_changed: true,
          focused: false,
          event_type: 'window_blur'
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [sessionToken, currentTime]);

  // Track tab switching detection
  useEffect(() => {
    let lastActiveTime = Date.now();
    let checkInterval: NodeJS.Timeout;

    const checkTabActivity = () => {
      const now = Date.now();
      const timeDiff = now - lastActiveTime;
      
      // If more than 2 seconds have passed since last activity, might indicate tab switch
      if (timeDiff > 2000 && sessionToken && isPlaying) {
        trackEvent('heartbeat', currentTime, {
          potential_tab_switch: true,
          inactive_duration: timeDiff,
          was_playing: isPlaying,
          is_tab_visible: isTabVisible
        });
      }
      
      lastActiveTime = now;
    };

    const handleActivity = () => {
      lastActiveTime = Date.now();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Check for inactivity every 3 seconds
    checkInterval = setInterval(checkTabActivity, 3000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearInterval(checkInterval);
    };
  }, [sessionToken, currentTime, isPlaying, isTabVisible]);

  // Start viewing session
  const startSession = useCallback(async () => {
    try {
      const response = await fetch('/api/video/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_lesson_id: videoLessonId,
          browser_tab_id: browserTabId.current,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start viewing session');
      }

      const data = await response.json();
      setSessionToken(data.session_token);
      onSessionStart?.(data.session_token);
      
      return data.session_token;
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start video tracking session');
      return null;
    }
  }, [videoLessonId, onSessionStart]);

  // Track viewing event
  const trackEvent = useCallback(async (
    eventType: 'play' | 'pause' | 'seek' | 'heartbeat' | 'end',
    timestampInVideo: number,
    additionalData?: Record<string, any>
  ) => {
    if (!sessionToken) return;

    try {
      await fetch('/api/video/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: sessionToken,
          event_type: eventType,
          timestamp_in_video: timestampInVideo,
          is_tab_visible: isTabVisible,
          playback_rate: playbackRate,
          volume_level: volume,
          additional_data: additionalData,
        }),
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [sessionToken, isTabVisible, playbackRate, volume]);

  // Handle iframe load
  const handleIframeLoad = useCallback(async () => {
    setIsLoading(false);
    
    // Start tracking session
    const token = await startSession();
    if (token) {
      // Set up message listener for Spotlightr events
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from Spotlightr domain
        if (!event.origin.includes('spotlightr.com')) return;

        const { type, data } = event.data;
        
        switch (type) {
          case 'video:play':
            setIsPlaying(true);
            trackEvent('play', data.currentTime || currentTime);
            break;
            
          case 'video:pause':
            setIsPlaying(false);
            trackEvent('pause', data.currentTime || currentTime);
            break;
            
          case 'video:seek':
            setCurrentTime(data.currentTime || 0);
            trackEvent('seek', data.currentTime || 0, {
              previous_time: currentTime,
              seek_delta: (data.currentTime || 0) - currentTime
            });
            break;
            
          case 'video:timeupdate':
            setCurrentTime(data.currentTime || 0);
            if (data.duration) setDuration(data.duration);
            break;
            
          case 'video:ratechange':
            setPlaybackRate(data.playbackRate || 1.0);
            break;
            
          case 'video:volumechange':
            setVolume(data.volume || 1.0);
            break;
            
          case 'video:ended':
            setIsPlaying(false);
            trackEvent('end', data.currentTime || currentTime);
            break;
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Cleanup function
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [startSession, trackEvent, currentTime]);

  // Heartbeat tracking - send periodic updates
  useEffect(() => {
    if (!sessionToken || !isPlaying) return;

    const heartbeatInterval = setInterval(() => {
      trackEvent('heartbeat', currentTime);
      
      // Update progress
      if (duration > 0) {
        const progress = (currentTime / duration) * 100;
        onProgressUpdate?.(progress);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(heartbeatInterval);
  }, [sessionToken, isPlaying, currentTime, duration, trackEvent, onProgressUpdate]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionToken) {
        trackEvent('end', currentTime);
        onSessionEnd?.();
      }
    };
  }, [sessionToken, currentTime, trackEvent, onSessionEnd]);

  // Construct Spotlightr embed URL
  const embedUrl = `https://app.spotlightr.com/watch/${spotlightrVideoId}?enableApi=true&origin=${encodeURIComponent(window.location.origin)}`;

  if (error) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-red-50 border border-red-200 flex items-center justify-center">
        <div className="text-center p-6">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 mb-2">שגיאה בטעינת הסרטון</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black border border-slate-200">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
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
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && sessionToken && (
        <div className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-600">
          <div>Session: {sessionToken.slice(0, 8)}...</div>
          <div>Time: {currentTime.toFixed(1)}s / {duration.toFixed(1)}s</div>
          <div>Playing: {isPlaying ? 'Yes' : 'No'} | Visible: {isTabVisible ? 'Yes' : 'No'}</div>
          <div>Rate: {playbackRate}x | Volume: {(volume * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  );
}