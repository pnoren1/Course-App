import { rlsSupabase } from '../supabase';
import { CourseAcknowledgmentInsert } from '../types/database.types';

export class CourseAcknowledgmentService {
  async checkAcknowledgment(userId: string, courseId: string): Promise<boolean> {
    try {
      const { data, error } = await rlsSupabase
        .from('course_acknowledgments')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking acknowledgment:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error in checkAcknowledgment:', error);
      throw error;
    }
  }

  async saveAcknowledgment(userId: string, courseId: string, userName: string): Promise<void> {
    try {
      const acknowledgmentData: CourseAcknowledgmentInsert = {
        user_id: userId,
        course_id: courseId,
        user_name: userName
      };

      const { error } = await rlsSupabase
        .from('course_acknowledgments')
        .insert(acknowledgmentData);

      if (error) {
        console.error('Error saving acknowledgment:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveAcknowledgment:', error);
      throw error;
    }
  }
}

export const courseAcknowledgmentService = new CourseAcknowledgmentService();