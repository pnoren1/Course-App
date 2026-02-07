import { rlsSupabase, getSupabaseAdmin } from '../supabase';
import { VideoView, UserProgress } from '../types/videoView';

export class VideoViewService {
  /**
   * Create a view record (idempotent)
   * If a record already exists for the user/lesson combination, returns the existing record
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  async createView(userId: string, lessonId: string): Promise<VideoView> {
    try {
      // Use admin client to bypass RLS for checking existing views
      const adminClient = getSupabaseAdmin();
      
      // First check if view already exists
      const { data: existingView, error: checkError } = await adminClient
        .from('video_views')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      // If view exists, return it (idempotent behavior)
      if (existingView) {
        return existingView as VideoView;
      }

      // If error is not "not found", throw it
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing view:', checkError);
        throw checkError;
      }

      // Create new view record using admin client
      const { data, error } = await adminClient
        .from('video_views')
        .insert({
          user_id: userId,
          lesson_id: lessonId
        })
        .select()
        .single();

      if (error) {
        // If it's a duplicate key error, fetch and return the existing record
        if (error.code === '23505') {
          const { data: existingRecord, error: fetchError } = await adminClient
            .from('video_views')
            .select('*')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .single();
          
          if (existingRecord) {
            return existingRecord as VideoView;
          }
          
          if (fetchError) {
            console.error('Error fetching existing record after duplicate:', fetchError);
            throw fetchError;
          }
        }
        
        console.error('Error creating view:', error);
        throw error;
      }

      return data as VideoView;
    } catch (error) {
      console.error('Error in createView:', error);
      throw error;
    }
  }

  /**
   * Get views for a user, optionally filtered by lesson
   * Requirements: 1.3
   */
  async getUserViews(userId: string, lessonId?: string): Promise<VideoView[]> {
    try {
      // Use admin client to bypass RLS
      const adminClient = getSupabaseAdmin();
      
      let query = adminClient
        .from('video_views')
        .select('*')
        .eq('user_id', userId);

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user views:', error);
        throw error;
      }

      return (data as VideoView[]) || [];
    } catch (error) {
      console.error('Error in getUserViews:', error);
      throw error;
    }
  }

  /**
   * Check if user has watched a lesson
   * Helper function for quick boolean checks
   */
  async hasWatchedLesson(userId: string, lessonId: string): Promise<boolean> {
    try {
      const { data, error } = await rlsSupabase
        .from('video_views')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking watched lesson:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error in hasWatchedLesson:', error);
      throw error;
    }
  }

  /**
   * Get all views for admin with role-based filtering
   * - Admins see all students across all organizations
   * - Org admins see only students in their organization
   * Requirements: 3.2, 3.3, 3.4, 3.5
   */
  async getAdminViews(
    adminUserId: string,
    filters?: {
      userId?: string;
      organizationId?: string;
    }
  ): Promise<UserProgress[]> {
    try {
      // Use admin client to bypass RLS for complex queries
      const adminClient = getSupabaseAdmin();

      // First, get the admin's role and organization
      const { data: adminProfile, error: adminError } = await adminClient
        .from('user_profile')
        .select('role, organization_id')
        .eq('user_id', adminUserId)  // Fixed: use user_id instead of id
        .single();

      if (adminError || !adminProfile) {
        console.error('Error fetching admin profile:', adminError);
        throw new Error('Unable to verify admin privileges');
      }

      const isAdmin = adminProfile.role === 'admin';
      const isOrgAdmin = adminProfile.role === 'org_admin';

      if (!isAdmin && !isOrgAdmin) {
        throw new Error('User does not have admin privileges');
      }

      // Build the query for user profiles
      let userQuery = adminClient
        .from('user_profile')
        .select('id, user_id, user_name, email, organization_id, role');

      // Apply organization filtering for org_admins
      if (isOrgAdmin && adminProfile.organization_id) {
        userQuery = userQuery.eq('organization_id', adminProfile.organization_id);
      }

      // Apply additional filters if provided
      if (filters?.userId) {
        userQuery = userQuery.eq('user_id', filters.userId);  // Fixed: use user_id
      }

      if (filters?.organizationId) {
        // Only allow org_admin to filter by their own organization
        if (isOrgAdmin && filters.organizationId !== adminProfile.organization_id) {
          throw new Error('Org admin can only view their own organization');
        }
        userQuery = userQuery.eq('organization_id', filters.organizationId);
      }

      // Filter to only show students
      userQuery = userQuery.eq('role', 'student');

      const { data: users, error: usersError } = await userQuery;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      if (!users || users.length === 0) {
        return [];
      }

      // Get all video views for these users
      const userIds = users.map(u => u.user_id);
      const { data: views, error: viewsError } = await adminClient
        .from('video_views')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      if (viewsError) {
        console.error('Error fetching views:', viewsError);
        throw viewsError;
      }

      // Get all lessons to map IDs to titles
      const { data: lessons, error: lessonsError } = await adminClient
        .from('lessons')
        .select('id, title');

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        // Don't throw - we can still show views without titles
      }

      // Create a map of lesson_id to title for quick lookup
      const lessonTitleMap = new Map<string, string>();
      if (lessons) {
        lessons.forEach(lesson => {
          // Store both numeric and string versions of the ID
          lessonTitleMap.set(String(lesson.id), lesson.title);
          lessonTitleMap.set(lesson.id.toString(), lesson.title);
        });
      }

      // Build UserProgress objects
      const userProgress: UserProgress[] = users.map(user => {
        const userViews = (views || []).filter(v => v.user_id === user.user_id);
        
        return {
          user_id: user.user_id,
          username: user.user_name || 'Unknown',
          email: user.email || 'unknown@example.com',
          organization_id: user.organization_id || undefined,
          watched_lessons: userViews.map(v => {
            // Get lesson title from the map or fallback to lesson_id
            const lessonTitle = lessonTitleMap.get(v.lesson_id) || `שיעור ${v.lesson_id}`;
            return {
              lesson_id: v.lesson_id,
              lesson_title: lessonTitle,
              watched_at: v.created_at
            };
          })
        };
      });

      return userProgress;
    } catch (error) {
      console.error('Error in getAdminViews:', error);
      throw error;
    }
  }
}

export const videoViewService = new VideoViewService();
