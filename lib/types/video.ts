// Video tracking system types

export interface VideoLessonData {
  id: string;
  lesson_id: string;
  title: string;
  spotlightr_video_id: string;
  duration_seconds: number;
  required_completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ViewingSessionData {
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
  created_at: string;
  updated_at: string;
}

export interface ViewingEventData {
  id: string;
  session_id: string;
  event_type: VideoEventType;
  timestamp_in_video: number;
  client_timestamp: string;
  server_timestamp: string;
  is_tab_visible?: boolean;
  playback_rate?: number;
  volume_level?: number;
  additional_data?: Record<string, any>;
  created_at: string;
}

export interface VideoProgressData {
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
  created_at: string;
  updated_at: string;
}

export type VideoEventType = 'play' | 'pause' | 'seek' | 'heartbeat' | 'end';

// API Request/Response types
export interface StartSessionRequest {
  video_lesson_id: string;
  browser_tab_id?: string;
}

export interface StartSessionResponse {
  session_token: string;
  video_data: VideoLessonData;
}

export interface TrackEventRequest {
  session_token: string;
  event_type: VideoEventType;
  timestamp_in_video: number;
  is_tab_visible?: boolean;
  playback_rate?: number;
  volume_level?: number;
  additional_data?: Record<string, any>;
}

export interface TrackBatchEventsRequest {
  session_token: string;
  events: Omit<TrackEventRequest, 'session_token'>[];
}

export interface ProgressResponse {
  completion_percentage: number;
  total_watched_seconds: number;
  is_completed: boolean;
  grade_contribution: number;
  suspicious_activity_count: number;
}

export interface AdminProgressResponse {
  progress: (VideoProgressData & {
    video_lessons: VideoLessonData;
    user_profile: {
      user_id: string;
      full_name: string;
      email: string;
      organization_id: string;
    };
  })[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Component Props types
export interface VideoPlayerProps {
  videoLessonId: string;
  spotlightrVideoId: string;
  onProgressUpdate?: (progress: number) => void;
  onSessionStart?: (sessionToken: string) => void;
  onSessionEnd?: () => void;
}

export interface VideoProgressProps {
  userId: string;
  videoLessonId: string;
  showDetails?: boolean;
  refreshInterval?: number;
}

export interface AdminVideoAnalyticsProps {
  videoLessonId?: string;
  userId?: string;
  organizationId?: string;
}

// Utility types
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

export interface SecurityCheck {
  isValid: boolean;
  violations: string[];
  riskScore: number;
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

export interface ViewingPatternAnalysis {
  totalEvents: number;
  playEvents: number;
  pauseEvents: number;
  seekEvents: number;
  heartbeatEvents: number;
  averagePlaybackRate: number;
  tabInvisiblePercentage: number;
}