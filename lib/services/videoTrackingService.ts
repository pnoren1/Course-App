import { supabase } from '@/lib/supabase';
import { videoCacheService } from './videoCacheService';

export interface ViewingSession {
  id: string;
  user_id: string;
  video_lesson_id: string;
  session_token: string;
  started_at: string;
  last_heartbeat: string;
  is_active: boolean;
  browser_tab_id?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface ViewingEvent {
  id?: string;
  session_id: string;
  event_type: 'play' | 'pause' | 'seek' | 'heartbeat' | 'end';
  timestamp_in_video: number;
  client_timestamp: string;
  server_timestamp?: string;
  is_tab_visible?: boolean;
  playback_rate?: number;
  volume_level?: number;
  additional_data?: any;
}

export interface VideoProgress {
  id: string;
  user_id: string;
  video_lesson_id: string;
  total_watched_seconds: number;
  completion_percentage: number;
  is_completed: boolean;
  first_watch_started?: string;
  last_watch_updated: string;
  suspicious_activity_count: number;
  grade_contribution: number;
}

export class VideoTrackingService {
  private supabase = supabase;

  /**
   * Create a new viewing session
   */
  async createSession(
    userId: string, 
    videoLessonId: string, 
    browserTabId?: string
  ): Promise<{ sessionToken: string; videoData: any }> {
    // Import security service for concurrent session checks
    const { VideoSecurityService } = await import('./videoSecurityService');
    const securityService = new VideoSecurityService();

    // Check for existing concurrent sessions
    const concurrentCheck = await securityService.checkConcurrentSessions(userId, videoLessonId);
    
    if (concurrentCheck.hasConcurrentSessions) {
      // Alert about concurrent viewing attempt
      await securityService.alertConcurrentViewing(userId, videoLessonId, concurrentCheck.sessionDetails);
      
      // Terminate old sessions
      const terminatedCount = await securityService.terminateOldSessions(userId, videoLessonId);
      console.log(`Terminated ${terminatedCount} concurrent sessions for user ${userId}`);
    }

    // Generate unique session token
    const sessionToken = this.generateSessionToken();

    // Create new session
    const { data: session, error } = await this.supabase
      .from('video_viewing_sessions')
      .insert({
        user_id: userId,
        video_lesson_id: videoLessonId,
        session_token: sessionToken,
        browser_tab_id: browserTabId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create viewing session: ${error.message}`);
    }

    // Get video lesson data with caching
    let videoData = videoCacheService.getCachedVideoLesson(videoLessonId);
    
    if (!videoData) {
      const { data: fetchedVideoData, error: videoError } = await this.supabase
        .from('video_lessons')
        .select('*')
        .eq('id', videoLessonId)
        .single();

      if (videoError) {
        throw new Error(`Failed to fetch video data: ${videoError.message}`);
      }

      videoData = fetchedVideoData;
      videoCacheService.cacheVideoLesson(videoLessonId, videoData);
    }

    return { sessionToken, videoData };
  }

  /**
   * Process viewing events and update progress
   */
  async processViewingEvents(sessionToken: string, events: ViewingEvent[]): Promise<void> {
    // Get session
    const { data: session, error: sessionError } = await this.supabase
      .from('video_viewing_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Perform comprehensive fraud check
    const { VideoSecurityService } = await import('./videoSecurityService');
    const securityService = new VideoSecurityService();
    
    const fraudCheck = await securityService.performComprehensiveFraudCheck(
      session.user_id, 
      session.video_lesson_id, 
      events
    );

    // Log security violations if any
    if (!fraudCheck.isValid) {
      console.warn('Security violations detected:', {
        userId: session.user_id,
        videoLessonId: session.video_lesson_id,
        violations: fraudCheck.violations,
        riskScore: fraudCheck.riskScore,
        recommendations: fraudCheck.recommendations
      });

      // Flag high-risk behavior
      if (fraudCheck.riskScore > 70) {
        await securityService.flagSuspiciousUser(
          session.user_id,
          session.video_lesson_id,
          'High fraud risk score',
          { fraudCheck, events: events.length }
        );
      }
    }

    // Insert events (even if suspicious, for audit trail)
    const eventsToInsert = events.map(event => ({
      ...event,
      session_id: session.id,
      client_timestamp: event.client_timestamp || new Date().toISOString()
    }));

    const { error: eventsError } = await this.supabase
      .from('video_viewing_events')
      .insert(eventsToInsert);

    if (eventsError) {
      throw new Error(`Failed to insert viewing events: ${eventsError.message}`);
    }

    // Update session heartbeat
    await this.supabase
      .from('video_viewing_sessions')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', session.id);

    // Recalculate progress (with fraud score consideration)
    await this.calculateProgress(session.user_id, session.video_lesson_id, fraudCheck.riskScore);
  }

  /**
   * Calculate viewing progress for a user and video
   */
  async calculateProgress(userId: string, videoLessonId: string, fraudRiskScore: number = 0): Promise<VideoProgress> {
    // Get video lesson data
    const { data: videoLesson, error: lessonError } = await this.supabase
      .from('video_lessons')
      .select('*')
      .eq('id', videoLessonId)
      .single();

    if (lessonError || !videoLesson) {
      throw new Error('Video lesson not found');
    }

    // Get all viewing events for this user and video
    const { data: sessions, error: sessionsError } = await this.supabase
      .from('video_viewing_sessions')
      .select(`
        id,
        video_viewing_events (*)
      `)
      .eq('user_id', userId)
      .eq('video_lesson_id', videoLessonId);

    if (sessionsError) {
      throw new Error(`Failed to fetch viewing sessions: ${sessionsError.message}`);
    }

    // Flatten all events
    const allEvents: ViewingEvent[] = [];
    sessions?.forEach(session => {
      if (session.video_viewing_events) {
        allEvents.push(...(session.video_viewing_events as ViewingEvent[]));
      }
    });

    // Calculate watched segments
    const watchedSegments = this.calculateWatchedSegments(allEvents);
    const totalWatchedSeconds = this.calculateTotalWatchedTime(watchedSegments);
    const completionPercentage = Math.min(100, (totalWatchedSeconds / videoLesson.duration_seconds) * 100);
    const isCompleted = completionPercentage >= videoLesson.required_completion_percentage;
    const suspiciousActivityCount = this.detectSuspiciousActivity(allEvents);

    // Calculate grade contribution (considering fraud risk)
    const gradeContribution = this.calculateGradeContribution(
      completionPercentage, 
      suspiciousActivityCount,
      videoLesson.required_completion_percentage,
      fraudRiskScore
    );

    // Update or create progress record
    const progressData = {
      user_id: userId,
      video_lesson_id: videoLessonId,
      total_watched_seconds: totalWatchedSeconds,
      completion_percentage: completionPercentage,
      is_completed: isCompleted,
      suspicious_activity_count: suspiciousActivityCount,
      grade_contribution: gradeContribution,
      last_watch_updated: new Date().toISOString()
    };

    const { data: progress, error } = await this.supabase
      .from('video_progress')
      .upsert(progressData, { 
        onConflict: 'user_id,video_lesson_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update progress: ${error.message}`);
    }

    // Cache the updated progress
    videoCacheService.cacheVideoProgress(userId, videoLessonId, {
      ...progress,
      first_watch_started: progress.first_watch_started || undefined
    });
    
    // Invalidate user's overall progress cache
    videoCacheService.invalidateUserCache(userId);

    return {
      ...progress,
      first_watch_started: progress.first_watch_started || undefined
    };
  }

  /**
   * Calculate watched segments from viewing events
   */
  private calculateWatchedSegments(events: ViewingEvent[]): Array<{ start: number; end: number }> {
    const segments: Array<{ start: number; end: number }> = [];
    let currentSegment: { start: number; end?: number } | null = null;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
    );

    for (const event of sortedEvents) {
      switch (event.event_type) {
        case 'play':
          if (event.is_tab_visible !== false) {
            currentSegment = { start: event.timestamp_in_video };
          }
          break;

        case 'pause':
        case 'seek':
        case 'end':
          if (currentSegment) {
            segments.push({
              start: currentSegment.start,
              end: event.timestamp_in_video
            });
            currentSegment = null;
          }
          break;

        case 'heartbeat':
          // Validate continuous watching
          if (currentSegment && event.is_tab_visible === false) {
            segments.push({
              start: currentSegment.start,
              end: event.timestamp_in_video
            });
            currentSegment = null;
          }
          break;
      }
    }

    return this.mergeOverlappingSegments(segments);
  }

  /**
   * Merge overlapping segments
   */
  private mergeOverlappingSegments(segments: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (segments.length === 0) return [];

    // Sort segments by start time
    const sorted = segments.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        // Overlapping segments, merge them
        last.end = Math.max(last.end, current.end);
      } else {
        // Non-overlapping segment
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Calculate total watched time from segments
   */
  private calculateTotalWatchedTime(segments: Array<{ start: number; end: number }>): number {
    return segments.reduce((total, segment) => total + (segment.end - segment.start), 0);
  }

  /**
   * Detect suspicious activity patterns
   */
  private detectSuspiciousActivity(events: ViewingEvent[]): number {
    let suspiciousCount = 0;

    // Count rapid seeks (more than 3 seeks in 10 seconds)
    const seekEvents = events.filter(e => e.event_type === 'seek');
    for (let i = 0; i < seekEvents.length - 2; i++) {
      const timeWindow = seekEvents.slice(i, i + 3);
      const timeSpan = new Date(timeWindow[2].client_timestamp).getTime() - 
                      new Date(timeWindow[0].client_timestamp).getTime();
      
      if (timeSpan < 10000) { // 10 seconds
        suspiciousCount++;
      }
    }

    // Count large jumps (seeks > 30 seconds)
    for (let i = 1; i < seekEvents.length; i++) {
      const jump = Math.abs(seekEvents[i].timestamp_in_video - seekEvents[i-1].timestamp_in_video);
      if (jump > 30) {
        suspiciousCount++;
      }
    }

    // Enhanced suspicious pattern detection
    suspiciousCount += this.detectAdvancedSuspiciousPatterns(events);

    return suspiciousCount;
  }

  /**
   * Detect advanced suspicious patterns
   */
  private detectAdvancedSuspiciousPatterns(events: ViewingEvent[]): number {
    let suspiciousCount = 0;

    // 1. Detect excessive forward seeking (skipping content)
    const forwardSeeks = events.filter(e => 
      e.event_type === 'seek' && 
      e.additional_data?.seek_distance && 
      e.additional_data.seek_distance > 10
    );
    
    if (forwardSeeks.length > events.length * 0.3) { // More than 30% of events are forward seeks
      suspiciousCount += 2;
    }

    // 2. Detect impossible viewing patterns (too much content in too little time)
    const playEvents = events.filter(e => e.event_type === 'play');
    const pauseEvents = events.filter(e => e.event_type === 'pause');
    
    if (playEvents.length > 0 && pauseEvents.length > 0) {
      const totalSessionTime = new Date(pauseEvents[pauseEvents.length - 1].client_timestamp).getTime() - 
                              new Date(playEvents[0].client_timestamp).getTime();
      const totalVideoTime = pauseEvents[pauseEvents.length - 1].timestamp_in_video - 
                            playEvents[0].timestamp_in_video;
      
      if (totalSessionTime > 0 && totalVideoTime > 0) {
        const impliedSpeed = (totalVideoTime * 1000) / totalSessionTime;
        if (impliedSpeed > 5) { // More than 5x speed
          suspiciousCount += 3;
        }
      }
    }

    // 3. Detect lack of natural pausing behavior
    const heartbeatEvents = events.filter(e => e.event_type === 'heartbeat');
    const naturalPauses = events.filter(e => 
      e.event_type === 'pause' && 
      (!e.additional_data?.automatic || e.additional_data.automatic === false)
    );
    
    if (heartbeatEvents.length > 20 && naturalPauses.length === 0) {
      suspiciousCount += 1; // Suspicious lack of natural pauses
    }

    // 4. Detect consistent tab visibility (possible manipulation)
    const visibilityEvents = events.filter(e => e.is_tab_visible !== undefined);
    const alwaysVisible = visibilityEvents.every(e => e.is_tab_visible === true);
    
    if (visibilityEvents.length > 10 && alwaysVisible) {
      suspiciousCount += 1;
    }

    return suspiciousCount;
  }

  /**
   * Calculate grade contribution based on completion and suspicious activity
   */
  private calculateGradeContribution(
    completionPercentage: number, 
    suspiciousActivityCount: number,
    requiredPercentage: number,
    fraudRiskScore: number = 0
  ): number {
    let baseScore = Math.min(100, completionPercentage);
    
    // Apply penalty for suspicious activity
    const suspiciousPenalty = Math.min(20, suspiciousActivityCount * 2); // Max 20% penalty
    baseScore = Math.max(0, baseScore - suspiciousPenalty);

    // Apply penalty for fraud risk score
    const fraudPenalty = Math.min(30, fraudRiskScore * 0.3); // Max 30% penalty based on risk
    baseScore = Math.max(0, baseScore - fraudPenalty);

    // Only give full credit if minimum requirement is met
    if (completionPercentage < requiredPercentage) {
      baseScore = Math.min(baseScore, (completionPercentage / requiredPercentage) * 100);
    }

    return Math.round(baseScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate unique session token
   */
  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get user's video progress with caching
   */
  async getUserProgress(userId: string, videoLessonId?: string): Promise<VideoProgress[]> {
    // Try cache first for single video
    if (videoLessonId) {
      const cached = videoCacheService.getCachedVideoProgress(userId, videoLessonId);
      if (cached) {
        return [cached];
      }
    } else {
      // Try cache for all user progress
      const cached = videoCacheService.getCachedUserProgress(userId);
      if (cached) {
        return cached;
      }
    }

    let query = this.supabase
      .from('video_progress')
      .select(`
        *,
        video_lessons (*)
      `)
      .eq('user_id', userId);

    if (videoLessonId) {
      query = query.eq('video_lesson_id', videoLessonId);
    }

    const { data, error } = await query.order('last_watch_updated', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user progress: ${error.message}`);
    }

    const progressData = data || [];

    // Cache the results
    if (videoLessonId && progressData.length > 0) {
      videoCacheService.cacheVideoProgress(userId, videoLessonId, {
        ...progressData[0],
        first_watch_started: progressData[0].first_watch_started || undefined
      });
    } else if (!videoLessonId) {
      videoCacheService.cacheUserProgress(userId, progressData.map(p => ({
        ...p,
        first_watch_started: p.first_watch_started || undefined
      })));
    }

    return progressData.map(p => ({
      ...p,
      first_watch_started: p.first_watch_started || undefined
    }));
  }

  /**
   * Close viewing session
   */
  async closeSession(sessionToken: string): Promise<void> {
    const { error } = await this.supabase
      .from('video_viewing_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);

    if (error) {
      throw new Error(`Failed to close session: ${error.message}`);
    }
  }
}