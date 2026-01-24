// Import assignment types
import { Assignment, AssignmentSubmission } from '../../lib/types/assignment';

export type Lesson = {
  id: number;
  title: string;
  order: number;
  duration?: string | null;
  durationSeconds?: number | null;
  locked?: boolean | null;
  embedUrl: string;
  slug: string;
  description?: string | null;
  is_lab?: boolean | null; // Optional lab indicator
  resources?: LessonResource[];
};

export type LessonResource = {
  label: string;
  url: string;
};

export type LessonFile = {
  id: number;
  lesson_id: number;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
};

export type Unit = {
  id: number | string; // Support both INTEGER and UUID IDs
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
  assignment?: Assignment; // Optional assignment for the unit
  assignments?: Assignment[]; // Optional assignments array for the unit
};

// Extended types for course with assignment data
export type UnitWithSubmission = Unit & {
  assignment?: Assignment & {
    userSubmission?: AssignmentSubmission;
  };
};

export type CourseData = {
  schemaVersion: number;
  units: Unit[];
};

// Props for components that need assignment data
export interface CoursePageProps {
  units: UnitWithSubmission[];
  userId?: string;
}

export interface UnitSectionProps {
  unit: UnitWithSubmission;
  userId?: string;
  onAssignmentSubmit?: (submission: AssignmentSubmission) => void;
}