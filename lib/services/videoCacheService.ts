import { VideoProgress } from './videoTrackingService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memory_usage_mb: number;
  hit_rate: number;
}

export class VideoCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0
  };

  // Default TTL values (in milliseconds)
  private readonly DEFAULT_TTL = {
    VIDEO_PROGRESS: 5 * 60 * 1000,      // 5 minutes
    VIDEO_LESSONS: 30 * 60 * 1000,      // 30 minutes
    USER_SESSIONS: 2 * 60 * 1000,       // 2 minutes
    ANALYTICS: 10 * 60 * 1000,          // 10 minutes
    SECURITY_ALERTS: 1 * 60 * 1000      // 1 minute
  };

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL.VIDEO_PROGRESS,
      key
    };

    this.cache.set(key, entry);
    this.cleanupExpired();
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.cleanupExpired();
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage();

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      memory_usage_mb: memoryUsage,
      hit_rate: Math.round(hitRate * 10000) / 100 // Percentage with 2 decimal places
    };
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimation of object size in bytes
      const jsonString = JSON.stringify(entry);
      totalSize += new Blob([jsonString]).size;
    }
    
    return Math.round((totalSize / (1024 * 1024)) * 100) / 100; // MB with 2 decimal places
  }

  /**
   * Cache video progress data
   */
  cacheVideoProgress(userId: string, videoLessonId: string, progress: VideoProgress): void {
    const key = `progress:${userId}:${videoLessonId}`;
    this.set(key, progress, this.DEFAULT_TTL.VIDEO_PROGRESS);
  }

  /**
   * Get cached video progress
   */
  getCachedVideoProgress(userId: string, videoLessonId: string): VideoProgress | null {
    const key = `progress:${userId}:${videoLessonId}`;
    return this.get<VideoProgress>(key);
  }

  /**
   * Cache user's all video progress
   */
  cacheUserProgress(userId: string, progressList: VideoProgress[]): void {
    const key = `user_progress:${userId}`;
    this.set(key, progressList, this.DEFAULT_TTL.VIDEO_PROGRESS);
  }

  /**
   * Get cached user progress
   */
  getCachedUserProgress(userId: string): VideoProgress[] | null {
    const key = `user_progress:${userId}`;
    return this.get<VideoProgress[]>(key);
  }

  /**
   * Cache video lesson data
   */
  cacheVideoLesson(videoLessonId: string, lessonData: any): void {
    const key = `lesson:${videoLessonId}`;
    this.set(key, lessonData, this.DEFAULT_TTL.VIDEO_LESSONS);
  }

  /**
   * Get cached video lesson
   */
  getCachedVideoLesson(videoLessonId: string): any | null {
    const key = `lesson:${videoLessonId}`;
    return this.get(key);
  }

  /**
   * Cache analytics data
   */
  cacheAnalytics(cacheKey: string, analyticsData: any): void {
    const key = `analytics:${cacheKey}`;
    this.set(key, analyticsData, this.DEFAULT_TTL.ANALYTICS);
  }

  /**
   * Get cached analytics
   */
  getCachedAnalytics(cacheKey: string): any | null {
    const key = `analytics:${cacheKey}`;
    return this.get(key);
  }

  /**
   * Cache active sessions for a user
   */
  cacheUserSessions(userId: string, sessions: any[]): void {
    const key = `sessions:${userId}`;
    this.set(key, sessions, this.DEFAULT_TTL.USER_SESSIONS);
  }

  /**
   * Get cached user sessions
   */
  getCachedUserSessions(userId: string): any[] | null {
    const key = `sessions:${userId}`;
    return this.get<any[]>(key);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Invalidate user-specific cache
   */
  invalidateUserCache(userId: string): number {
    return this.invalidateByPattern(`^(progress|user_progress|sessions):${userId}`);
  }

  /**
   * Invalidate video-specific cache
   */
  invalidateVideoCache(videoLessonId: string): number {
    return this.invalidateByPattern(`^(lesson|progress:.*):${videoLessonId}`);
  }

  /**
   * Invalidate analytics cache
   */
  invalidateAnalyticsCache(): number {
    return this.invalidateByPattern('^analytics:');
  }

  /**
   * Set up automatic cleanup interval
   */
  startCleanupInterval(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanupExpired();
    }, intervalMs);
  }

  /**
   * Get cache entries by prefix
   */
  getEntriesByPrefix(prefix: string): Array<{ key: string; data: any; age_ms: number }> {
    const entries: Array<{ key: string; data: any; age_ms: number }> = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix) && (now - entry.timestamp <= entry.ttl)) {
        entries.push({
          key,
          data: entry.data,
          age_ms: now - entry.timestamp
        });
      }
    }
    
    return entries;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(userId: string, videoLessonIds: string[]): Promise<void> {
    // This would typically pre-load frequently accessed data
    // For now, we'll just mark the intention
    console.log(`Warming up cache for user ${userId} with ${videoLessonIds.length} videos`);
    
    // In a real implementation, you might:
    // 1. Pre-load user progress for all videos
    // 2. Pre-load video lesson metadata
    // 3. Pre-load recent analytics data
  }

  /**
   * Export cache state for debugging
   */
  exportCacheState(): { [key: string]: any } {
    const state: { [key: string]: any } = {};
    
    for (const [key, entry] of this.cache.entries()) {
      state[key] = {
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        age_ms: Date.now() - entry.timestamp,
        expired: Date.now() - entry.timestamp > entry.ttl
      };
    }
    
    return state;
  }
}

// Global cache instance
export const videoCacheService = new VideoCacheService();