// Database types for Supabase integration

export interface Database {
  public: {
    Tables: {
      course_acknowledgments: {
        Row: {
          id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          course_id: string;
          acknowledged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name: string;
          user_email: string;
          course_id: string;
          acknowledged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string;
          user_email?: string;
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
          order: number; // Your actual DB schema uses 'order'
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          title: string;
          description?: string | null;
          order?: number; // Your actual DB schema uses 'order'
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          description?: string | null;
          order_number?: number;
          created_at?: string;
          updated_at?: string;
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
          due_date: string | null;
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
          due_date?: string | null;
          estimated_duration_minutes?: number | null;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          created_at?: string;
          updated_at?: string;
          required_files?: any;
        };
        Update: {
          id?: number;
          unit_id?: number | string; // Support both INTEGER and UUID unit IDs
          title?: string;
          description?: string | null;
          due_date?: string | null;
          estimated_duration_minutes?: number | null;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          created_at?: string;
          updated_at?: string;
          required_files?: any;
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
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      user_profile: {
        Row: {
          id: string;
          user_id: string;
          user_name: string | null;
          email: string | null;
          role: string;
          organization_id: string | null;
          group_id: string | null;
          granted_at: string;
          granted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          user_name?: string | null;
          email?: string | null;
          role?: string;
          organization_id?: string | null;
          group_id?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_name?: string | null;
          email?: string | null;
          role?: string;
          organization_id?: string | null;
          group_id?: string | null;
          granted_at?: string;
          granted_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profile_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profile_granted_by_fkey";
            columns: ["granted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profile_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_profile_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "groups";
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
      submission_comments: {
        Row: {
          id: number;
          submission_id: number;
          user_id: string;
          comment: string;
          is_internal: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          submission_id: number;
          user_id?: string;
          comment: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          submission_id?: number;
          user_id?: string;
          comment?: string;
          is_internal?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_comments_submission_id_fkey";
            columns: ["submission_id"];
            referencedRelation: "assignment_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submission_comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_invitations: {
        Row: {
          id: string;
          email: string;
          user_name: string;
          role: string;
          organization_id: string | null;
          invitation_token: string;
          invited_by: string | null;
          invited_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          user_name: string;
          role?: string;
          organization_id?: string | null;
          invitation_token: string;
          invited_by?: string | null;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          user_name?: string;
          role?: string;
          organization_id?: string | null;
          invitation_token?: string;
          invited_by?: string | null;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_invitations_organization_id_fkey";
            columns: ["organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey";
            columns: ["invited_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_invitations_accepted_by_fkey";
            columns: ["accepted_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      video_views: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_views_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_views_lesson_id_fkey";
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
      get_user_roles_with_org: {
        Args: {};
        Returns: {
          role: string;
          user_name: string;
          user_email: string;
          organization_name: string;
          organization_id: string;
        }[];
      };
      search_user_profiles: {
        Args: {
          search_term: string;
        };
        Returns: {
          user_id: string;
          user_name: string;
          user_email: string;
          role: string;
          organization_id: string;
          organization_name: string;
        }[];
      };
      get_user_profile_by_email: {
        Args: {
          email_address: string;
        };
        Returns: {
          user_id: string;
          user_name: string;
          user_email: string;
          role: string;
          organization_id: string;
          organization_name: string;
          granted_at: string;
        }[];
      };
      assign_user_role_with_org: {
        Args: {
          target_user_id: string;
          new_role: string;
          org_id?: string;
        };
        Returns: boolean;
      };
      create_organization: {
        Args: {
          org_name: string;
          org_description?: string;
          org_contact_email?: string;
          org_contact_phone?: string;
          org_address?: string;
        };
        Returns: string;
      };
      get_all_organizations: {
        Args: {};
        Returns: {
          id: string;
          name: string;
          description: string;
          contact_email: string;
          contact_phone: string;
          address: string;
          is_active: boolean;
          created_at: string;
          user_count: number;
        }[];
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
      create_user_invitation: {
        Args: {
          p_email: string;
          p_user_name: string;
          p_role?: string;
          p_organization_id?: string;
        };
        Returns: {
          invitation_id: string;
          invitation_token: string;
          expires_at: string;
        }[];
      };
      accept_user_invitation: {
        Args: {
          p_invitation_token: string;
        };
        Returns: {
          success: boolean;
          message: string;
          user_profile_id: string;
        }[];
      };
      get_pending_invitations: {
        Args: {};
        Returns: {
          id: string;
          email: string;
          user_name: string;
          role: string;
          organization_id: string;
          organization_name: string;
          invited_by: string;
          invited_by_name: string;
          invited_at: string;
          expires_at: string;
          status: string;
        }[];
      };
      cancel_user_invitation: {
        Args: {
          p_invitation_id: string;
        };
        Returns: boolean;
      };
      cleanup_expired_invitations: {
        Args: {};
        Returns: number;
      };
      get_invitation_by_token: {
        Args: {
          p_invitation_token: string;
        };
        Returns: {
          id: string;
          email: string;
          user_name: string;
          role: string;
          organization_id: string;
          organization_name: string;
          invited_by: string;
          invited_by_name: string;
          invited_at: string;
          expires_at: string;
          status: string;
        }[];
      };
      get_groups_by_organization: {
        Args: {
          org_id: string;
        };
        Returns: {
          id: string;
          name: string;
          organization_id: string;
          user_count: number;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_users_by_group: {
        Args: {
          group_id: string;
        };
        Returns: {
          id: string;
          user_id: string;
          user_name: string;
          email: string;
          role: string;
          created_at: string;
        }[];
      };
      create_group: {
        Args: {
          group_name: string;
          org_id: string;
        };
        Returns: string;
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

export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupInsert = Database['public']['Tables']['groups']['Insert'];
export type GroupUpdate = Database['public']['Tables']['groups']['Update'];

export type UserProfile = Database['public']['Tables']['user_profile']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profile']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profile']['Update'];



export type AuditLog = Database['public']['Tables']['rls_audit_log']['Row'];
export type AuditLogInsert = Database['public']['Tables']['rls_audit_log']['Insert'];
export type AuditLogUpdate = Database['public']['Tables']['rls_audit_log']['Update'];

export type UserInvitation = Database['public']['Tables']['user_invitations']['Row'];
export type UserInvitationInsert = Database['public']['Tables']['user_invitations']['Insert'];
export type UserInvitationUpdate = Database['public']['Tables']['user_invitations']['Update'];

export type VideoView = Database['public']['Tables']['video_views']['Row'];
export type VideoViewInsert = Database['public']['Tables']['video_views']['Insert'];
export type VideoViewUpdate = Database['public']['Tables']['video_views']['Update'];

// Role types for type safety
export type RoleType = 'student' | 'admin' | 'instructor' | 'moderator' | 'org_admin';

// Invitation status types for type safety
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

// Audit operation types for type safety
export type AuditOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

// Submission file type
export type SubmissionFile = Database['public']['Tables']['submission_files']['Row'];

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
  userRoleData?: {
    role: any;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
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