// Database types for Supabase integration

export interface Database {
  public: {
    Tables: {
      course_acknowledgments: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          course_id: string;
          acknowledged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          course_id: string;
          acknowledged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string;
          course_id?: string;
          acknowledged_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_acknowledgments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      units: {
        Row: {
          id: number | string; // Support both INTEGER and UUID IDs
          title: string;
          description: string | null;
          order: number;
        };
        Insert: {
          id?: number | string; // Support both INTEGER and UUID IDs
          title: string;
          description?: string | null;
          order: number;
        };
        Update: {
          id?: number | string; // Support both INTEGER and UUID IDs
          title?: string;
          description?: string | null;
          order?: number;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: number;
          title: string;
          order: number;
          duration: string | null;
          locked: boolean | null;
          embedUrl: string;
          notes: string | null;
          description: string | null;
          is_lab: boolean | null;
          unit_id: number;
        };
        Insert: {
          id?: number;
          title: string;
          order: number;
          duration?: string | null;
          locked?: boolean | null;
          embedUrl: string;
          notes?: string | null;
          description?: string | null;
          is_lab?: boolean | null;
          unit_id: number;
        };
        Update: {
          id?: number;
          title?: string;
          order?: number;
          duration?: string | null;
          locked?: boolean | null;
          embedUrl?: string;
          notes?: string | null;
          description?: string | null;
          is_lab?: boolean | null;
          unit_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      lesson_files: {
        Row: {
          id: number;
          lesson_id: number;
          file_name: string;
          file_url: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          lesson_id: number;
          file_name: string;
          file_url: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          lesson_id?: number;
          file_name?: string;
          file_url?: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_files_lesson_id_fkey";
            columns: ["lesson_id"];
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          }
        ];
      };
      assignments: {
        Row: {
          id: number;
          unit_id: number | string; // Support both INTEGER and UUID unit IDs
          title: string;
          description: string | null;
          estimated_duration_minutes: number | null;
          max_file_size_mb: number;
          allowed_file_types: string[];
          created_at: string;
          updated_at: string;
          required_files: any;
        };
        Insert: {
          id?: number;
          unit_id: number | string; // Support both INTEGER and UUID unit IDs
          title: string;
          description?: string | null;
          estimated_duration_minutes?: number | null;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          unit_id?: number | string; // Support both INTEGER and UUID unit IDs
          title?: string;
          description?: string | null;
          estimated_duration_minutes?: number | null;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "units";
            referencedColumns: ["id"];
          }
        ];
      };
      assignment_submissions: {
        Row: {
          id: number;
          assignment_id: number;
          user_id: string;
          submission_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          assignment_id: number;
          user_id: string;
          submission_date?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          assignment_id?: number;
          user_id?: string;
          submission_date?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignment_submissions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      submission_files: {
        Row: {
          id: number;
          submission_id: number;
          original_filename: string;
          stored_filename: string;
          file_size_bytes: number;
          file_type: string;
          storage_path: string;
          uploaded_at: string;
        };
        Insert: {
          id?: number;
          submission_id: number;
          original_filename: string;
          stored_filename: string;
          file_size_bytes: number;
          file_type: string;
          storage_path: string;
          uploaded_at?: string;
        };
        Update: {
          id?: number;
          submission_id?: number;
          original_filename?: string;
          stored_filename?: string;
          file_size_bytes?: number;
          file_type?: string;
          storage_path?: string;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_files_submission_id_fkey";
            columns: ["submission_id"];
            referencedRelation: "assignment_submissions";
            referencedColumns: ["id"];
          }
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          granted_at: string;
          granted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string;
          granted_at?: string;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          granted_at?: string;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      rls_audit_log: {
        Row: {
          id: string;
          table_name: string;
          operation: string;
          user_id: string | null;
          record_id: string | null;
          old_values: any | null;
          new_values: any | null;
          timestamp: string;
          user_agent: string | null;
          ip_address: string | null;
          session_id: string | null;
          additional_context: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          operation: string;
          user_id?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          timestamp?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          session_id?: string | null;
          additional_context?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          operation?: string;
          user_id?: string | null;
          record_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          timestamp?: string;
          user_agent?: string | null;
          ip_address?: string | null;
          session_id?: string | null;
          additional_context?: any | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rls_audit_log_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: {};
        Returns: boolean;
      };
      has_role: {
        Args: {
          role_name: string;
        };
        Returns: boolean;
      };
      get_user_roles: {
        Args: {};
        Returns: string[];
      };
      log_audit_event: {
        Args: {
          p_table_name: string;
          p_operation: string;
          p_record_id?: string;
          p_old_values?: any;
          p_new_values?: any;
          p_additional_context?: any;
        };
        Returns: string;
      };
      cleanup_audit_logs: {
        Args: {
          retention_days?: number;
        };
        Returns: number;
      };
      get_audit_trail: {
        Args: {
          p_table_name: string;
          p_record_id: string;
        };
        Returns: {
          id: string;
          operation: string;
          user_id: string;
          old_values: any;
          new_values: any;
          timestamp: string;
          additional_context: any;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Type aliases for easier usage
export type CourseAcknowledgment = Database['public']['Tables']['course_acknowledgments']['Row'];
export type CourseAcknowledgmentInsert = Database['public']['Tables']['course_acknowledgments']['Insert'];
export type CourseAcknowledgmentUpdate = Database['public']['Tables']['course_acknowledgments']['Update'];

export type UserRole = Database['public']['Tables']['user_roles']['Row'];
export type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert'];
export type UserRoleUpdate = Database['public']['Tables']['user_roles']['Update'];

export type AuditLog = Database['public']['Tables']['rls_audit_log']['Row'];
export type AuditLogInsert = Database['public']['Tables']['rls_audit_log']['Insert'];
export type AuditLogUpdate = Database['public']['Tables']['rls_audit_log']['Update'];

// Role types for type safety
export type RoleType = 'student' | 'admin' | 'instructor' | 'moderator';

// Audit operation types for type safety
export type AuditOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

// Additional types for the popup system
export interface PopupContent {
  title: string;
  guidelines: string[];
  termsOfUse: string[];
  termsCheckboxLabel: string;
  readCheckboxLabel: string;
  submitButtonText: string;
}

export interface AcknowledgmentData {
  termsAgreed: boolean;
  messageRead: boolean;
}

export interface WelcomePopupProps {
  userId: string;
  userName?: string;
  courseId: string;
  onAcknowledged: () => void;
}

export interface WelcomePopupState {
  isVisible: boolean;
  isLoading: boolean;
  hasAcknowledged: boolean;
}

export interface AcknowledgmentFormProps {
  onSubmit: (data: AcknowledgmentData) => void;
  isSubmitting: boolean;
}