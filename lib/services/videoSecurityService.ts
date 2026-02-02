import { supabase } from '@/lib/supabase';
import { ViewingEvent } from './videoTrackingService';

export interface SecurityCheck {
  isValid: boolean;
  violations: string[];
  riskScore: number; // 0-100, higher = more risky
  recommendations: string[];
}

export interface ConcurrentSessionCheck {
  hasConcurrentSessions: boolean;
  activeSessions: number;
  sessionDetails: Array<{
    id: string;
    started_at: string;
    ip_address?: string;
    user_agent?: string;
  }>;
}

export class VideoSecurityService {
  private supabase = supabase;

  /**
   * Check for concurrent viewing sessions
   */
  async checkConcurrentSessions(userId: string, videoLessonId: string): Promise<ConcurrentSessionCheck> {
    const { data: sessions, error } = await this.supabase
      .from('video_viewing_sessions')
      .select('id, started_at, ip_address, user_agent, last_heartbeat, browser_tab_id')
      .eq('user_id', userId)
      .eq('video_lesson_id', videoLessonId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to check concurrent sessions: ${error.message}`);
    }

    const activeSessions = sessions?.length || 0;
    
    return {
      hasConcurrentSessions: activeSessions > 1,
      activeSessions,
      sessionDetails: (sessions || []).map(session => ({
        id: session.id,
        started_at: session.started_at,
        ip_address: session.ip_address || undefined,
        user_agent: session.user_agent || undefined
      }))
    };
  }

  /**
   * Terminate old sessions when a new session is created
   */
  async terminateOldSessions(userId: string, videoLessonId: string, currentSessionToken?: string): Promise<number> {
    let query = this.supabase
      .from('video_viewing_sessions')
      .update({ 
        is_active: false,
        last_heartbeat: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('video_lesson_id', videoLessonId)
      .eq('is_active', true);

    // Don't terminate the current session if provided
    if (currentSessionToken) {
      query = query.neq('session_token', currentSessionToken);
    }

    const { data, error } = await query.select('id');

    if (error) {
      throw new Error(`Failed to terminate old sessions: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Alert about concurrent viewing attempt
   */
  async alertConcurrentViewing(
    userId: string, 
    videoLessonId: string, 
    sessionDetails: Array<{ id: string; started_at: string; ip_address?: string; user_agent?: string }>
  ): Promise<void> {
    const alertData = {
      user_id: userId,
      video_lesson_id: videoLessonId,
      alert_type: 'concurrent_viewing',
      alert_data: {
        concurrent_sessions: sessionDetails.length,
        session_details: sessionDetails,
        detected_at: new Date().toISOString()
      },
      severity: 'medium'
    };

    // Log the alert (in a real implementation, this would go to a security_alerts table)
    console.warn('Concurrent viewing detected:', alertData);

    // Could also trigger email/notification to administrators
    await this.flagSuspiciousUser(userId, videoLessonId, 'concurrent_viewing', alertData);
  }

  /**
   * Validate viewing event data
   */
  validateViewingEvent(event: ViewingEvent): SecurityCheck {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // 1. Validate timestamp consistency
    const clientTime = new Date(event.client_timestamp).getTime();
    const serverTime = Date.now();
    const timeDiff = Math.abs(serverTime - clientTime);

    if (timeDiff > 300000) { // 5 minutes
      violations.push('Client timestamp significantly differs from server time');
      riskScore += 20;
      recommendations.push('Check client system clock');
    }

    // 2. Validate video timestamp
    if (event.timestamp_in_video < 0) {
      violations.push('Negative video timestamp');
      riskScore += 30;
      recommendations.push('Reject event with invalid timestamp');
    }

    // 3. Validate playback rate
    if (event.playback_rate && (event.playback_rate <= 0 || event.playback_rate > 16)) {
      violations.push('Invalid playback rate');
      riskScore += 15;
      recommendations.push('Normalize playback rate to valid range');
    }

    // 4. Validate volume level
    if (event.volume_level !== undefined && (event.volume_level < 0 || event.volume_level > 1)) {
      violations.push('Invalid volume level');
      riskScore += 5;
      recommendations.push('Normalize volume to 0-1 range');
    }

    // 5. Check for suspicious event patterns
    if (event.event_type === 'seek' && event.additional_data) {
      const seekDistance = event.additional_data.seek_distance;
      if (seekDistance && Math.abs(seekDistance) > 300) { // 5 minutes
        violations.push('Large seek distance detected');
        riskScore += 10;
        recommendations.push('Flag for manual review');
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Analyze event sequence for fraud patterns
   */
  analyzeEventSequence(events: ViewingEvent[]): SecurityCheck {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    if (events.length === 0) {
      return { isValid: true, violations, riskScore, recommendations };
    }

    // Sort events by client timestamp
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
    );

    // 1. Check for impossible time sequences
    for (let i = 1; i < sortedEvents.length; i++) {
      const prev = sortedEvents[i - 1];
      const curr = sortedEvents[i];
      
      const timeDiff = new Date(curr.client_timestamp).getTime() - new Date(prev.client_timestamp).getTime();
      const videoDiff = curr.timestamp_in_video - prev.timestamp_in_video;

      // Check for impossible playback speed
      if (timeDiff > 0 && videoDiff > 0) {
        const impliedSpeed = videoDiff / (timeDiff / 1000);
        if (impliedSpeed > 20) { // More than 20x speed
          violations.push('Impossible playback speed detected');
          riskScore += 25;
          recommendations.push('Review event sequence for manipulation');
        }
      }
    }

    // 2. Check for excessive seeking
    const seekEvents = events.filter(e => e.event_type === 'seek');
    const totalEvents = events.length;
    
    if (totalEvents > 0 && (seekEvents.length / totalEvents) > 0.5) {
      violations.push('Excessive seeking behavior');
      riskScore += 20;
      recommendations.push('Flag user for potential content skipping');
    }

    // 3. Check for rapid-fire events
    const rapidEvents = this.findRapidEvents(sortedEvents, 1000); // Events within 1 second
    if (rapidEvents.length > 5) {
      violations.push('Rapid-fire events detected');
      riskScore += 15;
      recommendations.push('Possible automated interaction');
    }

    // 4. Check for missing heartbeats
    const playEvents = events.filter(e => e.event_type === 'play');
    const heartbeatEvents = events.filter(e => e.event_type === 'heartbeat');
    
    if (playEvents.length > 0 && heartbeatEvents.length === 0) {
      violations.push('No heartbeat events during playback');
      riskScore += 30;
      recommendations.push('Possible client-side manipulation');
    }

    // 5. Check for tab visibility inconsistencies
    const visibilityEvents = events.filter(e => e.is_tab_visible !== undefined);
    const alwaysVisible = visibilityEvents.every(e => e.is_tab_visible === true);
    
    if (visibilityEvents.length > 10 && alwaysVisible) {
      violations.push('Suspiciously consistent tab visibility');
      riskScore += 10;
      recommendations.push('Possible visibility API manipulation');
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Analyze seek patterns for suspicious behavior
   */
  analyzeSeekPatterns(events: ViewingEvent[]): SecurityCheck {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    const seekEvents = events.filter(e => e.event_type === 'seek');
    
    if (seekEvents.length === 0) {
      return { isValid: true, violations, riskScore, recommendations };
    }

    // 1. Analyze seek frequency
    const totalEvents = events.length;
    const seekRatio = seekEvents.length / totalEvents;
    
    if (seekRatio > 0.4) { // More than 40% of events are seeks
      violations.push('Excessive seeking behavior detected');
      riskScore += 25;
      recommendations.push('Flag for content skipping review');
    }

    // 2. Analyze seek distances
    const largeSeekers = seekEvents.filter(e => {
      const seekDistance = e.additional_data?.seek_distance || 0;
      return Math.abs(seekDistance) > 60; // More than 1 minute
    });

    if (largeSeekers.length > 3) {
      violations.push('Multiple large seek jumps detected');
      riskScore += 20;
      recommendations.push('Review for content skipping');
    }

    // 3. Analyze seek patterns (forward vs backward)
    const forwardSeeks = seekEvents.filter(e => {
      const seekDistance = e.additional_data?.seek_distance || 0;
      return seekDistance > 10; // Forward seek > 10 seconds
    });

    const backwardSeeks = seekEvents.filter(e => {
      const seekDistance = e.additional_data?.seek_distance || 0;
      return seekDistance < -5; // Backward seek > 5 seconds
    });

    const forwardRatio = forwardSeeks.length / seekEvents.length;
    
    if (forwardRatio > 0.8) { // More than 80% forward seeks
      violations.push('Predominantly forward seeking pattern');
      riskScore += 15;
      recommendations.push('Possible content skipping behavior');
    }

    // 4. Analyze seek timing patterns
    const rapidSeeks = this.findRapidSeeks(seekEvents, 5000); // Within 5 seconds
    
    if (rapidSeeks.length > 5) {
      violations.push('Rapid sequential seeking detected');
      riskScore += 20;
      recommendations.push('Possible automated seeking behavior');
    }

    // 5. Calculate suspicion score based on seek patterns
    const suspicionScore = this.calculateSeekSuspicionScore(seekEvents);
    
    if (suspicionScore > 70) {
      violations.push('High suspicion score for seek patterns');
      riskScore += 30;
      recommendations.push('Manual review required');
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Find rapid seek events
   */
  private findRapidSeeks(seekEvents: ViewingEvent[], windowMs: number): ViewingEvent[] {
    const rapidSeeks: ViewingEvent[] = [];
    
    for (let i = 1; i < seekEvents.length; i++) {
      const timeDiff = new Date(seekEvents[i].client_timestamp).getTime() - 
                      new Date(seekEvents[i - 1].client_timestamp).getTime();
      
      if (timeDiff < windowMs) {
        rapidSeeks.push(seekEvents[i]);
      }
    }
    
    return rapidSeeks;
  }

  /**
   * Find events that occur in rapid succession
   */
  private findRapidEvents(events: ViewingEvent[], windowMs: number): ViewingEvent[] {
    const rapidEvents: ViewingEvent[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const timeDiff = new Date(events[i].client_timestamp).getTime() - 
                      new Date(events[i - 1].client_timestamp).getTime();
      
      if (timeDiff < windowMs) {
        rapidEvents.push(events[i]);
      }
    }
    
    return rapidEvents;
  }

  /**
   * Validate timestamp consistency and detect manipulation
   */
  validateTimestamps(events: ViewingEvent[]): SecurityCheck {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    if (events.length === 0) {
      return { isValid: true, violations, riskScore, recommendations };
    }

    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
    );

    // 1. Check for timestamp inconsistencies
    for (let i = 1; i < sortedEvents.length; i++) {
      const prev = sortedEvents[i - 1];
      const curr = sortedEvents[i];
      
      const clientTimeDiff = new Date(curr.client_timestamp).getTime() - 
                            new Date(prev.client_timestamp).getTime();
      const videoTimeDiff = curr.timestamp_in_video - prev.timestamp_in_video;

      // Check for impossible time progression
      if (clientTimeDiff > 0 && videoTimeDiff < 0 && Math.abs(videoTimeDiff) > 5) {
        violations.push('Backward video time progression detected');
        riskScore += 15;
        recommendations.push('Check for timestamp manipulation');
      }

      // Check for time jumps that are too large
      if (clientTimeDiff > 0 && videoTimeDiff > 0) {
        const impliedSpeed = videoTimeDiff / (clientTimeDiff / 1000);
        if (impliedSpeed > 10) {
          violations.push('Impossible playback speed detected');
          riskScore += 25;
          recommendations.push('Possible timestamp manipulation');
        }
      }
    }

    // 2. Check for client-server time drift
    const serverTime = Date.now();
    const suspiciousTimestamps = events.filter(event => {
      const clientTime = new Date(event.client_timestamp).getTime();
      const timeDrift = Math.abs(serverTime - clientTime);
      return timeDrift > 600000; // More than 10 minutes drift
    });

    if (suspiciousTimestamps.length > 0) {
      violations.push('Significant client-server time drift detected');
      riskScore += 10;
      recommendations.push('Verify client system clock');
    }

    // 3. Check for duplicate timestamps
    const timestampCounts = new Map<string, number>();
    events.forEach(event => {
      const timestamp = event.client_timestamp;
      timestampCounts.set(timestamp, (timestampCounts.get(timestamp) || 0) + 1);
    });

    const duplicateTimestamps = Array.from(timestampCounts.values()).filter(count => count > 1);
    if (duplicateTimestamps.length > 2) {
      violations.push('Multiple duplicate timestamps detected');
      riskScore += 20;
      recommendations.push('Possible batch event manipulation');
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Calculate user reliability score based on historical behavior
   */
  async calculateUserReliabilityScore(userId: string): Promise<number> {
    // Get user's viewing history
    const { data: progressRecords, error } = await this.supabase
      .from('video_progress')
      .select('suspicious_activity_count, completion_percentage')
      .eq('user_id', userId);

    if (error || !progressRecords || progressRecords.length === 0) {
      return 50; // Neutral score for new users
    }

    let reliabilityScore = 100;
    const totalRecords = progressRecords.length;
    
    // Calculate average suspicious activity
    const avgSuspiciousActivity = progressRecords.reduce((sum, record) => 
      sum + record.suspicious_activity_count, 0) / totalRecords;
    
    // Reduce score based on suspicious activity
    reliabilityScore -= Math.min(40, avgSuspiciousActivity * 5);
    
    // Calculate completion rate
    const completedVideos = progressRecords.filter(record => record.completion_percentage >= 80).length;
    const completionRate = completedVideos / totalRecords;
    
    // Boost score for good completion rate
    if (completionRate > 0.8) {
      reliabilityScore += 10;
    } else if (completionRate < 0.3) {
      reliabilityScore -= 20;
    }

    // Additional reliability factors
    reliabilityScore += this.calculateBehaviorConsistency(progressRecords);
    reliabilityScore += this.calculateEngagementQuality(progressRecords);

    return Math.max(0, Math.min(100, Math.round(reliabilityScore)));
  }

  /**
   * Calculate behavior consistency score
   */
  private calculateBehaviorConsistency(progressRecords: any[]): number {
    if (progressRecords.length < 3) return 0;

    // Calculate variance in completion percentages
    const completions = progressRecords.map(r => r.completion_percentage);
    const mean = completions.reduce((sum, val) => sum + val, 0) / completions.length;
    const variance = completions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / completions.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = more consistent behavior = higher score
    const consistencyScore = Math.max(0, 10 - (stdDev / 10));
    return Math.min(10, consistencyScore);
  }

  /**
   * Calculate engagement quality score
   */
  private calculateEngagementQuality(progressRecords: any[]): number {
    // Users who complete videos fully get bonus points
    const highCompletionCount = progressRecords.filter(r => r.completion_percentage >= 95).length;
    const highCompletionRate = highCompletionCount / progressRecords.length;
    
    return Math.min(10, highCompletionRate * 10);
  }

  /**
   * Flag suspicious user behavior
   */
  async flagSuspiciousUser(
    userId: string, 
    videoLessonId: string, 
    reason: string, 
    evidence: any
  ): Promise<void> {
    const flagData = {
      userId,
      videoLessonId,
      reason,
      evidence,
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverityLevel(evidence)
    };

    // Create security alert
    const { VideoSecurityAlertService } = await import('./videoSecurityAlertService');
    const alertService = new VideoSecurityAlertService();
    
    const alert = await alertService.createAlert({
      user_id: userId,
      video_lesson_id: videoLessonId,
      alert_type: this.mapReasonToAlertType(reason),
      severity: flagData.severity,
      description: `Suspicious behavior detected: ${reason}`,
      evidence: evidence
    });

    // Send notifications for high-severity alerts
    await alertService.sendAlertNotifications(alert);

    // Store in user's reliability history for future reference
    await this.updateUserSecurityHistory(userId, flagData);

    console.warn('Suspicious user behavior flagged:', flagData);
  }

  /**
   * Map reason to alert type
   */
  private mapReasonToAlertType(reason: string): 'concurrent_viewing' | 'suspicious_seeking' | 'impossible_speed' | 'automation_detected' | 'high_risk_user' {
    if (reason.includes('concurrent')) return 'concurrent_viewing';
    if (reason.includes('seek')) return 'suspicious_seeking';
    if (reason.includes('speed')) return 'impossible_speed';
    if (reason.includes('automation')) return 'automation_detected';
    return 'high_risk_user';
  }

  /**
   * Calculate severity level based on evidence
   */
  private calculateSeverityLevel(evidence: any): 'low' | 'medium' | 'high' {
    if (evidence.fraudCheck?.riskScore > 80) return 'high';
    if (evidence.fraudCheck?.riskScore > 50) return 'medium';
    return 'low';
  }

  /**
   * Update user's security history
   */
  private async updateUserSecurityHistory(userId: string, flagData: any): Promise<void> {
    // This would typically update a user_security_history table
    // For now, we'll just log it
    console.log(`Updated security history for user ${userId}:`, flagData);
  }

  /**
   * Send high severity alert to administrators
   */
  private async sendHighSeverityAlert(flagData: any): Promise<void> {
    // This would typically send email/notification to administrators
    console.error('HIGH SEVERITY SECURITY ALERT:', flagData);
  }

  /**
   * Get user's fraud risk profile
   */
  async getUserFraudRiskProfile(userId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    reliabilityScore: number;
    flagCount: number;
    recommendations: string[];
  }> {
    const reliabilityScore = await this.calculateUserReliabilityScore(userId);
    
    // In a real implementation, this would query security history
    const flagCount = 0; // Placeholder
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const recommendations: string[] = [];

    if (reliabilityScore < 30) {
      riskLevel = 'high';
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Require manual review of submissions');
    } else if (reliabilityScore < 60) {
      riskLevel = 'medium';
      recommendations.push('Monitor for suspicious patterns');
    }

    if (flagCount > 3) {
      riskLevel = 'high';
      recommendations.push('Consider temporary restrictions');
    }

    return {
      riskLevel,
      reliabilityScore,
      flagCount,
      recommendations
    };
  }

  /**
   * Validate session integrity
   */
  async validateSessionIntegrity(sessionToken: string): Promise<SecurityCheck> {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // Get session data
    const { data: session, error } = await this.supabase
      .from('video_viewing_sessions')
      .select(`
        *,
        video_viewing_events (*)
      `)
      .eq('session_token', sessionToken)
      .single();

    if (error || !session) {
      violations.push('Session not found');
      riskScore = 100;
      recommendations.push('Reject all events for this session');
      return { isValid: false, violations, riskScore, recommendations };
    }

    // Check session age
    const sessionAge = Date.now() - new Date(session.started_at).getTime();
    const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours
    
    if (sessionAge > maxSessionAge) {
      violations.push('Session too old');
      riskScore += 30;
      recommendations.push('Force session renewal');
    }

    // Check heartbeat freshness
    const lastHeartbeat = new Date(session.last_heartbeat).getTime();
    const heartbeatAge = Date.now() - lastHeartbeat;
    const maxHeartbeatAge = 5 * 60 * 1000; // 5 minutes
    
    if (heartbeatAge > maxHeartbeatAge && session.is_active) {
      violations.push('Stale heartbeat');
      riskScore += 20;
      recommendations.push('Mark session as inactive');
    }

    // Analyze events if available
    if (session.video_viewing_events && session.video_viewing_events.length > 0) {
      const eventAnalysis = this.analyzeEventSequence(session.video_viewing_events as ViewingEvent[]);
      violations.push(...eventAnalysis.violations);
      riskScore += eventAnalysis.riskScore * 0.5; // Weight event analysis at 50%
      recommendations.push(...eventAnalysis.recommendations);
    }

    return {
      isValid: violations.length === 0,
      violations,
      riskScore: Math.min(100, riskScore),
      recommendations
    };
  }

  /**
   * Clean up inactive sessions
   */
  async cleanupInactiveSessions(): Promise<number> {
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    const { data, error } = await this.supabase
      .from('video_viewing_sessions')
      .update({ is_active: false })
      .lt('last_heartbeat', cutoffTime.toISOString())
      .eq('is_active', true)
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup inactive sessions: ${error.message}`);
    }

    const cleanedCount = data?.length || 0;
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} inactive sessions`);
    }

    return cleanedCount;
  }

  /**
   * Scheduled cleanup of inactive sessions and old data
   */
  async performScheduledMaintenance(): Promise<{
    inactiveSessionsCleaned: number;
    oldAlertsResolved: number;
    maintenanceLog: string[];
  }> {
    const maintenanceLog: string[] = [];
    
    // 1. Clean up inactive sessions
    const inactiveSessionsCleaned = await this.cleanupInactiveSessions();
    maintenanceLog.push(`Cleaned ${inactiveSessionsCleaned} inactive sessions`);

    // 2. Auto-resolve old low-severity alerts
    const { VideoSecurityAlertService } = await import('./videoSecurityAlertService');
    const alertService = new VideoSecurityAlertService();
    const oldAlertsResolved = await alertService.autoResolveOldAlerts(30);
    maintenanceLog.push(`Auto-resolved ${oldAlertsResolved} old alerts`);

    // 3. Update user reliability scores for active users
    await this.updateActiveUserReliabilityScores();
    maintenanceLog.push('Updated reliability scores for active users');

    // 4. Generate maintenance report
    const timestamp = new Date().toISOString();
    maintenanceLog.push(`Maintenance completed at ${timestamp}`);

    console.log('Scheduled maintenance completed:', maintenanceLog);

    return {
      inactiveSessionsCleaned,
      oldAlertsResolved,
      maintenanceLog
    };
  }

  /**
   * Update reliability scores for recently active users
   */
  private async updateActiveUserReliabilityScores(): Promise<void> {
    // Get users who have been active in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: activeSessions, error } = await this.supabase
      .from('video_viewing_sessions')
      .select('user_id')
      .gte('started_at', sevenDaysAgo.toISOString())
      .limit(100); // Limit to avoid overwhelming the system

    if (error || !activeSessions) {
      console.warn('Failed to get active users for reliability update:', error);
      return;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeSessions.map(session => session.user_id))];
    
    // Update reliability scores (in batches to avoid overwhelming the system)
    for (const userId of uniqueUserIds.slice(0, 50)) {
      try {
        await this.calculateUserReliabilityScore(userId);
      } catch (error) {
        console.warn(`Failed to update reliability score for user ${userId}:`, error);
      }
    }

    console.log(`Updated reliability scores for ${Math.min(uniqueUserIds.length, 50)} users`);
  }

  /**
   * Calculate suspicion score for seek patterns
   */
  private calculateSeekSuspicionScore(seekEvents: ViewingEvent[]): number {
    if (seekEvents.length === 0) return 0;

    let score = 0;

    // Factor 1: Seek frequency (0-30 points)
    const seekFrequency = seekEvents.length;
    score += Math.min(30, seekFrequency * 2);

    // Factor 2: Average seek distance (0-25 points)
    const avgSeekDistance = seekEvents.reduce((sum, event) => {
      const distance = Math.abs(event.additional_data?.seek_distance || 0);
      return sum + distance;
    }, 0) / seekEvents.length;
    
    score += Math.min(25, avgSeekDistance / 10);

    // Factor 3: Forward seek bias (0-20 points)
    const forwardSeeks = seekEvents.filter(e => 
      (e.additional_data?.seek_distance || 0) > 5
    ).length;
    const forwardBias = forwardSeeks / seekEvents.length;
    score += forwardBias * 20;

    // Factor 4: Rapid seeking (0-25 points)
    const rapidSeeks = this.findRapidSeeks(seekEvents, 3000);
    score += Math.min(25, rapidSeeks.length * 5);

    return Math.min(100, Math.round(score));
  }

  /**
   * Monitor real-time fraud patterns
   */
  async monitorRealTimeFraudPatterns(
    userId: string,
    videoLessonId: string,
    recentEvents: ViewingEvent[]
  ): Promise<{
    shouldAlert: boolean;
    alertLevel: 'info' | 'warning' | 'critical';
    patterns: string[];
    recommendations: string[];
  }> {
    const patterns: string[] = [];
    const recommendations: string[] = [];
    let alertLevel: 'info' | 'warning' | 'critical' = 'info';

    // 1. Check for rapid consecutive seeks
    const rapidSeeks = this.detectRapidConsecutiveSeeks(recentEvents);
    if (rapidSeeks.count > 5) {
      patterns.push(`${rapidSeeks.count} rapid seeks in ${rapidSeeks.timeWindow}ms`);
      recommendations.push('Monitor for content skipping behavior');
      alertLevel = 'warning';
    }

    // 2. Check for impossible viewing speeds
    const speedAnalysis = this.analyzeViewingSpeed(recentEvents);
    if (speedAnalysis.maxSpeed > 10) {
      patterns.push(`Impossible viewing speed: ${speedAnalysis.maxSpeed.toFixed(1)}x`);
      recommendations.push('Investigate possible timestamp manipulation');
      alertLevel = 'critical';
    }

    // 3. Check for automation patterns
    const automationScore = this.detectAutomationPatterns(recentEvents);
    if (automationScore > 70) {
      patterns.push(`High automation probability: ${automationScore}%`);
      recommendations.push('Flag for manual review');
      alertLevel = 'critical';
    }

    // 4. Check user's historical risk
    const riskProfile = await this.getUserFraudRiskProfile(userId);
    if (riskProfile.riskLevel === 'high') {
      patterns.push('User has high historical fraud risk');
      recommendations.push('Apply enhanced monitoring');
      if (alertLevel === 'info') alertLevel = 'warning';
    }

    return {
      shouldAlert: patterns.length > 0,
      alertLevel,
      patterns,
      recommendations
    };
  }

  /**
   * Detect rapid consecutive seeks
   */
  private detectRapidConsecutiveSeeks(events: ViewingEvent[]): { count: number; timeWindow: number } {
    const seekEvents = events.filter(e => e.event_type === 'seek');
    if (seekEvents.length < 2) return { count: 0, timeWindow: 0 };

    let maxRapidSeeks = 0;
    let currentRapidSeeks = 1;
    let windowStart = 0;

    for (let i = 1; i < seekEvents.length; i++) {
      const timeDiff = new Date(seekEvents[i].client_timestamp).getTime() - 
                      new Date(seekEvents[i - 1].client_timestamp).getTime();
      
      if (timeDiff < 2000) { // Within 2 seconds
        currentRapidSeeks++;
      } else {
        maxRapidSeeks = Math.max(maxRapidSeeks, currentRapidSeeks);
        currentRapidSeeks = 1;
        windowStart = i;
      }
    }

    const timeWindow = seekEvents.length > 1 ? 
      new Date(seekEvents[seekEvents.length - 1].client_timestamp).getTime() - 
      new Date(seekEvents[windowStart].client_timestamp).getTime() : 0;

    return { count: Math.max(maxRapidSeeks, currentRapidSeeks), timeWindow };
  }

  /**
   * Analyze viewing speed patterns
   */
  private analyzeViewingSpeed(events: ViewingEvent[]): { maxSpeed: number; avgSpeed: number } {
    if (events.length < 2) return { maxSpeed: 1, avgSpeed: 1 };

    const speeds: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const timeDiff = new Date(events[i].client_timestamp).getTime() - 
                      new Date(events[i - 1].client_timestamp).getTime();
      const videoDiff = events[i].timestamp_in_video - events[i - 1].timestamp_in_video;
      
      if (timeDiff > 0 && videoDiff > 0) {
        const speed = videoDiff / (timeDiff / 1000);
        if (speed > 0 && speed < 50) { // Filter out extreme outliers
          speeds.push(speed);
        }
      }
    }

    if (speeds.length === 0) return { maxSpeed: 1, avgSpeed: 1 };

    return {
      maxSpeed: Math.max(...speeds),
      avgSpeed: speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length
    };
  }

  /**
   * Detect automation patterns
   */
  private detectAutomationPatterns(events: ViewingEvent[]): number {
    let automationScore = 0;

    // 1. Check for perfectly regular intervals
    const intervals = this.calculateEventIntervals(events);
    const intervalVariance = this.calculateVariance(intervals);
    if (intervalVariance < 100) { // Very regular intervals
      automationScore += 30;
    }

    // 2. Check for lack of natural pauses
    const pauseEvents = events.filter(e => e.event_type === 'pause');
    if (events.length > 20 && pauseEvents.length === 0) {
      automationScore += 25;
    }

    // 3. Check for consistent playback rates
    const playbackRates = events
      .filter(e => e.playback_rate !== undefined)
      .map(e => e.playback_rate!);
    
    if (playbackRates.length > 5 && new Set(playbackRates).size === 1) {
      automationScore += 20;
    }

    // 4. Check for missing human-like variations
    const tabVisibilityChanges = events.filter(e => 
      e.is_tab_visible !== undefined
    ).length;
    
    if (events.length > 10 && tabVisibilityChanges === 0) {
      automationScore += 25;
    }

    return Math.min(100, automationScore);
  }

  /**
   * Calculate intervals between events
   */
  private calculateEventIntervals(events: ViewingEvent[]): number[] {
    const intervals: number[] = [];
    
    for (let i = 1; i < events.length; i++) {
      const interval = new Date(events[i].client_timestamp).getTime() - 
                      new Date(events[i - 1].client_timestamp).getTime();
      intervals.push(interval);
    }
    
    return intervals;
  }

  /**
   * Calculate variance of a number array
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  /**
   * Comprehensive fraud detection analysis
   */
  async performComprehensiveFraudCheck(
    userId: string, 
    videoLessonId: string, 
    events: ViewingEvent[]
  ): Promise<SecurityCheck> {
    const violations: string[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // 1. Check concurrent sessions
    const concurrentCheck = await this.checkConcurrentSessions(userId, videoLessonId);
    if (concurrentCheck.hasConcurrentSessions) {
      violations.push('Concurrent viewing sessions detected');
      riskScore += 30;
      recommendations.push('Terminate duplicate sessions');
    }

    // 2. Analyze event sequence
    const sequenceCheck = this.analyzeEventSequence(events);
    violations.push(...sequenceCheck.violations);
    riskScore += sequenceCheck.riskScore * 0.7; // Weight at 70%
    recommendations.push(...sequenceCheck.recommendations);

    // 3. Analyze seek patterns
    const seekCheck = this.analyzeSeekPatterns(events);
    violations.push(...seekCheck.violations);
    riskScore += seekCheck.riskScore * 0.5; // Weight at 50%
    recommendations.push(...seekCheck.recommendations);

    // 4. Validate timestamps
    const timestampCheck = this.validateTimestamps(events);
    violations.push(...timestampCheck.violations);
    riskScore += timestampCheck.riskScore * 0.6; // Weight at 60%
    recommendations.push(...timestampCheck.recommendations);

    // 5. Check user reliability history
    const reliabilityScore = await this.calculateUserReliabilityScore(userId);
    if (reliabilityScore < 30) {
      violations.push('User has low reliability score');
      riskScore += 20;
      recommendations.push('Increase monitoring for this user');
    }

    // 6. Monitor real-time patterns
    const realtimeCheck = await this.monitorRealTimeFraudPatterns(userId, videoLessonId, events);
    if (realtimeCheck.shouldAlert) {
      violations.push(...realtimeCheck.patterns);
      recommendations.push(...realtimeCheck.recommendations);
      
      // Adjust risk score based on alert level
      switch (realtimeCheck.alertLevel) {
        case 'critical':
          riskScore += 25;
          break;
        case 'warning':
          riskScore += 15;
          break;
        case 'info':
          riskScore += 5;
          break;
      }
    }

    return {
      isValid: violations.length === 0,
      violations: [...new Set(violations)], // Remove duplicates
      riskScore: Math.min(100, Math.round(riskScore)),
      recommendations: [...new Set(recommendations)] // Remove duplicates
    };
  }
}