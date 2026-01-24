import { rlsSupabase } from './supabase';
import { AcknowledgmentData } from './database.types';

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

  async saveAcknowledgment(userId: string, courseId: string, userName?: string): Promise<void> {
    try {
      const finalUserName = userName || await this.getUserName(userId);
      
      const acknowledgmentData: Omit<AcknowledgmentData, 'id' | 'created_at'> = {
        user_id: userId,
        course_id: courseId,
        user_name: finalUserName
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

  private async getUserName(userId: string): Promise<string> {
    try {
      const { data: { user }, error } = await rlsSupabase.auth.getUser();
      
      if (error || !user) {
        console.error('Error getting user:', error);
        return 'משתמש לא ידוע';
      }

      return user.user_metadata?.display_name || 
             user.user_metadata?.full_name || 
             user.email || 
             'משתמש לא ידוע';
    } catch (error) {
      console.error('Error in getUserName:', error);
      return 'משתמש לא ידוע';
    }
  }
}

export const courseAcknowledgmentService = new CourseAcknowledgmentService();