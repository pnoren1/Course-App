import { rlsSupabase } from '../supabase';
import { Assignment, AssignmentSubmission } from '../types/assignment';
import { Database } from '../types/database.types';

export class AssignmentService {
  async getAssignmentsByUnit(unitId: number | string): Promise<Assignment[]> {
    try {
      const { data, error } = await rlsSupabase
        .from('assignments')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching assignments:', error);
        throw error;
      }

      return (data as Database['public']['Tables']['assignments']['Row'][]) || [];
    } catch (error) {
      console.error('Error in getAssignmentsByUnit:', error);
      throw error;
    }
  }

  async getSubmissionsByUser(userId: string): Promise<AssignmentSubmission[]> {
    try {
      const { data, error } = await rlsSupabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('submission_date', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        throw error;
      }

      return (data as Database['public']['Tables']['assignment_submissions']['Row'][]) || [];
    } catch (error) {
      console.error('Error in getSubmissionsByUser:', error);
      throw error;
    }
  }

  async getUserSubmissionForAssignment(userId: string, assignmentId: number): Promise<AssignmentSubmission | null> {
    try {
      const { data, error } = await rlsSupabase
        .from('assignment_submissions')
        .select('*')
        .eq('user_id', userId)
        .eq('assignment_id', assignmentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user submission:', error);
        throw error;
      }

      return (data as Database['public']['Tables']['assignment_submissions']['Row']) || null;
    } catch (error) {
      console.error('Error in getUserSubmissionForAssignment:', error);
      throw error;
    }
  }

  async createSubmission(submission: Omit<AssignmentSubmission, 'id' | 'created_at'>): Promise<AssignmentSubmission> {
    try {
      const { data, error } = await rlsSupabase
        .from('assignment_submissions')
        .insert(submission)
        .select()
        .single();

      if (error) {
        console.error('Error creating submission:', error);
        throw error;
      }

      return data as Database['public']['Tables']['assignment_submissions']['Row'];
    } catch (error) {
      console.error('Error in createSubmission:', error);
      throw error;
    }
  }

  async updateSubmission(id: number, updates: Partial<AssignmentSubmission>): Promise<AssignmentSubmission> {
    try {
      const { data, error } = await rlsSupabase
        .from('assignment_submissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating submission:', error);
        throw error;
      }

      return data as Database['public']['Tables']['assignment_submissions']['Row'];
    } catch (error) {
      console.error('Error in updateSubmission:', error);
      throw error;
    }
  }
}

export const assignmentService = new AssignmentService();