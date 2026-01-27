import { rlsSupabase } from '../supabase';
import { Database, UserProfile, UserProfileInsert, UserProfileUpdate } from '../types/database.types';

export interface CreateUserData {
  userId: string;
  userName?: string | null;
  email: string;
  role?: string;
  organizationId?: string | null;
  groupId?: string | null;
  grantedBy?: string | null;
}

export interface UpdateUserGroupData {
  groupId: string | null;
}

export interface UserWithGroup extends UserProfile {
  group?: {
    id: string;
    name: string;
    organization_id: string;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export class UserService {
  /**
   * Create a new user profile with optional group assignment
   * Requirements: 2.1 - User creation requires organization and group selection
   */
  async createUser(data: CreateUserData): Promise<UserProfile> {
    try {
      // Validate group assignment if provided
      if (data.groupId && data.organizationId) {
        const isValidAssignment = await this.validateUserGroupAssignment(data.organizationId, data.groupId);
        if (!isValidAssignment) {
          throw new Error('הקבוצה הנבחרת לא שייכת לארגון הנבחר');
        }
      }

      const insertData: UserProfileInsert = {
        user_id: data.userId,
        user_name: data.userName,
        email: data.email,
        role: data.role || 'student',
        organization_id: data.organizationId,
        group_id: data.groupId,
        granted_by: data.grantedBy
      };

      const { data: result, error } = await rlsSupabase
        .from('user_profile')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }

      return result as UserProfile;
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  /**
   * Update user's group assignment
   * Requirements: 2.3 - User group can only be changed within same organization
   */
  async updateUserGroup(userId: string, groupId: string | null): Promise<UserProfile> {
    try {
      // Get current user profile to check organization
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw new Error('משתמש לא נמצא');
      }

      // Validate group assignment if groupId is provided
      if (groupId && currentUser.organization_id) {
        const isValidAssignment = await this.validateUserGroupAssignment(currentUser.organization_id, groupId);
        if (!isValidAssignment) {
          throw new Error('לא ניתן לשייך משתמש לקבוצה מארגון אחר');
        }
      }

      const updateData: UserProfileUpdate = {
        group_id: groupId,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await rlsSupabase
        .from('user_profile')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user group:', error);
        throw error;
      }

      return result as UserProfile;
    } catch (error) {
      console.error('Error in updateUserGroup:', error);
      throw error;
    }
  }

  /**
   * Update user's organization and require new group selection
   * Requirements: 2.4 - Moving user to different organization requires new group
   */
  async updateUserOrganization(userId: string, organizationId: string | null, groupId: string | null): Promise<UserProfile> {
    try {
      // If organization is provided, group must also be provided and belong to that organization
      if (organizationId && groupId) {
        const isValidAssignment = await this.validateUserGroupAssignment(organizationId, groupId);
        if (!isValidAssignment) {
          throw new Error('הקבוצה הנבחרת לא שייכת לארגון החדש');
        }
      } else if (organizationId && !groupId) {
        throw new Error('בחירת ארגון מחייבת בחירת קבוצה');
      }

      const updateData: UserProfileUpdate = {
        organization_id: organizationId,
        group_id: groupId,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await rlsSupabase
        .from('user_profile')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user organization:', error);
        throw error;
      }

      return result as UserProfile;
    } catch (error) {
      console.error('Error in updateUserOrganization:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with group and organization details
   */
  async getUserById(userId: string): Promise<UserWithGroup | null> {
    try {
      const { data, error } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          group:groups(id, name, organization_id),
          organization:organizations(id, name)
        `)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user by ID:', error);
        throw error;
      }

      return (data as UserWithGroup) || null;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  /**
   * Get users by group
   */
  async getUsersByGroup(groupId: string): Promise<UserWithGroup[]> {
    try {
      const { data, error } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          group:groups(id, name, organization_id),
          organization:organizations(id, name)
        `)
        .eq('group_id', groupId)
        .order('user_name', { ascending: true });

      if (error) {
        console.error('Error fetching users by group:', error);
        throw error;
      }

      return (data as UserWithGroup[]) || [];
    } catch (error) {
      console.error('Error in getUsersByGroup:', error);
      throw error;
    }
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId: string): Promise<UserWithGroup[]> {
    try {
      const { data, error } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          group:groups(id, name, organization_id),
          organization:organizations(id, name)
        `)
        .eq('organization_id', organizationId)
        .order('user_name', { ascending: true });

      if (error) {
        console.error('Error fetching users by organization:', error);
        throw error;
      }

      return (data as UserWithGroup[]) || [];
    } catch (error) {
      console.error('Error in getUsersByOrganization:', error);
      throw error;
    }
  }

  /**
   * Validate that a group belongs to the specified organization
   * Requirements: 2.3, 2.4 - Ensure group-organization consistency
   */
  async validateUserGroupAssignment(organizationId: string, groupId: string): Promise<boolean> {
    try {
      const { data, error } = await rlsSupabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        console.error('Error validating group assignment:', error);
        return false;
      }

      return (data as any).organization_id === organizationId;
    } catch (error) {
      console.error('Error in validateUserGroupAssignment:', error);
      return false;
    }
  }

  /**
   * Get all users with group and organization details
   */
  async getAllUsers(): Promise<UserWithGroup[]> {
    try {
      const { data, error } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          group:groups(id, name, organization_id),
          organization:organizations(id, name)
        `)
        .order('user_name', { ascending: true });

      if (error) {
        console.error('Error fetching all users:', error);
        throw error;
      }

      return (data as UserWithGroup[]) || [];
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  /**
   * Update user profile (general update function)
   */
  async updateUser(userId: string, updates: Partial<UserProfileUpdate>): Promise<UserProfile> {
    try {
      // If updating both organization and group, validate the assignment
      if (updates.organization_id && updates.group_id) {
        const isValidAssignment = await this.validateUserGroupAssignment(updates.organization_id, updates.group_id);
        if (!isValidAssignment) {
          throw new Error('הקבוצה הנבחרת לא שייכת לארגון הנבחר');
        }
      }

      const updateData: UserProfileUpdate = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await rlsSupabase
        .from('user_profile')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }

      return result as UserProfile;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }
}

export const userService = new UserService();