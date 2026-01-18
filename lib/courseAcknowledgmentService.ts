import { supabase } from './supabase';
import { CourseAcknowledgment, CourseAcknowledgmentInsert } from './database.types';

export interface CourseAcknowledgmentService {
  checkAcknowledgment(userId: string, courseId: string): Promise<boolean>;
  saveAcknowledgment(userId: string, courseId: string, userName?: string): Promise<void>;
  getAcknowledgment(userId: string, courseId: string): Promise<CourseAcknowledgment | null>;
  getCourseAcknowledgments(courseId: string): Promise<CourseAcknowledgment[]>;
}

export class SupabaseCourseAcknowledgmentService implements CourseAcknowledgmentService {
  /**
   * Get user name with fallback logic from provided user data
   * @param user - The user object from Supabase auth
   * @returns string - The user's display name or email as fallback
   */
  private getUserNameFromUserData(user: any): string {
    // Priority 1: Try to get full_name from user_metadata
    const fullName = user?.user_metadata?.full_name;
    if (fullName && fullName.trim()) {
      return fullName.trim();
    }

    // Priority 2: Try to get display_name from user_metadata
    const displayName = user?.user_metadata?.display_name;
    if (displayName && displayName.trim()) {
      return displayName.trim();
    }

    // Priority 3: Use email as fallback
    if (user?.email) {
      return user.email;
    }

    // Final fallback if no data is available
    return 'Unknown User';
  }

  /**
   * Check if a user has already acknowledged a specific course
   * @param userId - The user's ID
   * @param courseId - The course ID
   * @returns Promise<boolean> - true if acknowledged, false otherwise
   */
  async checkAcknowledgment(userId: string, courseId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('course_acknowledgments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error) {
        // If no record found, return false (not acknowledged)
        if (error.code === 'PGRST116') {
          return false;
        }
        // For other errors, throw to be handled by caller
        throw error;
      }

      // If we got data, the user has acknowledged
      return data !== null;
    } catch (error) {
      console.error('Error checking acknowledgment:', error);
      // Default to showing popup on error (safety measure)
      return false;
    }
  }

  /**
   * Save a user's acknowledgment for a specific course
   * @param userId - The user's ID
   * @param courseId - The course ID
   * @param userName - Optional user name (if not provided, will use fallback)
   * @returns Promise<void>
   */
  async saveAcknowledgment(userId: string, courseId: string, userName?: string): Promise<void> {
    try {
      // Use provided userName or fallback to 'Unknown User'
      const finalUserName = userName || 'Unknown User';

      const acknowledgmentData: CourseAcknowledgmentInsert = {
        user_id: userId,
        user_name: finalUserName,
        course_id: courseId,
      };

      const { error } = await supabase
        .from('course_acknowledgments')
        .insert(acknowledgmentData);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving acknowledgment:', error);
      throw error;
    }
  }

  /**
   * Get acknowledgment details for a user and course
   * @param userId - The user's ID
   * @param courseId - The course ID
   * @returns Promise<CourseAcknowledgment | null>
   */
  async getAcknowledgment(userId: string, courseId: string): Promise<CourseAcknowledgment | null> {
    try {
      const { data, error } = await supabase
        .from('course_acknowledgments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting acknowledgment:', error);
      return null;
    }
  }
  /**
   * Get all acknowledgments for a specific course
   * This method benefits from the user_name field by avoiding joins with auth.users
   * @param courseId - The course ID
   * @returns Promise<CourseAcknowledgment[]> - Array of acknowledgments with user names
   */
  async getCourseAcknowledgments(courseId: string): Promise<CourseAcknowledgment[]> {
    try {
      const { data, error } = await supabase
        .from('course_acknowledgments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting course acknowledgments:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const courseAcknowledgmentService = new SupabaseCourseAcknowledgmentService();