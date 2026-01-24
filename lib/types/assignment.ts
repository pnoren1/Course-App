export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  unit_id: number | string;
  due_date?: string;
  max_file_size_mb: number;
  allowed_file_types: string[];
  created_at: string;
  updated_at: string;
  estimated_duration_minutes?: number | null;
  required_files: RequiredFile[];
}

export interface RequiredFile {
  id: string;
  name: string;
  order: number;
  example: string;
  // file_type": "image/png",
  description: string;
}

export interface AssignmentSubmission {
  id: number;
  assignment_id: number;
  user_id: string;
  submission_date: string;
  status: string;
  created_at: string;
}

export interface SubmissionFile {
  id: number;
  submission_id: number;
  original_filename: string;
  storage_path: string;
  file_size_bytes: number;
  file_type: string;
  uploaded_at: string;
}

export interface AssignmentDisplayProps {
  assignment: Assignment;
  userSubmission?: AssignmentSubmission;
  onSubmissionComplete?: (submission: AssignmentSubmission) => void;
}