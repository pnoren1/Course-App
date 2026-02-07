// Video View Types for Video Viewing Tracking Feature

export interface VideoView {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
}

export interface VideoViewCreate {
  lessonId: string;
}

export interface UserProgress {
  user_id: string;
  username: string;
  email: string;
  organization_id?: string;
  watched_lessons: {
    lesson_id: string;
    lesson_title: string;
    lesson_order: number;
    watched_at: string;
  }[];
}
