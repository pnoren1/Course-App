"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoEventType, TrackEventRequest } from '@/lib/types/video';
import { VideoEventOptimizer, OptimizedEvent } from '@/lib/services/videoEventOptimizer';
import { authenticatedFetch } from '@/lib/utils/api-helpers';
import { rlsSupabase } from '@/lib/supabase';

interface UseVideoTrackingOptions {
  videoLessonId: string;
  batchSize?: number;
  batchInterval?: number;
  heartbeatInterval?: number;
  enableOptimization?: boolean;
}

interface VideoTrackingState {
  sessionToken: string | null;
  isActive: boolean;
  isTabVisible: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  error: string | null;
  networkLatency: number;
  compressionRatio: number;
}

interface EventBatch {
  events: Omit<TrackEventRequest, 'session_token'>[];
  timestamp: number;
}

export function useVideoTracking({
  videoLessonId,
  batchSize = 10,
  batchInterval = 5000, // 5 seconds
  heartbeatInterval = 10000, // 10 seconds
  enableOptimization = true
}: UseVideoTrackingOptions) {
  const [state, setState] = useState<VideoTrackingState>({
    sessionToken: null,
    isActive: false,
    isTabVisible: true,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1.0,
    volume: 1.0,
    error: null,
    networkLatency: 0,
    compressionRatio: 1.0
  });

  const eventQueue = useRef<OptimizedEvent[]>([]);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const batchTimer = useRef<NodeJS.Timeout | null>(null);
  const browserTabId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const optimizer = useRef(new VideoEventOptimizer());
  const debouncedSender = useRef<((events: OptimizedEvent[]) => void) | null>(null);

  // Send batched events to server
  const flushEvents = useCallback(async () => {
    if (!state.sessionToken || eventQueue.current.length === 0) return;

    const eventsToSend = [...eventQueue.current];
    eventQueue.current = [];

    try {
      if (enableOptimization) {
        // Use optimizer for sending with retry logic
        const result = await optimizer.current.sendEventsWithRetry(
          state.sessionToken,
          eventsToSend
        );

        if (!result.success) {
          // Re-queue events if failed
          eventQueue.current.unshift(...eventsToSend);
          console.error('Failed to send events:', result.error);
        } else {
          // Update compression ratio for monitoring
          const compressed = optimizer.current.compressEvents(eventsToSend);
          setState(prev => ({ ...prev, compressionRatio: compressed.compression_ratio }));
        }
      } else {
        // Fallback to original method with authentication
        const response = await authenticatedFetch('/api/video/events/batch', {
          method: 'POST',
          body: JSON.stringify({
            session_token: state.sessionToken,
            events: eventsToSend,
          }),
        });

        if (!response.ok) {
          // Re-queue events if failed
          eventQueue.current.unshift(...eventsToSend);
          throw new Error('Failed to send events');
        }
      }
    } catch (error) {
      console.error('Error sending events:', error);
    }
  }, [state.sessionToken, enableOptimization]);

  // Queue event for batching
  const queueEvent = useCallback((
    eventType: VideoEventType,
    timestampInVideo: number,
    additionalData?: Record<string, any>
  ) => {
    if (!state.sessionToken) return;

    const event: OptimizedEvent = {
      event_type: eventType,
      timestamp_in_video: timestampInVideo,
      client_timestamp: new Date().toISOString(),
      is_tab_visible: state.isTabVisible,
      playback_rate: state.playbackRate,
      volume_level: state.volume,
      additional_data: additionalData,
    };

    eventQueue.current.push(event);

    // Send immediately for critical events or use debounced sender
    if (eventType === 'play' || eventType === 'pause' || eventType === 'end') {
      flushEvents();
    } else if (enableOptimization && debouncedSender.current) {
      debouncedSender.current([event]);
    }
  }, [state.sessionToken, state.isTabVisible, state.playbackRate, state.volume, enableOptimization, flushEvents]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setState(prev => ({ ...prev, isTabVisible: isVisible }));
      
      // Queue visibility change event
      if (state.sessionToken) {
        queueEvent('heartbeat', state.currentTime, {
          visibility_changed: true,
          was_visible: !isVisible,
          now_visible: isVisible,
          document_hidden: document.hidden,
          visibility_state: document.visibilityState,
          timestamp: Date.now()
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.sessionToken, state.currentTime, queueEvent]);

  // Track window focus/blur
  useEffect(() => {
    const handleFocus = () => {
      if (state.sessionToken) {
        queueEvent('heartbeat', state.currentTime, {
          window_focus_changed: true,
          focused: true,
          event_type: 'window_focus',
          timestamp: Date.now()
        });
      }
    };

    const handleBlur = () => {
      if (state.sessionToken) {
        queueEvent('heartbeat', state.currentTime, {
          window_focus_changed: true,
          focused: false,
          event_type: 'window_blur',
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state.sessionToken, state.currentTime, queueEvent]);

  // Enhanced tab switching detection
  useEffect(() => {
    let lastActiveTime = Date.now();
    let lastMousePosition = { x: 0, y: 0 };
    let activityCheckInterval: NodeJS.Timeout;

    const detectTabSwitch = () => {
      const now = Date.now();
      const inactiveDuration = now - lastActiveTime;
      
      // Detect potential tab switches based on inactivity patterns
      if (inactiveDuration > 3000 && state.sessionToken && state.isPlaying) {
        queueEvent('heartbeat', state.currentTime, {
          potential_tab_switch: true,
          inactive_duration: inactiveDuration,
          was_playing: state.isPlaying,
          is_tab_visible: state.isTabVisible,
          detection_method: 'inactivity_pattern',
          timestamp: now
        });
      }
    };

    const handleUserActivity = (event: Event) => {
      lastActiveTime = Date.now();
      
      // Track mouse movement patterns
      if (event.type === 'mousemove') {
        const mouseEvent = event as MouseEvent;
        const deltaX = Math.abs(mouseEvent.clientX - lastMousePosition.x);
        const deltaY = Math.abs(mouseEvent.clientY - lastMousePosition.y);
        
        // Significant mouse movement indicates active engagement
        if (deltaX > 50 || deltaY > 50) {
          lastMousePosition = { x: mouseEvent.clientX, y: mouseEvent.clientY };
          
          if (state.sessionToken && state.isPlaying) {
            queueEvent('heartbeat', state.currentTime, {
              user_activity: 'mouse_movement',
              movement_delta: { x: deltaX, y: deltaY },
              engagement_level: 'active',
              timestamp: Date.now()
            });
          }
        }
      }
    };

    // Monitor various user activities
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'keydown', 
      'scroll', 'touchstart', 'click', 'wheel'
    ];
    
    activityEvents.forEach(eventType => {
      document.addEventListener(eventType, handleUserActivity, { passive: true });
    });

    // Check for suspicious inactivity patterns
    activityCheckInterval = setInterval(detectTabSwitch, 5000);

    return () => {
      activityEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleUserActivity);
      });
      clearInterval(activityCheckInterval);
    };
  }, [state.sessionToken, state.currentTime, state.isPlaying, state.isTabVisible, queueEvent]);

  // Estimate network latency on mount
  useEffect(() => {
    if (enableOptimization) {
      optimizer.current.estimateNetworkLatency().then(latency => {
        setState(prev => ({ ...prev, networkLatency: latency }));
      });
    }
  }, [enableOptimization]);

  // Initialize debounced sender when session starts
  useEffect(() => {
    if (state.sessionToken && enableOptimization) {
      debouncedSender.current = optimizer.current.createDebouncedSender(
        state.sessionToken,
        Math.max(1000, state.networkLatency * 2)
      );
    }
  }, [state.sessionToken, state.networkLatency, enableOptimization]);

  // Debug function to check authentication state
  const debugAuth = useCallback(async () => {
    try {
      console.log('🔍 Debug: Checking auth state...');
      
      // Check client-side session
      const { data: { session }, error: sessionError } = await rlsSupabase.auth.getSession();
      console.log('📋 Client session:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenStart: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'N/A',
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A',
        error: sessionError?.message
      });
      
      // Test API call
      const response = await authenticatedFetch('/api/debug/video-auth');
      const debugData = await response.json();
      
      console.log('🔍 Server debug response:', debugData);
      
      return debugData;
    } catch (error) {
      console.error('💥 Debug auth error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  // Start viewing session
  const startSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      console.log('🚀 Starting video session for lesson:', videoLessonId);
      
      // Debug authentication before making the request
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Running pre-request auth debug...');
        const debugResult = await debugAuth();
        console.log('🔍 Debug result:', debugResult);
      }
      
      const response = await authenticatedFetch('/api/video/sessions', {
        method: 'POST',
        body: JSON.stringify({
          video_lesson_id: videoLessonId,
          browser_tab_id: browserTabId.current,
        }),
      });

      console.log('📡 Session API response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to start viewing session';
        
        console.error('❌ Session API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorMessage
        });
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to view this video.');
        } else if (response.status === 404) {
          throw new Error('Video lesson not found.');
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      console.log('✅ Session started successfully:', {
        sessionToken: data.session_token?.substring(0, 8) + '...',
        videoData: data.video_data
      });
      
      setState(prev => ({
        ...prev,
        sessionToken: data.session_token,
        isActive: true
      }));
      
      return data.session_token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      console.error('💥 Error starting session:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      return null;
    }
  }, [videoLessonId]);

  // Set up batch timer with dynamic batch size
  useEffect(() => {
    if (state.sessionToken && state.isActive) {
      // Calculate optimal batch size if optimization is enabled
      let effectiveBatchSize = batchSize;
      if (enableOptimization && state.networkLatency > 0) {
        effectiveBatchSize = optimizer.current.calculateOptimalBatchSize(
          500, // Estimated average event size in bytes
          state.networkLatency
        );
      }

      batchTimer.current = setInterval(() => {
        if (eventQueue.current.length >= effectiveBatchSize || eventQueue.current.length > 0) {
          flushEvents();
        }
      }, batchInterval);

      return () => {
        if (batchTimer.current) {
          clearInterval(batchTimer.current);
          batchTimer.current = null;
        }
      };
    }
  }, [state.sessionToken, state.isActive, state.networkLatency, batchInterval, batchSize, enableOptimization, flushEvents]);

  // Set up heartbeat timer
  useEffect(() => {
    if (state.sessionToken && state.isPlaying && state.isTabVisible) {
      heartbeatTimer.current = setInterval(() => {
        queueEvent('heartbeat', state.currentTime);
      }, heartbeatInterval);

      return () => {
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
          heartbeatTimer.current = null;
        }
      };
    }
  }, [state.sessionToken, state.isPlaying, state.isTabVisible, state.currentTime, heartbeatInterval, queueEvent]);

  // End session
  const endSession = useCallback(async () => {
    if (!state.sessionToken) return;

    // Send final event and flush queue
    queueEvent('end', state.currentTime);
    await flushEvents();

    // Clean up timers
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (batchTimer.current) {
      clearInterval(batchTimer.current);
      batchTimer.current = null;
    }

    setState(prev => ({
      ...prev,
      sessionToken: null,
      isActive: false
    }));
  }, [state.sessionToken, state.currentTime, queueEvent, flushEvents]);

  // Update state methods
  const updateTime = useCallback((currentTime: number, duration?: number) => {
    setState(prev => ({
      ...prev,
      currentTime,
      ...(duration !== undefined && { duration })
    }));
  }, []);

  const updatePlayState = useCallback((isPlaying: boolean) => {
    setState(prev => ({ ...prev, isPlaying }));
    
    if (state.sessionToken) {
      queueEvent(isPlaying ? 'play' : 'pause', state.currentTime);
    }
  }, [state.sessionToken, state.currentTime, queueEvent]);

  const updateSeek = useCallback((newTime: number, previousTime?: number) => {
    setState(prev => ({ ...prev, currentTime: newTime }));
    
    if (state.sessionToken) {
      queueEvent('seek', newTime, {
        previous_time: previousTime || state.currentTime,
        seek_delta: newTime - (previousTime || state.currentTime)
      });
    }
  }, [state.sessionToken, state.currentTime, queueEvent]);

  const updatePlaybackRate = useCallback((rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate }));
  }, []);

  const updateVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.sessionToken) {
        endSession();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startSession,
    endSession,
    queueEvent,
    flushEvents,
    debugAuth,
    
    // Update methods
    updateTime,
    updatePlayState,
    updateSeek,
    updatePlaybackRate,
    updateVolume,
    
    // Utility
    browserTabId: browserTabId.current,
    queuedEventsCount: eventQueue.current.length
  };
}