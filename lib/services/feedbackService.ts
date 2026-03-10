import { getSupabaseAdmin } from '@/lib/supabase';

export interface Feedback {
  id: string;
  user_id: string;
  rating: number;
  message: string;
  created_at: string;
}

export interface FeedbackWithUser extends Feedback {
  user_name?: string;
  organization_name?: string;
  group_name?: string;
}

export const feedbackService = {
  /**
   * Create a new feedback entry
   */
  async createFeedback(userId: string, rating: number, message: string): Promise<Feedback | null> {
    const admin = getSupabaseAdmin();
    
    const { data, error } = await admin
      .from('feedback')
      .insert({
        user_id: userId,
        rating,
        message
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      return null;
    }

    return data;
  },

  /**
   * Get all feedback for a specific user
   */
  async getUserFeedback(userId: string): Promise<Feedback[]> {
    const admin = getSupabaseAdmin();
    
    const { data, error } = await admin
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all feedback with user details (admin only)
   */
  async getAllFeedback(): Promise<FeedbackWithUser[]> {
    const admin = getSupabaseAdmin();
    
    console.log('getAllFeedback: Starting query...');
    
    // First get all feedback
    const { data: feedbackData, error: feedbackError } = await admin
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError);
      return [];
    }

    if (!feedbackData || feedbackData.length === 0) {
      console.log('getAllFeedback: No feedback found');
      return [];
    }

    // Get user IDs
    const userIds = feedbackData.map(f => f.user_id);

    // Get user profiles with organization and group info
    const { data: profiles, error: profileError } = await admin
      .from('user_profile')
      .select(`
        user_id,
        user_name,
        organizations(name),
        groups(name)
      `)
      .in('user_id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    }

    // Create a map of user profiles
    const profileMap = new Map(
      (profiles || []).map((p: any) => [
        p.user_id,
        {
          user_name: p.user_name,
          organization_name: p.organizations?.name,
          group_name: p.groups?.name
        }
      ])
    );

    // Combine feedback with user info
    const result = feedbackData.map((item: any) => {
      const profile = profileMap.get(item.user_id);
      return {
        id: item.id,
        user_id: item.user_id,
        rating: item.rating,
        message: item.message,
        created_at: item.created_at,
        user_name: profile?.user_name,
        organization_name: profile?.organization_name,
        group_name: profile?.group_name
      };
    });

    console.log('getAllFeedback: Returning', result.length, 'items');

    return result;
  },

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const admin = getSupabaseAdmin();
    
    const { data, error } = await admin
      .from('feedback')
      .select('rating');

    if (error || !data) {
      console.error('Error fetching feedback stats:', error);
      return {
        total: 0,
        averageRating: 0,
        ratingDistribution: {}
      };
    }

    const total = data.length;
    const sum = data.reduce((acc, item) => acc + item.rating, 0);
    const averageRating = total > 0 ? sum / total : 0;

    const ratingDistribution = data.reduce((acc, item) => {
      acc[item.rating] = (acc[item.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      total,
      averageRating,
      ratingDistribution
    };
  }
};
