import { ViewingEvent } from './videoTrackingService';

export interface TimeSegment {
  start: number;
  end: number;
}

export interface ProgressCalculationResult {
  watchedSegments: TimeSegment[];
  totalWatchedSeconds: number;
  completionPercentage: number;
  suspiciousActivityScore: number;
  qualityScore: number;
}

export class VideoProgressCalculator {
  /**
   * Calculate comprehensive progress data from viewing events
   */
  static calculateProgress(
    events: ViewingEvent[], 
    videoDurationSeconds: number
  ): ProgressCalculationResult {
    const watchedSegments = this.calculateWatchedSegments(events);
    const totalWatchedSeconds = this.calculateTotalWatchedTime(watchedSegments);
    const completionPercentage = Math.min(100, (totalWatchedSeconds / videoDurationSeconds) * 100);
    const suspiciousActivityScore = this.calculateSuspiciousActivityScore(events);
    const qualityScore = this.calculateQualityScore(events, watchedSegments, videoDurationSeconds);

    return {
      watchedSegments,
      totalWatchedSeconds,
      completionPercentage,
      suspiciousActivityScore,
      qualityScore
    };
  }

  /**
   * Trigger automatic grade update after progress calculation
   */
  static async triggerGradeUpdate(userId: string, videoLessonId: string): Promise<void> {
    try {
      // Call the auto-update endpoint to recalculate grades
      const response = await fetch('/api/video/grading/auto-update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}`
        },
        body: JSON.stringify({ userId, videoLessonId })
      });

      if (!response.ok) {
        console.error('Failed to trigger grade update:', await response.text());
      }
    } catch (error) {
      console.error('Error triggering grade update:', error);
    }
  }

  /**
   * Calculate watched segments with advanced merging algorithm
   */
  private static calculateWatchedSegments(events: ViewingEvent[]): TimeSegment[] {
    const segments: TimeSegment[] = [];
    let currentSegment: { start: number; end?: number } | null = null;

    // Sort events by video timestamp first, then by client timestamp
    const sortedEvents = events.sort((a, b) => {
      const timestampDiff = a.timestamp_in_video - b.timestamp_in_video;
      if (timestampDiff !== 0) return timestampDiff;
      
      return new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime();
    });

    for (const event of sortedEvents) {
      switch (event.event_type) {
        case 'play':
          // Only start tracking if tab is visible
          if (event.is_tab_visible !== false) {
            // Close previous segment if exists
            if (currentSegment) {
              segments.push({
                start: currentSegment.start,
                end: event.timestamp_in_video
              });
            }
            currentSegment = { start: event.timestamp_in_video };
          }
          break;

        case 'pause':
        case 'end':
          if (currentSegment) {
            segments.push({
              start: currentSegment.start,
              end: event.timestamp_in_video
            });
            currentSegment = null;
          }
          break;

        case 'seek':
          // End current segment and potentially start new one
          if (currentSegment) {
            segments.push({
              start: currentSegment.start,
              end: Math.min(currentSegment.start, event.timestamp_in_video)
            });
            currentSegment = null;
          }
          break;

        case 'heartbeat':
          // Validate continuous watching
          if (currentSegment) {
            if (event.is_tab_visible === false) {
              // Tab became invisible, end current segment
              segments.push({
                start: currentSegment.start,
                end: event.timestamp_in_video
              });
              currentSegment = null;
            } else {
              // Continue current segment (heartbeat validates continuous watching)
              // No action needed, segment continues
            }
          }
          break;
      }
    }

    // Filter out invalid segments and merge overlapping ones
    const validSegments = segments
      .filter(segment => segment.end > segment.start && segment.end - segment.start >= 0.1) // At least 0.1 seconds
      .sort((a, b) => a.start - b.start);

    return this.mergeOverlappingSegments(validSegments);
  }

  /**
   * Merge overlapping segments with tolerance for small gaps
   */
  private static mergeOverlappingSegments(segments: TimeSegment[]): TimeSegment[] {
    if (segments.length === 0) return [];

    const merged: TimeSegment[] = [{ ...segments[0] }];
    const gapTolerance = 2; // Merge segments with gaps smaller than 2 seconds

    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const last = merged[merged.length - 1];

      // Check if segments overlap or are close enough to merge
      if (current.start <= last.end + gapTolerance) {
        // Merge segments
        last.end = Math.max(last.end, current.end);
      } else {
        // Add as new segment
        merged.push({ ...current });
      }
    }

    return merged;
  }

  /**
   * Calculate total watched time from segments
   */
  private static calculateTotalWatchedTime(segments: TimeSegment[]): number {
    return segments.reduce((total, segment) => total + (segment.end - segment.start), 0);
  }

  /**
   * Calculate suspicious activity score (0-100, higher = more suspicious)
   */
  private static calculateSuspiciousActivityScore(events: ViewingEvent[]): number {
    let suspiciousScore = 0;
    const maxScore = 100;

    // 1. Rapid seeking behavior
    const seekEvents = events.filter(e => e.event_type === 'seek');
    const rapidSeekPenalty = this.calculateRapidSeekPenalty(seekEvents);
    suspiciousScore += rapidSeekPenalty;

    // 2. Large jumps in video position
    const largeJumpPenalty = this.calculateLargeJumpPenalty(seekEvents);
    suspiciousScore += largeJumpPenalty;

    // 3. Unusual playback patterns
    const playbackPatternPenalty = this.calculatePlaybackPatternPenalty(events);
    suspiciousScore += playbackPatternPenalty;

    // 4. Tab visibility patterns
    const tabVisibilityPenalty = this.calculateTabVisibilityPenalty(events);
    suspiciousScore += tabVisibilityPenalty;

    return Math.min(maxScore, Math.round(suspiciousScore));
  }

  /**
   * Calculate penalty for rapid seeking
   */
  private static calculateRapidSeekPenalty(seekEvents: ViewingEvent[]): number {
    let penalty = 0;
    const timeWindow = 10000; // 10 seconds in milliseconds

    for (let i = 0; i < seekEvents.length - 2; i++) {
      const windowEvents = [];
      let j = i;
      
      while (j < seekEvents.length && 
             new Date(seekEvents[j].client_timestamp).getTime() - 
             new Date(seekEvents[i].client_timestamp).getTime() <= timeWindow) {
        windowEvents.push(seekEvents[j]);
        j++;
      }

      if (windowEvents.length >= 3) {
        penalty += windowEvents.length * 2; // 2 points per rapid seek
      }
    }

    return Math.min(30, penalty); // Max 30 points for rapid seeking
  }

  /**
   * Calculate penalty for large jumps
   */
  private static calculateLargeJumpPenalty(seekEvents: ViewingEvent[]): number {
    let penalty = 0;
    const largeJumpThreshold = 30; // 30 seconds

    for (let i = 1; i < seekEvents.length; i++) {
      const jump = Math.abs(seekEvents[i].timestamp_in_video - seekEvents[i-1].timestamp_in_video);
      if (jump > largeJumpThreshold) {
        penalty += Math.min(10, jump / 10); // Up to 10 points per large jump
      }
    }

    return Math.min(25, penalty); // Max 25 points for large jumps
  }

  /**
   * Calculate penalty for unusual playback patterns
   */
  private static calculatePlaybackPatternPenalty(events: ViewingEvent[]): number {
    let penalty = 0;

    // Check for excessive play/pause cycles
    const playPauseEvents = events.filter(e => e.event_type === 'play' || e.event_type === 'pause');
    if (playPauseEvents.length > 20) {
      penalty += Math.min(15, (playPauseEvents.length - 20) * 0.5);
    }

    // Check for unusual playback rates (for analysis only, no penalty for speed)
    const highSpeedEvents = events.filter(e => e.playback_rate && e.playback_rate > 2);
    if (highSpeedEvents.length > 0) {
      // Just track for analysis, no penalty applied
    }

    return Math.min(20, penalty); // Max 20 points for playback patterns
  }

  /**
   * Calculate penalty for suspicious tab visibility patterns
   */
  private static calculateTabVisibilityPenalty(events: ViewingEvent[]): number {
    let penalty = 0;
    let invisibleTime = 0;
    let totalTime = 0;

    const heartbeatEvents = events.filter(e => e.event_type === 'heartbeat');
    
    for (const event of heartbeatEvents) {
      totalTime += 10; // Assuming 10-second heartbeat intervals
      if (event.is_tab_visible === false) {
        invisibleTime += 10;
      }
    }

    if (totalTime > 0) {
      const invisibleRatio = invisibleTime / totalTime;
      if (invisibleRatio > 0.3) { // More than 30% invisible
        penalty += invisibleRatio * 25; // Up to 25 points
      }
    }

    return Math.min(25, penalty); // Max 25 points for tab visibility
  }

  /**
   * Calculate overall quality score (0-100, higher = better quality viewing)
   */
  private static calculateQualityScore(
    events: ViewingEvent[], 
    segments: TimeSegment[], 
    videoDurationSeconds: number
  ): number {
    let qualityScore = 100;

    // Reduce score based on suspicious activity
    const suspiciousScore = this.calculateSuspiciousActivityScore(events);
    qualityScore -= suspiciousScore * 0.5; // Suspicious activity reduces quality

    // Reduce score for fragmented viewing
    const fragmentationPenalty = this.calculateFragmentationPenalty(segments, videoDurationSeconds);
    qualityScore -= fragmentationPenalty;

    // Reduce score for incomplete viewing
    const totalWatchedTime = this.calculateTotalWatchedTime(segments);
    const completionRatio = totalWatchedTime / videoDurationSeconds;
    if (completionRatio < 0.8) {
      qualityScore -= (0.8 - completionRatio) * 50; // Penalty for incomplete viewing
    }

    return Math.max(0, Math.min(100, Math.round(qualityScore)));
  }

  /**
   * Calculate penalty for fragmented viewing
   */
  private static calculateFragmentationPenalty(segments: TimeSegment[], videoDurationSeconds: number): number {
    if (segments.length <= 1) return 0;

    // Calculate average segment length
    const totalWatchedTime = this.calculateTotalWatchedTime(segments);
    const averageSegmentLength = totalWatchedTime / segments.length;
    const expectedAverageLength = videoDurationSeconds / 5; // Expect ~5 segments for normal viewing

    if (averageSegmentLength < expectedAverageLength * 0.3) {
      return Math.min(20, segments.length * 0.5); // Penalty for too many short segments
    }

    return 0;
  }

  /**
   * Get viewing pattern analysis
   */
  static analyzeViewingPattern(events: ViewingEvent[]): {
    totalEvents: number;
    playEvents: number;
    pauseEvents: number;
    seekEvents: number;
    heartbeatEvents: number;
    averagePlaybackRate: number;
    tabInvisiblePercentage: number;
  } {
    const totalEvents = events.length;
    const playEvents = events.filter(e => e.event_type === 'play').length;
    const pauseEvents = events.filter(e => e.event_type === 'pause').length;
    const seekEvents = events.filter(e => e.event_type === 'seek').length;
    const heartbeatEvents = events.filter(e => e.event_type === 'heartbeat').length;

    const playbackRates = events
      .filter(e => e.playback_rate && e.playback_rate > 0)
      .map(e => e.playback_rate!);
    const averagePlaybackRate = playbackRates.length > 0 
      ? playbackRates.reduce((sum, rate) => sum + rate, 0) / playbackRates.length 
      : 1.0;

    const visibilityEvents = events.filter(e => e.is_tab_visible !== undefined);
    const invisibleEvents = visibilityEvents.filter(e => e.is_tab_visible === false);
    const tabInvisiblePercentage = visibilityEvents.length > 0 
      ? (invisibleEvents.length / visibilityEvents.length) * 100 
      : 0;

    return {
      totalEvents,
      playEvents,
      pauseEvents,
      seekEvents,
      heartbeatEvents,
      averagePlaybackRate: Math.round(averagePlaybackRate * 100) / 100,
      tabInvisiblePercentage: Math.round(tabInvisiblePercentage * 100) / 100
    };
  }
}