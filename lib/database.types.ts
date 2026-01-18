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
          id: number;
          title: string;
          description: string | null;
          order: number;
        };
        Insert: {
          id?: number;
          title: string;
          description?: string | null;
          order: number;
        };
        Update: {
          id?: number;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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